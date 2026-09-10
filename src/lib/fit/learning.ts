import type { Product } from '@/lib/catalog/types';
import type { FitAnswer, FitFeedback } from '@/lib/fitFeedback';
import type { BodyPoint, Verdict } from './types';

/**
 * What Paula learns from the "did it fit?" answers.
 *
 * Until now the loop was write-only: the answers went into storage and nothing
 * ever read them back. A question you ask and then ignore stops being asked —
 * so this module turns the answers into the two things they can honestly
 * support.
 *
 * 1. **Brand memory.** Sizing is a property of a brand's patterns, not of the
 *    body wearing them. If two Reserved dresses pulled at the waist, that is
 *    worth saying on the third one.
 * 2. **A scoreboard.** How often Fit Score agreed with what actually happened.
 *    Nobody publishes this number about their own recommendations; it is the
 *    only thing that makes the score falsifiable rather than decorative.
 *
 * Deliberately NOT here: silently shifting the Fit Score by the brand's lean.
 * Two garments are not a pattern strong enough to move a number the user reads
 * as a measurement, and a correction she cannot see is a correction she cannot
 * argue with. The memory is shown next to the score, in its own words, with
 * the counts printed.
 */

/**
 * How many answers a brand needs at one body point before we call it a lean
 * rather than an anecdote. Two is low, and chosen knowingly: the alternative
 * is a feature that stays silent for the first year of use. The counts are
 * always printed next to the sentence, so a lean built on two garments says
 * so out loud.
 */
export const MIN_ANSWERS = 2;

export interface PointTally {
  point: BodyPoint;
  tight: number;
  ok: number;
  loose: number;
  /** Garments answered at this point. */
  total: number;
  /**
   * The answer holding a strict majority, once `total >= MIN_ANSWERS`.
   * Null when the answers disagree — a tie is not knowledge.
   */
  lean: FitAnswer | null;
}

export interface BrandMemory {
  brand: string;
  /** Distinct garments of this brand that carry at least one answer. */
  garments: number;
  /** Only the points she actually answered, in FEEDBACK_POINTS order. */
  points: PointTally[];
}

/** One answered garment, after the feedback record is joined to the catalogue. */
export interface AnsweredGarment {
  productId: string;
  brand: string;
  answers: Partial<Record<BodyPoint, FitAnswer>>;
}

const POINT_ORDER: BodyPoint[] = ['bust', 'waist', 'hips', 'thighs', 'stomach'];

/**
 * Joins feedback records to the catalogue.
 *
 * A record whose product is no longer in the catalogue is dropped rather than
 * filed under an empty brand: we would be counting garments we can no longer
 * name, and "3 rzeczy" that the user cannot point at is worse than "2".
 */
export function joinFeedback(
  feedback: FitFeedback[],
  byId: Map<string, Product>,
): AnsweredGarment[] {
  const out: AnsweredGarment[] = [];
  for (const record of feedback) {
    const product = byId.get(record.productId);
    if (!product || !product.brand) continue;
    if (Object.keys(record.answers).length === 0) continue;
    out.push({ productId: record.productId, brand: product.brand, answers: record.answers });
  }
  return out;
}

function tally(point: BodyPoint, answers: FitAnswer[]): PointTally {
  const counts = { tight: 0, ok: 0, loose: 0 };
  for (const a of answers) counts[a] += 1;
  const total = answers.length;

  let lean: FitAnswer | null = null;
  if (total >= MIN_ANSWERS) {
    for (const answer of ['tight', 'ok', 'loose'] as FitAnswer[]) {
      // Strict majority: 2 of 3 leans, 1 of 2 does not, 2 of 4 does not.
      if (counts[answer] * 2 > total) lean = answer;
    }
  }

  return { point, ...counts, total, lean };
}

/** Brands with at least one answered garment, most-answered first. */
export function brandMemory(garments: AnsweredGarment[]): BrandMemory[] {
  const byBrand = new Map<string, AnsweredGarment[]>();
  for (const g of garments) {
    const list = byBrand.get(g.brand);
    if (list) list.push(g);
    else byBrand.set(g.brand, [g]);
  }

  const out: BrandMemory[] = [];
  for (const [brand, list] of byBrand) {
    const points: PointTally[] = [];
    for (const point of POINT_ORDER) {
      const answers = list.map(g => g.answers[point]).filter(Boolean) as FitAnswer[];
      if (answers.length > 0) points.push(tally(point, answers));
    }
    out.push({ brand, garments: list.length, points });
  }

  return out.sort((a, b) => b.garments - a.garments || a.brand.localeCompare(b.brand));
}

/**
 * Picks one brand out of an already-computed list.
 *
 * Split out because the hook needs the whole list *and* one entry from it, and
 * writing the lookup twice meant a mutation to this rule left the component
 * test green — the component was matching through its own copy of the same
 * line. One rule, one place, both callers.
 */
export function pickBrand(memories: BrandMemory[], brand: string): BrandMemory | null {
  return memories.find(m => m.brand === brand) ?? null;
}

/** The memory for one brand, or null when we have never heard about it. */
export function memoryForBrand(garments: AnsweredGarment[], brand: string): BrandMemory | null {
  return pickBrand(brandMemory(garments), brand);
}

// ---------------------------------------------------------------- scoreboard

/**
 * Did the prediction agree with what happened?
 *
 * `unknown` is not a wrong answer — it is the scorer saying it had no data,
 * and counting it as a miss would punish honesty about missing attributes and
 * make the scoreboard look worse the more often Paula admits she cannot tell.
 * Callers must skip it; `countable` is the guard.
 */
export function predictionMatches(verdict: Verdict, answer: FitAnswer): boolean {
  if (verdict === 'tight') return answer === 'tight';
  if (verdict === 'loose') return answer === 'loose';
  if (verdict === 'neutral') return answer === 'ok';
  return false;
}

export const countable = (verdict: Verdict) => verdict !== 'unknown';

export interface PointAccuracy {
  point: BodyPoint;
  hits: number;
  total: number;
}

export interface Accuracy {
  hits: number;
  /** Predictions that were actually made — `unknown` verdicts are excluded. */
  total: number;
  points: PointAccuracy[];
}

/** One garment: what Paula predicted per point, and what the user answered. */
export interface ScoredGarment {
  verdicts: Partial<Record<BodyPoint, Verdict>>;
  answers: Partial<Record<BodyPoint, FitAnswer>>;
}

export function accuracy(garments: ScoredGarment[]): Accuracy {
  const perPoint = new Map<BodyPoint, PointAccuracy>();
  let hits = 0;
  let total = 0;

  for (const g of garments) {
    for (const point of POINT_ORDER) {
      const verdict = g.verdicts[point];
      const answer = g.answers[point];
      if (!verdict || !answer || !countable(verdict)) continue;

      const entry = perPoint.get(point) ?? { point, hits: 0, total: 0 };
      entry.total += 1;
      total += 1;
      if (predictionMatches(verdict, answer)) {
        entry.hits += 1;
        hits += 1;
      }
      perPoint.set(point, entry);
    }
  }

  return {
    hits,
    total,
    points: POINT_ORDER.map(p => perPoint.get(p)).filter(Boolean) as PointAccuracy[],
  };
}
