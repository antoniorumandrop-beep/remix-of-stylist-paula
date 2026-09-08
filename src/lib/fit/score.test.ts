import { describe, expect, it } from "vitest";
import { computeFit } from "./score";
import type { FitAttributes } from "./attributes";

// FFIT triangle: hips wider than bust, modest waist difference.
const triangle = { bust: 90, waist: 86, hips: 108 };
const hourglass = { bust: 95, waist: 70, hips: 97 };

const attr = <T,>(value: T, confidence = 0.9) => ({ value, confidence });

describe("computeFit", () => {
  it("flags hips as tight for a triangle in a fitted, non-stretch garment", () => {
    const a: FitAttributes = {
      silhouette: attr("fitted" as const),
      stretchLevel: attr("none" as const),
    };
    const r = computeFit(a, triangle);
    const hips = r.points.find((p) => p.point === "hips")!;
    expect(hips.verdict).toBe("tight");
    expect(r.score).toBeLessThan(75);
  });

  it("scores the same body higher in an A-line cut", () => {
    const fitted = computeFit(
      { silhouette: attr("fitted" as const), stretchLevel: attr("none" as const) },
      triangle,
    );
    const aline = computeFit(
      { silhouette: attr("a-line" as const), stretchLevel: attr("none" as const) },
      triangle,
    );
    expect(aline.score).toBeGreaterThan(fitted.score);
  });

  it("lets stretch rescue a tight cut", () => {
    const stiff = computeFit(
      { silhouette: attr("fitted" as const), stretchLevel: attr("none" as const) },
      triangle,
    );
    const stretchy = computeFit(
      { silhouette: attr("fitted" as const), stretchLevel: attr("high" as const) },
      triangle,
    );
    expect(stretchy.score).toBeGreaterThan(stiff.score);
  });

  it("flags the waist gap an hourglass gets in a straight cut", () => {
    const r = computeFit(
      { silhouette: attr("straight" as const), stretchLevel: attr("none" as const) },
      hourglass,
    );
    expect(r.points.find((p) => p.point === "waist")!.verdict).toBe("loose");
  });

  it("closes that gap when the garment defines the waist", () => {
    const r = computeFit(
      {
        silhouette: attr("straight" as const),
        waistDefinition: attr("natural" as const),
        stretchLevel: attr("none" as const),
      },
      hourglass,
    );
    expect(r.points.find((p) => p.point === "waist")!.verdict).not.toBe("loose");
  });

  it("says unknown instead of inventing confidence when nothing is known", () => {
    const r = computeFit({}, hourglass);
    const bust = r.points.find((p) => p.point === "bust")!;
    expect(bust.verdict).toBe("unknown");
    expect(bust.reasons).toContain("data.missingAttributes");
    expect(r.confidence).toBeLessThanOrEqual(0.2);
  });

  it("reports higher confidence as more attributes arrive", () => {
    const thin = computeFit({ silhouette: attr("fitted" as const) }, triangle);
    const rich = computeFit(
      {
        silhouette: attr("fitted" as const),
        stretchLevel: attr("high" as const),
        waistDefinition: attr("natural" as const),
        rise: attr("high" as const),
        closureType: attr("zip" as const),
      },
      triangle,
    );
    expect(rich.confidence).toBeGreaterThan(thin.confidence);
  });

  it("every reason is a stable code, never user-facing prose", () => {
    const r = computeFit(
      { silhouette: attr("fitted" as const), stretchLevel: attr("none" as const) },
      triangle,
    );
    for (const p of r.points) {
      for (const reason of p.reasons) {
        expect(reason).toMatch(/^[a-zA-Z]+(\.[a-zA-Z-]+)+$/);
      }
    }
  });

  it("keeps the score inside 0-100", () => {
    const r = computeFit(
      { silhouette: attr("fitted" as const), stretchLevel: attr("none" as const) },
      { bust: 105, waist: 115, hips: 110 },
    );
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
