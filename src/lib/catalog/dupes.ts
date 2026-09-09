import type { Product } from './types';
import type { BodyProfile } from '@/lib/profile';
import { sortByFit } from '@/lib/fit/product';

/**
 * "Dupes" — cheaper pieces close to something she already likes.
 *
 * The reference price is a **demo value, not a measurement**. Nothing analyses
 * the uploaded photo, so nothing knows what the original cost; the number was
 * previously a bare `899` sitting in the component, and the interface called
 * it an "estimated original price" and printed a percentage off it. That
 * turned an invented number into a claim.
 *
 * It stays until there is a real source for it, but it is named for what it is
 * and the copy says so.
 *
 * PLUG(ai): the real reference comes from the vision model that reads the
 * photo, or from the user typing what the original costs. Either way this
 * constant goes and `reference` becomes an argument with a provenance.
 */
export const DEMO_REFERENCE_PRICE = 899;

/** A dupe has to be meaningfully cheaper, not merely cheaper. */
export const DUPE_MAX_RATIO = 0.7;

export function findDupes(
  products: Product[],
  profile: BodyProfile | null,
  reference: number,
  limit = 12,
): Product[] {
  const ceiling = reference * DUPE_MAX_RATIO;
  return sortByFit(
    products.filter(p => p.price <= ceiling),
    profile,
    (a, b) => a.price - b.price,
  ).slice(0, limit);
}

/**
 * How much cheaper, as a whole percent. Returns null when the comparison would
 * be meaningless — no reference, or a product that is not actually cheaper —
 * so the caller can leave the badge off instead of printing "0% cheaper" or a
 * negative saving.
 */
export function discountPercent(price: number, reference: number): number | null {
  if (!Number.isFinite(reference) || reference <= 0) return null;
  if (price >= reference) return null;
  return Math.round((1 - price / reference) * 100);
}
