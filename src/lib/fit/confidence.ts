/**
 * When a Fit Score is too thinly sourced to be shown as a plain number.
 *
 * `computeFit` already knows how much it knew: `confidence` rises with the
 * number of garment attributes it had to work with. What the interface did
 * with that was nothing — `FitBadge` took only the score, so "fit 92%" read
 * from a full attribute set and "fit 92%" read from one word in the product
 * name were pixel-identical in a list.
 *
 * That is the `qualityScore` mistake wearing a different hat: a number with a
 * progress bar reads as a measurement. The difference is that this number is
 * real — it is the certainty behind it that varies — so the fix is to show the
 * uncertainty, not to hide the number.
 *
 * The threshold lives here rather than in either screen because both have to
 * agree: a badge that says "about" next to prose that says nothing is worse
 * than neither.
 */
export const LOW_CONFIDENCE = 0.6;

export function isLowConfidence(confidence: number): boolean {
  return confidence < LOW_CONFIDENCE;
}
