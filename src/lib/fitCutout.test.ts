import { describe, it, expect } from 'vitest';
import { alignScales, placeSubject } from '@/lib/fitCutout';

/**
 * Wyrównanie kadrów — czyli to, co decyduje, czy obrót czyta się jako obrót.
 *
 * Samo wycięcie tła nie wystarcza: jeśli na jednej klatce stoi bliżej albo
 * bardziej z lewej, sylwetka przeskakuje i fit znów rozpada się na osobne
 * zdjęcia. Canvasu w vitest nie ma, więc sprawdzana jest arytmetyka, a
 * rysowanie pilnuje `e2e/fits.spec.ts`.
 */

/** Tyle wysokości kadru ma zajmować sylwetka — 0,80 × 1600 px. */
const DOCELOWA = 1280;

describe('wyrównanie klatek skanu', () => {
  it('przy równych sylwetkach daje wszystkim tę samą skalę', () => {
    const skale = alignScales([1000, 1000, 1000]);
    expect(skale).toEqual([DOCELOWA / 1000, DOCELOWA / 1000, DOCELOWA / 1000]);
  });

  it('wyrównuje pół kroku bliżej — mniejsza sylwetka dostaje większą skalę', () => {
    const [blizej, dalej] = alignScales([1100, 1000]);
    // Obie mają wyjść na tę samą wysokość na kadrze.
    expect(1100 * blizej).toBeCloseTo(DOCELOWA, 6);
    expect(1000 * dalej).toBeCloseTo(DOCELOWA, 6);
  });

  it('nie pozwala klatce z uciętymi stopami spuchnąć', () => {
    // Trzecia klatka ma zmierzoną sylwetkę krótszą, bo nóg nie widać.
    const [a, b, ucieta] = alignScales([1000, 1000, 500]);
    const wspolna = DOCELOWA / 1000;
    expect(a).toBeCloseTo(wspolna, 6);
    expect(b).toBeCloseTo(wspolna, 6);
    // Bez ograniczenia wyszłoby 2,752 — czyli osoba puchnąca w połowie obrotu.
    expect(ucieta).toBeCloseTo(wspolna * 1.15, 6);
    expect(ucieta).toBeLessThan(DOCELOWA / 500);
  });

  it('odstająca klatka nie przesuwa punktu odniesienia dla pozostałych', () => {
    // Mediana, nie średnia: średnia z [1000, 1000, 200] to 733, więc dwie
    // porządne klatki zostałyby przeskalowane pod jedną zepsutą.
    const [a, b] = alignScales([1000, 1000, 200]);
    expect(a).toBeCloseTo(DOCELOWA / 1000, 6);
    expect(b).toBeCloseTo(DOCELOWA / 1000, 6);
  });

  it('nie dzieli przez zero, gdy żadnej sylwetki nie zmierzono', () => {
    expect(alignScales([])).toEqual([]);
    expect(alignScales([0, 0])).toEqual([1, 1]);
    const [dobra, pusta] = alignScales([1000, 0]);
    expect(dobra).toBeCloseTo(DOCELOWA / 1000, 6);
    expect(Number.isFinite(pusta)).toBe(true);
  });

  it('stawia sylwetkę środkiem w poziomie i czubkiem głowy w pionie', () => {
    const { dx, dy } = placeSubject({ x0: 100, y0: 50, x1: 300, y1: 1050 }, 1);
    // Środek sylwetki (200) ląduje na środku kadru (600).
    expect(200 * 1 + dx).toBeCloseTo(600, 6);
    // Czubek głowy (50) ląduje na 10% wysokości kadru (160).
    expect(50 * 1 + dy).toBeCloseTo(160, 6);
  });

  it('trzyma głowę w tym samym miejscu także po przeskalowaniu', () => {
    // Anker na głowie, nie na środku: stopy bywają ucięte, głowa nie.
    const wysoka = placeSubject({ x0: 0, y0: 40, x1: 200, y1: 1040 }, 1.28);
    const niska = placeSubject({ x0: 500, y0: 200, x1: 700, y1: 1200 }, 1.28);
    expect(40 * 1.28 + wysoka.dy).toBeCloseTo(160, 6);
    expect(200 * 1.28 + niska.dy).toBeCloseTo(160, 6);
    expect(100 * 1.28 + wysoka.dx).toBeCloseTo(600, 6);
    expect(600 * 1.28 + niska.dx).toBeCloseTo(600, 6);
  });
});
