export type StretchLevel = "unknown" | "none" | "low" | "high";

export interface StretchResult {
  level: StretchLevel;
  /** 0-1. How much the scoring engine should trust this value. */
  confidence: number;
  elastanePercent: number | null;
}

const ELASTIC = /(elastane?|elastan|spandex|lycra|elasthan)/i;
const KNIT = /(knit|jersey|rib(bed)?|dzianina|prazkowan)/i;

/**
 * Derives stretch from the material composition. No AI: the composition string
 * is the one field feeds reliably carry, and stretch is the single attribute
 * that decides whether a 5 cm difference is a problem or not.
 *
 * Accepts either the raw string ("95% cotton, 5% elastane") or the structured
 * composition already present in the product data.
 */
export function parseStretch(
  composition: string | { name: string; percent: number }[] | null | undefined,
): StretchResult {
  if (composition == null) {
    return { level: "unknown", confidence: 0, elastanePercent: null };
  }

  const text = Array.isArray(composition)
    ? composition.map((c) => `${c.percent}% ${c.name}`).join(", ")
    : composition;

  if (!text.trim()) {
    return { level: "unknown", confidence: 0, elastanePercent: null };
  }

  let percent: number | null = null;
  if (Array.isArray(composition)) {
    const hit = composition.find((c) => ELASTIC.test(c.name));
    percent = hit ? hit.percent : null;
  } else {
    // "5% elastane" and "elastane 5%" both occur in real feeds.
    const before = text.match(/(\d+(?:[.,]\d+)?)\s*%\s*[^,;]*?(?:elastane?|elastan|spandex|lycra|elasthan)/i);
    const after = text.match(/(?:elastane?|elastan|spandex|lycra|elasthan)[^,;]*?(\d+(?:[.,]\d+)?)\s*%/i);
    const raw = before?.[1] ?? after?.[1];
    percent = raw === undefined ? null : parseFloat(raw.replace(",", "."));
  }

  if (percent !== null) {
    return {
      level: percent >= 4 ? "high" : percent >= 1 ? "low" : "none",
      confidence: 0.9,
      elastanePercent: percent,
    };
  }

  if (ELASTIC.test(text)) {
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
