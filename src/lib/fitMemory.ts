import { useMemo } from 'react';
import { useCatalog } from '@/lib/catalog/useCatalog';
import { useBodyProfile } from '@/lib/profile';
import { useFitFeedback } from '@/lib/fitFeedback';
import { scoreProduct } from '@/lib/fit/product';
import { accuracy, brandMemory, joinFeedback, pickBrand, type Accuracy, type AnsweredGarment, type BrandMemory } from '@/lib/fit/learning';
import type { BodyPoint, Verdict } from '@/lib/fit/types';

/**
 * Reads the "did it fit?" answers back out.
 *
 * The maths lives in `fit/learning.ts` and knows nothing about React; this is
 * only the wiring — feedback joined to the catalogue, and the scorer run again
 * over the garments she answered for.
 */

export function useAnsweredGarments(): { garments: AnsweredGarment[]; loading: boolean } {
  const { all, loading: feedbackLoading } = useFitFeedback();
  const { byId, loading: catalogLoading } = useCatalog();
  const garments = useMemo(() => joinFeedback(all, byId), [all, byId]);
  return { garments, loading: feedbackLoading || catalogLoading };
}

export function useBrandMemory(brand?: string): { memory: BrandMemory | null; all: BrandMemory[]; loading: boolean } {
  const { garments, loading } = useAnsweredGarments();
  const all = useMemo(() => brandMemory(garments), [garments]);
  const memory = useMemo(() => (brand ? pickBrand(all, brand) : null), [all, brand]);
  return { memory, all, loading };
}

/**
 * How often the score agreed with reality.
 *
 * The verdicts are recomputed from today's profile rather than stored with the
 * answer. That is a real limitation and it is worth naming: if she remeasures,
 * yesterday's predictions are re-judged against her new proportions. Storing
 * the prediction alongside the answer would fix it and needs a schema change,
 * which is not ours to make alone — so for now the screen says the number is
 * counted on the current profile.
 */
export function useFitAccuracy(): { result: Accuracy; answered: number; loading: boolean } {
  const { all, loading: feedbackLoading } = useFitFeedback();
  const { byId, loading: catalogLoading } = useCatalog();
  const { profile } = useBodyProfile();

  const result = useMemo(() => {
    const scored = [];
    for (const record of all) {
      const product = byId.get(record.productId);
      if (!product) continue;
      const fit = scoreProduct(product, profile);
      if (!fit) continue;
      const verdicts: Partial<Record<BodyPoint, Verdict>> = {};
      for (const point of fit.points) verdicts[point.point] = point.verdict;
      scored.push({ verdicts, answers: record.answers });
    }
    return accuracy(scored);
  }, [all, byId, profile]);

  return { result, answered: all.length, loading: feedbackLoading || catalogLoading };
}
