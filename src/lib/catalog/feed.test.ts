import { describe, expect, it } from 'vitest';
import { parseBrandFeed, parseCsv, parsePrice, normalizeCategory, slugify, FEED_TEMPLATE_CSV } from './feed';

const OPTS = { source: 'brand', fetchedAt: '2026-09-08T00:00:00.000Z' };

describe('parseCsv', () => {
  it('reads quoted fields with the delimiter and newlines inside', () => {
    const rows = parseCsv('a,b\n"x, y","line1\nline2"\n');
    expect(rows).toEqual([['a', 'b'], ['x, y', 'line1\nline2']]);
  });

  it('detects the semicolon delimiter used by Polish Excel', () => {
    const rows = parseCsv('name;price\nSukienka;129,99\n');
    expect(rows).toEqual([['name', 'price'], ['Sukienka', '129,99']]);
  });

  it('unescapes doubled quotes', () => {
    expect(parseCsv('a\n"say ""hi"""')).toEqual([['a'], ['say "hi"']]);
  });
});

describe('parsePrice', () => {
  it('handles Polish formatting and currency text', () => {
    expect(parsePrice('129,99 zł')).toBe(129.99);
    expect(parsePrice('1 299 PLN')).toBe(1299);
    expect(parsePrice('1.299,00')).toBe(1299);
    expect(parsePrice('249')).toBe(249);
    expect(parsePrice('abc')).toBeNull();
  });
});

describe('normalizeCategory', () => {
  it('maps Polish and English names onto the UI categories', () => {
    expect(normalizeCategory('sukienki')).toBe('dresses');
    expect(normalizeCategory('Spódnica')).toBe('skirts');
    expect(normalizeCategory('marynarki')).toBe('outerwear');
    expect(normalizeCategory('dresses')).toBe('dresses');
    expect(normalizeCategory('rakiety')).toBeNull();
  });
});

describe('parseBrandFeed', () => {
  it('parses the template we hand out', () => {
    const { products, errors } = parseBrandFeed(FEED_TEMPLATE_CSV, OPTS);
    expect(errors).toEqual([]);
    expect(products).toHaveLength(1);
    const p = products[0];
    expect(p.id).toBe('brand:SUK-001');
    expect(p.externalId).toBe('SUK-001');
    expect(p.price).toBe(249);
    expect(p.category).toBe('dresses');
    expect(p.imageUrl).toContain('suk-001.jpg');
    expect(p.material).toBe('100% wiskoza');
    expect(p.fetchedAt).toBe(OPTS.fetchedAt);
  });

  it('accepts JSON with camelCase keys', () => {
    const json = JSON.stringify([
      { name: 'Slip dress', brand: 'Marka', price: 199, category: 'dresses', imageUrl: 'https://x/y.jpg' },
    ]);
    const { products, errors } = parseBrandFeed(json, OPTS);
    expect(errors).toEqual([]);
    expect(products[0].imageUrl).toBe('https://x/y.jpg');
    expect(products[0].externalId).toBe('marka-slip-dress');
  });

  it('reports rows that are missing what we cannot do without', () => {
    const csv = 'name;brand;price;category\n;Marka;100;sukienki\nTop;Marka;;topy\nTop;Marka;50;rakiety\nOk;Marka;50;topy';
    const { products, errors } = parseBrandFeed(csv, OPTS);
    expect(products).toHaveLength(1);
    expect(errors.map(e => e.row)).toEqual([2, 3, 4]);
    expect(errors[0].message).toContain('name');
    expect(errors[1].message).toContain('price');
    expect(errors[2].message).toContain('category');
  });

  it('rejects duplicate ids inside one feed', () => {
    const csv = 'id;name;brand;price;category\nA;X;M;10;topy\nA;Y;M;10;topy';
    const { products, errors } = parseBrandFeed(csv, OPTS);
    expect(products).toHaveLength(1);
    expect(errors[0].message).toContain('duplicate');
  });

  it('understands Polish column headers', () => {
    const csv = 'nazwa;marka;cena;kategoria;zdjęcie\nBluzka;M;79;bluzki;https://x/1.jpg';
    const { products, errors } = parseBrandFeed(csv, OPTS);
    expect(errors).toEqual([]);
    expect(products[0].category).toBe('tops');
    expect(products[0].imageUrl).toBe('https://x/1.jpg');
  });
});

/**
 * Two regexes in this file were written with the characters they match typed
 * literally: the byte-order mark, and the combining-diacritics block. Both are
 * invisible in the source, and the combining marks attach visually to the
 * bracket before them, so a tool that normalises the file could destroy either
 * range without anything looking wrong. They are escapes now; these tests are
 * what would notice if they stopped working.
 */
describe('znaki niewidzialne w parserze', () => {
  it('strips the byte-order mark Polish Excel writes', () => {
    const withBom = '﻿name;brand;price;category\nSukienka;Marka;199;sukienki';
    const result = parseBrandFeed(withBom, { source: 'brand' });

    expect(result.errors).toEqual([]);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe('Sukienka');
  });

  it('keeps working when the header has no mark', () => {
    const plain = 'name;brand;price;category\nSukienka;Marka;199;sukienki';
    expect(parseBrandFeed(plain, { source: 'brand' }).products).toHaveLength(1);
  });

  it('strips Polish diacritics when building a slug', () => {
    expect(slugify('Spódnica ołówkowa')).toBe('spodnica-olowkowa');
    expect(slugify('Żółta sukienka')).toBe('zolta-sukienka');
    expect(slugify('Bluzka z lnu — nowość')).toBe('bluzka-z-lnu-nowosc');
  });

  it('handles a name that is only diacritics', () => {
    expect(slugify('ąćęłńóśźż')).toBe('acelnoszz');
  });
});
