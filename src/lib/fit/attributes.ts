import type { StretchLevel } from "./stretch";

/**
 * Fit attribute vocabulary. Closed value lists: no feed provides these, so our
 * enrichment layer produces them and everything downstream depends on the
 * values being fixed.
 */
export const SILHOUETTES = [
  "fitted",
  "straight",
  "a-line",
  "flared",
  "wrap",
  "empire",
  "oversized",
] as const;

export const WAIST_DEFINITIONS = ["none", "natural", "high", "low", "elasticated"] as const;
export const RISES = ["low", "mid", "high"] as const;
export const LENGTH_CLASSES = ["mini", "knee", "midi", "maxi", "cropped", "full"] as const;
export const SLEEVE_LENGTHS = ["sleeveless", "short", "three-quarter", "long"] as const;
export const NECKLINES = ["crew", "v", "square", "scoop", "halter", "boat", "off-shoulder"] as const;
export const CLOSURE_TYPES = ["none", "zip", "buttons", "wrap-tie", "elastic"] as const;

export type Silhouette = (typeof SILHOUETTES)[number];
export type WaistDefinition = (typeof WAIST_DEFINITIONS)[number];
export type Rise = (typeof RISES)[number];
export type LengthClass = (typeof LENGTH_CLASSES)[number];
export type SleeveLength = (typeof SLEEVE_LENGTHS)[number];
export type Neckline = (typeof NECKLINES)[number];
export type ClosureType = (typeof CLOSURE_TYPES)[number];

/**
 * Every enriched attribute carries its own confidence, and may be explicitly
 * "not visible" when it was derived from an image. Missing is a valid state and
 * must never be filled in with a guess.
 */
export interface Attr<T> {
  value: T;
  confidence: number;
  visible?: boolean;
}

export interface FitAttributes {
  silhouette?: Attr<Silhouette>;
  waistDefinition?: Attr<WaistDefinition>;
  rise?: Attr<Rise>;
  lengthClass?: Attr<LengthClass>;
  sleeveLength?: Attr<SleeveLength>;
  neckline?: Attr<Neckline>;
  closureType?: Attr<ClosureType>;
  stretchLevel?: Attr<StretchLevel>;
}
