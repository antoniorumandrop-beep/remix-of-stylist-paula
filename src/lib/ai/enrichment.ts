import type { RawProduct } from '@/lib/catalog/types';
import type { FitAttributes } from '@/lib/fit/attributes';
import { enrichFromText } from '@/lib/catalog/enrich';

/**
 * Catalog enrichment: raw product in, fit attributes out.
 *
 * Local = the rule tables in `catalog/enrich.ts` (name, description, material).
 * Remote = an edge function that runs a vision/text model on the same input
 * and answers with the same `FitAttributes` shape, each attribute carrying
 * `confidence` and `visible`. Same input, same output, swappable.
 */
export interface EnrichmentResult {
  fit: FitAttributes;
  /** 'rules', or the model name that produced the attributes. */
  enrichedBy: string;
}

export interface EnrichmentProvider {
  enrich(raw: RawProduct): Promise<EnrichmentResult>;
}

export const rulesEnrichment: EnrichmentProvider = {
  async enrich(raw) {
    return {
      fit: enrichFromText({ name: raw.name, description: raw.description, material: raw.material }),
      enrichedBy: 'rules',
    };
  },
};

/**
 * PLUG(ai): remote enrichment.
 *
 * POST `${VITE_AI_ENDPOINT}/enrich` with the `RawProduct` as JSON; the edge
 * function answers `{ fit: FitAttributes, enrichedBy: string }`. The prompt
 * lives server-side and must allow "not visible" per attribute; the response
 * is validated against the closed vocabularies in `fit/attributes.ts`.
 * Rules run first and are sent along so the model only has to confirm or
 * fill gaps.
 */
export function remoteEnrichment(endpoint: string): EnrichmentProvider {
  return {
    async enrich(raw) {
      const base = await rulesEnrichment.enrich(raw);
      const res = await fetch(`${endpoint.replace(/\/$/, '')}/enrich`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ product: raw, rules: base.fit }),
      });
      if (!res.ok) throw new Error(`enrich failed: ${res.status}`);
      const data = (await res.json()) as EnrichmentResult;
      return { fit: { ...base.fit, ...data.fit }, enrichedBy: data.enrichedBy || 'remote' };
    },
  };
}
