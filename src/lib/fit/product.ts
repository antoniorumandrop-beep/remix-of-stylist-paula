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
 * Attributes are built in two layers: the rule-based enrichment reads the
 * product name and material (the same text a real feed would give us), and
 * the hand-tagged table lays human corrections on top. When the real catalog
 * arrives, only the first layer changes.
 *
 * A product with no entry in the tagged table gets no Fit Score at all. That
 * is deliberate: shoes and bags are not body-fit garments, and the table is
 * the registry of what is.
 */
export function getProductFitAttributes(product: Product): FitAttributes | null {
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

export function useProductFit(product: Product): FitResult | null {
  const { profile } = useBodyProfile();
  return useMemo(() => scoreProduct(product, profile), [product.id, profile]);
}
