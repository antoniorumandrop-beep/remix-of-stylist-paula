import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readShopJson } from './shopJson';

/**
 * The five LPP shops — Reserved, Sinsay, House, Cropp, Mohito — run one shop
 * platform, and it publishes two things their JSON-LD does not: the fabric
 * composition and the size run with stock per size.
 *
 * Measured 2026-09-13 on live pages: `"material":"100% LEN"` on Reserved,
 * `"100% POLIESTER"` on Sinsay, `"100% POLIURETAN"` on Mohito. Every one of
 * the nine products imported that day arrived with an empty composition and an
 * empty size run while both sat in the HTML — the parser only ever read
 * JSON-LD.
 */
const fixture = (name: string) => readFileSync(resolve(__dirname, '__fixtures__', name), 'utf8');

describe('readShopJson — skład i rozmiary z osadzonego JSON-a sklepu', () => {
  const reserved = readShopJson(fixture('reserved-sukienka-838kb-88x.html'));

  it('czyta skład, którego nie ma w JSON-LD', () => {
    expect(reserved.material).toBe('100% LEN');
  });

  it('zwraca wyłącznie rozmiary dostępne', () => {
    // XS, S, M i L mają stockQuantity 0. Pokazanie ich jako rozmiarówki tej
    // sukienki to obietnica, której sklep nie dotrzyma.
    expect(reserved.sizes).toBe('XL');
  });

  it('mówi, że towar jest, gdy choć jeden rozmiar jest dostępny', () => {
    expect(reserved.stock).toBe('in');
  });
});

describe('readShopJson — sytuacje, w których łatwo o cichy błąd', () => {
  it('bierze blok rozmiarów z dostępnością, nie tabelę obwodów przed nim', () => {
    // The live page carries three `"sizes":[` blocks and the stock one is
    // last: a body-measurement table and a garment-measurement table come
    // first. Taking the first match yields sizes that look right and ignore
    // stock completely.
    const html = `<script>window['x'] = function() { return {
      "sizes":[{"name":"XS","dimensions":[{"size":"82","name":"Obwód klatki piersiowej"}]},
               {"name":"S","dimensions":[{"size":"86","name":"Obwód klatki piersiowej"}]}],
      "material":"95% BAWEŁNA, 5% ELASTAN",
      "sizes":[{"isInStock":false,"sizeName":"XS","stockQuantity":0},
               {"isInStock":true,"sizeName":"M","stockQuantity":4}]
    }; };</script>`;
    const facts = readShopJson(html);
    expect(facts.sizes).toBe('M');
    expect(facts.material).toBe('95% BAWEŁNA, 5% ELASTAN');
  });

  it('nie ogłasza braku towaru, gdy sklep w ogóle nie pisze o dostępności', () => {
    const html = `<script>return {"sizes":[{"sizeName":"S"},{"sizeName":"M"}]};</script>`;
    const facts = readShopJson(html);
    expect(facts.sizes).toBe('S, M');
    expect(facts.stock).toBe('unknown');
  });

  it('zgłasza brak towaru, gdy każdy rozmiar jest wyprzedany', () => {
    const html = `<script>return {"sizes":[{"isInStock":false,"sizeName":"S"},{"isInStock":false,"sizeName":"M"}]};</script>`;
    const facts = readShopJson(html);
    expect(facts.stock).toBe('out');
    // Still worth showing what the shop carries, the way `sizesFrom` does.
    expect(facts.sizes).toBe('S, M');
  });

  it('milczy na stronie bez osadzonego JSON-a zamiast zgadywać', () => {
    const facts = readShopJson(fixture('hm-jeans-0941666089.html'));
    expect(facts.material).toBeUndefined();
    expect(facts.sizes).toBeUndefined();
    expect(facts.stock).toBe('unknown');
  });

  it('nie wywraca się na uciętym JSON-ie', () => {
    // `fetch-product` reports truncation, but a page can also simply be odd.
    const html = `<script>return {"material":"100% LEN","sizes":[{"isInStock":true,"sizeName":"M"`;
    expect(() => readShopJson(html)).not.toThrow();
    expect(readShopJson(html).material).toBe('100% LEN');
  });

  it('pomija pusty skład zamiast zapisywać pusty napis', () => {
    const html = `<script>return {"material":"","sizes":[{"sizeName":"S"}]};</script>`;
    expect(readShopJson(html).material).toBeUndefined();
  });

  it('czyta polskie znaki zapisane jako sekwencje \\u', () => {
    const html = `<script>return {"material":"100% BAWE\\u0141NA"};</script>`;
    expect(readShopJson(html).material).toBe('100% BAWEŁNA');
  });
});

describe('readShopJson — strona niesie też rozmiary cudzych produktów', () => {
  /**
   * Found by importing nine real LPP products and reading what landed: a
   * House dress came back in sizes 35–41 and a pair of Sinsay joggers in
   * 39–44. Both are shoe size runs, belonging to the "you may also like"
   * products further down the same page.
   *
   * The live jogger page carries three size blocks — 486JH-99X (shoes),
   * 449JM-77X, and 620JM-77X, which is the one the URL and the JSON-LD `sku`
   * point at. Taking the first block is how a dress gets shoe sizes and looks
   * entirely plausible doing it.
   */
  const fixture = (name: string) => readFileSync(resolve(__dirname, '__fixtures__', name), 'utf8');
  const jogger = fixture('sinsay-jogger-620jm-77x.html');

  it('bierze blok tego produktu, nie pierwszy na stronie', () => {
    expect(readShopJson(jogger, '620JM-77X').sizes).toBe('XS, S, M');
  });

  it('milczy, gdy żaden blok nie należy do tego produktu', () => {
    // Better no size run than someone else's: a wrong one is invisible.
    expect(readShopJson(jogger, '999ZZ-11X').sizes).toBeUndefined();
  });

  it('milczy, gdy nie wiadomo, którego produktu szukać, a bloków jest kilka', () => {
    expect(readShopJson(jogger).sizes).toBeUndefined();
  });

  it('bierze jedyny blok na stronie także bez sku', () => {
    // One block is not ambiguous, and most pages have exactly one.
    const html = `<script>return {"sizes":[{"isInStock":true,"sizeName":"M"}]};</script>`;
    expect(readShopJson(html).sizes).toBe('M');
  });

  it('nie bierze składu, gdy strona podaje kilka różnych', () => {
    // One `"material"` per page on all four shops measured, but the size
    // blocks taught us what a second copy costs.
    const html = `<script>return {"material":"100% LEN","x":{"material":"100% POLIESTER"}};</script>`;
    expect(readShopJson(html).material).toBeUndefined();
  });

  it('bierze skład powtórzony tą samą wartością', () => {
    const html = `<script>return {"material":"100% LEN","x":{"material":"100% LEN"}};</script>`;
    expect(readShopJson(html).material).toBe('100% LEN');
  });
});

describe('readShopJson — tabela obwodów ciała dla tego fasonu', () => {
  /**
   * The LPP shops publish, per product, the body each size is cut for:
   * XS → bust 82 / waist 64 / hip 90, and so on. That is the input Paula is
   * built on, and until now the size advice fell back to a generic Polish
   * sizing table for every garment in the catalogue.
   *
   * The page also publishes a second table of the garment's own flat
   * measurements — "Długość 126", "Szerokość w talii". Those are half-widths
   * of the item, not circumferences of a person: reading 32 where the body
   * table says 64 would halve every measurement and recommend a size two
   * steps too small. The word "Obwód" is what separates them.
   */
  const fixture = (name: string) => readFileSync(resolve(__dirname, '__fixtures__', name), 'utf8');
  const chart = readShopJson(fixture('reserved-sukienka-838kb-88x.html'), '838KB-88X').sizeChart;

  it('czyta obwody ciała dla każdego rozmiaru', () => {
    expect(chart?.slice(0, 3)).toEqual([
      { size: 'XS', bust: 82, waist: 64, hips: 90 },
      { size: 'S', bust: 86, waist: 68, hips: 94 },
      { size: 'M', bust: 90, waist: 72, hips: 98 },
    ]);
  });

  it('bierze tabelę obwodów, a nie wymiarów samego ubrania', () => {
    // The garment table sits first in this fixture on purpose.
    expect(chart?.[0].bust).toBe(82);
    expect(chart?.[0].bust).not.toBe(48);
  });

  it('milczy, gdy sklep żadnej tabeli nie podaje', () => {
    expect(readShopJson(fixture('hm-jeans-0941666089.html')).sizeChart).toBeUndefined();
  });

  it('pomija wiersze bez ani jednego obwodu', () => {
    const html = `<script>return {"sizes":[
      {"name":"XS","dimensions":[{"name":"Wzrost","size":"161","unit":"cm"}]},
      {"name":"S","dimensions":[{"name":"Obwód talii","size":"68","unit":"cm"}]}]};</script>`;
    expect(readShopJson(html).sizeChart).toEqual([{ size: 'S', waist: 68 }]);
  });

  it('pomija wymiar bez wartości zamiast zapisywać zero', () => {
    // "Szerokość w talii" came through with an empty string on the live page.
    const html = `<script>return {"sizes":[
      {"name":"M","dimensions":[{"name":"Obwód talii","size":"","unit":"cm"},
                                {"name":"Obwód bioder","size":"98","unit":"cm"}]}]};</script>`;
    expect(readShopJson(html).sizeChart).toEqual([{ size: 'M', hips: 98 }]);
  });
});

describe('readShopJson — obwód ciała a szerokość ubrania', () => {
  /**
   * The dangerous confusion, isolated. On the fixture the garment table
   * happens to carry empty values for waist and hip, so dropping the "Obwód"
   * check changed nothing and the guard looked untested. On a product where
   * the shop fills them in, reading 32 where the body table says 64 halves
   * every measurement and recommends a size two steps too small — with both
   * numbers looking perfectly ordinary.
   */
  it('nie czyta szerokości ubrania jako obwodu ciała', () => {
    const html = `<script>return {"sizes":[
      {"name":"M","dimensions":[{"name":"Długość","size":"126","unit":"cm"},
                                {"name":"Szerokość w talii","size":"32","unit":"cm"},
                                {"name":"Szerokość w biodrach","size":"49","unit":"cm"}]}]};</script>`;
    expect(readShopJson(html).sizeChart).toBeUndefined();
  });

  it('wybiera tabelę obwodów, gdy obie są wypełnione', () => {
    const html = `<script>return {
      "sizes":[{"name":"M","dimensions":[{"name":"Szerokość w talii","size":"32","unit":"cm"},
                                         {"name":"Szerokość w biodrach","size":"49","unit":"cm"}]}],
      "sizes":[{"name":"M","dimensions":[{"name":"Obwód talii","size":"64","unit":"cm"},
                                         {"name":"Obwód bioder","size":"98","unit":"cm"}]}]};</script>`;
    expect(readShopJson(html).sizeChart).toEqual([{ size: 'M', waist: 64, hips: 98 }]);
  });
});
