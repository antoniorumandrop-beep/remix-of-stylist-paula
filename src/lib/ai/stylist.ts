import type { Product } from '@/lib/catalog/types';
import type { BodyProfile } from '@/lib/profile';
import type { Language } from '@/i18n/translations';
import { translate } from '@/i18n/translations';
import type { TranslationKey, TranslationArgs } from '@/i18n/translations';
import { sortByFit, getProductFitAttributes } from '@/lib/fit/product';
import { colorFromText, colorLabelPl } from '@/lib/catalog/color';

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

/**
 * Polish inflects, so these tables match on stems rather than dictionary
 * forms — the same way `CATEGORY_WORDS` below always did.
 *
 * The full forms were a real gap, not a stylistic one: nobody types "biuro",
 * they type "coś do biura" or "w biurze", and neither matched. The occasion
 * simply never appeared, so Paula asked a question the person had already
 * answered.
 */
const OCCASIONS: Record<string, string> = {
  'wedding': 'Wedding', 'wesel': 'Wedding', 'ślub': 'Wedding',
  'office': 'Office', 'biur': 'Office', 'work': 'Office', 'prac': 'Office',
  'party': 'Party', 'imprez': 'Party', 'going out': 'Going out', 'wyjści': 'Going out',
  'casual': 'Casual', 'everyday': 'Everyday', 'na co dzień': 'Everyday', 'codzienn': 'Everyday',
  'date': 'Date night', 'randk': 'Date night',
  'vacation': 'Vacation', 'travel': 'Travel', 'podróż': 'Travel', 'wakacj': 'Vacation',
};

/**
 * Colours used to live in this table, and that was the bug: "czarna sukienka"
 * produced a pill reading "Styl: Black" which `applyPills` then ignored, so
 * she was shown an animal print and told her colour had been understood.
 * Colour is now its own pill, read by `colorFromText`, and it filters.
 */
const STYLES: Record<string, string> = {
  'floral': 'Floral', 'kwiat': 'Floral', 'boho': 'Boho', 'minimalist': 'Minimalist',
  'elegan': 'Elegant', 'casual': 'Casual',
  'romantic': 'Romantic', 'romantyczn': 'Romantic',
  'pastel': 'Pastels', 'satin': 'Satin', 'satynow': 'Satin',
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

/**
 * Which products matched, by id rather than as a count.
 *
 * The count has to be taken inside the twelve she is shown, and a second
 * filter re-orders the list, so "the matches are at the front" stops being
 * true the moment two of them run. Ids survive both.
 */
interface Ranked {
  products: Product[];
  matched: Set<string>;
}

/**
 * What she asked for, what we know, and the gap between them.
 *
 * The catalogue is thin on stated attributes: a shop that does not name a
 * colour has not said the dress is not black. Dropping everything unnamed
 * would answer "nothing found" to nearly every question and would be
 * asserting things nobody published.
 *
 * So only what is known to be **different** is removed, the matches move to
 * the front, and the reply says how many actually matched — a list that is
 * mostly "we do not know" must not read as a list of black dresses. Use this
 * for attributes a garment can only have one of; ranking without dropping is
 * the right shape for anything a garment can be several of at once.
 *
 * Applied after `sortByFit` rather than inside `applyPills`: this is what she
 * said out loud, and Fit Score is what we suggest, so her words decide the
 * order and fit decides it within each group.
 */
function rankByKnown<T>(
  products: Product[],
  wanted: T,
  known: (product: Product) => T | null,
): Ranked {
  const matches: Product[] = [];
  const unknown: Product[] = [];
  for (const p of products) {
    const value = known(p);
    if (value === wanted) matches.push(p);
    else if (value === null) unknown.push(p);
  }
  return { products: [...matches, ...unknown], matched: new Set(matches.map(p => p.id)) };
}

/**
 * Of 57 products in the catalogue on 2026-09-14, eight named a colour
 * anywhere: no feed here carries a colour field, so it is read from prose.
 */
function applyColor(products: Product[], color: string): Ranked {
  const wanted = colorFromText(color);
  if (!wanted) return { products, matched: new Set<string>() };
  // The shop's own colour first: it is a stated fact, while the name and the
  // description are prose we are reading between the lines of.
  return rankByKnown(products, wanted, p => colorFromText(p.color, p.name, p.description));
}

/**
 * Ranking without dropping, for attributes a garment can have several of.
 *
 * Colour and length are exclusive: knowing a skirt is mini says it is not
 * maxi. Style is not — a satin dress can be floral, and a dress whose page
 * happens to say "satynowa" has not thereby said it is not boho. So nothing is
 * ever removed here; matches simply move to the front and the reply says how
 * many there were.
 */
function rankByMatch(products: Product[], isMatch: (product: Product) => boolean): Ranked {
  const matches: Product[] = [];
  const rest: Product[] = [];
  for (const p of products) (isMatch(p) ? matches : rest).push(p);
  return { products: [...matches, ...rest], matched: new Set(matches.map(p => p.id)) };
}

/**
 * The words a shop actually writes when a garment is in one of these styles.
 *
 * Stems, like every other Polish table here, and all of them free of Polish
 * diacritics, so lowercasing the product text is enough — a stem that needs an
 * ogonek would have to strip accents on both sides, and none does.
 *
 * Five of the eight styles Paula recognises have no such word — nobody writes "minimalistyczna" on a product
 * page — and that is the honest finding rather than a gap to paper over: for
 * those, nothing matches, and the reply says the catalogue does not describe
 * style rather than pretending the results were picked for it.
 */
const STYLE_STEMS: Record<string, string[]> = {
  'Floral': ['kwiat', 'floral', 'kwiec'],
  'Satin': ['satyn', 'satin'],
  'Boho': ['boho'],
  'Pastels': ['pastel'],
  'Romantic': ['romantyczn', 'romantic'],
  'Elegant': ['elegan'],
  'Minimalist': ['minimalist'],
  'Casual': ['casual', 'codzienn'],
};

/**
 * Style, the third pill that was shown and thrown away.
 *
 * Read from the product's own words — its name, description and composition —
 * because nothing in the catalogue records a style as a field. Never drops
 * anything: see `rankByMatch`.
 */
function applyStyle(products: Product[], style: string): Ranked {
  const stems = STYLE_STEMS[style];
  if (!stems) return { products, matched: new Set<string>() };
  return rankByMatch(products, p => {
    const text = [p.name, p.description, p.material].filter(Boolean).join(' ').toLowerCase();
    return stems.some(stem => text.includes(stem));
  });
}

const LENGTH_TO_CLASS: Record<string, string> = { 'Mini': 'mini', 'Midi': 'midi', 'Maxi': 'maxi' };

/**
 * Length, which used to be shown and thrown away.
 *
 * Paula read "spódnica midi", printed a pill saying "Długość: Midi" and then
 * handed back minis — the same shape of bug colour had, and the reason that
 * one was worth fixing: a pill is a promise that the word was understood.
 *
 * Exclusive like colour, so a garment we know to be mini is dropped from a
 * request for maxi. LPP names carry the word constantly ("Spódnica mini z
 * wełną"), and `enrichFromText` has been reading it into `lengthClass` all
 * along; nothing was using it here.
 */
function applyLength(products: Product[], length: string): Ranked {
  const wanted = LENGTH_TO_CLASS[length];
  if (!wanted) return { products, matched: new Set<string>() };
  return rankByKnown(products, wanted, p => getProductFitAttributes(p)?.lengthClass?.value ?? null);
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
    // Printed in Polish because the pill is visible and editable. Whatever she
    // retypes goes back through `colorFromText`, so an edit keeps filtering.
    const color = colorFromText(text);
    if (color) found.push({ key: 'color', label: t('pillColor'), value: colorLabelPl(color) });
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
      const ranked = sortByFit(applyPills(catalog, nextPills), profile);
      // Length first so colour keeps deciding the order, as it always has.
      const lengthPill = nextPills.find(p => p.key === 'length');
      const byLength = lengthPill ? applyLength(ranked, lengthPill.value) : null;
      const afterLength = byLength?.products ?? ranked;
      const stylePill = nextPills.find(p => p.key === 'style');
      const byStyle = stylePill ? applyStyle(afterLength, stylePill.value) : null;
      const afterStyle = byStyle?.products ?? afterLength;
      const colorPill = nextPills.find(p => p.key === 'color');
      const byColor = colorPill ? applyColor(afterStyle, colorPill.value) : null;
      const products = (byColor?.products ?? afterStyle).slice(0, 12);

      // Counted inside what she can actually see. Before this, twenty results
      // with fifteen matches read as "I found 12 options, 15 of them black".
      const shown = (result: Ranked | null) =>
        result ? products.filter(p => result.matched.has(p.id)).length : 0;

      const sentences = [
        byColor
          ? t('paulaFoundInColor', products.length, shown(byColor), colorPill!.value)
          : t('paulaFoundOptions', products.length),
      ];
      if (byLength) sentences.push(t('paulaFoundInLength', products.length, shown(byLength), lengthPill!.value));
      if (byStyle) sentences.push(t('paulaFoundInStyle', shown(byStyle), stylePill!.value));

      return {
        reply: sentences.join(' '),
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
