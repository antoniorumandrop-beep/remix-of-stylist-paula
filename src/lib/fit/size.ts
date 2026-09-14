import type { BodyMeasurements, BodyPoint, FitResult } from './types';
import type { SizeChartRow } from '@/lib/catalog/shopJson';

/**
 * Which size to order.
 *
 * Fit Score says **where** a garment is likely to pull. It never said **what
 * size to buy**, which is the question a woman actually has standing in front
 * of a product page — and the one behind 42% of returns in Gabriela's study of
 * 185 Polish women.
 *
 * The answer is not one number, and that is the whole point. The same study
 * found **90.84% of women take a different size in different parts of the
 * body**. So this returns a size per body point and then one to order, with
 * the difference stated in centimetres rather than hidden.
 *
 * Descriptive only, per the language rules: "about 4 cm of room at the waist",
 * never a judgement about the body it belongs to.
 */

/**
 * Polish women's clothing sizes. Every size covers a 4 cm band, which is the
 * grading step Polish retail uses; the numbers are the middle of each band.
 *
 * Printed here rather than computed from a formula so it can be shown to the
 * user and checked against a brand's own chart line by line.
 */
export interface SizeRow {
  size: number;
  /** The letter most Polish shops print next to it (H&M, Reserved, Sinsay…). */
  letter: string;
  bust: number;
  waist: number;
  hips: number;
}

export const SIZE_TABLE: SizeRow[] = [
  { size: 32, letter: 'XXS', bust: 78, waist: 62, hips: 86 },
  { size: 34, letter: 'XS', bust: 82, waist: 66, hips: 90 },
  { size: 36, letter: 'S', bust: 86, waist: 70, hips: 94 },
  { size: 38, letter: 'M', bust: 90, waist: 74, hips: 98 },
  { size: 40, letter: 'L', bust: 94, waist: 78, hips: 102 },
  { size: 42, letter: 'XL', bust: 98, waist: 82, hips: 106 },
  { size: 44, letter: 'XXL', bust: 102, waist: 86, hips: 110 },
  { size: 46, letter: '3XL', bust: 107, waist: 91, hips: 115 },
  { size: 48, letter: '4XL', bust: 112, waist: 96, hips: 120 },
  { size: 50, letter: '5XL', bust: 117, waist: 101, hips: 125 },
];

/** Which measurements decide the size, per category. */
const POINTS_BY_CATEGORY: Record<string, ('bust' | 'waist' | 'hips')[]> = {
  dresses: ['bust', 'waist', 'hips'],
  outerwear: ['bust', 'waist'],
  tops: ['bust', 'waist'],
  skirts: ['waist', 'hips'],
  bottoms: ['waist', 'hips'],
};

export type SizePoint = 'bust' | 'waist' | 'hips';

export interface PointSize {
  point: SizePoint;
  size: number;
  letter: string;
  /** Centimetres of room (positive) or shortfall (negative) at the ordered size. */
  slackCm: number;
}

export interface SizeAdvice {
  /** The size each measurement would take on its own. */
  points: PointSize[];
  size: number;
  letter: string;
  /** What the shop calls this size: "XXL", "38". Prefer it when printing. */
  label: string;
  /** Whether the advice came from this garment's own chart or our generic one. */
  fromBrandChart: boolean;
  /**
   * True when the three points disagree — the case that makes a single size
   * label wrong for most women, and the reason this is worth saying out loud.
   */
  split: boolean;
  /** Sizes the shop publishes, when it publishes any. */
  offered: string[] | null;
  /** Whether the recommended size is among them. Null when we do not know. */
  available: boolean | null;
}

/** The row whose band contains the measurement, clamped to the ends of the table. */
/** A chart row from either source: the brand's labels, or ours. */
interface ChartRow {
  label: string;
  letter?: string;
  size?: number;
  bust?: number;
  waist?: number;
  hips?: number;
}

function rowFor(rows: ChartRow[], point: SizePoint, cm: number): ChartRow {
  const usable = rows.filter(row => Number.isFinite(row[point]));
  let best = usable[0];
  let bestGap = Math.abs((usable[0][point] as number) - cm);
  for (const row of usable) {
    const gap = Math.abs((row[point] as number) - cm);
    // `<=`, so a measurement sitting exactly between two sizes takes the
    // larger. Same reasoning as picking the largest point: a garment with a
    // little room is worn, one that does not close is returned.
    if (gap <= bestGap) {
      best = row;
      bestGap = gap;
    }
  }
  return best;
}

/**
 * Reads whatever the shop wrote in its size field.
 *
 * Feeds publish this as free text and every shop does it differently:
 * "34-42", "XS, S, M", "S-XL", "36 38 40". Returns the labels as written,
 * because that is what she will see in the shop's own dropdown.
 */
export function parseOfferedSizes(text: string | undefined): string[] | null {
  if (!text?.trim()) return null;
  const raw = text.toUpperCase();

  const numericRange = raw.match(/(\d{2})\s*[-–—]\s*(\d{2})/);
  if (numericRange) {
    const from = Number(numericRange[1]);
    const to = Number(numericRange[2]);
    if (from < to && to - from <= 24) {
      return SIZE_TABLE.filter(r => r.size >= from && r.size <= to).map(r => String(r.size));
    }
  }

  const letters = SIZE_TABLE.map(r => r.letter);
  const letterRange = raw.match(/\b(X{0,2}S|M|X{0,3}L)\s*[-–—]\s*(X{0,2}S|M|X{0,3}L)\b/);
  if (letterRange) {
    const from = letters.indexOf(letterRange[1]);
    const to = letters.indexOf(letterRange[2]);
    if (from !== -1 && to !== -1 && from < to) return letters.slice(from, to + 1);
  }

  const listed = raw
    .split(/[,;/|\s]+/)
    .map(part => part.trim())
    .filter(part => /^\d{2}$/.test(part) || letters.includes(part));
  return listed.length > 0 ? [...new Set(listed)] : null;
}

/**
 * The size to order, and what it costs at each point.
 *
 * The recommendation is the **largest** of the relevant points. Not a
 * compromise and not an average: a seam can be taken in, it cannot be let out,
 * and a garment that does not close is returned while one with room is worn.
 */
export function recommendSize(
  measurements: Pick<BodyMeasurements, 'bust' | 'waist' | 'hips'>,
  category: string | undefined,
  offeredText?: string,
  brandChart?: SizeChartRow[],
): SizeAdvice | null {
  const wanted = POINTS_BY_CATEGORY[(category ?? '').toLowerCase()];
  if (!wanted) return null;

  const measured = wanted.filter(
    point => Number.isFinite(measurements[point]) && measurements[point] > 0,
  );
  if (measured.length === 0) return null;

  /**
   * The brand's own chart when it covers any of the points this category is
   * decided by, ours otherwise.
   *
   * Partial coverage is normal and deliberate: a skirt chart carries hips
   * alone, because that is what a skirt is sized by. We use what the shop
   * published and do not invent the rest — a bust measurement derived from a
   * hip table would be a number with no source.
   */
  const chartPoints = brandChart
    ? measured.filter(point => brandChart.some(row => Number.isFinite(row[point])))
    : [];
  const useBrand = chartPoints.length > 0;
  const rows: ChartRow[] = useBrand
    ? brandChart!.map(row => ({ label: row.size, bust: row.bust, waist: row.waist, hips: row.hips }))
    : SIZE_TABLE.map(row => ({
        label: String(row.size),
        letter: row.letter,
        size: row.size,
        bust: row.bust,
        waist: row.waist,
        hips: row.hips,
      }));
  const usedPoints = useBrand ? chartPoints : measured;

  const picks = usedPoints.map(point => ({ point, row: rowFor(rows, point, measurements[point]) }));
  if (picks.length === 0) return null;

  // The largest of the points, by position in the chart — the chart is printed
  // small to large, and a label like "XXL" has no arithmetic of its own.
  const chosen = picks.reduce(
    (max, p) => (rows.indexOf(p.row) > rows.indexOf(max.row) ? p : max),
    picks[0],
  ).row;

  const points: PointSize[] = picks.map(({ point, row }) => ({
    point,
    size: row.size ?? 0,
    letter: row.letter ?? row.label,
    // Room is what the chosen size gives at that point beyond her measurement.
    slackCm: Math.round(((chosen[point] ?? measurements[point]) - measurements[point]) * 10) / 10,
  }));

  const offered = parseOfferedSizes(offeredText);
  const available = offered
    ? offered.includes(chosen.label) || (chosen.letter !== undefined && offered.includes(chosen.letter))
    : null;

  return {
    points,
    size: chosen.size ?? 0,
    letter: chosen.letter ?? chosen.label,
    label: chosen.label,
    fromBrandChart: useBrand,
    split: new Set(picks.map(p => p.row.label)).size > 1,
    offered,
    available,
  };
}

/**
 * Whether the ordered size falls short at this body point.
 *
 * Below a centimetre it is rounding, not something worth telling her. Exported
 * because the size panel and the fit breakdown have to agree: the bug this
 * fixes was one of them printing "should sit as it should" at the waist while
 * the other, on the same screen, counted 2 cm missing at the same waist.
 */
export const shortAt = (point: PointSize) => point.slackCm < -1;

/**
 * Let the tape measure overrule the cut.
 *
 * `computeFit` reads the garment — silhouette, stretch, rise — and guesses
 * where it will pull. That guess has nothing to say about grading, so when a
 * brand simply stops cutting before a woman's measurement, the breakdown went
 * on calling the point "should sit as it should". A shop's own chart makes
 * that case real for the first time: the generic table runs to size 50, so
 * something always fitted.
 *
 * A shortfall in centimetres beats a guess from a product description, so the
 * point becomes `tight` and carries a reason saying by how much. The score is
 * deliberately left alone — it answers a different question ("does this cut
 * suit your proportions") and changing it here would move every badge in the
 * app without anyone deciding to.
 */
export function withSizeLimits(fit: FitResult, advice: SizeAdvice | null): FitResult {
  const short = new Map((advice?.points ?? []).filter(shortAt).map(p => [p.point as string, p]));
  if (short.size === 0) return fit;
  return {
    ...fit,
    points: fit.points.map(point => {
      const missing = short.get(point.point);
      if (!missing) return point;
      return {
        ...point,
        verdict: 'tight',
        reasons: [...point.reasons, `size.short.${Math.abs(missing.slackCm)}`],
      };
    }),
  };
}

export type { BodyPoint };
