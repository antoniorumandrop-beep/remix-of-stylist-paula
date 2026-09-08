import { useMemo } from 'react';
import type { Product } from '@/data/mockData';
import { productMaterials } from '@/data/mockData';
import { productFitAttributes } from '@/data/fitAttributes';
import type { BodyProfile } from '@/lib/profile';
import { toBodyInput, useBodyProfile } from '@/lib/profile';
import type { FitAttributes } from './attributes';
import { computeFit } from './score';
import { parseStretch } from './stretch';
import type { FitResult } from './types';

/**
 * Bridges the pure engine and the product data. Attributes come from two
 * places: the hand-tagged table (temporary — replaced by the enrichment layer
 * in step 1) and the material composition, which already exists and yields
 * stretch with no human input.
 *
 * A product with no entry in the tagged table gets no Fit Score at all. That
 * is deliberate: shoes and bags are not body-fit garments.
 */
export function getProductFitAttributes(productId: string): FitAttributes | null {
  const tagged = productFitAttributes[productId];
  if (!tagged) return null;
  if (tagged.stretchLevel) return tagged;

  const material = productMaterials[productId];
  if (!material) return tagged;
  const stretch = parseStretch(material.composition);
  if (stretch.level === 'unknown') return tagged;
  return { ...tagged, stretchLevel: { value: stretch.level, confidence: stretch.confidence } };
}

export function scoreProduct(product: Product, profile: BodyProfile | null): FitResult | null {
  if (!profile) return null;
  const attrs = getProductFitAttributes(product.id);
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
