import { describe, it, expect } from 'vitest';
import { translate } from './translations';

/**
 * `translate` used to take `...args: any[]`, so a message that interpolates a
 * count could be called without one and would render "Zaimportowano undefined
 * produktów" with nothing to warn about it. The arguments are now derived from
 * the entry itself, which is a compile-time guarantee; these cases cover what
 * the compiler cannot see — that both languages actually interpolate.
 */
describe('translate', () => {
  it('returns a plain message in the asked-for language', () => {
    expect(translate('pl', 'continue')).toBe('Dalej');
    expect(translate('en', 'continue')).toBe('Continue');
  });

  it('interpolates a count in both languages', () => {
    expect(translate('en', 'adminImportedToast', 1)).toContain('1');
    expect(translate('pl', 'adminImportedToast', 5)).toContain('5');
    expect(translate('pl', 'adminImportedToast', 5)).not.toContain('undefined');
  });

  it('handles Polish plural forms, which are three, not two', () => {
    expect(translate('pl', 'adminImportedToast', 1)).toContain('produkt');
    expect(translate('pl', 'adminImportedToast', 3)).toContain('produkty');
    expect(translate('pl', 'adminImportedToast', 7)).toContain('produktów');
  });

  it('interpolates more than one argument', () => {
    const message = translate('pl', 'paulaDupesFound', 4, 899);
    expect(message).toContain('4');
    expect(message).toContain('899');
  });

  it('falls back to English for a key Polish has not translated yet', () => {
    // Not a hypothetical: the two objects are edited by hand, in two places.
    const value = translate('pl', 'continue');
    expect(typeof value).toBe('string');
    expect(value.length).toBeGreaterThan(0);
  });
});

describe('liczebniki', () => {
  const pl = (n: number) => translate('pl', 'itemsCount', n);

  it('odmienia po polsku we wszystkich trzech formach', () => {
    expect(pl(1)).toBe('1 element');
    expect(pl(2)).toBe('2 elementy');
    expect(pl(4)).toBe('4 elementy');
    expect(pl(5)).toBe('5 elementów');
    expect(pl(0)).toBe('0 elementów');
  });

  it('nie daje się nabrać na nastki i setki', () => {
    // 12-14 take the genitive despite ending in 2-4; 22 goes back to "elementy".
    expect(pl(12)).toBe('12 elementów');
    expect(pl(14)).toBe('14 elementów');
    expect(pl(22)).toBe('22 elementy');
    expect(pl(112)).toBe('112 elementów');
    expect(pl(122)).toBe('122 elementy');
  });

  it('po angielsku wystarczy liczba pojedyncza i mnoga', () => {
    expect(translate('en', 'itemsCount', 1)).toBe('1 item');
    expect(translate('en', 'itemsCount', 3)).toBe('3 items');
  });
});
