/**
 * Facts a shop embeds in its own page JSON, next to — and outside — JSON-LD.
 *
 * The five LPP shops (Reserved, Sinsay, House, Cropp, Mohito) share one
 * platform whose JSON-LD carries name, price and photo but neither the fabric
 * composition nor the size run. Both are on the page, in the shop's own
 * `window[…] = function() { return {…} }` payload:
 *
 *     "material":"100% LEN"
 *     "sizes":[{"isInStock":true,"sizeName":"XL","stockQuantity":30}, …]
 *
 * Measured 2026-09-13 on live pages. All nine products imported that day
 * arrived with an empty composition and an empty size run, so the stretch
 * model fell back to guessing from the product name and the size advice had
 * nothing about this garment to work with.
 *
 * This module reads **only outside** JSON-LD. `material` is a real schema.org
 * field that H&M and Zara do publish there, and `parseProductPage` already
 * reads it; a second reader over the same bytes would be two code paths for
 * one fact.
 */

/**
 * The body a given size is cut for, in centimetres, as the shop publishes it
 * for this particular garment.
 */
export interface SizeChartRow {
  size: string;
  bust?: number;
  waist?: number;
  hips?: number;
}

export interface ShopJsonFacts {
  /** Composition as the shop writes it, e.g. "100% LEN". */
  material?: string;
  /** Available sizes, or every listed size when the shop says nothing about stock. */
  sizes?: string;
  /** Whether the shop stated availability at all, and what it said. */
  stock: 'unknown' | 'in' | 'out';
  /** This garment's own size table, when the shop publishes one. */
  sizeChart?: SizeChartRow[];
}

interface SizeEntry {
  sizeName?: unknown;
  isInStock?: unknown;
  /** Per-size SKU, e.g. "620JM-77X-XS" — the product id with the size appended. */
  sku?: unknown;
}

/** JSON-LD is `parseProductPage`'s job; this module reads what it leaves out. */
function withoutJsonLd(html: string): string {
  return html.replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
}

/**
 * The substring from `start` (a `[` or `{`) to its matching bracket.
 *
 * Counts brackets while skipping anything inside a string, so a `]` in a
 * description cannot end the array early. Returns undefined when the page is
 * cut off mid-structure — the caller then has no sizes rather than wrong ones.
 */
function sliceBalanced(text: string, start: number): string | undefined {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return undefined;
}

/**
 * A JSON string value for `key` — but only when the page agrees with itself.
 *
 * Every LPP page measured carries exactly one `"material"`, and it belongs to
 * the product the URL points at. If a page ever carries two different ones,
 * the first is as likely to be a recommended product's as this one's, and a
 * wrong composition feeds the stretch model silently. Same lesson the size
 * blocks taught, applied before it costs anything.
 */
function readString(text: string, key: string): string | undefined {
  const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'g');
  const seen = new Set<string>();
  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    try {
      const value = (JSON.parse(`"${m[1]}"`) as string).trim();
      if (value) seen.add(value);
    } catch {
      // A value we cannot decode is one we do not have.
    }
  }
  return seen.size === 1 ? [...seen][0] : undefined;
}

/**
 * The size array that carries stock, not the measurement tables.
 *
 * A live Reserved page has three `"sizes":[` blocks and the one that matters
 * is last: a body-measurement table (bust/waist/hip per size) and a garment
 * table (length in cm) come first. Both parse cleanly and neither knows
 * anything about stock, so picking the first match yields a size run that
 * looks right and quietly ignores what is actually buyable.
 */
function readSizeEntries(text: string, sku?: string): SizeEntry[] | undefined {
  const marker = /"sizes"\s*:\s*\[/g;
  const blocks: SizeEntry[][] = [];
  for (let m = marker.exec(text); m !== null; m = marker.exec(text)) {
    const open = text.indexOf('[', m.index);
    const slice = sliceBalanced(text, open);
    if (!slice) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(slice);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;
    const entries = parsed.filter(
      (item): item is SizeEntry => typeof item === 'object' && item !== null && 'sizeName' in item,
    );
    if (entries.length > 0) blocks.push(entries);
  }

  if (blocks.length === 0) return undefined;

  // The page also sells the products it recommends, and theirs are shaped
  // identically. Match on the per-size SKU, which starts with the product id.
  if (sku) {
    const wanted = sku.trim().toLowerCase();
    return blocks.find(entries =>
      entries.some(e => typeof e.sku === 'string' && e.sku.toLowerCase().startsWith(wanted)),
    );
  }

  // Without an id there is nothing to match on, so one block is an answer and
  // several are a coin toss. A size run belonging to a different garment is
  // invisible once imported — it looks exactly like this product's.
  return blocks.length === 1 ? blocks[0] : undefined;
}

const ACCENTS: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
};

const deaccent = (text: string) =>
  text.toLowerCase().replace(/[ąćęłńóśźż]/g, ch => ACCENTS[ch] ?? ch);

/**
 * Which body measurement a row of the size table is, if any.
 *
 * Only circumferences count, and the shop marks them: "Obwód talii" is a
 * person's waist at 64 cm, while "Szerokość w talii" from the second table is
 * the garment measured flat at 32. Taking the latter would halve every
 * measurement and recommend a size two steps too small, silently — both are
 * plausible numbers in centimetres.
 */
function measurementOf(name: string): keyof Omit<SizeChartRow, 'size'> | null {
  const key = deaccent(name).trim();
  if (!key.startsWith('obwod')) return null;
  if (key.includes('piersiow') || key.includes('biust')) return 'bust';
  if (key.includes('tali')) return 'waist';
  if (key.includes('biod')) return 'hips';
  return null;
}

/**
 * The garment's size table, picked from every `"sizes"` block that carries
 * `dimensions` — the one with the most recognised circumferences wins, so the
 * flat-measurement table never does.
 */
function readSizeChart(text: string): SizeChartRow[] | undefined {
  const marker = /"sizes"\s*:\s*\[/g;
  let best: SizeChartRow[] | undefined;
  let bestCount = 0;
  for (let m = marker.exec(text); m !== null; m = marker.exec(text)) {
    const open = text.indexOf('[', m.index);
    const slice = sliceBalanced(text, open);
    if (!slice) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(slice);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;

    const rows: SizeChartRow[] = [];
    let count = 0;
    for (const entry of parsed) {
      if (typeof entry !== 'object' || entry === null) continue;
      const { name, dimensions } = entry as { name?: unknown; dimensions?: unknown };
      if (typeof name !== 'string' || !Array.isArray(dimensions)) continue;
      const row: SizeChartRow = { size: name.trim() };
      for (const dim of dimensions) {
        if (typeof dim !== 'object' || dim === null) continue;
        const { name: label, size } = dim as { name?: unknown; size?: unknown };
        if (typeof label !== 'string') continue;
        const key = measurementOf(label);
        if (!key) continue;
        const value = Number(String(size ?? '').replace(',', '.'));
        // An empty string is what the live page sends for a measurement it
        // does not have; `Number('')` is 0, which would read as a real value.
        if (!Number.isFinite(value) || value <= 0) continue;
        row[key] = value;
        count++;
      }
      if (row.bust !== undefined || row.waist !== undefined || row.hips !== undefined) rows.push(row);
    }
    if (count > bestCount) {
      best = rows;
      bestCount = count;
    }
  }
  return best && best.length > 0 ? best : undefined;
}

/**
 * @param sku The product's own id, from JSON-LD. Without it the size run is
 * only read when the page carries exactly one — see `readSizeEntries`.
 */
export function readShopJson(html: string, sku?: string): ShopJsonFacts {
  const text = withoutJsonLd(html);
  const material = readString(text, 'material');
  const sizeChart = readSizeChart(text);
  const entries = readSizeEntries(text, sku);
  if (!entries) return { material, sizeChart, stock: 'unknown' };

  // Same rule as `sizesFrom` in link.ts, and for the same reason: a shop that
  // publishes no availability is telling us nothing, not telling us the
  // product is gone.
  const all: string[] = [];
  const inStock: string[] = [];
  let stated = false;
  let anyInStock = false;
  for (const entry of entries) {
    const name = typeof entry.sizeName === 'string' ? entry.sizeName.trim() : '';
    if (!name) continue;
    if (typeof entry.isInStock === 'boolean') {
      stated = true;
      if (entry.isInStock) anyInStock = true;
    }
    if (!all.includes(name)) all.push(name);
    if (entry.isInStock === true && !inStock.includes(name)) inStock.push(name);
  }

  const chosen = inStock.length > 0 ? inStock : all;
  return {
    material,
    sizeChart,
    sizes: chosen.length > 0 ? chosen.join(', ') : undefined,
    stock: !stated ? 'unknown' : anyInStock ? 'in' : 'out',
  };
}
