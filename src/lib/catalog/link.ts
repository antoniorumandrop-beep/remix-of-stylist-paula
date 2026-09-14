import type { RawProduct } from './types';
import { categoryFromName, normalizeCategory, parsePrice, slugify } from './feed';
import { readShopJson, type SizeChartRow } from './shopJson';

/**
 * "Paste a link, get the product."
 *
 * `research/bodytech-09-og-image-test.md` measured this: 30 product pages
 * across Zalando, Answear, Modivo, Reserved and Sinsay, and **all 30** hand
 * over `og:image` and a JSON-LD `Product` in raw HTML — no JavaScript, no
 * bot wall, no CAPTCHA. So the paid metadata services the research had
 * shortlisted (Microlink, $49/month) buy us nothing, and this file is the
 * whole pipeline.
 *
 * The same test found three traps, and each one is a rule here:
 *
 * 1. **JSON-LD first, Open Graph second.** Answear's `og:image` is the shop
 *    logo, not the dress. An Open-Graph-first parser would show a woman a logo
 *    and report success, so the bug would never surface as a bug.
 * 2. **Validate the image anyway.** Rejecting `logo`/`share`/`placeholder`
 *    URLs and square-ish crops catches the same class of mistake at the next
 *    shop, the one we have not tested.
 * 3. **No shop publishes fabric composition.** `material` comes back empty
 *    almost every time, which is exactly why `stretch` has to be derived on
 *    our side (`lib/fit/stretch.ts`). Not a gap to fix — a finding to keep.
 *
 * Parsing is done with regular expressions over `<script type="ld+json">` and
 * `<meta>` rather than `DOMParser`, on purpose. Both are machine-generated
 * head metadata, not hand-written markup, and the narrow regex runs unchanged
 * in the browser, in Node tests, and in the Deno edge function this will
 * eventually live in — `DOMParser` is not available in the last of those.
 */

/** Where a field came from. Shown in the UI so a wrong pick is visible, not silent. */
export type FieldSource = 'json-ld' | 'shop-json' | 'open-graph' | 'url' | 'guess';

export interface LinkDraft {
  url: string;
  name?: string;
  brand?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  description?: string;
  material?: string;
  sizes?: string;
  color?: string;
  sizeChart?: SizeChartRow[];
  category?: string;
  availability?: string;
  provenance: Partial<Record<keyof Omit<LinkDraft, 'provenance' | 'warnings'>, FieldSource>>;
  /** Things a human should look at before importing. Never thrown, always shown. */
  warnings: string[];
}

/* ------------------------------------------------------------------ *
 * HTML surface
 * ------------------------------------------------------------------ */

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', oacute: 'ó', hellip: '…', ndash: '–', mdash: '—',
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole);
}

/**
 * Reads `<meta>` content by `property` or `name`, in either attribute order.
 * Shops are inconsistent about which of the two they use for Open Graph, and
 * about quoting, so the matcher stays loose and the key comparison is exact.
 */
export function readMeta(html: string, key: string): string | undefined {
  const wanted = key.toLowerCase();
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const keyMatch = tag.match(/\b(?:property|name|itemprop)\s*=\s*["']?([^"'\s>]+)/i);
    if (!keyMatch || keyMatch[1].toLowerCase() !== wanted) continue;
    const valueMatch = tag.match(/\bcontent\s*=\s*"([^"]*)"/i) ?? tag.match(/\bcontent\s*=\s*'([^']*)'/i);
    if (valueMatch) {
      const value = decodeEntities(valueMatch[1]).trim();
      if (value) return value;
    }
  }
  return undefined;
}

/** Every JSON-LD block on the page, parsed; unparseable blocks are skipped, not fatal. */
export function readJsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const body = match[1].replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '').trim();
    if (!body) continue;
    try {
      out.push(JSON.parse(body));
    } catch {
      // Some shops emit trailing commas or raw newlines inside strings. One bad
      // block must not cost us the good ones on the same page.
    }
  }
  return out;
}

type JsonObject = Record<string, unknown>;

const isObject = (v: unknown): v is JsonObject => typeof v === 'object' && v !== null && !Array.isArray(v);

function typesOf(node: JsonObject): string[] {
  const raw = node['@type'];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.filter((t): t is string => typeof t === 'string').map(t => t.toLowerCase());
}

/**
 * Finds the `Product` node anywhere in the graph.
 *
 * Zalando and Modivo nest theirs inside `@graph` or a bare array, which is why
 * the first version of this walk (top level only) found nothing on two of the
 * five shops tested. Depth-first, first match wins.
 */
export function findProductNode(input: unknown, depth = 0): JsonObject | undefined {
  if (depth > 8) return undefined;
  if (Array.isArray(input)) {
    for (const item of input) {
      const found = findProductNode(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (!isObject(input)) return undefined;
  const types = typesOf(input);
  if (types.some(t => t === 'product' || t === 'productgroup' || t === 'individualproduct')) return input;
  for (const value of Object.values(input)) {
    if (Array.isArray(value) || isObject(value)) {
      const found = findProductNode(value, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------ *
 * Image validation
 * ------------------------------------------------------------------ */

/** Substrings that mark a shop-chrome asset rather than a photo of the garment. */
const NON_PRODUCT_TOKENS = ['logo', 'placeholder', 'share', 'default', 'sprite', 'favicon', 'icon-', 'og-image', 'og_image'];

export interface ImageVerdict {
  ok: boolean;
  reason?: string;
}

/**
 * Fashion product photography is portrait — Answear serves 700x1050, Reserved
 * and Sinsay 850-wide crops. A square or landscape image at this position is
 * almost always a logo or a share card, so shape is a usable second signal
 * when the filename gives nothing away.
 */
export function checkProductImage(url: string): ImageVerdict {
  const lower = url.toLowerCase();
  const token = NON_PRODUCT_TOKENS.find(t => lower.includes(t));
  if (token) return { ok: false, reason: `looks like shop chrome ("${token}" in the URL)` };

  const dims = readDimensions(lower);
  if (dims && dims.height > 0) {
    const ratio = dims.width / dims.height;
    if (ratio > 0.95) return { ok: false, reason: `not portrait (${dims.width}x${dims.height})` };
  }
  return { ok: true };
}

/** Pulls `700x1050` out of a path, or `w=700&h=1050` out of a query string. */
function readDimensions(url: string): { width: number; height: number } | undefined {
  const path = url.match(/\/(\d{2,4})x(\d{2,4})(?:[/_.]|$)/);
  if (path) return { width: Number(path[1]), height: Number(path[2]) };
  const w = url.match(/[?&](?:w|width)=(\d{2,4})\b/);
  const h = url.match(/[?&](?:h|height)=(\d{2,4})\b/);
  if (w && h) return { width: Number(w[1]), height: Number(h[1]) };
  return undefined;
}

/* ------------------------------------------------------------------ *
 * JSON-LD field readers
 * ------------------------------------------------------------------ */

function asText(value: unknown): string | undefined {
  if (typeof value === 'string') return decodeEntities(value).trim() || undefined;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = asText(item);
      if (text) return text;
    }
    return undefined;
  }
  if (isObject(value)) return asText(value.name ?? value['@id'] ?? value.value);
  return undefined;
}

/** `image` may be a string, an array, or an ImageObject — and any of them nested. */
function imagesFrom(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(imagesFrom);
  if (isObject(value)) return imagesFrom(value.url ?? value.contentUrl ?? value['@id']);
  return [];
}

/**
 * An offer plus the size it belongs to.
 *
 * On a plain `Product` the size sits on the offer. On a `ProductGroup` it sits
 * on the variant one level up, and the offer underneath carries only a price.
 * Carrying the pair keeps `sizesFrom` working for both without asking it which
 * shape it is looking at.
 */
interface OfferLike {
  offer: JsonObject;
  size?: string;
}

function flattenOffers(raw: unknown, size?: string): OfferLike[] {
  const list = Array.isArray(raw) ? raw : [raw];
  const out: OfferLike[] = [];
  for (const item of list) {
    if (!isObject(item)) continue;
    // An AggregateOffer wraps the real offers one level down.
    const nested = item.offers;
    if (Array.isArray(nested)) out.push(...nested.filter(isObject).map(o => ({ offer: o, size })));
    out.push({ offer: item, size });
  }
  return out;
}

function offersFrom(node: JsonObject): OfferLike[] {
  return flattenOffers(node.offers);
}

/**
 * The variants that belong to the link the user actually pasted.
 *
 * H&M's `hasVariant` lists every colour of the style — 360 entries on a pair
 * of jeans — and each variant's offer names its own product page. Zara keeps
 * the colour in a `v1` query parameter and does the same. Taking the first
 * variant would put another colour's photo and stock on the page and look
 * entirely successful doing it.
 *
 * Matched on the offer's own URL: same path, and the same `v1` when the link
 * carries one. A shop that publishes no per-variant URL gets all its variants
 * back rather than none — half a record beats an empty one.
 */
export function variantsForUrl(node: JsonObject, url: string): JsonObject[] {
  const raw = node.hasVariant;
  if (!Array.isArray(raw)) return [];
  const variants = raw.filter(isObject);
  if (variants.length === 0) return [];

  let wanted: URL;
  try {
    wanted = new URL(url);
  } catch {
    return variants;
  }
  const wantedVariantId = wanted.searchParams.get('v1');

  const matching = variants.filter(variant => {
    const offers = flattenOffers(variant.offers);
    return offers.some(({ offer }) => {
      const href = asText(offer.url);
      if (!href) return false;
      let candidate: URL;
      try {
        candidate = new URL(href, url);
      } catch {
        return false;
      }
      if (candidate.pathname !== wanted.pathname) return false;
      if (!wantedVariantId) return true;
      return candidate.searchParams.get('v1') === wantedVariantId;
    });
  });

  return matching.length > 0 ? matching : variants;
}

/**
 * Composition with the shares in it.
 *
 * Zara publishes `material: "welna/poliamid/elastan"` — the fibres with no
 * percentages, which tells the stretch model nothing — and the real
 * composition, "88% welna, 8% poliamid, 4% elastan", one field over in
 * `additionalProperty`. The research line "no shop publishes composition" was
 * measured on five other shops and does not hold here.
 *
 * Only a value that actually carries a percentage wins over `material`; a
 * second `Composition` entry (lining, sole) is left alone.
 */
export function compositionFrom(node: JsonObject): string | undefined {
  const raw = node.additionalProperty;
  const list = Array.isArray(raw) ? raw : [raw];
  for (const item of list) {
    if (!isObject(item)) continue;
    const id = asText(item.propertyID) ?? asText(item.name);
    if (!id || !/composition|sk[lł]ad/i.test(id)) continue;
    const value = asText(item.value);
    if (value && /\d\s*%/.test(value)) return value;
  }
  return undefined;
}

/**
 * Sizes come from the per-size offers, which is the only place shops publish
 * them — and the only place that says which are in stock. We keep the
 * available ones, because "34-42, but only 40 is left" is a different product
 * to a woman than "34-42".
 */
function sizesFrom(offers: OfferLike[]): { sizes?: string; stock: 'unknown' | 'in' | 'out' } {
  const inStock: string[] = [];
  const all: string[] = [];
  // A shop that publishes no `availability` is telling us nothing, not telling
  // us the product is gone. Reserved's live pages have no such field at all,
  // and an earlier version of this function warned "every size reads as out of
  // stock" on a perfectly available dress. Absence and denial are different.
  let stated = false;
  let anyInStock = false;
  for (const { offer, size: variantSize } of offers) {
    const availability = asText(offer.availability)?.toLowerCase();
    let available = false;
    if (availability) {
      stated = true;
      available = availability.includes('instock') || availability.includes('limited') || availability.includes('preorder');
      if (available) anyInStock = true;
    }
    const size = variantSize ?? asText(offer.size ?? offer.sku_size ?? (isObject(offer.itemOffered) ? offer.itemOffered.size : undefined));
    if (!size) continue;
    if (!all.includes(size)) all.push(size);
    if (available && !inStock.includes(size)) inStock.push(size);
  }
  const chosen = inStock.length > 0 ? inStock : all;
  return {
    sizes: chosen.length > 0 ? chosen.join(', ') : undefined,
    stock: !stated ? 'unknown' : anyInStock ? 'in' : 'out',
  };
}

/* ------------------------------------------------------------------ *
 * The parser
 * ------------------------------------------------------------------ */

/** `"… midi Kolor brązowy - RESERVED - 838KB-88X"` → `"brązowy"`. */
function colorFromTitle(title: string | undefined): string | undefined {
  const match = title?.match(/\bkolor\s+([^-|–]+)/i);
  return match?.[1].trim() || undefined;
}

/** Brand of last resort: `www.sklep-marki.pl` → `Sklep Marki`. */
function brandFromHost(url: string): string | undefined {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const label = host.split('.')[0];
    if (!label) return undefined;
    return label.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  } catch {
    return undefined;
  }
}

function absolute(candidate: string, base: string): string | undefined {
  try {
    return new URL(candidate, base).toString();
  } catch {
    return undefined;
  }
}

export function parseProductPage(html: string, url: string): LinkDraft {
  const draft: LinkDraft = { url, provenance: {}, warnings: [] };
  const set = <K extends keyof LinkDraft>(key: K, value: LinkDraft[K] | undefined, source: FieldSource) => {
    if (value === undefined || value === null || value === '') return;
    if (draft[key] !== undefined) return; // First writer wins, and JSON-LD goes first.
    draft[key] = value;
    (draft.provenance as Record<string, FieldSource>)[key as string] = source;
  };

  const blocks = readJsonLd(html);
  let product: JsonObject | undefined;
  for (const block of blocks) {
    product = findProductNode(block);
    if (product) break;
  }

  const rejectedImages: string[] = [];
  const takeImage = (candidates: string[], source: FieldSource) => {
    for (const candidate of candidates) {
      const resolved = absolute(candidate, url);
      if (!resolved) continue;
      const verdict = checkProductImage(resolved);
      if (verdict.ok) { set('imageUrl', resolved, source); return; }
      rejectedImages.push(`${verdict.reason}: ${resolved}`);
    }
  };

  if (product) {
    // A ProductGroup keeps price, photo, sizes and stock in `hasVariant`, and
    // often nothing at all at the top — H&M and Zara both do. Narrowed to the
    // colour the link points at; see `variantsForUrl`.
    const variants = variantsForUrl(product, url);

    set('name', asText(product.name), 'json-ld');
    set('brand', asText(product.brand ?? product.manufacturer), 'json-ld');
    // The variant first, then the group. H&M's `hasVariant` lists every colour
    // of the style and the first is usually not the one the link points at —
    // the same trap that used to show the wrong photo. Zara repeats the colour
    // in both places, so either order gives it the right answer.
    set('color', variants.map(v => asText(v.color)).find(Boolean), 'json-ld');
    set('color', asText(product.color), 'json-ld');
    set('description', asText(product.description), 'json-ld');
    // Percentages first, the bare fibre list second.
    set('material', compositionFrom(product) ?? asText(product.material), 'json-ld');
    set('category', normalizeCategory(asText(product.category) ?? '') ?? undefined, 'json-ld');
    takeImage(imagesFrom(product.image), 'json-ld');
    if (!draft.imageUrl) takeImage(variants.flatMap(v => imagesFrom(v.image)), 'json-ld');

    const offers = [...offersFrom(product), ...variants.flatMap(v => flattenOffers(v.offers, asText(v.size)))];
    for (const { offer } of offers) {
      const price = parsePrice(asText(offer.price ?? offer.lowPrice) ?? '');
      if (price !== null) {
        set('price', price, 'json-ld');
        set('currency', asText(offer.priceCurrency), 'json-ld');
        break;
      }
    }
    const { sizes, stock } = sizesFrom(offers);
    set('sizes', sizes, 'json-ld');
    if (stock === 'out') {
      draft.warnings.push('every size the page lists reads as out of stock');
      set('availability', 'out-of-stock', 'json-ld');
    }
  } else {
    draft.warnings.push('no JSON-LD Product on the page — falling back to Open Graph, which is the weaker source');
  }

  // The shop's own page JSON, after JSON-LD and before Open Graph. The five
  // LPP shops publish the composition and the size run there and nowhere else,
  // so without this every Reserved, Sinsay, House, Cropp and Mohito product
  // arrived with an empty `material` and an empty `sizes` while both sat in
  // the HTML. It is still the shop stating a fact about its own garment, which
  // is why it outranks Open Graph — see `shopJson.ts`.
  // The `sku` decides which size block on the page belongs to this garment:
  // LPP pages carry one block per recommended product too, all shaped the
  // same. A House dress came back in sizes 35-41 — the shoes below it.
  const shop = readShopJson(html, product ? asText(product.sku) : undefined);
  set('material', shop.material, 'shop-json');
  set('sizes', shop.sizes, 'shop-json');
  set('sizeChart', shop.sizeChart, 'shop-json');
  if (shop.stock === 'out' && !draft.availability) {
    draft.warnings.push('every size the page lists reads as out of stock');
    set('availability', 'out-of-stock', 'shop-json');
  }

  // Open Graph fills the holes. Never the other way round: see the Answear trap.
  set('name', readMeta(html, 'og:title') ?? readMeta(html, 'twitter:title'), 'open-graph');
  set('description', readMeta(html, 'og:description'), 'open-graph');
  set('brand', readMeta(html, 'product:brand') ?? readMeta(html, 'og:brand'), 'open-graph');
  const ogPrice = parsePrice(readMeta(html, 'product:price:amount') ?? '');
  if (ogPrice !== null) set('price', ogPrice, 'open-graph');
  set('currency', readMeta(html, 'product:price:currency'), 'open-graph');
  // The five LPP shops put the colour nowhere else: their page title reads
  // "Lniana sukienka midi Kolor brązowy - RESERVED - 838KB-88X". Read only up
  // to the dash, so the brand and the SKU stay out of it.
  set('color', colorFromTitle(readMeta(html, 'og:title')), 'open-graph');
  if (!draft.imageUrl) {
    const og = readMeta(html, 'og:image') ?? readMeta(html, 'twitter:image');
    if (og) takeImage([og], 'open-graph');
  }

  set('brand', brandFromHost(url), 'url');
  // Last, because it reads the name, and the name can come from Open Graph.
  // None of the five LPP shops publishes a category we can map, so without
  // this a human picks one by hand for every product — twenty times per batch
  // of twenty links. Recorded as `guess` and confirmed on screen, never
  // silently: filing a product in the wrong category hides it from every
  // search that should find it.
  set('category', categoryFromName(draft.name) ?? undefined, 'guess');
  if (!draft.currency) set('currency', 'PLN', 'guess');

  if (rejectedImages.length > 0 && !draft.imageUrl) {
    draft.warnings.push(`no usable product photo — rejected ${rejectedImages.join('; ')}`);
  } else if (rejectedImages.length > 0) {
    draft.warnings.push(`skipped a non-product image (${rejectedImages[0]})`);
  }
  if (!draft.material) {
    // Expected, not exceptional: 0 of 30 pages in the test published composition.
    draft.warnings.push('no fabric composition published — stretch will be inferred from the name');
  }
  if (draft.currency && draft.currency !== 'PLN') {
    draft.warnings.push(`price is in ${draft.currency}; Paula stores PLN only`);
  }
  if (!draft.category) {
    draft.warnings.push('category not published — pick one before importing');
  } else if (draft.provenance.category === 'guess') {
    draft.warnings.push('category read from the product name — check it before importing');
  }

  return draft;
}

/* ------------------------------------------------------------------ *
 * Draft → RawProduct
 * ------------------------------------------------------------------ */

export interface DraftToRawOptions {
  source?: string;
  /** Filled by a human in the UI when the page did not publish one. */
  category?: string;
  fetchedAt?: string;
}

/**
 * A string discriminant, not a boolean `ok`. The project compiles with
 * `strict: false`, and without `strictNullChecks` TypeScript refuses to narrow
 * a union by a boolean literal — `if (!result.ok)` would leave `missing`
 * invisible at every call site. Measured, not assumed.
 */
export type DraftConversion =
  | { status: 'ok'; product: RawProduct }
  | { status: 'incomplete'; missing: string[] };

/**
 * The same three hard requirements as the CSV feed — name, brand, price — plus
 * a category, which a link often does not carry. Anything missing is reported
 * rather than guessed, because a silently wrong product is worse than an
 * import that asks a question.
 */
export function draftToRawProduct(draft: LinkDraft, opts: DraftToRawOptions = {}): DraftConversion {
  const category = opts.category ?? draft.category;
  const missing: string[] = [];
  if (!draft.name) missing.push('name');
  if (!draft.brand) missing.push('brand');
  if (draft.price === undefined) missing.push('price');
  if (!category) missing.push('category');
  if (missing.length > 0) return { status: 'incomplete', missing };

  const source = opts.source ?? 'link';
  const externalId = slugify(`${draft.brand}-${draft.name}`) || slugify(draft.url);
  return {
    status: 'ok',
    product: {
      id: `${source}:${externalId}`,
      source,
      externalId,
      name: draft.name!,
      brand: draft.brand!,
      price: draft.price!,
      currency: 'PLN',
      category: category!,
      url: draft.url,
      imageUrl: draft.imageUrl,
      material: draft.material,
      description: draft.description,
      sizes: draft.sizes,
      color: draft.color,
      sizeChart: draft.sizeChart,
      fetchedAt: opts.fetchedAt ?? new Date().toISOString(),
    },
  };
}
