export type Unit = "cm" | "in";

export interface BodyMeasurements {
  bust: number;
  waist: number;
  hips: number;
  /**
   * Upper hip, roughly 7-10 cm below the waist. Optional: FFIT needs it only to
   * tell Spoon from Bottom Hourglass. Without it those two are merged.
   */
  highHip?: number;
  heightCm?: number;
  /** Unit of bust/waist/hips/highHip. Defaults to cm. */
  unit?: Unit;
}

export type BodyShape =
  | "hourglass"
  | "bottom-hourglass"
  | "top-hourglass"
  | "spoon"
  | "triangle"
  | "inverted-triangle"
  | "rectangle"
  | "diamond"
  | "oval";

export interface ShapeResult {
  shape: BodyShape;
  /** True when highHip was missing, so spoon and bottom-hourglass were merged. */
  merged: boolean;
  /** Id of the FFIT rule that fired. Stable, for UI copy and for audit. */
  rule: string;
  /**
   * Differences in cm, so the UI can explain the result with real numbers.
   * Null when the shape was picked by hand rather than measured.
   */
  diffs: { bustHips: number; bustWaist: number; hipsWaist: number } | null;
}

/** What the scorer needs to know about the body: measurements, or a shape the user picked. */
export type BodyInput = BodyMeasurements | { shape: BodyShape };

export type BodyPoint = "bust" | "waist" | "hips" | "thighs" | "stomach";

export type Verdict = "tight" | "loose" | "neutral" | "unknown";

export interface FitPointResult {
  point: BodyPoint;
  verdict: Verdict;
  /** 0 = no risk, 1 = certain problem. */
  risk: number;
  /** Stable reason codes. Never user-facing English — the UI translates them. */
  reasons: string[];
}

export interface FitResult {
  score: number;
  /** 0-1. Drops when the garment is missing the attributes we need. */
  confidence: number;
  shape: BodyShape;
  points: FitPointResult[];
}
