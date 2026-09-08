import type { FitAttributes } from '@/lib/fit/attributes';

/**
 * Two-layer catalog model.
 *
 * `raw` is exactly what a source handed us — never edited, so a feed refresh
 * can replace it wholesale. `enriched` is what we derived from it, with a
 * confidence per attribute, so it survives that refresh and can be audited.
 */
export interface RawProduct {
  /** Stable id inside Paula. */
  id: string;
  /** Where the record came from: 'mock', 'awin', 'ceneo', 'allegro', ... */
  source: string;
  /** The source's own id for the product. */
  externalId: string;
  name: string;
  brand: string;
  price: number;
  currency: 'PLN';
  category: string;
  url?: string;
  imageUrl?: string;
  /** Free-text composition as the feed gives it, e.g. "95% cotton, 5% elastane". */
  material?: string;
  description?: string;
  fetchedAt: string;
}

export interface EnrichedProduct {
  raw: RawProduct;
  fit: FitAttributes;
  /** 'rules' today; a model name once the AI layer exists; 'human' for manual overrides. */
  enrichedBy: string;
  enrichedAt: string;
}
