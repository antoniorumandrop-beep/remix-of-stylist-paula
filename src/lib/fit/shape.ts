import type { BodyMeasurements, ShapeResult, Unit } from "./types";

/**
 * FFIT — Female Figure Identification Technique.
 * Original: Lee, Istook, Nam & Park (2007). Plus-size modification:
 * Sokolowski & Bettencourt (2020), which adds Diamond and Oval and guards the
 * original rules against a waist larger than bust or hips.
 *
 * All thresholds below are in INCHES, exactly as published. Input is converted
 * rather than the thresholds, so the numbers stay checkable against the paper.
 */

const CM_PER_IN = 2.54;
const SPOON_RATIO = 1.193;

const toIn = (v: number, unit: Unit) => (unit === "in" ? v : v / CM_PER_IN);
const round1 = (v: number) => Math.round(v * 10) / 10;

export function classifyShape(m: BodyMeasurements): ShapeResult {
  const unit = m.unit ?? "cm";
  const bust = toIn(m.bust, unit);
  const waist = toIn(m.waist, unit);
  const hips = toIn(m.hips, unit);
  const highHip = m.highHip === undefined ? undefined : toIn(m.highHip, unit);

  const bustHips = bust - hips;
  const hipsBust = hips - bust;
  const bustWaist = bust - waist;
  const hipsWaist = hips - waist;

  const diffs = {
    bustHips: round1((bust - hips) * CM_PER_IN),
    bustWaist: round1((bust - waist) * CM_PER_IN),
    hipsWaist: round1((hips - waist) * CM_PER_IN),
  };

  // Without highHip the spoon test cannot run, so spoon collapses into
  // bottom-hourglass. Flagged so the UI can offer "measure your upper hip for a
  // more precise result".
  const merged = highHip === undefined;
  const highHipRatio = highHip === undefined ? undefined : highHip / waist;

  const done = (shape: ShapeResult["shape"], rule: string): ShapeResult => ({
    shape,
    merged: merged && (shape === "bottom-hourglass" || shape === "spoon"),
    rule,
    diffs,
  });

  if (bustHips <= 1 && hipsBust < 3.6 && (bustWaist >= 9 || hipsWaist >= 10)) {
    return done("hourglass", "ffit.hourglass");
  }

  if (
    hipsBust >= 3.6 &&
    hipsBust < 10 &&
    hipsWaist >= 9 &&
    (highHipRatio === undefined || highHipRatio < SPOON_RATIO)
  ) {
    return done("bottom-hourglass", "ffit.bottomHourglass");
  }

  if (bustHips > 1 && bustHips < 10 && bustWaist >= 9) {
    return done("top-hourglass", "ffit.topHourglass");
  }

  if (
    highHipRatio !== undefined &&
    hipsBust > 2 &&
    hipsWaist >= 7 &&
    highHipRatio >= SPOON_RATIO
  ) {
    return done("spoon", "ffit.spoon");
  }

  // Sokolowski guard: the original rule assumed waist < hips.
  if (hipsBust >= 3.6 && hipsWaist >= 0 && hipsWaist < 9) {
    return done("triangle", "ffit.triangle");
  }

  if (bustHips >= 3.6 && bustWaist < 9 && hipsWaist >= 0) {
    return done("inverted-triangle", "ffit.invertedTriangle");
  }

  // Diamond and Oval must be tested before Rectangle: a waist wider than the
  // hips satisfies Rectangle's upper bounds by accident.
  if (hipsWaist < 0 && bustWaist < 0) {
    return done("diamond", "ffit.diamond");
  }

  if (hipsWaist < 0 && bustWaist >= 0) {
    return done("oval", "ffit.oval");
  }

  return done("rectangle", "ffit.rectangle");
}
