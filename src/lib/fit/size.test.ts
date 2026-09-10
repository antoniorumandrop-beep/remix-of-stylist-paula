import { describe, it, expect } from 'vitest';
import { parseOfferedSizes, recommendSize, SIZE_TABLE } from './size';

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
