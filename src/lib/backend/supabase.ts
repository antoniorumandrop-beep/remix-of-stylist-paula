import type { Backend } from './types';
import { NotConnectedError } from './types';

/**
 * PLUG(supabase): the Supabase backend.
 *
 * Not written yet — on purpose. Enabling Lovable Cloud on Gabriela's project
 * generates `src/integrations/supabase/client.ts`; this file is where that
 * client gets wrapped into the `Backend` contract. Until then every method
 * throws `NotConnectedError`, and `index.ts` falls back to the local backend.
 *
 * What each repository maps to (full schema: docs/supabase-schema.draft.sql):
 *
 *   auth      → supabase.auth (magic link + Google OAuth); `Session.userId` = auth.uid()
 *   profile   → table `body_profiles`      (one row per user, RLS: user_id = auth.uid())
 *   prefs     → table `user_prefs`         (one row per user)
 *   wardrobe  → tables `wardrobe_items`, `pending_purchases`, `outfits`
 *   feedback  → table `fit_feedback`       (one row per user × product — the dataset that matters)
 *   saved     → table `saved_products`
 *   collections → tables `collections` + `collection_products` (join, ordered)
 *   catalog   → tables `products` (raw layer) + `product_fit_attributes` (enriched layer),
 *               readable by everyone, writable by admins only
 *
 * The local adapter (`local.ts`) is the reference for behaviour; the contract
 * tests in `backend.test.ts` must pass against this adapter too.
 */
export function createSupabaseBackend(): Backend {
  const notConnected = (what: string) => async () => { throw new NotConnectedError(what); };
  return {
    name: 'supabase',
    auth: {
      getSession: notConnected('supabase.auth'),
      signInWithEmail: notConnected('supabase.auth'),
      signInWithGoogle: notConnected('supabase.auth'),
      signOut: notConnected('supabase.auth'),
      onAuthChange: () => () => {},
    },
    profile: { get: notConnected('body_profiles'), set: notConnected('body_profiles'), clear: notConnected('body_profiles') },
    prefs: { get: notConnected('user_prefs'), update: notConnected('user_prefs') },
    wardrobe: {
      listItems: notConnected('wardrobe_items'), addItem: notConnected('wardrobe_items'),
      removeItem: notConnected('wardrobe_items'), incrementWear: notConnected('wardrobe_items'),
      listPending: notConnected('pending_purchases'), markPending: notConnected('pending_purchases'),
      dismissPending: notConnected('pending_purchases'),
      listOutfits: notConnected('outfits'), createOutfit: notConnected('outfits'), deleteOutfit: notConnected('outfits'),
    },
    feedback: { list: notConnected('fit_feedback'), save: notConnected('fit_feedback'), remove: notConnected('fit_feedback') },
    saved: { list: notConnected('saved_products'), add: notConnected('saved_products'), remove: notConnected('saved_products') },
    collections: {
      list: notConnected('collections'), create: notConnected('collections'),
      rename: notConnected('collections'), remove: notConnected('collections'),
      addProduct: notConnected('collection_products'), removeProduct: notConnected('collection_products'),
    },
    catalog: {
      list: notConnected('products'), get: notConnected('products'), importRaw: notConnected('products'),
      listImported: notConnected('products'), clearImported: notConnected('products'),
    },
  };
}
