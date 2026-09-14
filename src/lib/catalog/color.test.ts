import { describe, it, expect } from 'vitest';
import { colorFromText, colorLabelPl, COLOR_IDS } from './color';

/**
 * Colour is read from prose, because that is where shops put it: a product
 * name ("Czarny top halter") or a description. It is never invented — a
 * garment whose colour nobody wrote down has no colour here, and the search
 * has to treat that as "unknown", not as "not black".
 */
describe('colorFromText', () => {
  it('czyta kolor z prawdziwych nazw produktów', () => {
    expect(colorFromText('Czarny top halter')).toBe('black');
    expect(colorFromText('Beżowy top na ramiączkach basic')).toBe('beige');
    expect(colorFromText('Dzianinowa sukienka mini z długim rękawem beżowa')).toBe('beige');
    expect(colorFromText('Grafitowe spodnie parachute')).toBe('grey');
  });

  it('odmienia się razem z polskim', () => {
    expect(colorFromText('czarna sukienka')).toBe('black');
    expect(colorFromText('sukienki w kolorze czarnym')).toBe('black');
    expect(colorFromText('coś czerwonego')).toBe('red');
    expect(colorFromText('biała bluzka')).toBe('white');
  });

  it('czyta też bez ogonków, bo tak się pisze w wyszukiwarce', () => {
    expect(colorFromText('czarna sukienka')).toBe(colorFromText('czarna sukienka'));
    expect(colorFromText('rozowa spodnica')).toBe('pink');
    expect(colorFromText('zolty top')).toBe('yellow');
  });

  it('rozumie angielskie nazwy, bo katalog mockowy jest po angielsku', () => {
    expect(colorFromText('Black Midi Dress')).toBe('black');
    expect(colorFromText('Navy Blazer')).toBe('navy');
  });

  it('szuka po kolei w podanych tekstach i bierze pierwszy znaleziony', () => {
    // The name wins over the description: it is what the shop chose to call
    // the thing, and descriptions mention other colours ("pasuje do czarnych
    // spodni").
    expect(colorFromText('Sukienka midi', 'Czerwona sukienka z wiskozy')).toBe('red');
    expect(colorFromText('Czarny top', 'Pasuje do białych spodni')).toBe('black');
  });

  it('milczy, gdy nikt koloru nie napisał', () => {
    expect(colorFromText('Lniana sukienka midi')).toBeNull();
    expect(colorFromText('Żakardowa sukienka maxi w kwiaty')).toBeNull();
    expect(colorFromText('Spodnie jogger slim fit')).toBeNull();
    expect(colorFromText('')).toBeNull();
    expect(colorFromText(undefined)).toBeNull();
  });

  it('nie bierze koloru ze środka innego słowa', () => {
    // "szarfa" starts with "szar" and is not grey; "rozmiar" is not pink.
    expect(colorFromText('Sukienka z szarfą')).toBeNull();
    expect(colorFromText('Rozmiar uniwersalny')).toBeNull();
  });

  it('nie uznaje jasności za kolor', () => {
    // "Jasne spodnie slim" is a real product name and says nothing about hue.
    expect(colorFromText('Jasne spodnie slim')).toBeNull();
    expect(colorFromText('Ciemna sukienka')).toBeNull();
  });
});

describe('colorLabelPl', () => {
  it('nazywa kolor po polsku, bo pigułka jest widoczna', () => {
    expect(colorLabelPl('black')).toBe('czarny');
    expect(colorLabelPl('navy')).toBe('granatowy');
  });

  it('ma nazwę dla każdego koloru, który umie rozpoznać', () => {
    // A colour the search can find but cannot name would show its English id
    // in the middle of a Polish sentence. "Khaki" is the one borrowing that
    // reads the same in both, so it is named here rather than excused by a
    // looser assertion.
    const SAME_IN_BOTH = ['khaki'];
    for (const id of COLOR_IDS) {
      if (SAME_IN_BOTH.includes(id)) continue;
      expect(colorLabelPl(id)).not.toBe(id);
    }
    expect(colorLabelPl('khaki')).toBe('khaki');
  });

  it('każda polska nazwa wraca do tego samego koloru', () => {
    // The pill is editable: whatever we print, a person may retype. It has to
    // parse back, or her edit silently stops filtering.
    for (const id of COLOR_IDS) expect(colorFromText(colorLabelPl(id))).toBe(id);
  });
});

describe('colorFromText — złożenia, którymi sklepy nazywają kolory', () => {
  it('czyta kolor przez przedrostek jasności', () => {
    // H&M's variant for this link is "Jasnoniebieski denim" and Zara writes
    // "Ciemnozielony". Neither word starts with the colour stem.
    expect(colorFromText('Jasnoniebieski denim')).toBe('blue');
    expect(colorFromText('Ciemnozielony sweter')).toBe('green');
    expect(colorFromText('jasnoszary top')).toBe('grey');
    expect(colorFromText('Ciemnogranatowa sukienka')).toBe('navy');
  });

  it('nie uznaje samego przedrostka za kolor', () => {
    expect(colorFromText('Jasne spodnie slim')).toBeNull();
    expect(colorFromText('Ciemna sukienka')).toBeNull();
  });
});
