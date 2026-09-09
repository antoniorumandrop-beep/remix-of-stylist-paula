import { useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { backend, qk } from '@/lib/backend';
import type { BodyPoint } from './fit/types';

/** Shared empty list; see the note in `saved.ts`. */
const EMPTY: FitFeedback[] = [];

/**
 * The "did it fit?" loop. After a purchase the user tells us, per body point,
 * whether the garment was tight, fine or loose. This is the one signal that
 * makes Fit Score falsifiable — and the dataset nobody else on the market has.
 *
 * History note: the first version wrote to storage inside a React state
 * updater, and the write silently never ran because the form was unmounted in
 * the same tick. Writes are mutations now — they run to completion whether or
 * not the component that started them is still on screen.
 */
export type FitAnswer = 'tight' | 'ok' | 'loose';

export interface FitFeedback {
  productId: string;
  answers: Partial<Record<BodyPoint, FitAnswer>>;
  createdAt: string;
}

export const FEEDBACK_POINTS: BodyPoint[] = ['bust', 'waist', 'hips', 'thighs', 'stomach'];

export function useFitFeedback() {
  const query = useQuery({ queryKey: qk.feedback, queryFn: () => backend.feedback.list() });
  const saveMutation = useMutation({
    mutationFn: (v: { productId: string; answers: FitFeedback['answers'] }) => backend.feedback.save(v.productId, v.answers),
  });
  const removeMutation = useMutation({ mutationFn: (productId: string) => backend.feedback.remove(productId) });

  const all = query.data ?? EMPTY;
  const forProduct = useCallback(
    (productId: string) => all.find(f => f.productId === productId) ?? null,
    [all],
  );

  return {
    all,
    loading: query.isPending,
    forProduct,
    save: (productId: string, answers: FitFeedback['answers']) => saveMutation.mutateAsync({ productId, answers }),
    remove: (productId: string) => removeMutation.mutateAsync(productId),
  };
}
