import { parseBrandFeed } from '@/lib/catalog/feed';
import type { EnrichedProduct, RawProduct } from '@/lib/catalog/types';

/**
 * Turns the shipped H&M/Zara CSV into the same shape `importRaw` stores.
 *
 * Kept apart from `ensureCatalogSeeded` so a test can call it directly with a
 * stubbed `fetch`, without going through the "skip under vitest" gate that
 * exists for every *other* test in the suite — see that function's comment.
 */
export async function seedProductsFromDefaultFeed(): Promise<EnrichedProduct[]> {
  const res = await fetch('/katalog-hm-zara.csv');
  if (!res.ok) return [];
  const csv = await res.text();
  const { products } = parseBrandFeed(csv, { source: 'seed' });
  if (products.length === 0) return [];

  // Lazy for the same reason `importRaw` in local.ts is: the AI layer imports
  // the fit engine, which imports the profile hooks, which import this
  // backend. A static import here would close that circle.
  const { enrichment } = await import('@/lib/ai');
  const enriched: EnrichedProduct[] = [];
  for (const raw of products as RawProduct[]) {
    const { fit, enrichedBy } = await enrichment.enrich(raw);
    enriched.push({ raw, fit, enrichedBy, enrichedAt: new Date().toISOString() });
  }
  return enriched;
}
