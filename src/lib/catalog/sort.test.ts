import { describe, it, expect } from 'vitest';
import { sortProducts } from './sort';
import type { Product } from './types';
import type { BodyProfile } from '@/lib/profile';

/**
 * The sort control shipped with four options and no handler: it moved when
 * clicked and changed nothing. These cases are what each option now means.
 */

const attr = <T,>(value: T) => ({ value, confidence: 0.9 });

const product = (id: string, price: number, extra: Partial<Product> = {}): Product => ({
  id: `sort-test-${id}`,
  name: `Produkt ${id}`,
  brand: 'Marka',
  price,
  fitScore: 0,
  category: 'dresses',
  isSecondHand: false,
  store: 'Marka',
  ...extra,
});

const profile: BodyProfile = {
  source: 'measured',
  bust: 90,
  waist: 70,
  hips: 100,
  updatedAt: '2026-09-09T00:00:00.000Z',
};

const prices = (list: Product[]) => list.map(p => p.price);
const ids = (list: Product[]) => list.map(p => p.id);

describe('sortProducts', () => {
  const catalogue = [product('a', 300), product('b', 100), product('c', 200)];

  it('sorts by price, cheapest first', () => {
    expect(prices(sortProducts(catalogue, profile, 'price-asc'))).toEqual([100, 200, 300]);
  });

  it('sorts by price, dearest first', () => {
    expect(prices(sortProducts(catalogue, profile, 'price-desc'))).toEqual([300, 200, 100]);
  });

  it('never mutates the list it was given', () => {
    const input = [...catalogue];
    sortProducts(input, profile, 'price-desc');
    expect(ids(input)).toEqual(ids(catalogue));
  });

  it('puts a real fit score first, and breaks ties on price', () => {
    const scoreable = (id: string, price: number) =>
      product(id, price, { fit: { silhouette: attr('a-line' as const), stretchLevel: attr('none' as const) } });
    const list = [scoreable('x', 400), product('plain', 50), scoreable('y', 120)];
    const sorted = sortProducts(list, profile, 'fit');

    // Unscored products sink to the bottom; equal scores order by price.
    expect(sorted[sorted.length - 1].id).toBe('sort-test-plain');
    expect(sorted[0].id).toBe('sort-test-y');
  });

  describe('newest', () => {
    it('orders by the date the import recorded, newest first', () => {
      const list = [
        product('old', 100, { fetchedAt: '2026-01-01T00:00:00.000Z' }),
        product('new', 200, { fetchedAt: '2026-09-01T00:00:00.000Z' }),
        product('mid', 300, { fetchedAt: '2026-05-01T00:00:00.000Z' }),
      ];
      expect(ids(sortProducts(list, profile, 'newest'))).toEqual([
        'sort-test-new',
        'sort-test-mid',
        'sort-test-old',
      ]);
    });

    it('keeps undated mock products behind everything that has a date', () => {
      // The mock catalogue carries no timestamps, and inventing one for it
      // would make the option a lie rather than a sort.
      const list = [product('mock1', 100), product('real', 200, { fetchedAt: '2026-05-01T00:00:00.000Z' }), product('mock2', 300)];
      expect(ids(sortProducts(list, profile, 'newest'))).toEqual([
        'sort-test-real',
        'sort-test-mock1',
        'sort-test-mock2',
      ]);
    });

    it('is stable among undated products', () => {
      const list = [product('one', 1), product('two', 2), product('three', 3)];
      expect(ids(sortProducts(list, profile, 'newest'))).toEqual(ids(list));
    });

    it('treats an unparseable date as no date at all', () => {
      const list = [product('broken', 100, { fetchedAt: 'nie-data' }), product('good', 200, { fetchedAt: '2026-05-01T00:00:00.000Z' })];
      expect(ids(sortProducts(list, profile, 'newest'))).toEqual(['sort-test-good', 'sort-test-broken']);
    });
  });

  it('copes with an empty list', () => {
    expect(sortProducts([], profile, 'newest')).toEqual([]);
    expect(sortProducts([], null, 'fit')).toEqual([]);
  });
});
