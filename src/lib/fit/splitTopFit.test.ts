import { describe, it, expect } from 'vitest';
import { splitTopFit } from './product';
import type { Product } from '@/data/mockData';
import type { BodyProfile } from '@/lib/profile';

/**
 * The brand page showed its four best matches, then repeated all of them under
 * "All products" whenever the brand had four or fewer scored items — which is
 * every small brand, the exact supply Paula starts with.
 */

const attr = <T,>(value: T) => ({ value, confidence: 0.9 });

// Ids are prefixed so they cannot collide with the mock catalogue's
// hand-tagged fit table, which `getProductFitAttributes` looks up by id — a
// bare '2' silently picked up real attributes and scored an accessory.

/** A scoreable garment: `fit` present means the scorer has something to read. */
const garment = (id: string, name: string): Product => ({
  id,
  name,
  brand: 'Mała Marka',
  price: 199,
  fitScore: 0,
  category: 'dresses',
  isSecondHand: false,
  store: 'Mała Marka',
  fit: { silhouette: attr('fitted' as const), stretchLevel: attr('none' as const) },
});

/** Bags and shoes are not body-fit garments, so they never get a score. */
const accessory = (id: string, name: string): Product => ({
  id,
  name,
  brand: 'Mała Marka',
  price: 99,
  fitScore: 0,
  category: 'accessories',
  isSecondHand: false,
  store: 'Mała Marka',
});

const profile: BodyProfile = {
  source: 'measured',
  bust: 90,
  waist: 70,
  hips: 100,
  updatedAt: '2026-09-09T00:00:00.000Z',
};

describe('splitTopFit', () => {
  it('never shows the same product in both halves', () => {
    const products = [garment('brand-test-1', 'Sukienka A'), garment('brand-test-2', 'Sukienka B'), garment('brand-test-3', 'Sukienka C')];
    const { top, rest } = splitTopFit(products, profile);

    expect(top).toHaveLength(3);
    expect(rest).toHaveLength(0);
    const ids = [...top, ...rest].map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('puts the overflow in the remainder once there are more than four', () => {
    const products = Array.from({ length: 7 }, (_, i) => garment(`brand-test-${i}`, `Sukienka ${i}`));
    const { top, rest } = splitTopFit(products, profile);

    expect(top).toHaveLength(4);
    expect(rest).toHaveLength(3);
    expect(rest.some(p => top.includes(p))).toBe(false);
  });

  it('keeps unscored products in the remainder instead of dropping them', () => {
    // The old code filtered them out of the ranked list entirely and only got
    // them back by accident, through the fallback that caused the duplicate.
    const products = [garment('brand-test-1', 'Sukienka'), accessory('brand-test-2', 'Torebka'), accessory('brand-test-3', 'Buty')];
    const { top, rest } = splitTopFit(products, profile);

    expect(top.map(p => p.id)).toEqual(['brand-test-1']);
    expect(rest.map(p => p.id).sort()).toEqual(['brand-test-2', 'brand-test-3']);
  });

  it('shows everything as the remainder when there is no body profile', () => {
    // Nothing can be scored without a profile, so there is no highlight row —
    // and this is the case the old fallback was actually written for.
    const products = [garment('brand-test-1', 'Sukienka A'), garment('brand-test-2', 'Sukienka B')];
    const { top, rest } = splitTopFit(products, null);

    expect(top).toHaveLength(0);
    expect(rest).toHaveLength(2);
  });

  it('handles a brand with nothing at all', () => {
    const { top, rest } = splitTopFit([], profile);
    expect(top).toHaveLength(0);
    expect(rest).toHaveLength(0);
  });
});
