import { useCallback, useMemo } from 'react';
import { readStored, useStored } from './wardrobe';
import { classifyShape } from './fit/shape';
import type { BodyInput, BodyMeasurements, BodyShape, ShapeResult } from './fit/types';

/**
 * The user's body profile. Same localStorage pattern as the wardrobe: this is a
 * placeholder for the database, not the destination.
 *
 * Two sources: measured (bust / waist / hips typed in, shape computed by FFIT)
 * or selected (no tape measure — the user picked the closest shape by hand).
 */
export interface MeasuredProfile {
  source: 'measured';
  bust: number;
  waist: number;
  hips: number;
  highHip?: number;
  heightCm?: number;
  updatedAt: string;
}

export interface SelectedProfile {
  source: 'selected';
  shape: BodyShape;
  heightCm?: number;
  updatedAt: string;
}

export type BodyProfile = MeasuredProfile | SelectedProfile;

const KEY = 'paula.bodyProfile';

export function readBodyProfile(): BodyProfile | null {
  return readStored<BodyProfile | null>(KEY, null);
}

export function toMeasurements(p: MeasuredProfile): BodyMeasurements {
  return { bust: p.bust, waist: p.waist, hips: p.hips, highHip: p.highHip, heightCm: p.heightCm, unit: 'cm' };
}

/** What the scorer should be given for this profile. */
export function toBodyInput(p: BodyProfile): BodyInput {
  return p.source === 'measured' ? toMeasurements(p) : { shape: p.shape };
}

export function profileShape(p: BodyProfile | null): ShapeResult | null {
  if (!p) return null;
  if (p.source === 'selected') return { shape: p.shape, merged: false, rule: 'selected', diffs: null };
  return classifyShape(toMeasurements(p));
}

export function useBodyProfile() {
  const [profile, setProfile] = useStored<BodyProfile | null>(KEY, null);
  const shape = useMemo(() => profileShape(profile), [profile]);
  const clear = useCallback(() => setProfile(null), [setProfile]);
  return { profile, setProfile, clear, shape };
}
