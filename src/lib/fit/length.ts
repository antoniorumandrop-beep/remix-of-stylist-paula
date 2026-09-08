import type { LengthClass } from "./attributes";

/**
 * Height is a separate axis from shape: it decides how a length reads, not how
 * a cut fits. Kept out of the Fit Score on purpose — mixing them produces one
 * number nobody can explain.
 */
export type LengthNote = "runsLong" | "runsShort" | "asIntended";

const SHORT_CM = 160;
const TALL_CM = 175;

export function evaluateLength(
  lengthClass: LengthClass | undefined,
  heightCm: number | undefined,
): { note: LengthNote; reason: string } | null {
  if (!lengthClass || !heightCm) return null;

  const long: LengthClass[] = ["midi", "maxi", "full"];
  const short: LengthClass[] = ["mini", "cropped"];

  if (heightCm < SHORT_CM && long.includes(lengthClass)) {
    return { note: "runsLong", reason: `length.${lengthClass}.onShort` };
  }
  if (heightCm > TALL_CM && long.includes(lengthClass)) {
    return { note: "runsShort", reason: `length.${lengthClass}.onTall` };
  }
  if (heightCm > TALL_CM && short.includes(lengthClass)) {
    return { note: "runsShort", reason: `length.${lengthClass}.onTall` };
  }
  return { note: "asIntended", reason: `length.${lengthClass}.asIntended` };
}
