import { describe, it, expect } from 'vitest';
import {
  CLOTHING_FIELDS,
  hasCoreMeasurements,
  pickClothingMeasurements,
} from './measurements';

/** Odpowiedź w kształcie, w jakim `clad_body.measure.mhr` ją zwraca. */
const CLAD_RESPONSE = {
  height_cm: 164.69,
  bust_cm: 98.26,
  hip_cm: 108.95,
  waist_cm: 84.02,
  stomach_cm: 95.11,
  thigh_cm: 61.79,
  upperarm_cm: 31.65,
  inseam_cm: 71.57,
  shoulder_width_cm: 38.42,
  sleeve_length_cm: 50.98,
  knee_cm: 39.12,
  calf_cm: 37.29,
  wrist_cm: 16.46,
  crotch_length_cm: 72.9,
  front_rise_cm: 37.82,
  back_rise_cm: 35.09,
  shirt_length_cm: 72.0,
};

describe('pickClothingMeasurements', () => {
  it('przepisuje wszystkie wymiary ubraniowe', () => {
    const m = pickClothingMeasurements(CLAD_RESPONSE);
    expect(m.bust).toBe(98.3);
    expect(m.waist).toBe(84);
    expect(m.hips).toBe(109);
    expect(m.heightCm).toBe(164.7);
    expect(Object.keys(m).sort()).toEqual([...CLOTHING_FIELDS].sort());
  });

  it('nie przepuszcza masy, BMI ani tkanki tłuszczowej', () => {
    // Ścieżka MHR ich nie zwraca, ale ścieżka Anny w `clad_body` zwraca je
    // wszystkie trzy. Filtr nie może zależeć od tego, którą stroną przyjdzie
    // odpowiedź — patrz `body-lab/NOTES.md` i zakaz języka wagi w CLAUDE.md.
    const m = pickClothingMeasurements({
      ...CLAD_RESPONSE,
      mass_kg: 62.4,
      bmi: 23.1,
      body_fat_pct: 28.7,
      estimated_density: 1.04,
    });
    const serialised = JSON.stringify(m);
    expect(serialised).not.toContain('62.4');
    expect(serialised).not.toContain('23.1');
    expect(serialised).not.toContain('28.7');
    expect(Object.keys(m).sort()).toEqual([...CLOTHING_FIELDS].sort());
  });

  it('pomija wymiary, których model nie podał', () => {
    const m = pickClothingMeasurements({ bust_cm: 90, waist_cm: 70 });
    expect(m).toEqual({ bust: 90, waist: 70 });
  });

  it('odrzuca liczby, które nie są ciałem dorosłej osoby', () => {
    const m = pickClothingMeasurements({
      bust_cm: 0,
      waist_cm: -5,
      hip_cm: 981,
      thigh_cm: Number.NaN,
      knee_cm: Number.POSITIVE_INFINITY,
      calf_cm: 37,
    });
    expect(m).toEqual({ calf: 37 });
  });

  it('nie przewraca się na śmieciach zamiast obiektu', () => {
    expect(pickClothingMeasurements(null)).toEqual({});
    expect(pickClothingMeasurements('98/74/104')).toEqual({});
    expect(pickClothingMeasurements(42)).toEqual({});
    expect(pickClothingMeasurements(undefined)).toEqual({});
  });

  it('zaokrągla do dziesiątej części centymetra', () => {
    // Model podaje dziesięć miejsc po przecinku. Pokazanie ich sugerowałoby
    // dokładność, której przy błędzie rzędu centymetrów po prostu nie ma.
    expect(pickClothingMeasurements({ waist_cm: 84.023456789 }).waist).toBe(84);
    expect(pickClothingMeasurements({ waist_cm: 84.06 }).waist).toBe(84.1);
  });
});

describe('hasCoreMeasurements', () => {
  it('wymaga trzech obwodów, bo tyle potrzebuje FFIT', () => {
    expect(hasCoreMeasurements({ bust: 90, waist: 70, hips: 100 })).toBe(true);
    expect(hasCoreMeasurements({ bust: 90, waist: 70 })).toBe(false);
    expect(hasCoreMeasurements({ heightCm: 168, thigh: 55 })).toBe(false);
    expect(hasCoreMeasurements({})).toBe(false);
  });
});
