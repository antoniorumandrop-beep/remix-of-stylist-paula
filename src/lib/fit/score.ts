import type { FitAttributes } from "./attributes";
import type {
  BodyInput,
  BodyMeasurements,
  BodyPoint,
  FitPointResult,
  FitResult,
  BodyShape,
  Verdict,
} from "./types";
import { classifyShape } from "./shape";

/**
 * Fit Score = risk of the garment not fitting, per body point.
 *
 * Deliberately NOT an aesthetic judgement. The baseline risks below come from
 * Chrimes et al. (2023), who documented that women of the same shape report the
 * same fit problems. That claim is falsifiable and can be checked after purchase
 * by asking "did it fit?" — which is how v2 of this function will be trained.
 */

/**
 * How much each body point can take off the score.
 *
 * Exported because the "how Paula works" screen prints these numbers, and a
 * screen that explains the ranking has to read the ranking rather than repeat
 * it from memory — the explanation is a legal obligation, and a stale one is
 * worse than none.
 */
export const WEIGHTS: Record<BodyPoint, number> = {
  bust: 20,
  waist: 20,
  hips: 25,
  thighs: 15,
  stomach: 20,
};

const POINTS: BodyPoint[] = ["bust", "waist", "hips", "thighs", "stomach"];

/** Documented tension (garment too tight) per shape. */
const TIGHT_BASELINE: Record<BodyShape, Partial<Record<BodyPoint, number>>> = {
  "hourglass": {},
  "bottom-hourglass": { hips: 0.6, thighs: 0.4 },
  "top-hourglass": { bust: 0.6 },
  "spoon": { hips: 0.7, thighs: 0.6 },
  "triangle": { hips: 0.6, thighs: 0.4 },
  "inverted-triangle": { bust: 0.6 },
  "rectangle": { stomach: 0.4 },
  "diamond": { stomach: 0.7, waist: 0.6 },
  "oval": { stomach: 0.6, waist: 0.4 },
};

/** Documented looseness (garment gapes or hangs) per shape. */
const LOOSE_BASELINE: Record<BodyShape, Partial<Record<BodyPoint, number>>> = {
  "hourglass": { waist: 0.5, stomach: 0.3 },
  "bottom-hourglass": { waist: 0.3 },
  "top-hourglass": { hips: 0.3 },
  "spoon": { waist: 0.3 },
  "triangle": { bust: 0.3 },
  "inverted-triangle": { hips: 0.4 },
  "rectangle": {},
  "diamond": {},
  "oval": {},
};

const clamp = (v: number) => Math.max(0, Math.min(1, v));

const isMeasurements = (b: BodyInput): b is BodyMeasurements => "bust" in b;

export function computeFit(attrs: FitAttributes, body: BodyInput): FitResult {
  const shape = isMeasurements(body) ? classifyShape(body).shape : body.shape;

  const stretch = attrs.stretchLevel?.value ?? "unknown";
  const silhouette = attrs.silhouette?.value;
  const waistDef = attrs.waistDefinition?.value;
  const rise = attrs.rise?.value;
  const closure = attrs.closureType?.value;

  const points: FitPointResult[] = POINTS.map((point) => {
    const reasons: string[] = [];
    let tight = TIGHT_BASELINE[shape][point] ?? 0;
    let loose = LOOSE_BASELINE[shape][point] ?? 0;

    if (tight > 0) reasons.push(`shape.${shape}.tight.${point}`);
    if (loose > 0) reasons.push(`shape.${shape}.loose.${point}`);

    // A close cut amplifies every tension the shape already has; a roomy or
    // flared cut relieves it below the waist.
    if (silhouette === "fitted") {
      if (tight > 0) {
        tight += 0.2;
        reasons.push("garment.fitted.amplifies");
      }
      loose = Math.max(0, loose - 0.2);
    }
    if (silhouette === "a-line" || silhouette === "flared") {
      if ((point === "hips" || point === "thighs") && tight > 0) {
        tight -= 0.35;
        reasons.push("garment.flared.relieves");
      }
    }
    if (silhouette === "oversized") {
      tight = Math.max(0, tight - 0.4);
      loose += 0.25;
      if (loose > 0) reasons.push("garment.oversized.loose");
    }
    if (silhouette === "wrap" && point === "waist") {
      loose = Math.max(0, loose - 0.4);
      reasons.push("garment.wrap.definesWaist");
    }
    if (silhouette === "empire" && point === "stomach") {
      tight = Math.max(0, tight - 0.3);
      reasons.push("garment.empire.skimsStomach");
    }

    // A defined waist closes the gap an hourglass gets in straight-cut clothes.
    if ((waistDef === "natural" || waistDef === "high") && point === "waist" && loose > 0) {
      loose -= 0.3;
      reasons.push("garment.definedWaist.closesGap");
    }
    if (waistDef === "elasticated" && (point === "waist" || point === "stomach")) {
      tight = Math.max(0, tight - 0.25);
      reasons.push("garment.elasticated.adapts");
    }
    if (rise === "high" && point === "stomach" && tight > 0) {
      tight -= 0.15;
      reasons.push("garment.highRise.smooths");
    }
    // Buttons across a full bust are the classic failure point.
    if (closure === "buttons" && point === "bust" && tight > 0) {
      tight += 0.2;
      reasons.push("garment.buttons.gape");
    }

    if (stretch === "high") {
      tight = Math.max(0, tight - 0.45);
      if (tight > 0 || reasons.length) reasons.push("fabric.stretch.high");
    } else if (stretch === "low") {
      tight = Math.max(0, tight - 0.2);
      if (tight > 0 || reasons.length) reasons.push("fabric.stretch.low");
    } else if (stretch === "none") {
      if (tight > 0) reasons.push("fabric.stretch.none");
    }

    tight = clamp(tight);
    loose = clamp(loose);

    const knowsGarment = silhouette !== undefined || stretch !== "unknown";
    let verdict: Verdict;
    if (!knowsGarment && tight === 0 && loose === 0) {
      verdict = "unknown";
      reasons.push("data.missingAttributes");
    } else if (tight >= 0.3 && tight >= loose) {
      verdict = "tight";
    } else if (loose >= 0.3) {
      verdict = "loose";
    } else {
      verdict = "neutral";
    }

    return { point, verdict, risk: Math.max(tight, loose), reasons };
  });

  const penalty = points.reduce((sum, p) => sum + p.risk * WEIGHTS[p.point], 0);
  const score = Math.round(100 - penalty);

  // Confidence tracks how much we actually knew about the garment. A score
  // computed from nothing must not look as certain as one computed from a full
  // attribute set.
  const known = [
    attrs.silhouette,
    attrs.stretchLevel,
    attrs.waistDefinition,
    attrs.rise,
    attrs.closureType,
  ].filter(Boolean) as { confidence: number }[];
  const confidence =
    known.length === 0
      ? 0.2
      : Math.min(1, 0.2 + (known.reduce((s, a) => s + a.confidence, 0) / 5) * 0.8);

  return { score, confidence: Math.round(confidence * 100) / 100, shape, points };
}
