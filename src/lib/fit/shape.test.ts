import { describe, expect, it } from "vitest";
import { classifyShape } from "./shape";

// Measurements are in cm unless stated. FFIT thresholds are in inches, so these
// cases exist partly to prove the conversion is right.
describe("classifyShape (FFIT)", () => {
  it("hourglass: balanced bust and hips, waist much smaller", () => {
    const r = classifyShape({ bust: 95, waist: 70, hips: 97 });
    expect(r.shape).toBe("hourglass");
    expect(r.rule).toBe("ffit.hourglass");
  });

  // Triangle needs hips-waist BELOW 9 inches (22.9 cm). A bigger waist drop
  // makes it a bottom hourglass, which is why these two are easy to confuse.
  it("triangle: hips wider than bust, but only a modest waist difference", () => {
    const r = classifyShape({ bust: 90, waist: 86, hips: 108 });
    expect(r.shape).toBe("triangle");
  });

  it("the same hips with a deeper waist become a bottom hourglass", () => {
    const r = classifyShape({ bust: 90, waist: 74, hips: 108 });
    expect(r.shape).toBe("bottom-hourglass");
  });

  it("inverted triangle: bust clearly wider than hips", () => {
    const r = classifyShape({ bust: 106, waist: 88, hips: 92 });
    expect(r.shape).toBe("inverted-triangle");
  });

  it("rectangle: everything close together", () => {
    const r = classifyShape({ bust: 92, waist: 82, hips: 94 });
    expect(r.shape).toBe("rectangle");
  });

  it("bottom hourglass: wider hips with a strong waist difference", () => {
    const r = classifyShape({ bust: 92, waist: 74, hips: 108 });
    expect(r.shape).toBe("bottom-hourglass");
  });

  it("top hourglass: bust wider than hips with a strong waist difference", () => {
    const r = classifyShape({ bust: 108, waist: 82, hips: 98 });
    expect(r.shape).toBe("top-hourglass");
  });

  // Sokolowski & Bettencourt (2020): the original formulas assumed the waist is
  // always smaller than bust and hips, so plus-size bodies fell through.
  it("diamond: waist wider than both bust and hips", () => {
    const r = classifyShape({ bust: 105, waist: 115, hips: 110 });
    expect(r.shape).toBe("diamond");
  });

  it("oval: waist wider than hips but not than bust", () => {
    const r = classifyShape({ bust: 120, waist: 112, hips: 108 });
    expect(r.shape).toBe("oval");
  });

  it("does not fall back to rectangle when the waist is the widest point", () => {
    const r = classifyShape({ bust: 105, waist: 115, hips: 110 });
    expect(r.shape).not.toBe("rectangle");
  });

  it("merges spoon into bottom-hourglass when highHip is missing", () => {
    const r = classifyShape({ bust: 92, waist: 74, hips: 110 });
    expect(r.shape).toBe("bottom-hourglass");
    expect(r.merged).toBe(true);
  });

  it("separates spoon once highHip is given", () => {
    const r = classifyShape({ bust: 92, waist: 74, hips: 110, highHip: 95 });
    expect(r.shape).toBe("spoon");
    expect(r.merged).toBe(false);
  });

  it("accepts inches and produces the same shape as the cm equivalent", () => {
    const cm = classifyShape({ bust: 95, waist: 70, hips: 97 });
    const inch = classifyShape({
      bust: 95 / 2.54,
      waist: 70 / 2.54,
      hips: 97 / 2.54,
      unit: "in",
    });
    expect(inch.shape).toBe(cm.shape);
  });

  it("reports differences in cm for the explanation", () => {
    const r = classifyShape({ bust: 90, waist: 70, hips: 100 });
    expect(r.diffs!.hipsWaist).toBeCloseTo(30, 1);
    expect(r.diffs!.bustHips).toBeCloseTo(-10, 1);
  });
});
