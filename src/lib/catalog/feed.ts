import type { RawProduct } from './types';
import { CATEGORIES } from './types';

/**
 * Brand feed import.
 *
 * Small brands are Paula's first supply, and a small brand has a spreadsheet,
 * not an API. So the feed is a CSV (or the same columns as JSON) that anyone
 * can fill in Excel. Column names below; `docs/brand-feed-template.csv` is the
 * template we hand out.
 *
 * Forgiving on purpose: `;` or `,` delimiters (Polish Excel exports `;`),
 * prices like "129,99 zł", Polish category names, snake_case or camelCase
 * JSON keys. Strict on the three things we cannot do without: name, brand,
 * price.
 */
export const FEED_COLUMNS = [
  'id', 'name', 'brand', 'price', 'category', 'url', 'image_url', 'material', 'description', 'sizes',
] as const;

export interface FeedError {
  row: number;
  message: string;
}

export interface FeedParseResult {
  products: RawProduct[];
  errors: FeedError[];
}

const CATEGORY_SYNONYMS: Record<string, string> = {
  dress: 'dresses', dresses: 'dresses', sukienka: 'dresses', sukienki: 'dresses', sukienke: 'dresses', sukienkę: 'dresses',
  skirt: 'skirts', skirts: 'skirts', spodnica: 'skirts', spódnica: 'skirts', spodnice: 'skirts', spódnice: 'skirts',
  top: 'tops', tops: 'tops', topy: 'tops', bluzka: 'tops', bluzki: 'tops', koszula: 'tops', koszule: 'tops', tshirt: 'tops', 't-shirt': 'tops', sweter: 'tops', swetry: 'tops', kamizelka: 'tops',
  bottom: 'bottoms', bottoms: 'bottoms', trousers: 'bottoms', pants: 'bottoms', jeans: 'bottoms', spodnie: 'bottoms', jeansy: 'bottoms', szorty: 'bottoms', shorts: 'bottoms',
  outerwear: 'outerwear', jacket: 'outerwear', jackets: 'outerwear', coat: 'outerwear', coats: 'outerwear', blazer: 'outerwear', blazers: 'outerwear', kurtka: 'outerwear', kurtki: 'outerwear', plaszcz: 'outerwear', płaszcz: 'outerwear', plaszcze: 'outerwear', płaszcze: 'outerwear', marynarka: 'outerwear', marynarki: 'outerwear',
  shoe: 'shoes', shoes: 'shoes', buty: 'shoes', obuwie: 'shoes',
  accessory: 'accessories', accessories: 'accessories', akcesoria: 'accessories', torebka: 'accessories', torebki: 'accessories', bag: 'accessories', bags: 'accessories', bizuteria: 'accessories', biżuteria: 'accessories',
};

export function normalizeCategory(value: string): string | null {
  const key = value.trim().toLowerCase();
  if (!key) return null;
  if ((CATEGORIES as readonly string[]).includes(key)) return key;
  return CATEGORY_SYNONYMS[key] ?? null;
}

/**
 * Stems, not dictionary forms, for the same reason the stylist's keyword
 * tables are stems: Polish inflects, and nobody names a product "sukienka" —
 * they name it "Żakardowa sukienka maxi w kwiaty".
 *
 * Written without accents and matched against an unaccented name, because
 * shops are inconsistent about them and a missing ogonek should not change
 * what a garment is.
 */
const CATEGORY_STEMS: Record<string, string> = {
  sukienk: 'dresses', sukni: 'dresses', dress: 'dresses',
  spodnic: 'skirts', spodniczk: 'skirts', skirt: 'skirts',
  top: 'tops', bluzk: 'tops', bluza: 'tops', koszul: 'tops', swet: 'tops',
  kamizelk: 'tops', tshirt: 'tops', 't-shirt': 'tops', tunik: 'tops', golf: 'tops',
  spodni: 'bottoms', jeans: 'bottoms', dzins: 'bottoms', szort: 'bottoms',
  legins: 'bottoms', jogger: 'bottoms', bermud: 'bottoms', trousers: 'bottoms',
  marynark: 'outerwear', zakiet: 'outerwear', kurtk: 'outerwear',
  plaszcz: 'outerwear', trencz: 'outerwear', parka: 'outerwear', blazer: 'outerwear',
  buty: 'shoes', obuwi: 'shoes', sneaker: 'shoes', kozak: 'shoes', sandal: 'shoes',
  mokasyn: 'shoes', botk: 'shoes', szpilk: 'shoes', trampk: 'shoes', klapk: 'shoes',
  torb: 'accessories', torebk: 'accessories', plecak: 'accessories',
  czapk: 'accessories', szalik: 'accessories', pasek: 'accessories',
  bizuteri: 'accessories', kolczyk: 'accessories', naszyjnik: 'accessories',
  bransolet: 'accessories', portfel: 'accessories',
};

const ACCENTS: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
};

function deaccent(text: string): string {
  return text.toLowerCase().replace(/[ąćęłńóśźż]/g, ch => ACCENTS[ch] ?? ch);
}

/**
 * What the product name says the garment is, or null when it does not say.
 *
 * Two rules, and both earned their place:
 *
 * **A stem counts only at the start of a word.** "Krem do stóp" contains
 * "top" and "butelkowy" contains "but"; matching anywhere would file a foot
 * cream under tops.
 *
 * **The longest matching stem wins.** A name carries one noun for the garment
 * and several adjectives describing it, and the adjectives are often other
 * categories: "SUKIENKA MINI JEANSOWA" is a dress, not jeans, and "Swetrowa
 * sukienka" is a dress, not a sweater. Taking the first stem that fits would
 * depend on the order of this table, which is not a decision anyone made.
 * It also settles "spodnica" written without its accent, which contains
 * "spodni" whole: "spodnic" is longer, so a skirt stays a skirt.
 *
 * This is a guess from prose and it is recorded as one — `parseProductPage`
 * marks the field `guess`, and the screen asks a human to confirm it before
 * the product is imported.
 */
export function categoryFromName(name: string | undefined): string | null {
  if (!name) return null;
  const words = deaccent(name).split(/[^a-z0-9-]+/).filter(Boolean);
  let best: { category: string; length: number } | null = null;
  for (const word of words) {
    for (const [stem, category] of Object.entries(CATEGORY_STEMS)) {
      if (!word.startsWith(stem)) continue;
      if (!best || stem.length > best.length) best = { category, length: stem.length };
    }
  }
  return best?.category ?? null;
}

/** "129,99 zł" → 129.99; "1 299 PLN" → 1299; "abc" → null */
export function parsePrice(value: string | number): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  const cleaned = value.replace(/[^\d,.\s]/g, '').replace(/\s+/g, '').trim();
  if (!cleaned) return null;
  // If both separators appear, the last one is the decimal point.
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized = cleaned;
  if (lastComma > lastDot) normalized = cleaned.replace(/\./g, '').replace(',', '.');
  else normalized = cleaned.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    // \u0300-\u036f is the combining-diacritics block NFD leaves behind.
    // Written as escapes on purpose: as literal characters they are invisible
    // in the source and each one visually attaches to the bracket before it,
    // so any tool that normalises the file can quietly destroy the range —
    // and this is the line that turns polish product names into slugs.
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Minimal RFC 4180 reader: quoted fields, escaped quotes, newlines inside quotes. */
export function parseCsv(text: string, delimiter?: string): string[][] {
  // Polish Excel writes a byte-order mark; as a literal character it is
  // invisible here, so it goes in as an escape.
  const src = text.replace(/^\uFEFF/, '');
  const delim = delimiter ?? detectDelimiter(src);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === delim) { row.push(field); field = ''; continue; }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
      continue;
    }
    field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const semis = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  if (tabs > semis && tabs > commas) return '\t';
  return semis > commas ? ';' : ',';
}

/** "Image URL" / "imageUrl" / "image_url" → "image_url" */
function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s-]+/g, '_');
}

const KEY_ALIASES: Record<string, string> = {
  image: 'image_url', img: 'image_url', photo: 'image_url', zdjecie: 'image_url', zdjęcie: 'image_url', image_url: 'image_url', imageurl: 'image_url',
  link: 'url', product_url: 'url', producturl: 'url', adres: 'url',
  nazwa: 'name', title: 'name',
  marka: 'brand',
  cena: 'price',
  kategoria: 'category',
  sklad: 'material', skład: 'material', composition: 'material', fabric: 'material',
  opis: 'description',
  rozmiary: 'sizes', size: 'sizes',
  sku: 'id', external_id: 'id',
};

function canonicalKey(key: string): string {
  const k = normalizeKey(key);
  return KEY_ALIASES[k] ?? k;
}

type Row = Record<string, string>;

function rowsFromCsv(text: string): Row[] {
  const table = parseCsv(text);
  if (table.length < 2) return [];
  const header = table[0].map(canonicalKey);
  return table.slice(1).map(cells => {
    const row: Row = {};
    header.forEach((h, i) => { row[h] = (cells[i] ?? '').trim(); });
    return row;
  });
}

function rowsFromJson(text: string): Row[] {
  const parsed = JSON.parse(text);
  const list: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.products) ? parsed.products : [];
  return list.map(item => {
    const row: Row = {};
    if (item && typeof item === 'object') {
      for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
        row[canonicalKey(k)] = v == null ? '' : String(v);
      }
    }
    return row;
  });
}

export interface ParseFeedOptions {
  /** Recorded on every product, e.g. 'brand' or 'brand:nazwa-marki'. */
  source: string;
  fetchedAt?: string;
}

export function parseBrandFeed(text: string, opts: ParseFeedOptions): FeedParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { products: [], errors: [{ row: 0, message: 'empty' }] };

  let rows: Row[];
  try {
    rows = trimmed.startsWith('[') || trimmed.startsWith('{') ? rowsFromJson(trimmed) : rowsFromCsv(trimmed);
  } catch (e) {
    return { products: [], errors: [{ row: 0, message: `unreadable: ${(e as Error).message}` }] };
  }
  if (rows.length === 0) return { products: [], errors: [{ row: 0, message: 'no rows' }] };

  const fetchedAt = opts.fetchedAt ?? new Date().toISOString();
  const products: RawProduct[] = [];
  const errors: FeedError[] = [];
  const seen = new Set<string>();

  rows.forEach((row, i) => {
    const rowNo = i + 2; // 1-based, after the header
    const name = row.name ?? '';
    const brand = row.brand ?? '';
    const price = parsePrice(row.price ?? '');
    const category = normalizeCategory(row.category ?? '');
    if (!name) { errors.push({ row: rowNo, message: 'missing name' }); return; }
    if (!brand) { errors.push({ row: rowNo, message: 'missing brand' }); return; }
    if (price === null) { errors.push({ row: rowNo, message: 'missing or unreadable price' }); return; }
    if (!category) { errors.push({ row: rowNo, message: `unknown category "${row.category ?? ''}"` }); return; }

    const externalId = row.id || slugify(`${brand}-${name}`);
    const id = `${opts.source}:${externalId}`;
    if (seen.has(id)) { errors.push({ row: rowNo, message: `duplicate id "${externalId}"` }); return; }
    seen.add(id);

    products.push({
      id,
      source: opts.source,
      externalId,
      name,
      brand,
      price,
      currency: 'PLN',
      category,
      url: row.url || undefined,
      imageUrl: row.image_url || undefined,
      material: row.material || undefined,
      description: row.description || undefined,
      sizes: row.sizes || undefined,
      fetchedAt,
    });
  });

  return { products, errors };
}

/** The template we hand to a brand. Header plus one example row. */
export const FEED_TEMPLATE_CSV = [
  FEED_COLUMNS.join(';'),
  [
    'SUK-001',
    'Sukienka midi kopertowa z wiskozy',
    'Nazwa Marki',
    '249,00',
    'sukienki',
    'https://sklep.example.pl/sukienka-midi-kopertowa',
    'https://sklep.example.pl/img/suk-001.jpg',
    '100% wiskoza',
    'Kopertowa sukienka midi z dekoltem w serek i wiązaniem w talii. Rozkloszowany dół.',
    '34-42',
  ].join(';'),
].join('\n');
