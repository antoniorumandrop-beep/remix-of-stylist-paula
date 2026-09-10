import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseBrandFeed } from './feed';
import { enrichFromText } from './enrich';
import { parseComposition, naturalShare } from './composition';
import { parseStretch } from '@/lib/fit/stretch';
import { recommendSize } from '@/lib/fit/size';

/**
 * The first real catalogue.
 *
 * Eighteen products Antonio picked from H&M and Zara, read off the shops' own
 * JSON-LD on 2026-09-10 and written into the brand-feed format the importer
 * already takes. Neither shop lets our fetcher through — both answer a bot
 * wall — so the file is how these clothes get into Paula today, and it is
 * checked in so the demo catalogue is reproducible rather than living in one
 * browser's storage.
 *
 * The test is here because a data file rots quietly: a stray semicolon or a
 * category nobody normalises would show up as an empty shelf, not as an error.
 */
const CSV = readFileSync(resolve(__dirname, '..', '..', '..', 'public', 'katalog-hm-zara.csv'), 'utf8');

describe('katalog H&M i Zara', () => {
  const feed = parseBrandFeed(CSV, { source: 'seed' });

  it('wczytuje wszystkie osiemnaście, bez ani jednego błędu wiersza', () => {
    expect(feed.errors, feed.errors.map(e => `${e.row}: ${e.message}`).join('\n')).toEqual([]);
    expect(feed.products).toHaveLength(18);
  });

  it('każdy produkt ma nazwę, markę, cenę, kategorię i zdjęcie', () => {
    for (const p of feed.products) {
      expect(p.name, p.id).toBeTruthy();
      expect(p.brand, p.id).toBeTruthy();
      expect(p.price, p.id).toBeGreaterThan(0);
      expect(p.category, p.id).toBeTruthy();
      expect(p.imageUrl, p.id).toMatch(/^https:\/\//);
      expect(p.url, p.id).toMatch(/^https:\/\//);
    }
  });

  it('kategorie mieszczą się w tych, które aplikacja umie filtrować', () => {
    const allowed = ['dresses', 'skirts', 'tops', 'bottoms', 'outerwear', 'shoes', 'accessories'];
    for (const p of feed.products) expect(allowed, p.id).toContain(p.category);
  });

  it('składy Zary dają się rozłożyć na włókna z udziałami', () => {
    // Zara publishes real percentages; H&M publishes the fibre list only. The
    // difference is the shop's, not ours, and it must survive the import.
    const zara = feed.products.filter(p => p.brand === 'ZARA');
    expect(zara.length).toBe(9);
    for (const p of zara) {
      const entries = parseComposition(p.material);
      expect(entries.length, p.name).toBeGreaterThan(0);
      expect(naturalShare(entries), p.name).not.toBeNull();
    }
  });

  it('rozciągliwość jest odczytana, a nie zgadnięta, wszędzie gdzie jest elastan', () => {
    const withElastane = feed.products.filter(p => /elastan/i.test(p.material ?? ''));
    expect(withElastane.length).toBeGreaterThan(8);
    for (const p of withElastane) {
      expect(parseStretch(p.material).level, p.name).not.toBe('unknown');
    }
  });

  it('wzbogacanie po nazwie i opisie czyta krój, a nie tylko materiał', () => {
    // This is what the import pipeline runs over every row. Shoes carry no body
    // fit at all and are excluded on purpose — a boot has no waist.
    const garments = feed.products.filter(p => p.category !== 'shoes');
    expect(garments).toHaveLength(14); // 18 minus four pairs of shoes

    const read = garments.filter(p => {
      const attrs = enrichFromText({ name: p.name, material: p.material, description: p.description });
      return attrs && Object.keys(attrs).length > 0;
    });
    // Not every garment can be read from its own words, but most must be, or
    // the feed carries too little for Fit Score to say anything at all.
    expect(read.length, read.map(p => p.name).join(', ')).toBeGreaterThanOrEqual(10);
  });

  it('rozmiary są w formacie, z którego liczymy rekomendację', () => {
    const dress = feed.products.find(p => p.category === 'dresses');
    const advice = recommendSize({ bust: 90, waist: 70, hips: 100 }, 'dresses', dress!.sizes);
    expect(advice).not.toBeNull();
    expect(advice!.offered).not.toBeNull();
    expect(advice!.available).toBe(true);
  });
});
