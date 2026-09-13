import { describe, it, expect } from 'vitest';
import { torsoSpan } from './garment';

/**
 * Odróżnianie tułowia od rąk.
 *
 * Bielizna na awatarze powstaje z trójkątów samej sylwetki, więc trzeba
 * wiedzieć, które z nich są tułowiem. Na danej wysokości wierzchołki układają
 * się w skupiska rozdzielone przerwą — lewa ręka, tułów, prawa ręka — a tułów
 * to ten ze środka. Bez tego rozróżnienia pas kładzie się też na rękach; tak
 * wyglądała pierwsza wersja i widać to było od razu.
 *
 * Wartości są w metrach, bo taka jest siatka z warsztatu. Punkty muszą być
 * **gęste** — próg przerwy to 2,5 cm, a wierzchołki prawdziwej siatki dzieli
 * kilka milimetrów. Pierwsza wersja tego pliku rozstawiła punkty tułowia co
 * 8 cm i rozpadł się on na osobne skupiska; test pokazywał wtedy błąd w
 * danych testowych, nie w kodzie.
 */

/** Ciąg punktów co 5 mm, tak gęsty jak wierzchołki siatki. */
function dense(from: number, to: number): number[] {
  const points: number[] = [];
  for (let x = from; x <= to + 1e-9; x += 0.005) points.push(Math.round(x * 1000) / 1000);
  return points;
}

describe('torsoSpan', () => {
  it('bierze skupisko przy osi ciała, pomijając ręce po bokach', () => {
    const across = [...dense(-0.30, -0.26), ...dense(-0.18, 0.18), ...dense(0.26, 0.30)];
    expect(torsoSpan(across)).toEqual({ min: -0.18, max: 0.18 });
  });

  it('nie zależy od kolejności wejścia, bo sortuje u siebie', () => {
    const across = [...dense(-0.30, -0.26), ...dense(-0.18, 0.18), ...dense(0.26, 0.30)];
    const shuffled = [...across].reverse();
    expect(torsoSpan(shuffled)).toEqual(torsoSpan(across));
  });

  it('bierze wszystko, gdy ręce dotykają tułowia i nie ma przerwy', () => {
    // Postawa z rękami przy ciele. Lepiej położyć pas szerzej, niż zgadywać,
    // gdzie kończy się tułów — zgadywanie widać na sylwetce, szerszy pas nie.
    const across = dense(-0.26, 0.26);
    expect(torsoSpan(across)).toEqual({ min: -0.26, max: 0.26 });
  });

  it('radzi sobie z ręką tylko po jednej stronie', () => {
    const across = [...dense(-0.16, 0.16), ...dense(0.29, 0.33)];
    expect(torsoSpan(across)).toEqual({ min: -0.16, max: 0.16 });
  });

  it('nie przewraca się na jednym punkcie', () => {
    expect(torsoSpan([0.05])).toEqual({ min: 0.05, max: 0.05 });
  });
});
