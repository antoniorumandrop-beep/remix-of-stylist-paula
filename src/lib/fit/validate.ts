/**
 * Sanity checks on typed measurements.
 *
 * Nothing stopped a slipped digit. A waist of 5 cm or a bust of 900 cm went
 * straight into FFIT, which classified it without complaint, and Fit Score
 * then reported a confident number derived from nonsense. That breaks the rule
 * the rest of the product follows: never present something invented as a
 * finding. It also quietly poisons the "did it fit?" dataset, which is the
 * material for Fit Score v2.
 *
 * The bounds are deliberately **very** wide. A narrow range would tell real
 * women their bodies are wrong, which is the exact harm this product exists to
 * avoid — so these only catch what is almost certainly a typo. The check warns
 * and never blocks: we do not know every body, and she is the one holding the
 * tape.
 */

export type MeasurementField = 'bust' | 'waist' | 'hips' | 'highHip' | 'height';

export type MeasurementIssue = 'maybe-inches' | 'too-small' | 'too-large';

/** Generous outer bounds in centimetres, past which a value is a typo. */
const BOUNDS: Record<MeasurementField, { min: number; max: number }> = {
  bust: { min: 50, max: 200 },
  waist: { min: 40, max: 200 },
  hips: { min: 50, max: 220 },
  highHip: { min: 40, max: 200 },
  height: { min: 120, max: 220 },
};

/**
 * A circumference typed in inches lands in a narrow, recognisable band: 24–55
 * covers essentially every adult measurement in inches while sitting far below
 * any plausible centimetre value. Worth naming, because the tape a person owns
 * may well be imperial on one side.
 */
const INCHES_BAND = { min: 24, max: 55 };

export function checkMeasurement(field: MeasurementField, value: number): MeasurementIssue | null {
  if (!Number.isFinite(value) || value <= 0) return null; // "not filled in yet" is not an error.

  const bounds = BOUNDS[field];
  if (field !== 'height' && value >= INCHES_BAND.min && value <= INCHES_BAND.max && value < bounds.min) {
    return 'maybe-inches';
  }
  if (value < bounds.min) return 'too-small';
  if (value > bounds.max) return 'too-large';
  return null;
}

/** Centimetres for a value that was probably typed in inches. */
export function inchesToCm(value: number): number {
  return Math.round(value * 2.54);
}
