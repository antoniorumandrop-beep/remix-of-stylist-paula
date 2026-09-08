import { describe, expect, it } from "vitest";
import { parseStretch } from "./stretch";

describe("parseStretch", () => {
  it("reads a percentage from a plain composition string", () => {
    const r = parseStretch("95% cotton, 5% elastane");
    expect(r.level).toBe("high");
    expect(r.elastanePercent).toBe(5);
  });

  it("treats 2% elastane as low stretch", () => {
    expect(parseStretch("98% cotton, 2% elastane").level).toBe("low");
  });

  it("reads the structured composition already used by the product data", () => {
    const r = parseStretch([
      { name: "Organic Cotton", percent: 95 },
      { name: "Elastane", percent: 5 },
    ]);
    expect(r.level).toBe("high");
  });

  it("recognises spandex and lycra as well as elastane", () => {
    expect(parseStretch("94% nylon, 6% spandex").level).toBe("high");
    expect(parseStretch("Lycra 8%, polyamide 92%").level).toBe("high");
  });

  it("handles the percentage written after the fibre name", () => {
    expect(parseStretch("cotton 97%, elastane 3%").elastanePercent).toBe(3);
  });

  it("says none when the composition is known and has nothing stretchy", () => {
    const r = parseStretch("100% linen");
    expect(r.level).toBe("none");
    expect(r.confidence).toBeLessThan(1);
  });

  it("gives knits some stretch even with no elastane", () => {
    expect(parseStretch("100% cotton jersey").level).toBe("low");
  });

  it("says unknown rather than guessing when there is no composition", () => {
    expect(parseStretch(null).level).toBe("unknown");
    expect(parseStretch(null).confidence).toBe(0);
    expect(parseStretch("").level).toBe("unknown");
  });
});
