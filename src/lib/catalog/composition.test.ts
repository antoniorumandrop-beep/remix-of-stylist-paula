import { describe, it, expect } from 'vitest';
import { careAdvice, materialProfile, naturalShare, parseComposition } from './composition';
import { matchFiber } from './fibers';

describe('rozpoznawanie włókna', () => {
  it('reads Polish and English names for the same fibre', () => {
    expect(matchFiber('Bawełna')).toBe('cotton');
    expect(matchFiber('Organic Cotton')).toBe('cotton');
    expect(matchFiber('bawelna organiczna')).toBe('cotton');
    expect(matchFiber('WEŁNA')).toBe('wool');
    expect(matchFiber('merynos')).toBe('wool');
  });

  it('does not find linen inside "blend"', () => {
    // "len" is a substring of "blend"; the guard is the word boundary.
    expect(matchFiber('cotton blend')).toBe('cotton');
    expect(matchFiber('wool blend')).toBe('wool');
  });

  it('returns null for something it does not know', () => {
    expect(matchFiber('bambus')).toBeNull();
    expect(matchFiber('')).toBeNull();
  });
});

describe('parsowanie składu', () => {
  it('reads percentage before the fibre', () => {
    expect(parseComposition('95% cotton, 5% elastane')).toEqual([
      { fiber: 'cotton', label: 'cotton', percent: 95, natural: true },
      { fiber: 'elastane', label: 'elastane', percent: 5, natural: false },
    ]);
  });

  it('reads percentage after the fibre', () => {
    const parsed = parseComposition('Bawełna 95%, Elastan 5%');
    expect(parsed.map(e => [e.fiber, e.percent])).toEqual([['cotton', 95], ['elastane', 5]]);
  });

  it('copes with no separator at all', () => {
    const parsed = parseComposition('70% Linen 30% Cotton');
    expect(parsed.map(e => [e.fiber, e.percent])).toEqual([['linen', 70], ['cotton', 30]]);
  });

  it('reads the structured composition the mock catalogue carries', () => {
    const parsed = parseComposition([
      { name: 'Linen', percent: 70 },
      { name: 'Cotton', percent: 30 },
    ]);
    expect(parsed.map(e => [e.fiber, e.percent])).toEqual([['linen', 70], ['cotton', 30]]);
  });

  it('treats a lone fibre with no percentage as all of it', () => {
    expect(parseComposition('jedwab')).toEqual([
      { fiber: 'silk', label: 'jedwab', percent: 100, natural: true },
    ]);
  });

  it('returns nothing rather than guessing', () => {
    expect(parseComposition(null)).toEqual([]);
    expect(parseComposition('   ')).toEqual([]);
    expect(parseComposition('Skład: patrz metka')).toEqual([]);
  });
});

describe('udział włókien naturalnych', () => {
  it('adds up the natural ones', () => {
    expect(naturalShare(parseComposition('95% cotton, 5% elastane'))).toBe(95);
    expect(naturalShare(parseComposition('100% poliester'))).toBe(0);
  });

  it('counts viscose as not natural — wood, but chemically regenerated', () => {
    expect(naturalShare(parseComposition('100% wiskoza'))).toBe(0);
  });

  it('refuses to answer when the percentages do not add up to a garment', () => {
    expect(naturalShare(parseComposition('50% cotton'))).toBeNull();
    expect(naturalShare([])).toBeNull();
  });
});

describe('profil materiału', () => {
  it('weights each fibre property by its share', () => {
    const pure = materialProfile(parseComposition('100% linen'));
    expect(pure).toEqual({ breathability: 95, abrasion: 80, pillingResistance: 90 });
  });

  it('moves towards the second fibre in a blend', () => {
    const linen = materialProfile(parseComposition('100% linen'));
    const blend = materialProfile(parseComposition('50% linen, 50% poliester'));
    expect(blend.breathability).toBeLessThan(linen.breathability);
    expect(blend.abrasion).toBeGreaterThan(linen.abrasion);
  });

  it('stays silent when the composition is incomplete', () => {
    expect(materialProfile(parseComposition('cotton, elastane'))).toBeNull();
  });
});

describe('pielęgnacja', () => {
  it('takes the strictest instruction in the blend', () => {
    // Cotton alone tolerates a warm wash and a tumble drier; silk does not.
    expect(careAdvice(parseComposition('100% cotton'))).toEqual({
      wash: 'warm', tumbleDry: true, iron: 'high',
    });
    expect(careAdvice(parseComposition('70% cotton, 30% jedwab'))).toEqual({
      wash: 'hand', tumbleDry: false, iron: 'low',
    });
  });

  it('says nothing when it recognises no fibre', () => {
    expect(careAdvice(parseComposition('100% bambus'))).toBeNull();
  });
});
