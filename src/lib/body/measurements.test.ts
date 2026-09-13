import { describe, it, expect } from 'vitest';
import {
  anchorToWaist,
  CLOTHING_FIELDS,
  hasCoreMeasurements,
  pickClothingMeasurements,
} from './measurements';
import { checkPhotoFile } from './photoMeasure';

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

describe('checkPhotoFile', () => {
  const file = (type: string, bytes = 1000) =>
    new File([new Uint8Array(bytes)], 'ja', { type });

  it('przepuszcza formaty, które model czyta', () => {
    expect(checkPhotoFile(file('image/jpeg'))).toBeNull();
    expect(checkPhotoFile(file('image/png'))).toBeNull();
    expect(checkPhotoFile(file('image/webp'))).toBeNull();
  });

  it('odmawia HEIC osobnym komunikatem, nie ogólnym błędem', () => {
    // iPhone zapisuje domyślnie HEIC, a `accept="image/*"` go przepuszcza.
    // Bez tego plik dochodzi do modelu i wraca odmowa, z której nie da się
    // wywnioskować, że wystarczy zmienić format. Wpadliśmy w to przy pierwszym
    // prawdziwym zdjęciu z telefonu (2026-09-13).
    expect(checkPhotoFile(file('image/heic'))).toBe('bad-format');
    expect(checkPhotoFile(file('image/heif'))).toBe('bad-format');
  });

  it('dalej odmawia rzeczy, które obrazem nie są', () => {
    expect(checkPhotoFile(file('application/pdf'))).toBe('bad-file');
    expect(checkPhotoFile(file('image/jpeg', 13_000_000))).toBe('bad-file');
  });
});

describe('anchorToWaist', () => {
  /**
   * Liczby z pomiaru dwóch ciał 2026-09-13. To nie są przykłady wymyślone pod
   * test — to jest ten pomiar, na którym stoi cała ta funkcja, więc gdyby
   * kiedyś przestała go odtwarzać, znaczyłoby to, że przestała robić to, po co
   * powstała.
   */
  it('sprowadza pomiar kobiety do taśmy z dokładnością do 0,2 cm', () => {
    const fromPhoto = { bust: 93.1, waist: 75.6, hips: 105.8, heightCm: 166.2 };
    const anchored = anchorToWaist(fromPhoto, 65);
    expect(anchored.waist).toBe(65);
    expect(anchored.bust).toBeCloseTo(82.5, 1);   // taśma: 82,5
    expect(anchored.hips).toBeCloseTo(95.2, 1);   // taśma: 95,0
  });

  it('sprowadza pomiar drugiego ciała tak samo', () => {
    const fromPhoto = { bust: 106.0, waist: 92.3, hips: 109.2 };
    const anchored = anchorToWaist(fromPhoto, 93);
    expect(anchored.hips).toBeCloseTo(109.9, 1);  // taśma: 110,0
  });

  it('nie rusza wzrostu, bo to nie jest obwód', () => {
    // Model myli się we wzroście inaczej niż w obwodach — na jednym ciele o
    // 7 cm w dół, na drugim o 5 w górę. Wspólne przesunięcie tego nie opisuje.
    const anchored = anchorToWaist({ bust: 93.1, waist: 75.6, heightCm: 166.2 }, 65);
    expect(anchored.heightCm).toBe(166.2);
  });

  it('przesuwa też pozostałe obwody, nie tylko trzy główne', () => {
    const anchored = anchorToWaist({ waist: 75.6, thigh: 59.2, upperArm: 29.5 }, 65);
    expect(anchored.thigh).toBeCloseTo(48.6, 1);
    expect(anchored.upperArm).toBeCloseTo(18.9, 1);
  });

  it('oddaje pomiar bez zmian, gdy nie ma czym kotwiczyć', () => {
    const withoutWaist = { bust: 93.1, hips: 105.8 };
    expect(anchorToWaist(withoutWaist, 65)).toEqual(withoutWaist);
  });
});
