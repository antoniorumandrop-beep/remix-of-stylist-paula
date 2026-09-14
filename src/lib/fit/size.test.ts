import { describe, it, expect } from 'vitest';
import { parseOfferedSizes, recommendSize, shortAt, withSizeLimits, SIZE_TABLE } from './size';
import type { FitResult } from './types';

describe('tabela rozmiarów', () => {
  it('rośnie co 4 cm i nigdzie się nie cofa', () => {
    for (let i = 1; i < SIZE_TABLE.length; i++) {
      expect(SIZE_TABLE[i].size).toBeGreaterThan(SIZE_TABLE[i - 1].size);
      expect(SIZE_TABLE[i].bust).toBeGreaterThan(SIZE_TABLE[i - 1].bust);
      expect(SIZE_TABLE[i].waist).toBeGreaterThan(SIZE_TABLE[i - 1].waist);
      expect(SIZE_TABLE[i].hips).toBeGreaterThan(SIZE_TABLE[i - 1].hips);
    }
  });
});

describe('rozmiary, które sklep podaje', () => {
  it('rozwija zakres liczbowy', () => {
    expect(parseOfferedSizes('34-42')).toEqual(['34', '36', '38', '40', '42']);
  });

  it('rozwija zakres literowy', () => {
    expect(parseOfferedSizes('S-XL')).toEqual(['S', 'M', 'L', 'XL']);
  });

  it('czyta wyliczenie w każdym zapisie, jaki spotykamy', () => {
    expect(parseOfferedSizes('XS, S, M')).toEqual(['XS', 'S', 'M']);
    expect(parseOfferedSizes('36 38 40')).toEqual(['36', '38', '40']);
    expect(parseOfferedSizes('S/M/L')).toEqual(['S', 'M', 'L']);
  });

  it('mówi null, a nie zgaduje, gdy pole jest puste albo nieczytelne', () => {
    expect(parseOfferedSizes(undefined)).toBeNull();
    expect(parseOfferedSizes('  ')).toBeNull();
    expect(parseOfferedSizes('rozmiar uniwersalny')).toBeNull();
  });
});

describe('rozmiar do zamówienia', () => {
  const even = { bust: 90, waist: 74, hips: 98 };

  it('daje jeden rozmiar, gdy wszystkie punkty się zgadzają', () => {
    const advice = recommendSize(even, 'dresses')!;
    expect(advice.size).toBe(38);
    expect(advice.letter).toBe('M');
    expect(advice.split).toBe(false);
    expect(advice.points.every(p => p.slackCm === 0)).toBe(true);
  });

  it('bierze największy z punktów, a nie średnią', () => {
    // Bust 40, waist 36, hips 40. The average would be 38 — a dress that does
    // not close. A seam can be taken in; it cannot be let out.
    const advice = recommendSize({ bust: 94, waist: 70, hips: 102 }, 'dresses')!;
    expect(advice.size).toBe(40);
    expect(advice.split).toBe(true);
    expect(advice.points.map(p => [p.point, p.size])).toEqual([
      ['bust', 40], ['waist', 36], ['hips', 40],
    ]);
  });

  it('mówi w centymetrach, gdzie zostanie luz', () => {
    const advice = recommendSize({ bust: 94, waist: 70, hips: 102 }, 'dresses')!;
    const waist = advice.points.find(p => p.point === 'waist')!;
    // Size 40 has a 78 cm waist; hers is 70.
    expect(waist.slackCm).toBe(8);
    expect(advice.points.find(p => p.point === 'bust')!.slackCm).toBe(0);
  });

  it('patrzy tylko na te punkty, które dla tej kategorii coś znaczą', () => {
    // A skirt does not care about the bust, and saying otherwise would make
    // the recommendation wrong for exactly the women it matters most for.
    const skirt = recommendSize({ bust: 110, waist: 70, hips: 94 }, 'skirts')!;
    expect(skirt.points.map(p => p.point)).toEqual(['waist', 'hips']);
    expect(skirt.size).toBe(36);

    const top = recommendSize({ bust: 110, waist: 70, hips: 94 }, 'tops')!;
    expect(top.points.map(p => p.point)).toEqual(['bust', 'waist']);
    // 110 cm sits between the 107 cm and 112 cm rows and is nearer the larger.
    expect(top.size).toBe(48);
  });

  it('milczy tam, gdzie rozmiar odzieżowy nic nie znaczy', () => {
    expect(recommendSize(even, 'shoes')).toBeNull();
    expect(recommendSize(even, 'accessories')).toBeNull();
    expect(recommendSize(even, undefined)).toBeNull();
  });

  it('sprawdza, czy ten rozmiar w ogóle jest w sklepie', () => {
    const inStock = recommendSize({ bust: 94, waist: 70, hips: 102 }, 'dresses', '34-42')!;
    expect(inStock.available).toBe(true);

    const tooBig = recommendSize({ bust: 112, waist: 96, hips: 120 }, 'dresses', '34-40')!;
    expect(tooBig.size).toBe(48);
    expect(tooBig.available).toBe(false);

    // No size field is not the same as "not available".
    expect(recommendSize(even, 'dresses')!.available).toBeNull();
  });

  it('przy wymiarze dokładnie między rozmiarami bierze większy', () => {
    // 100 cm w biodrach leży w połowie drogi między 98 (38) a 102 (40).
    // Dwa centymetry za mało w biodrach to zwrot; dwa za dużo to noszona rzecz.
    const advice = recommendSize({ bust: 90, waist: 70, hips: 100 }, 'dresses')!;
    expect(advice.points.find(p => p.point === 'hips')!.size).toBe(40);
    expect(advice.size).toBe(40);
  });

  it('nie wypada poza tabelę przy skrajnych wymiarach', () => {
    const small = recommendSize({ bust: 60, waist: 50, hips: 70 }, 'dresses')!;
    expect(small.size).toBe(32);
    const large = recommendSize({ bust: 150, waist: 140, hips: 160 }, 'dresses')!;
    expect(large.size).toBe(50);
  });
});

describe('rozmiar z tabeli marki', () => {
  /**
   * Every LPP shop publishes, per garment, the body each size is cut for.
   * Until it was read, the advice came from one generic Polish table for
   * everything in the catalogue — close at the middle sizes and several
   * centimetres out at the ends. Reserved's XXL is bust 108 / waist 90 /
   * hip 116; the generic table's XXL is 102 / 86 / 110.
   */
  const RESERVED = [
    { size: 'XS', bust: 82, waist: 64, hips: 90 },
    { size: 'S', bust: 86, waist: 68, hips: 94 },
    { size: 'M', bust: 90, waist: 72, hips: 98 },
    { size: 'L', bust: 96, waist: 78, hips: 104 },
    { size: 'XL', bust: 102, waist: 84, hips: 110 },
    { size: 'XXL', bust: 108, waist: 90, hips: 116 },
  ];

  it('czyta z tabeli marki, nie ze standardowej', () => {
    // The same body lands on two different sizes: Reserved grades its XL at
    // bust 102 / waist 84 / hip 110, while the generic table's nearest row is
    // 44. Whichever is right, only one of them is this dress.
    const body = { bust: 104, waist: 86, hips: 112 };
    const brand = recommendSize(body, 'dresses', undefined, RESERVED);
    const generic = recommendSize(body, 'dresses');
    expect(brand?.label).toBe('XL');
    expect(brand?.fromBrandChart).toBe(true);
    expect(generic?.label).toBe('44');
    expect(generic?.fromBrandChart).toBe(false);
  });

  it('wraca do standardowej, gdy sklep tabeli nie podał', () => {
    const advice = recommendSize({ bust: 104, waist: 86, hips: 112 }, 'dresses');
    expect(advice?.fromBrandChart).toBe(false);
  });

  it('bierze największy punkt także w tabeli marki', () => {
    // Bust fits M, hips need XL — a seam can be taken in, not let out.
    const advice = recommendSize({ bust: 90, waist: 72, hips: 109 }, 'dresses', undefined, RESERVED);
    expect(advice?.label).toBe('XL');
  });

  it('liczy luz względem obwodów marki', () => {
    const advice = recommendSize({ bust: 88, waist: 70, hips: 92 }, 'dresses', undefined, RESERVED);
    // Bust and waist both land on M, which decides it; M's hip is 98, so the
    // 92 cm hip gets 6 cm of room — measured against Reserved's grading, not
    // against ours, where M is 98 too but XL and XXL are centimetres apart.
    expect(advice?.label).toBe('M');
    expect(advice?.points.find(p => p.point === 'hips')?.slackCm).toBe(6);
  });

  it('używa tylko tych obwodów, które marka podała', () => {
    // A skirt chart carries hips alone; bust must not be invented from it.
    const skirt = [
      { size: '34', hips: 91 },
      { size: '36', hips: 95 },
      { size: '38', hips: 99 },
    ];
    const advice = recommendSize({ bust: 90, waist: 72, hips: 96 }, 'skirts', undefined, skirt);
    expect(advice?.label).toBe('36');
    expect(advice?.points.map(p => p.point)).toEqual(['hips']);
  });

  it('pomija tabelę marki, gdy nie ma w niej potrzebnego obwodu', () => {
    // Hips-only chart against a dress, which is decided by bust and waist too.
    const hipsOnly = [{ size: '34', hips: 91 }, { size: '36', hips: 95 }];
    const advice = recommendSize({ bust: 104, waist: 86, hips: 112 }, 'tops', undefined, hipsOnly);
    expect(advice?.fromBrandChart).toBe(false);
  });
});

/**
 * The two panels on the product page disagreed out loud.
 *
 * "Talia — powinno leżeć jak trzeba" sat four centimetres above "W talii
 * zabraknie około 2 cm", on a real Reserved blazer, both computed from the
 * same body. The cut-based guess has nothing to say about grading, so where
 * the brand's chart runs out the measurement wins.
 */
describe('rozmiarówka marki poprawia werdykt', () => {
  const RESERVED = [
    { size: 'XS', bust: 82, waist: 64, hips: 90 },
    { size: 'S', bust: 86, waist: 68, hips: 94 },
    { size: 'M', bust: 90, waist: 72, hips: 98 },
    { size: 'L', bust: 96, waist: 78, hips: 104 },
    { size: 'XL', bust: 102, waist: 84, hips: 110 },
    { size: 'XXL', bust: 108, waist: 90, hips: 116 },
  ];

  const fit = (): FitResult => ({
    score: 100,
    confidence: 0.9,
    shape: 'rectangle',
    points: [
      { point: 'bust', verdict: 'neutral', risk: 0, reasons: [] },
      { point: 'waist', verdict: 'neutral', risk: 0, reasons: [] },
      { point: 'hips', verdict: 'neutral', risk: 0, reasons: [] },
      { point: 'stomach', verdict: 'neutral', risk: 0, reasons: ['shape.x.tight.stomach'] },
    ],
  });

  // Waist 92 against Reserved's largest waist of 90: two centimetres missing.
  const advice = () => recommendSize({ bust: 106, waist: 92, hips: 110 }, 'outerwear', undefined, RESERVED);

  const verdictAt = (result: FitResult, point: string) =>
    result.points.find(p => p.point === point)!;

  it('mówi „ciasno" tam, gdzie marka przestała kroić', () => {
    const out = withSizeLimits(fit(), advice());
    expect(verdictAt(out, 'waist').verdict).toBe('tight');
    expect(verdictAt(out, 'waist').reasons).toContain('size.short.2');
  });

  it('nie rusza obwodów, które się mieszczą', () => {
    const out = withSizeLimits(fit(), advice());
    expect(verdictAt(out, 'bust').verdict).toBe('neutral');
    expect(verdictAt(out, 'hips').verdict).toBe('neutral');
  });

  it('nie rusza punktów, o których tabela nic nie mówi', () => {
    const out = withSizeLimits(fit(), advice());
    expect(verdictAt(out, 'stomach').verdict).toBe('neutral');
    expect(verdictAt(out, 'stomach').reasons).toEqual(['shape.x.tight.stomach']);
  });

  it('zostawia ocenę w spokoju', () => {
    // Fit Score answers a different question — czy ten krój pasuje do
    // proporcji — i zmiana go tutaj ruszyłaby każdą plakietkę w aplikacji.
    expect(withSizeLimits(fit(), advice()).score).toBe(100);
  });

  it('nie zmienia niczego, gdy nie ma rozmiarówki', () => {
    // Identity, not deep equality: the function's job is to override where it
    // has something to say, so having nothing to say has to leave the result
    // it was handed exactly as it was.
    const given = fit();
    expect(withSizeLimits(given, null)).toBe(given);
    const roomy = recommendSize({ bust: 86, waist: 68, hips: 94 }, 'outerwear', undefined, RESERVED);
    expect(withSizeLimits(given, roomy)).toBe(given);
  });

  it('milczy przy zaokrągleniu poniżej centymetra', () => {
    expect(shortAt({ point: 'waist', size: 46, letter: 'XXL', slackCm: -0.6 })).toBe(false);
    expect(shortAt({ point: 'waist', size: 46, letter: 'XXL', slackCm: -2 })).toBe(true);
  });
});
