import { localStylist, remoteStylist, type StylistProvider } from './stylist';
import { rulesEnrichment, remoteEnrichment, type EnrichmentProvider } from './enrichment';

/**
 * PLUG(ai): set `VITE_AI_ENDPOINT` to the base URL of the edge functions
 * (`/stylist`, `/enrich`) and both providers switch from rules to the model.
 * The API key never reaches the browser — it lives with the functions.
 */
const endpoint = (import.meta.env.VITE_AI_ENDPOINT as string | undefined)?.trim();

export const stylist: StylistProvider = endpoint ? remoteStylist(endpoint) : localStylist;
export const enrichment: EnrichmentProvider = endpoint ? remoteEnrichment(endpoint) : rulesEnrichment;
export const aiMode: 'rules' | 'remote' = endpoint ? 'remote' : 'rules';

export type { StylistProvider, StylistInput, StylistOutput, StylistMessage, ContextPill } from './stylist';
export type { EnrichmentProvider, EnrichmentResult } from './enrichment';
