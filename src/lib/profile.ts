import { useCallback, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { backend, qk } from '@/lib/backend';
import { classifyShape } from './fit/shape';
import type { BodyInput, BodyMeasurements, BodyShape, ShapeResult } from './fit/types';

/**
 * The user's body profile.
 *
 * Two sources: measured (bust / waist / hips typed in, shape computed by FFIT)
 * or selected (no tape measure — the user picked the closest shape by hand).
 *
 * Storage goes through `backend.profile`; this file only knows the shape of
 * the data and how to read it.
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
  const query = useQuery({ queryKey: qk.profile, queryFn: () => backend.profile.get() });
  const setMutation = useMutation({ mutationFn: (p: BodyProfile) => backend.profile.set(p) });
  const clearMutation = useMutation({ mutationFn: () => backend.profile.clear() });

  const profile = query.data ?? null;
  const shape = useMemo(() => profileShape(profile), [profile]);
  const setProfile = useCallback((p: BodyProfile) => setMutation.mutateAsync(p), [setMutation.mutateAsync]);
  const clear = useCallback(() => clearMutation.mutateAsync(), [clearMutation.mutateAsync]);

  return { profile, shape, loading: query.isPending, setProfile, clear };
}
