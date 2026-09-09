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
  /** Where the record came from: 'mock', 'brand', 'awin', 'ceneo', 'allegro', ... */
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
  /** Sizes the brand offers, as given: "XS, S, M" or "34-42". */
  sizes?: string;
  fetchedAt: string;
}

export interface EnrichedProduct {
  raw: RawProduct;
  fit: FitAttributes;
  /** 'rules' today; a model name once the AI layer exists; 'human' for manual overrides. */
  enrichedBy: string;
  enrichedAt: string;
}

/**
 * What the screens render. Historically the mock catalog's shape; imported
 * products are converted into it (`convert.ts`) so every screen handles both.
 *
 * `fitScore` is a leftover static number that nothing reads any more — the
 * badge is computed from the body profile. It stays until the mock catalog
 * goes.
 */
export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  fitScore: number;
  category: string;
  isSecondHand: boolean;
  store: string;
  /** Present on imported products; the mock catalog has none. */
  imageUrl?: string;
  url?: string;
  description?: string;
  material?: string;
  sizes?: string;
  source?: string;
  /** When the source handed us this record. Absent on the mock catalogue. */
  fetchedAt?: string;
  /** The enriched layer, when the product came through the import pipeline. */
  fit?: FitAttributes;
}

/** The categories the UI knows how to filter and score. */
export const CATEGORIES = ['dresses', 'skirts', 'tops', 'bottoms', 'outerwear', 'shoes', 'accessories'] as const;
export type Category = (typeof CATEGORIES)[number];
