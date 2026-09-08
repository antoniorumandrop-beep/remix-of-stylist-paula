import { useCallback } from 'react';
import { readStored, useStored, writeStored } from './wardrobe';
import type { BodyPoint } from './fit/types';

/**
 * The "did it fit?" loop. After a purchase the user tells us, per body point,
 * whether the garment was tight, fine or loose. This is the one signal that
 * makes Fit Score falsifiable — and the dataset nobody else on the market has.
 *
 * localStorage for now, like everything else; the database migration takes it
 * along with the profile and the wardrobe.
 */
export type FitAnswer = 'tight' | 'ok' | 'loose';

export interface FitFeedback {
  productId: string;
  answers: Partial<Record<BodyPoint, FitAnswer>>;
  createdAt: string;
}

const KEY = 'paula.fitFeedback';

export const FEEDBACK_POINTS: BodyPoint[] = ['bust', 'waist', 'hips', 'thighs', 'stomach'];

export function readFitFeedback(): FitFeedback[] {
  return readStored<FitFeedback[]>(KEY, []);
}

/**
 * Writes go straight to storage, not through a state updater. The form that
 * calls `save` is unmounted by its parent in the same tick, and React never
 * runs the updater of a component it is removing — so a write hidden inside
 * one would silently never happen. `writeStored` broadcasts a storage event
 * and every mounted `useStored(KEY)` re-reads on its own.
 */
export function saveFitFeedback(productId: string, answers: FitFeedback['answers']) {
  const next: FitFeedback[] = [
    ...readFitFeedback().filter(f => f.productId !== productId),
    { productId, answers, createdAt: new Date().toISOString() },
  ];
  writeStored(KEY, next);
}

export function removeFitFeedback(productId: string) {
  writeStored(KEY, readFitFeedback().filter(f => f.productId !== productId));
}

export function useFitFeedback() {
  const [all] = useStored<FitFeedback[]>(KEY, []);

  const forProduct = useCallback(
    (productId: string) => all.find(f => f.productId === productId) ?? null,
    [all],
  );

  return { all, forProduct, save: saveFitFeedback, remove: removeFitFeedback };
}
