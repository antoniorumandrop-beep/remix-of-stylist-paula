import { parseComposition, type CompositionInput } from '@/lib/catalog/composition';

export type StretchLevel = "unknown" | "none" | "low" | "high";

export interface StretchResult {
  level: StretchLevel;
  /** 0-1. How much the scoring engine should trust this value. */
  confidence: number;
  elastanePercent: number | null;
}

const KNIT = /(knit|jersey|rib(bed)?|dzianina|prazkowan)/i;

/**
 * Derives stretch from the material composition. No AI: the composition string
 * is the one field feeds reliably carry, and stretch is the single attribute
 * that decides whether a 5 cm difference is a problem or not.
 *
 * Accepts either the raw string ("95% cotton, 5% elastane") or the structured
 * composition already present in the product data. The reading of the string
 * itself lives in `catalog/composition.ts`, so the panel on the product page
 * and the scoring engine cannot drift apart over what a composition says.
 */
export function parseStretch(composition: CompositionInput): StretchResult {
  if (composition == null) {
    return { level: "unknown", confidence: 0, elastanePercent: null };
  }

  const text = Array.isArray(composition)
    ? composition.map((c) => `${c.percent}% ${c.name}`).join(", ")
    : composition;

  if (!text.trim()) {
    return { level: "unknown", confidence: 0, elastanePercent: null };
  }

  const elastic = parseComposition(composition).find((entry) => entry.fiber === "elastane");
  const percent = elastic?.percent ?? null;

  if (elastic && percent !== null) {
    return {
      level: percent >= 4 ? "high" : percent >= 1 ? "low" : "none",
      confidence: 0.9,
      elastanePercent: percent,
    };
  }

  if (elastic) {
    // Named but without a percentage — it stretches, we just don't know how much.
    return { level: "low", confidence: 0.5, elastanePercent: null };
  }

  if (KNIT.test(text)) {
    // Knits stretch mechanically even with no elastane.
    return { level: "low", confidence: 0.5, elastanePercent: null };
  }

  // Composition is known and contains nothing stretchy. Not 1.0: weave and cut
  // still give a little give.
  return { level: "none", confidence: 0.8, elastanePercent: null };
}
