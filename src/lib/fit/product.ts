import { useMemo } from 'react';
import type { Product } from '@/data/mockData';
import { productMaterials } from '@/data/mockData';
import { productFitAttributes } from '@/data/fitAttributes';
import type { BodyProfile } from '@/lib/profile';
import { toBodyInput, useBodyProfile } from '@/lib/profile';
import type { FitAttributes } from './attributes';
import { computeFit } from './score';
import type { FitResult } from './types';
import { enrichFromText, mergeAttributes } from '@/lib/catalog/enrich';

/**
 * Bridges the pure engine and the product data.
 *
 * Imported products arrive with `fit` already filled by the enrichment
 * provider at import time. Mock products are built in two layers on the fly:
 * the rule-based enrichment reads the name and material, and the hand-tagged
 * table lays human corrections on top.
 *
 * A mock product with no entry in the tagged table gets no Fit Score at all.
 * That is deliberate: shoes and bags are not body-fit garments, and the table
 * is the registry of what is.
 */
export function getProductFitAttributes(product: Product): FitAttributes | null {
  // Imported products carry their enriched layer with them.
  if (product.fit) return product.fit;
  // Mock products: rules over the name and composition, hand tags on top.
  const tagged = productFitAttributes[product.id];
  if (!tagged) return null;
  const material = productMaterials[product.id];
  const fromRules = enrichFromText({ name: product.name, material: material?.composition });
  return mergeAttributes(fromRules, tagged);
}

export function scoreProduct(product: Product, profile: BodyProfile | null): FitResult | null {
  if (!profile) return null;
  const attrs = getProductFitAttributes(product);
  if (!attrs) return null;
  return computeFit(attrs, toBodyInput(profile));
}

/**
 * Scored products first, best fit first; unscored products keep their original
 * order at the end. `tiebreak` decides between equal scores.
 */
export function sortByFit(
  products: Product[],
  profile: BodyProfile | null,
  tiebreak?: (a: Product, b: Product) => number,
): Product[] {
  const scores = new Map<string, number>();
  for (const p of products) {
    const fit = scoreProduct(p, profile);
    scores.set(p.id, fit ? fit.score : -1);
  }
  return [...products].sort((a, b) => {
    const diff = (scores.get(b.id) ?? -1) - (scores.get(a.id) ?? -1);
    if (diff !== 0) return diff;
    return tiebreak ? tiebreak(a, b) : 0;
  });
}

/**
 * Keyed on the whole product, not on its id.
 *
 * The id looked like a sufficient key and is not: re-importing a product keeps
 * its id and can change its fit attributes, so the memo would keep serving a
 * score computed from attributes the product no longer has. Scoring is pure
 * arithmetic over a handful of attributes — cheap enough that correctness wins
 * over skipping the recomputation on a catalogue refetch.
 */
export function useProductFit(product: Product): FitResult | null {
  const { profile } = useBodyProfile();
  return useMemo(() => scoreProduct(product, profile), [product, profile]);
}

/**
 * Splits a list into a highlight row and everything else, without showing
 * anything twice.
 *
 * The brand page used to take the first four scored products as highlights and
 * `slice(4)` as the remainder, falling back to the whole list when that
 * remainder was empty. The fallback was written for the case where nothing can
 * be scored at all — no body profile — but it also fired whenever a brand had
 * four or fewer scored products, and then "All products" repeated the four
 * already shown above it.
 *
 * Splitting by identity instead of by index fixes both cases at once, and
 * keeps unscored products (shoes, bags — never body-fit garments) in the
 * remainder where they belong, rather than dropping them.
 */
export function splitTopFit(
  products: Product[],
  profile: BodyProfile | null,
  topCount = 4,
): { top: Product[]; rest: Product[] } {
  const ranked = sortByFit(products, profile);
  const top = ranked.filter(p => scoreProduct(p, profile)).slice(0, topCount);
  const shown = new Set(top.map(p => p.id));
  return { top, rest: ranked.filter(p => !shown.has(p.id)) };
}
