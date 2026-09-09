import type { Product } from '@/lib/catalog/types';
import type { BodyProfile } from '@/lib/profile';
import type { Language } from '@/i18n/translations';
import { translate } from '@/i18n/translations';
import type { TranslationKey, TranslationArgs } from '@/i18n/translations';
import { sortByFit } from '@/lib/fit/product';

/**
 * Paula's conversational brain.
 *
 * The screen sends one turn (what the user typed, the conversation so far,
 * the context pills, the body profile, the catalog) and gets back what Paula
 * says, which chips to offer, which products to show and the updated pills.
 *
 * Local = keyword rules (moved here from the search screen, unchanged).
 * Remote = an edge function in front of a language model. Same turn in, same
 * turn out — the screen does not know which one answered.
 */
export interface StylistMessage {
  sender: 'user' | 'paula';
  text: string;
}

export interface ContextPill {
  key: string;
  label: string;
  value: string;
}

export interface StylistInput {
  text: string;
  history: StylistMessage[];
  pills: ContextPill[];
  profile: BodyProfile | null;
  catalog: Product[];
  lang: Language;
}

/**
 * A suggestion chip.
 *
 * `id` is what the flow branches on; `label` is only ever shown. They used to
 * be the same string, so the search screen decided what a tap meant by
 * comparing the visible text against `t('findSame')` and friends — flow
 * control through translated copy. Changing a word in the Polish file, or
 * switching language mid-conversation, silently broke the branch.
 */
export interface Chip {
  id: string;
  label: string;
}

/** Normalises a chip that arrived as a bare string (an older remote reply). */
export function toChip(chip: Chip | string): Chip {
  return typeof chip === 'string' ? { id: chip, label: chip } : chip;
}

export interface StylistOutput {
  reply: string;
  chips?: Chip[];
  products?: Product[];
  /** The full pill set after this turn (not a delta). */
  pills: ContextPill[];
}

export interface StylistProvider {
  respond(input: StylistInput): Promise<StylistOutput>;
}

// ---------------------------------------------------------------- local rules

const OCCASIONS: Record<string, string> = {
  'wedding': 'Wedding', 'wesele': 'Wedding', 'ślub': 'Wedding',
  'office': 'Office', 'biuro': 'Office', 'work': 'Office', 'praca': 'Office',
  'party': 'Party', 'impreza': 'Party', 'going out': 'Going out', 'wyjście': 'Going out',
  'casual': 'Casual', 'everyday': 'Everyday', 'na co dzień': 'Everyday',
  'date': 'Date night', 'randka': 'Date night',
  'vacation': 'Vacation', 'travel': 'Travel', 'podróż': 'Travel', 'wakacje': 'Vacation',
};

const STYLES: Record<string, string> = {
  'floral': 'Floral', 'kwiatowy': 'Floral', 'boho': 'Boho', 'minimalist': 'Minimalist', 'minimalistyczny': 'Minimalist',
  'elegant': 'Elegant', 'elegancki': 'Elegant', 'casual': 'Casual',
  'romantic': 'Romantic', 'romantyczny': 'Romantic',
  'pastel': 'Pastels', 'black': 'Black', 'czarny': 'Black',
  'white': 'White', 'biały': 'White', 'red': 'Red', 'czerwony': 'Red',
  'navy': 'Navy', 'granatowy': 'Navy', 'satin': 'Satin', 'satynowy': 'Satin',
};

const CATEGORY_WORDS: Record<string, string> = {
  'dress': 'Dresses', 'sukienk': 'Dresses', 'skirt': 'Skirts',
  'spódnic': 'Skirts', 'blazer': 'Blazers', 'marynark': 'Blazers',
  'top': 'Tops', 'blouse': 'Tops', 'bluzk': 'Tops',
  'trouser': 'Trousers', 'spodni': 'Trousers', 'jeans': 'Jeans',
  'shoes': 'Shoes', 'buty': 'Shoes',
};

const CATEGORY_TO_ID: Record<string, string> = {
  'Dresses': 'dresses', 'Skirts': 'skirts', 'Blazers': 'outerwear',
  'Tops': 'tops', 'Trousers': 'bottoms', 'Jeans': 'bottoms', 'Shoes': 'shoes',
};

const LENGTHS: Record<string, string> = { 'midi': 'Midi', 'maxi': 'Maxi', 'mini': 'Mini' };

function firstMatch(lower: string, table: Record<string, string>): string | null {
  for (const [keyword, value] of Object.entries(table)) if (lower.includes(keyword)) return value;
  return null;
}

function mergePills(current: ContextPill[], incoming: ContextPill[]): ContextPill[] {
  const merged = [...current];
  for (const pill of incoming) {
    const idx = merged.findIndex(p => p.key === pill.key);
    if (idx >= 0) merged[idx] = pill;
    else merged.push(pill);
  }
  return merged;
}

function applyPills(catalog: Product[], pills: ContextPill[]): Product[] {
  let filtered = [...catalog];
  const budget = pills.find(p => p.key === 'budget');
  if (budget) {
    const max = parseInt(budget.value);
    if (!isNaN(max)) filtered = filtered.filter(p => p.price <= max);
  }
  const category = pills.find(p => p.key === 'category');
  if (category) {
    const id = CATEGORY_TO_ID[category.value];
    if (id) filtered = filtered.filter(p => p.category === id);
  }
  const source = pills.find(p => p.key === 'source');
  if (source && source.value === 'Second-hand') filtered = filtered.filter(p => p.isSecondHand);
  return filtered;
}

export const localStylist: StylistProvider = {
  async respond({ text, history, pills, profile, catalog, lang }) {
    const t = <K extends TranslationKey>(key: K, ...args: TranslationArgs<K>) => translate(lang, key, ...args);
    const lower = text.toLowerCase();
    const userTurns = history.filter(m => m.sender === 'user').length;
    const found: ContextPill[] = [];

    const budgetMatch = lower.match(/(\d+)\s*(pln|zł|zl|eur|€|\$|usd)/i) || lower.match(/(max|do|budget|budżet)\s*(\d+)/i);
    const amount = budgetMatch?.[0].match(/\d+/)?.[0];
    if (amount) found.push({ key: 'budget', label: t('pillBudget'), value: `${amount} PLN` });

    const occasion = firstMatch(lower, OCCASIONS);
    if (occasion) found.push({ key: 'occasion', label: t('pillOccasion'), value: occasion });
    const style = firstMatch(lower, STYLES);
    if (style) found.push({ key: 'style', label: t('pillStyle'), value: style });
    const category = firstMatch(lower, CATEGORY_WORDS);
    if (category) found.push({ key: 'category', label: t('pillCategory'), value: category });
    const length = firstMatch(lower, LENGTHS);
    if (length) found.push({ key: 'length', label: t('pillLength'), value: length });
    if (/second-hand|vinted|used|vintage|używan/.test(lower)) {
      found.push({ key: 'source', label: t('pillSource'), value: 'Second-hand' });
    }

    const nextPills = mergePills(pills, found);
    const hasEnoughContext = nextPills.length >= 2 || userTurns >= 3;

    if (hasEnoughContext) {
      const products = sortByFit(applyPills(catalog, nextPills), profile).slice(0, 12);
      return {
        reply: t('paulaFoundOptions', products.length),
        chips: [
          { id: 'second-hand', label: t('chipSecondHand') },
          { id: 'free-shipping', label: t('chipFreeShipping') },
          { id: 'under-100', label: t('chipUnder100') },
        ],
        products,
        pills: nextPills,
      };
    }

    if (userTurns === 0) {
      if (nextPills.some(p => p.key === 'occasion')) {
        return { reply: t('paulaOccasionFound'), pills: nextPills };
      }
      if (nextPills.some(p => p.key === 'category')) {
        return {
          reply: t('paulaCategoryFound'),
          chips: [
            { id: 'everyday', label: t('chipEveryday') },
            { id: 'office', label: t('chipOffice') },
            { id: 'wedding', label: t('chipWedding') },
            { id: 'date-night', label: t('chipDateNight') },
          ],
          pills: nextPills,
        };
      }
      return {
        reply: t('paulaGeneric'),
        chips: [
          { id: 'everyday', label: t('chipEveryday') },
          { id: 'office', label: t('chipOffice') },
          { id: 'special-event', label: t('chipSpecialEvent') },
        ],
        pills: nextPills,
      };
    }

    const budgetOnly = nextPills.filter(p => p.key === 'budget');
    const products = sortByFit(applyPills(catalog, budgetOnly), profile).slice(0, 12);
    return { reply: t('paulaNoted'), products, pills: nextPills };
  },
};

// ---------------------------------------------------------------- remote

/**
 * PLUG(ai): the real Paula.
 *
 * POST `${VITE_AI_ENDPOINT}/stylist` with `{ text, history, pills, profile,
 * lang, catalogIds }` — the catalog itself stays server-side; the client only
 * says which ids it can show. The function answers `{ reply, chips?,
 * productIds?, pills }`; ids are resolved against the local catalog here.
 * The system prompt (Paula is reactive, never prescriptive, no "avoid" or
 * "slimming") is a compliance artefact and lives with the function.
 */
export function remoteStylist(endpoint: string): StylistProvider {
  return {
    async respond(input) {
      const res = await fetch(`${endpoint.replace(/\/$/, '')}/stylist`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: input.text,
          history: input.history,
          pills: input.pills,
          profile: input.profile,
          lang: input.lang,
          catalogIds: input.catalog.map(p => p.id),
        }),
      });
      if (!res.ok) throw new Error(`stylist failed: ${res.status}`);
      const data = (await res.json()) as { reply: string; chips?: (Chip | string)[]; productIds?: string[]; pills?: ContextPill[] };
      const byId = new Map(input.catalog.map(p => [p.id, p]));
      const products = data.productIds?.map(id => byId.get(id)).filter((p): p is Product => Boolean(p));
      return { reply: data.reply, chips: data.chips?.map(toChip), products, pills: data.pills ?? input.pills };
    },
  };
}
