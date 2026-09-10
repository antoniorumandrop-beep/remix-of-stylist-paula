-- Paula — draft Supabase schema. NOT applied anywhere yet.
--
-- This is the target the local backend (src/lib/backend/local.ts) mirrors.
-- When Lovable Cloud is enabled, turn this into a migration and write
-- src/lib/backend/supabase.ts against it. Every user table has RLS with
-- `user_id = auth.uid()`; the catalog is readable by everyone.
--
-- Naming follows the Backend interfaces in src/lib/backend/types.ts.

-- ---------------------------------------------------------------- users

-- body_profiles ↔ ProfileRepository (BodyProfile in src/lib/profile.ts)
create table body_profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  source      text not null check (source in ('measured', 'selected')),
  bust_cm     numeric,          -- measured only
  waist_cm    numeric,
  hips_cm     numeric,
  high_hip_cm numeric,
  shape       text,             -- selected only; one of the 9 FFIT shapes
  height_cm   numeric,
  updated_at  timestamptz not null default now()
);

-- user_prefs ↔ PrefsRepository (UserPrefs in src/lib/backend/types.ts)
create table user_prefs (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  name            text,
  aesthetics      text[] not null default '{}',
  fit_prefs       text[] not null default '{}',
  occasions       text[] not null default '{}',
  budget_min      integer,
  budget_max      integer,
  brands          text[] not null default '{}',
  inspirations    text[] not null default '{}',
  pinterest_links text[] not null default '{}',
  updated_at      timestamptz not null default now()
);

-- wardrobe_items / pending_purchases / outfits ↔ WardrobeRepository
create table wardrobe_items (
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id text not null references products(id),
  added_at   timestamptz not null default now(),
  times_worn integer not null default 0,
  notes      text,
  primary key (user_id, product_id)
);

create table pending_purchases (
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id text not null references products(id),
  clicked_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table outfits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  product_ids text[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- fit_feedback ↔ FitFeedbackRepository — the "did it fit?" loop.
-- One row per user × product; answers keyed by body point.
-- This is the training signal for Fit Score v2. Keep it clean.
create table fit_feedback (
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id text not null references products(id),
  answers    jsonb not null,   -- {"bust":"tight","waist":"ok","hips":"loose",...}
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- saved_products ↔ SavedRepository
create table saved_products (
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id text not null references products(id),
  saved_at   timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- collections ↔ CollectionsRepository
-- Deliberately separate from `outfits`, even though the columns line up. An
-- outfit is a set of clothes worn together; a collection is a shelf things are
-- put on. One table would make "delete this outfit" quietly empty a shelf.
create table collections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  emoji      text,                        -- chosen by the user, never assigned for her
  created_at timestamptz not null default now()
);

-- The join. `position` keeps the newest-first order the app shows; a plain
-- text[] column on `collections` could not have the foreign key below, and the
-- catalogue is refreshed underneath these rows.
create table collection_products (
  collection_id uuid not null references collections(id) on delete cascade,
  product_id    text not null references products(id),
  position      integer not null default 0,
  added_at      timestamptz not null default now(),
  primary key (collection_id, product_id)
);

create index on collection_products (collection_id, position);

-- ---------------------------------------------------------------- catalog

-- products ↔ RawProduct (src/lib/catalog/types.ts) — the RAW layer.
-- Exactly what the source gave us. A feed refresh replaces rows here and
-- never touches product_fit_attributes.
create table products (
  id          text primary key,           -- "<source>:<external_id>"
  source      text not null,              -- 'brand', 'awin', 'ceneo', 'allegro', ...
  external_id text not null,
  name        text not null,
  brand       text not null,
  price       numeric not null,
  currency    text not null default 'PLN',
  category    text not null,              -- CATEGORIES in src/lib/catalog/types.ts
  url         text,
  image_url   text,
  material    text,
  description text,
  sizes       text,
  fetched_at  timestamptz not null default now(),
  unique (source, external_id)
);

-- product_fit_attributes ↔ EnrichedProduct.fit — the ENRICHED layer.
-- FitAttributes as JSON (closed vocabularies in src/lib/fit/attributes.ts),
-- plus who produced it and when. Human overrides are rows with enriched_by='human'
-- and win over model/rules rows for the same product.
create table product_fit_attributes (
  product_id  text not null references products(id) on delete cascade,
  attributes  jsonb not null,             -- {"silhouette":{"value":"wrap","confidence":0.75}, ...}
  enriched_by text not null,              -- 'rules' | model name | 'human'
  enriched_at timestamptz not null default now(),
  primary key (product_id, enriched_by)
);

-- price_history — collect from day one (needed before any "was X zł" badge).
create table price_history (
  product_id  text not null references products(id) on delete cascade,
  price       numeric not null,
  observed_at timestamptz not null default now(),
  primary key (product_id, observed_at)
);

-- ---------------------------------------------------------------- RLS

alter table body_profiles          enable row level security;
alter table user_prefs             enable row level security;
alter table wardrobe_items         enable row level security;
alter table pending_purchases      enable row level security;
alter table outfits                enable row level security;
alter table fit_feedback           enable row level security;
alter table saved_products         enable row level security;
alter table collections            enable row level security;
alter table collection_products    enable row level security;
alter table products               enable row level security;
alter table product_fit_attributes enable row level security;
alter table price_history          enable row level security;

-- Own rows only, for every user table:
create policy "own rows" on body_profiles     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on user_prefs        for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on wardrobe_items    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on pending_purchases for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on outfits           for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on fit_feedback      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on saved_products    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on collections       for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The join table has no user_id of its own, so its policy has to go through
-- the parent. Without this it would be readable by everyone.
create policy "own rows" on collection_products for all
  using (exists (select 1 from collections c where c.id = collection_id and c.user_id = auth.uid()))
  with check (exists (select 1 from collections c where c.id = collection_id and c.user_id = auth.uid()));

-- Catalog: everyone reads, only admins write (admin = a role claim or an
-- `admins` table — decide when the first real brand is onboarded).
create policy "public read" on products               for select using (true);
create policy "public read" on product_fit_attributes for select using (true);
create policy "public read" on price_history          for select using (true);
