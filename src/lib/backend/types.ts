import type { BodyProfile } from '@/lib/profile';
import type { WardrobeItem, PendingPurchase, Outfit } from '@/lib/wardrobe';
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
  createOutfit(name: string, productIds: string[]): Promise<Outfit>;
  deleteOutfit(id: string): Promise<void>;
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
}

// ---------------------------------------------------------------- root

export interface Backend {
  name: BackendName;
  auth: AuthProvider;
  profile: ProfileRepository;
  prefs: PrefsRepository;
  wardrobe: WardrobeRepository;
  feedback: FitFeedbackRepository;
  saved: SavedRepository;
  catalog: CatalogRepository;
}

/** Thrown by the Supabase adapter until the project is actually connected. */
export class NotConnectedError extends Error {
  constructor(what: string) {
    super(`${what} is not connected yet — see docs/integration-points.md`);
    this.name = 'NotConnectedError';
  }
}
