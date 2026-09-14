import type { Product } from './types';
import type { BodyProfile } from '@/lib/profile';
import { sortByFit } from '@/lib/fit/product';

/**
 * Sorting a result list.
 *
 * The control existed on screen with four options and no `onChange` — it moved
 * when clicked and changed nothing, which is worse than not offering it.
 *
 * `newest` reads `fetchedAt`, the timestamp the import pipeline records.
 * The mock catalogue has none, so mock products keep their original order
 * behind everything that carries a real date. That is the honest answer while
 * the catalogue is half real and half fixture: sort by what we actually know,
 * and do not invent a date for the rest.
 */
export const SORT_MODES = ['fit', 'price-asc', 'price-desc', 'newest'] as const;
export type SortMode = (typeof SORT_MODES)[number];

/**
 * @param matched Ids the stylist matched to what the user named out loud.
 * Only "Dopasowanie" honours them, and only as the key above Fit Score: the
 * other three modes are explicit instructions ("cena rosnąco" means cena
 * rosnąco), while this one is ours to order sensibly. Without it the screen
 * re-sorted by fit and buried the one skirt that was actually midi.
 */
export function sortProducts(
  products: Product[],
  profile: BodyProfile | null,
  mode: SortMode,
  matched?: string[],
): Product[] {
  switch (mode) {
    case 'price-asc':
      return [...products].sort((a, b) => a.price - b.price);
    case 'price-desc':
      return [...products].sort((a, b) => b.price - a.price);
    case 'newest': {
      // Stable: equal (or missing) dates keep the order they came in.
      const time = (p: Product) => (p.fetchedAt ? Date.parse(p.fetchedAt) : NaN);
      return [...products]
        .map((product, index) => ({ product, index }))
        .sort((a, b) => {
          const ta = time(a.product);
          const tb = time(b.product);
          const aKnown = Number.isFinite(ta);
          const bKnown = Number.isFinite(tb);
          if (aKnown && bKnown && tb !== ta) return tb - ta;
          if (aKnown !== bKnown) return aKnown ? -1 : 1;
          return a.index - b.index;
        })
        .map(entry => entry.product);
    }
    case 'fit':
    default: {
      const byFit = (items: Product[]) => sortByFit(items, profile, (a, b) => a.price - b.price);
      if (!matched || matched.length === 0) return byFit(products);
      const asked = new Set(matched);
      return [
        ...byFit(products.filter(p => asked.has(p.id))),
        ...byFit(products.filter(p => !asked.has(p.id))),
      ];
    }
  }
}
