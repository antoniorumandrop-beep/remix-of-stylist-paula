import type { BodyProfile } from '@/lib/profile';
import type { WardrobeItem, PendingPurchase, Outfit, OutfitDraft } from '@/lib/wardrobe';
import type { FitFeedback } from '@/lib/fitFeedback';
import type { Product, RawProduct } from '@/lib/catalog/types';

/**
 * The backend contract.
 *
 * Every screen talks to the app's data through these interfaces and nothing
 * else. Today the only implementation is `local` (localStorage + the mock
 * catalog). Connecting Supabase means writing a second implementation of the
 * same interfaces in `supabase.ts` — the screens do not change.
 *
 * Every method is async on purpose: localStorage answers instantly, a database
 * does not, and the screens must not care which one they are talking to.
 *
 * The map of what to plug in where: `docs/integration-points.md`.
 */

export type BackendName = 'local' | 'supabase';

// ---------------------------------------------------------------- auth

export interface Session {
  userId: string;
  email: string | null;
  provider: 'local' | 'email' | 'google';
  createdAt: string;
}

export interface AuthProvider {
  getSession(): Promise<Session | null>;
  /**
   * Local: signs in instantly with any email. Supabase: sends a magic link
   * and resolves `null` — the session arrives later through `onAuthChange`.
   */
  signInWithEmail(email: string): Promise<Session | null>;
  /** Local: instant fake session. Supabase: OAuth redirect, resolves `null`. */
  signInWithGoogle(): Promise<Session | null>;
  signOut(): Promise<void>;
  onAuthChange(cb: (session: Session | null) => void): () => void;
}

// ---------------------------------------------------------------- user data

export interface ProfileRepository {
  get(): Promise<BodyProfile | null>;
  set(profile: BodyProfile): Promise<void>;
  clear(): Promise<void>;
}

/** Everything from onboarding that is not the body: name, taste, budget. */
export interface UserPrefs {
  name: string | null;
  aesthetics: string[];
  fitPrefs: string[];
  occasions: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  brands: string[];
  inspirations: string[];
  pinterestLinks: string[];
}

export interface PrefsRepository {
  get(): Promise<UserPrefs>;
  update(patch: Partial<UserPrefs>): Promise<UserPrefs>;
}

export interface WardrobeRepository {
  listItems(): Promise<WardrobeItem[]>;
  addItem(productId: string): Promise<void>;
  removeItem(productId: string): Promise<void>;
  incrementWear(productId: string): Promise<void>;
  listPending(): Promise<PendingPurchase[]>;
  markPending(productId: string): Promise<void>;
  dismissPending(productId: string): Promise<void>;
  listOutfits(): Promise<Outfit[]>;
  createOutfit(draft: OutfitDraft): Promise<Outfit>;
  /** Replaces name, items and photos wholesale. Photos dropped here are deleted. */
  updateOutfit(id: string, draft: OutfitDraft): Promise<void>;
  /**
   * Replaces the cut-out silhouettes wholesale; the ones no longer named are
   * deleted.
   *
   * Deliberately not a field on `OutfitDraft`: a draft is what she typed, and
   * if cut-outs travelled with it, the editor saving a name change would wipe
   * a scan without anyone noticing. This is the only place they are written.
   */
  setCutouts(id: string, cutouts: Record<string, string>): Promise<void>;
  /** Deletes the fit and every photo that belonged to it. No orphaned bytes. */
  deleteOutfit(id: string): Promise<void>;
}

/**
 * Photos she takes of herself in a fit.
 *
 * The first place in Paula where an image is kept rather than passed through —
 * the measurement path deliberately never touches storage
 * (`docs/photo-measurement.md`), because there the photo is an input. Here the
 * photo *is* the thing, so the rule "a photo is stored deliberately or not at
 * all" is satisfied the other way: a named store, a stated lifetime, and one
 * button that deletes it. Where the bytes actually live:
 * `docs/own-fits-photos.md`.
 *
 * Photos are addressed by id and never inlined into an `Outfit`: a phone photo
 * as a data URI would blow the localStorage budget shared with her profile,
 * her wardrobe and the imported catalogue — and it would fail on write, which
 * is the worst possible moment to find out.
 */
export interface PhotoRepository {
  /** Stores an image and returns the id to keep in an `Outfit`. */
  put(blob: Blob): Promise<string>;
  get(id: string): Promise<Blob | null>;
  remove(id: string): Promise<void>;
  /**
   * Whether this browser can store photos at all. Sync on purpose: the screen
   * has to decide whether to offer the picker before it renders it, and a
   * browser with site data blocked throws on access rather than saying no.
   */
  available(): boolean;
}

export interface FitFeedbackRepository {
  list(): Promise<FitFeedback[]>;
  save(productId: string, answers: FitFeedback['answers']): Promise<void>;
  remove(productId: string): Promise<void>;
}

/** Hearted products, by id. */
export interface SavedRepository {
  list(): Promise<string[]>;
  add(productId: string): Promise<void>;
  remove(productId: string): Promise<void>;
}

/**
 * A folder of saved things, named by the user.
 *
 * Deliberately not an `Outfit`, even though the stored shape is identical —
 * `wardrobe.createOutfit(name, productIds)` already exists. An outfit is a set
 * of clothes worn together; a collection is a shelf things are put on. Merging
 * them because the columns line up would make "delete this outfit" quietly
 * empty a shelf.
 *
 * Products are held by id, not embedded: a collection has to survive the
 * catalogue being refreshed underneath it.
 */
export interface Collection {
  id: string;
  name: string;
  /** Optional, chosen by the user. Never assigned for her. */
  emoji: string | null;
  productIds: string[];
  createdAt: string;
}

export interface CollectionsRepository {
  list(): Promise<Collection[]>;
  create(name: string, emoji?: string | null): Promise<Collection>;
  rename(id: string, name: string): Promise<void>;
  remove(id: string): Promise<void>;
  /** Adding a product that is already there is not an error and not a duplicate. */
  addProduct(id: string, productId: string): Promise<void>;
  removeProduct(id: string, productId: string): Promise<void>;
}

// ---------------------------------------------------------------- catalog

export interface CatalogRepository {
  /** Every product Paula can show: imported brand products first, then the mock catalog. */
  list(): Promise<Product[]>;
  get(id: string): Promise<Product | null>;
  /**
   * Adds products from a brand feed. Enrichment (fit attributes) runs here,
   * once per product, so the result can be stored next to the raw record.
   * Returns how many products were stored.
   */
  importRaw(items: RawProduct[]): Promise<number>;
  listImported(): Promise<Product[]>;
  clearImported(): Promise<void>;

  /**
   * Products the user added herself, from a link to a shop we do not carry.
   *
   * Kept out of `list()` on purpose, so they never reach the feed, the search
   * results or the "similar products" rows. A pasted page gives us whatever
   * that shop happened to publish — often no composition and no size chart —
   * while a brand feed is filled in by the brand. Both would render an
   * identical Fit Score badge, and the weaker one would be indistinguishable.
   *
   * `get()` still finds them: she has to be able to open what she added.
   */
  addUserProduct(item: RawProduct): Promise<Product>;
  listUserProducts(): Promise<Product[]>;
  removeUserProduct(id: string): Promise<void>;
}

// ---------------------------------------------------------------- root

export interface Backend {
  name: BackendName;
  auth: AuthProvider;
  profile: ProfileRepository;
  prefs: PrefsRepository;
  wardrobe: WardrobeRepository;
  photos: PhotoRepository;
  feedback: FitFeedbackRepository;
  saved: SavedRepository;
  collections: CollectionsRepository;
  catalog: CatalogRepository;
}

/** Thrown by the Supabase adapter until the project is actually connected. */
export class NotConnectedError extends Error {
  constructor(what: string) {
    super(`${what} is not connected yet — see docs/integration-points.md`);
    this.name = 'NotConnectedError';
  }
}
