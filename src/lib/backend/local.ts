import type {
  AuthProvider, Backend, CatalogRepository, Collection, CollectionsRepository,
  FitFeedbackRepository, PrefsRepository, ProfileRepository, SavedRepository,
  Session, UserPrefs, WardrobeRepository,
} from './types';
import { readStored, removeStored, writeStored } from './storage';
import type { BodyProfile } from '@/lib/profile';
import type { Outfit, PendingPurchase, WardrobeItem } from '@/lib/wardrobe';
import type { FitFeedback } from '@/lib/fitFeedback';
import type { EnrichedProduct, Product, RawProduct } from '@/lib/catalog/types';
import { enrichedToProduct } from '@/lib/catalog/convert';
import { allProducts } from '@/data/mockData';

/**
 * The local backend: localStorage for user data, the mock catalog plus
 * whatever was imported through /admin/import for products.
 *
 * This is the reference implementation of the `Backend` contract. When the
 * Supabase adapter is written, its behaviour has to match this file — the
 * tests in `backend.test.ts` run against both.
 */

const KEYS = {
  session: 'paula.session',
  profile: 'paula.bodyProfile',
  prefs: 'paula.prefs',
  wardrobe: 'paula.wardrobe',
  pending: 'paula.pendingPurchases',
  outfits: 'paula.outfits',
  feedback: 'paula.fitFeedback',
  saved: 'paula.saved',
  collections: 'paula.collections',
  imported: 'paula.catalog.imported',
  userProducts: 'paula.catalog.user',
} as const;

const now = () => new Date().toISOString();

/** djb2, enough to turn an email into a stable fake user id. */
function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

function localAuth(): AuthProvider {
  const listeners = new Set<(s: Session | null) => void>();
  const emit = (s: Session | null) => listeners.forEach(cb => cb(s));
  return {
    async getSession() {
      return readStored<Session | null>(KEYS.session, null);
    },
    async signInWithEmail(email) {
      const session: Session = { userId: `local-${hash(email.trim().toLowerCase())}`, email: email.trim(), provider: 'email', createdAt: now() };
      writeStored(KEYS.session, session);
      emit(session);
      return session;
    },
    async signInWithGoogle() {
      const session: Session = { userId: 'local-google', email: null, provider: 'google', createdAt: now() };
      writeStored(KEYS.session, session);
      emit(session);
      return session;
    },
    async signOut() {
      removeStored(KEYS.session);
      emit(null);
    },
    onAuthChange(cb) {
      listeners.add(cb);
      return () => { listeners.delete(cb); };
    },
  };
}

function localProfile(): ProfileRepository {
  return {
    async get() { return readStored<BodyProfile | null>(KEYS.profile, null); },
    async set(profile) { writeStored(KEYS.profile, profile); },
    async clear() { removeStored(KEYS.profile); },
  };
}

export const DEFAULT_PREFS: UserPrefs = {
  name: null,
  aesthetics: [],
  fitPrefs: [],
  occasions: [],
  budgetMin: null,
  budgetMax: null,
  brands: [],
  inspirations: [],
  pinterestLinks: [],
};

function localPrefs(): PrefsRepository {
  const read = (): UserPrefs => {
    const stored = readStored<Partial<UserPrefs> | null>(KEYS.prefs, null);
    if (stored) return { ...DEFAULT_PREFS, ...stored };
    // Earlier builds kept the name and inspirations under their own keys.
    const legacyName = localStorage.getItem('paula-username');
    const legacyInspirations = readStored<string[]>('paula-inspirations', []);
    return { ...DEFAULT_PREFS, name: legacyName, inspirations: legacyInspirations };
  };
  return {
    async get() { return read(); },
    async update(patch) {
      const next = { ...read(), ...patch };
      writeStored(KEYS.prefs, next);
      return next;
    },
  };
}

function localWardrobe(): WardrobeRepository {
  const items = () => readStored<WardrobeItem[]>(KEYS.wardrobe, []);
  const pending = () => readStored<PendingPurchase[]>(KEYS.pending, []);
  const outfits = () => readStored<Outfit[]>(KEYS.outfits, []);
  return {
    async listItems() { return items(); },
    async addItem(productId) {
      if (!items().some(i => i.productId === productId)) {
        writeStored(KEYS.wardrobe, [...items(), { productId, addedAt: now(), timesWorn: 0 }]);
      }
      writeStored(KEYS.pending, pending().filter(p => p.productId !== productId));
    },
    async removeItem(productId) {
      writeStored(KEYS.wardrobe, items().filter(i => i.productId !== productId));
      writeStored(KEYS.outfits, outfits().map(o => ({ ...o, productIds: o.productIds.filter(id => id !== productId) })));
    },
    async incrementWear(productId) {
      writeStored(KEYS.wardrobe, items().map(i => i.productId === productId ? { ...i, timesWorn: i.timesWorn + 1 } : i));
    },
    async listPending() { return pending(); },
    async markPending(productId) {
      if (items().some(i => i.productId === productId)) return;
      if (pending().some(p => p.productId === productId)) return;
      writeStored(KEYS.pending, [...pending(), { productId, clickedAt: now() }]);
    },
    async dismissPending(productId) {
      writeStored(KEYS.pending, pending().filter(p => p.productId !== productId));
    },
    async listOutfits() { return outfits(); },
    async createOutfit(name, productIds) {
      const outfit: Outfit = { id: `o-${Date.now()}`, name, productIds, createdAt: now() };
      writeStored(KEYS.outfits, [outfit, ...outfits()]);
      return outfit;
    },
    async deleteOutfit(id) {
      writeStored(KEYS.outfits, outfits().filter(o => o.id !== id));
    },
  };
}

function localFeedback(): FitFeedbackRepository {
  const all = () => readStored<FitFeedback[]>(KEYS.feedback, []);
  return {
    async list() { return all(); },
    async save(productId, answers) {
      writeStored(KEYS.feedback, [
        ...all().filter(f => f.productId !== productId),
        { productId, answers, createdAt: now() },
      ]);
    },
    async remove(productId) {
      writeStored(KEYS.feedback, all().filter(f => f.productId !== productId));
    },
  };
}

function localSaved(): SavedRepository {
  const all = () => readStored<string[]>(KEYS.saved, []);
  return {
    async list() { return all(); },
    async add(productId) {
      if (!all().includes(productId)) writeStored(KEYS.saved, [productId, ...all()]);
    },
    async remove(productId) {
      writeStored(KEYS.saved, all().filter(id => id !== productId));
    },
  };
}

function localCollections(): CollectionsRepository {
  const all = () => readStored<Collection[]>(KEYS.collections, []);
  const write = (next: Collection[]) => writeStored(KEYS.collections, next);
  const patch = (id: string, change: (c: Collection) => Collection) =>
    write(all().map(c => (c.id === id ? change(c) : c)));

  return {
    async list() { return all(); },
    async create(name, emoji = null) {
      const collection: Collection = {
        id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        emoji,
        productIds: [],
        createdAt: now(),
      };
      write([collection, ...all()]);
      return collection;
    },
    async rename(id, name) {
      patch(id, c => ({ ...c, name: name.trim() }));
    },
    async remove(id) {
      write(all().filter(c => c.id !== id));
    },
    async addProduct(id, productId) {
      // Newest first, and adding something twice is a no-op rather than an
      // error: the menu on a product card cannot know what is already inside.
      patch(id, c => (c.productIds.includes(productId)
        ? c
        : { ...c, productIds: [productId, ...c.productIds] }));
    },
    async removeProduct(id, productId) {
      patch(id, c => ({ ...c, productIds: c.productIds.filter(p => p !== productId) }));
    },
  };
}

function localCatalog(): CatalogRepository {
  const imported = () => readStored<EnrichedProduct[]>(KEYS.imported, []);
  const importedProducts = () => imported().map(enrichedToProduct);
  const userAdded = () => readStored<EnrichedProduct[]>(KEYS.userProducts, []);
  const userProducts = () => userAdded().map(enrichedToProduct);
  return {
    async list() {
      return [...importedProducts(), ...allProducts];
    },
    async get(id) {
      // Deliberately wider than `list()`: the shared channel excludes what the
      // user added herself, but she still has to be able to open it.
      return [...(await this.list()), ...userProducts()].find(p => p.id === id) ?? null;
    },
    async importRaw(items) {
      // Lazy on purpose: the AI layer imports the fit engine, which imports
      // the profile hooks, which import this backend. A static import here
      // would close that circle.
      const { enrichment } = await import('@/lib/ai');
      const enriched: EnrichedProduct[] = [];
      for (const raw of items) {
        const { fit, enrichedBy } = await enrichment.enrich(raw);
        enriched.push({ raw, fit, enrichedBy, enrichedAt: now() });
      }
      const existing = imported().filter(e => !items.some(i => i.id === e.raw.id));
      writeStored(KEYS.imported, [...existing, ...enriched]);
      return enriched.length;
    },
    async listImported() { return importedProducts(); },
    async clearImported() { removeStored(KEYS.imported); },

    async addUserProduct(item) {
      const { enrichment } = await import('@/lib/ai');
      const { fit, enrichedBy } = await enrichment.enrich(item);
      const entry: EnrichedProduct = { raw: item, fit, enrichedBy, enrichedAt: now() };
      // Re-adding the same link replaces the record rather than doubling it.
      writeStored(KEYS.userProducts, [entry, ...userAdded().filter(e => e.raw.id !== item.id)]);
      return enrichedToProduct(entry);
    },
    async listUserProducts() { return userProducts(); },
    async removeUserProduct(id) {
      writeStored(KEYS.userProducts, userAdded().filter(e => e.raw.id !== id));
    },
  };
}

export function createLocalBackend(): Backend {
  return {
    name: 'local',
    auth: localAuth(),
    profile: localProfile(),
    prefs: localPrefs(),
    wardrobe: localWardrobe(),
    feedback: localFeedback(),
    saved: localSaved(),
    collections: localCollections(),
    catalog: localCatalog(),
  };
}

export type { Product };
