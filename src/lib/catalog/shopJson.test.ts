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
