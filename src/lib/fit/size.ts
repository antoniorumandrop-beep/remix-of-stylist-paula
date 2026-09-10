import type { BodyMeasurements, BodyPoint } from './types';

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
function rowFor(point: SizePoint, cm: number): SizeRow {
  let best = SIZE_TABLE[0];
  let bestGap = Math.abs(SIZE_TABLE[0][point] - cm);
  for (const row of SIZE_TABLE) {
    const gap = Math.abs(row[point] - cm);
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
): SizeAdvice | null {
  const wanted = POINTS_BY_CATEGORY[(category ?? '').toLowerCase()];
  if (!wanted) return null;

  const points = wanted
    .filter(point => Number.isFinite(measurements[point]) && measurements[point] > 0)
    .map(point => {
      const row = rowFor(point, measurements[point]);
      return { point, size: row.size, letter: row.letter, slackCm: 0 };
    });

  if (points.length === 0) return null;

  const chosen = points.reduce((max, p) => (p.size > max.size ? p : max), points[0]);
  const row = SIZE_TABLE.find(r => r.size === chosen.size)!;

  for (const p of points) {
    // Room is what the chosen size gives at that point beyond her measurement.
    p.slackCm = Math.round((row[p.point] - measurements[p.point]) * 10) / 10;
  }

  const offered = parseOfferedSizes(offeredText);
  const available = offered
    ? offered.includes(String(row.size)) || offered.includes(row.letter)
    : null;

  return {
    points,
    size: row.size,
    letter: row.letter,
    split: new Set(points.map(p => p.size)).size > 1,
    offered,
    available,
  };
}

export type { BodyPoint };
