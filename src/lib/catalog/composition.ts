import { FIBERS, IRON_ORDER, WASH_ORDER, matchFiber, type FiberId, type IronCare, type WashCare } from './fibers';

export interface CompositionEntry {
  /** null when the fibre is named in a way we do not recognise yet. */
  fiber: FiberId | null;
  /** Exactly as the source wrote it, so an unknown fibre is still shown. */
  label: string;
  /** null when the source gave no percentage for this fibre. */
  percent: number | null;
  /** null when the fibre is unknown — we do not guess. */
  natural: boolean | null;
}

export type CompositionInput =
  | string
  | { name: string; percent: number }[]
  | null
  | undefined;

const PERCENT = /(\d+(?:[.,]\d+)?)\s*%/g;
/** Runs of letters, spaces and hyphens: the fragments that can name a fibre. */
const WORDS = /[\p{L}][\p{L} -]*/gu;

/**
 * Reads a free-text composition into fibres and percentages.
 *
 * Real feeds write it every way there is — "95% cotton, 5% elastane",
 * "Bawełna 95%, Elastan 5%", "70% Linen 30% Cotton" with no separator at all.
 * Rather than guess a separator, we find every percentage and every fibre name
 * with their positions and pair each fibre with the nearest free percentage,
 * preferring one that sits just before it.
 */
export function parseComposition(input: CompositionInput): CompositionEntry[] {
  if (input == null) return [];

  if (Array.isArray(input)) {
    return input.map(part => {
      const fiber = matchFiber(part.name);
      return {
        fiber,
        label: part.name,
        percent: part.percent,
        natural: fiber ? FIBERS[fiber].natural : null,
      };
    });
  }

  const text = input.trim();
  if (!text) return [];

  const percents: { value: number; at: number; taken: boolean }[] = [];
  for (const match of text.matchAll(PERCENT)) {
    percents.push({
      value: parseFloat(match[1].replace(',', '.')),
      at: match.index ?? 0,
      taken: false,
    });
  }

  const found: { fiber: FiberId; label: string; at: number; end: number }[] = [];
  for (const match of text.matchAll(WORDS)) {
    const label = match[0].trim();
    const fiber = matchFiber(label);
    if (!fiber) continue;
    // The same fibre listed twice is a parsing artefact, not two materials.
    if (found.some(f => f.fiber === fiber)) continue;
    const at = match.index ?? 0;
    found.push({ fiber, label, at, end: at + match[0].length });
  }

  if (found.length === 0) return [];

  const entries: CompositionEntry[] = found.map(({ fiber, label, at, end }) => {
    const before = percents
      .filter(p => !p.taken && p.at < at)
      .sort((a, b) => b.at - a.at)[0];
    const after = percents
      .filter(p => !p.taken && p.at >= end)
      .sort((a, b) => a.at - b.at)[0];

    // A percentage before the name wins outright. Distance cannot decide it:
    // in "95% cotton, 5% elastane" the nearest percentage to "cotton" is the
    // 5% that belongs to the elastane. Claiming from the left, in order, keeps
    // both "95% cotton" and "Bawelna 95%" right, because a fibre only ever
    // reaches to the right when nothing is left of it to claim.
    const chosen = before ?? after;
    if (chosen) chosen.taken = true;

    return {
      fiber,
      label,
      percent: chosen ? chosen.value : null,
      natural: FIBERS[fiber].natural,
    };
  });

  // "100% cotton" written as plain "cotton" is still one fibre and all of it.
  if (entries.length === 1 && entries[0].percent === null && percents.length === 0) {
    entries[0].percent = 100;
  }

  return entries;
}

/**
 * Percentages we can add up. Anything that does not roughly sum to a whole
 * garment is refused rather than normalised: a composition we misread should
 * show nothing, not a confident wrong number.
 */
function usablePercents(entries: CompositionEntry[]): { fiber: FiberId; percent: number }[] | null {
  if (entries.length === 0) return null;
  if (entries.some(e => e.fiber === null || e.percent === null)) return null;
  const total = entries.reduce((sum, e) => sum + (e.percent ?? 0), 0);
  if (total < 90 || total > 110) return null;
  return entries.map(e => ({ fiber: e.fiber as FiberId, percent: e.percent as number }));
}

/** Share of plant and animal fibres, 0-100. null when the maths does not hold. */
export function naturalShare(entries: CompositionEntry[]): number | null {
  const usable = usablePercents(entries);
  if (!usable) return null;
  const total = usable.reduce((sum, e) => sum + e.percent, 0);
  const natural = usable
    .filter(e => FIBERS[e.fiber].natural)
    .reduce((sum, e) => sum + e.percent, 0);
  return Math.round((natural / total) * 100);
}

export interface MaterialProfile {
  breathability: number;
  abrasion: number;
  pillingResistance: number;
}

/**
 * Each axis is the fibre property averaged by its share of the composition.
 * A rule simple enough to print on the screen next to the result, which is the
 * whole point: the number it replaces was invented and looked like a
 * measurement.
 *
 * These are properties of fibres, not of this garment. Weave, weight and
 * finish matter just as much and no shop publishes them.
 */
export function materialProfile(entries: CompositionEntry[]): MaterialProfile | null {
  const usable = usablePercents(entries);
  if (!usable) return null;
  const total = usable.reduce((sum, e) => sum + e.percent, 0);
  const weighted = (pick: (f: (typeof FIBERS)[FiberId]) => number) =>
    Math.round(usable.reduce((sum, e) => sum + pick(FIBERS[e.fiber]) * e.percent, 0) / total);

  return {
    breathability: weighted(f => f.breathability),
    abrasion: weighted(f => f.abrasion),
    pillingResistance: weighted(f => f.pillingResistance),
  };
}

export interface CareAdvice {
  wash: WashCare;
  tumbleDry: boolean;
  iron: IronCare;
}

/** The strictest instruction across the fibres present — silk in a blend rules. */
export function careAdvice(entries: CompositionEntry[]): CareAdvice | null {
  const known = entries.filter(e => e.fiber !== null).map(e => FIBERS[e.fiber as FiberId]);
  if (known.length === 0) return null;

  const strictest = <T,>(order: readonly T[], values: T[]): T =>
    order[Math.min(...values.map(v => order.indexOf(v)))];

  return {
    wash: strictest(WASH_ORDER, known.map(f => f.wash)),
    tumbleDry: known.every(f => f.tumbleDry),
    iron: strictest(IRON_ORDER, known.map(f => f.iron)),
  };
}
