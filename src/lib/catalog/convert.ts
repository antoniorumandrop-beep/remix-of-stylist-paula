import type { EnrichedProduct, Product, RawProduct } from './types';

/** The UI view of an enriched product. */
export function enrichedToProduct(e: EnrichedProduct): Product {
  return { ...rawToProduct(e.raw), fit: e.fit };
}

export function rawToProduct(raw: RawProduct): Product {
  return {
    id: raw.id,
    name: raw.name,
    brand: raw.brand,
    price: raw.price,
    fitScore: 0,
    category: raw.category,
    isSecondHand: false,
    store: raw.brand,
    imageUrl: raw.imageUrl,
    url: raw.url,
    description: raw.description,
    material: raw.material,
    sizes: raw.sizes,
    color: raw.color,
    sizeChart: raw.sizeChart,
    source: raw.source,
    fetchedAt: raw.fetchedAt,
  };
}
