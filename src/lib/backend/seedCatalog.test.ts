import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { seedProductsFromDefaultFeed } from './seedCatalog';

/**
 * What a fresh browser gets, proven for real — not behind the "skip under
 * vitest" gate in `local.ts`'s `ensureSeeded`, which exists so the dozens of
 * other test files touching `catalog.list()` never attempt a real fetch.
 * This file calls the underlying function directly, with `fetch` stubbed to
 * the actual shipped CSV, so a change to the feed format or the enrichment
 * pipeline breaks this test rather than surfacing as an empty catalog in
 * someone's browser.
 */
const CSV = readFileSync(resolve(__dirname, '..', '..', '..', 'public', 'katalog-hm-zara.csv'), 'utf8');

describe('seedProductsFromDefaultFeed', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('wczytuje wszystkie osiemnaście prawdziwych produktów z wysyłki', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(CSV, { status: 200 })));
    const seeded = await seedProductsFromDefaultFeed();
    expect(seeded).toHaveLength(18);

    const brands = seeded.map(e => e.raw.brand);
    expect(brands.filter(b => b === 'H&M')).toHaveLength(9);
    expect(brands.filter(b => b === 'ZARA')).toHaveLength(9);
  });

  it('każdy produkt przeszedł przez wzbogacanie, nie tylko przez parser', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(CSV, { status: 200 })));
    const seeded = await seedProductsFromDefaultFeed();
    for (const e of seeded) {
      expect(e.fit, e.raw.name).toBeTruthy();
      expect(e.enrichedBy, e.raw.name).toBeTruthy();
      expect(e.enrichedAt, e.raw.name).toBeTruthy();
    }
  });

  it('nie wybucha i nie zwraca niczego, gdy sklep — czyli tu nasz serwer — nie odpowiada', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    expect(await seedProductsFromDefaultFeed()).toEqual([]);
  });
});
