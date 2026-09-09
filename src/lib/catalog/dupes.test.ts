import { describe, it, expect } from 'vitest';
import { findDupes, discountPercent, DEMO_REFERENCE_PRICE, DUPE_MAX_RATIO } from './dupes';
import type { Product } from './types';

const product = (id: string, price: number): Product => ({
  id: `dupe-test-${id}`,
  name: `Produkt ${id}`,
  brand: 'Marka',
  price,
  fitScore: 0,
  category: 'dresses',
  isSecondHand: false,
  store: 'Marka',
});

describe('findDupes', () => {
  const catalogue = [product('a', 100), product('b', 620), product('c', 630), product('d', 900)];

  it('keeps only pieces meaningfully below the reference', () => {
    // 70% of 899 is 629.3 — 630 is over the line, 620 is not.
    const dupes = findDupes(catalogue, null, DEMO_REFERENCE_PRICE);
    expect(dupes.map(p => p.price)).toEqual([100, 620]);
  });

  it('orders by price when nothing can be scored', () => {
    const dupes = findDupes([product('x', 300), product('y', 50)], null, 1000);
    expect(dupes.map(p => p.price)).toEqual([50, 300]);
  });

  it('respects the limit', () => {
    const many = Array.from({ length: 30 }, (_, i) => product(String(i), 10 + i));
    expect(findDupes(many, null, 1000, 12)).toHaveLength(12);
  });

  it('returns nothing when everything is too expensive', () => {
    expect(findDupes([product('a', 1000)], null, 100)).toEqual([]);
  });

  it('uses the documented ratio', () => {
    expect(DUPE_MAX_RATIO).toBe(0.7);
  });
});

describe('discountPercent', () => {
  it('reports whole percents below the reference', () => {
    expect(discountPercent(500, 1000)).toBe(50);
    expect(discountPercent(250, 899)).toBe(72);
  });

  it('says nothing rather than "0% cheaper" when the piece is not cheaper', () => {
    expect(discountPercent(1000, 1000)).toBeNull();
    expect(discountPercent(1200, 1000)).toBeNull();
  });

  it('says nothing when there is no usable reference', () => {
    expect(discountPercent(100, 0)).toBeNull();
    expect(discountPercent(100, Number.NaN)).toBeNull();
  });
});
