import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseProductPage, draftToRawProduct } from './link';
import { parseComposition, naturalShare } from './composition';
import { colorFromText } from './color';

/**
 * Two real shops, captured from their live pages.
 *
 * `research/bodytech-09-og-image-test.md` measured five Polish shops and found
 * a plain `Product` in JSON-LD on all of them. H&M and Zara are not on that
 * list and they are shaped differently: both publish a **ProductGroup** whose
 * price, photo, sizes and stock live one level down in `hasVariant`, and
 * nothing at all at the top. The parser read only the top level, so on the two
 * biggest high-street chains in Poland it produced a product with no price and
 * no photo — and reported no error, because Open Graph filled the name.
 *
 * The fixtures are trimmed (fewer sizes, shorter description) but nothing is
 * reshaped: what is here is what the shop served, including the trap that
 * matters — H&M's `hasVariant` lists **every colour of the style**, so the
 * first variant on the page is usually not the one the link points at.
 *
 * Captured 2026-09-10. Prices move; the assertions below are about structure,
 * and the two that pin a price say so.
 */
const fixture = (name: string) => readFileSync(resolve(__dirname, '__fixtures__', name), 'utf8');

const HM_URL = 'https://www2.hm.com/pl_pl/productpage.0941666089.html';
const ZARA_URL = 'https://www.zara.com/pl/pl/spodnie-z-zaszewkami-z-we%C5%82na-kolekcja-zw-p02017305.html?v1=565703986';
const RESERVED_URL = 'https://www.reserved.com/pl/pl/lniana-sukienka-midi-3-838kb-88x';

describe('H&M — ProductGroup z wariantami', () => {
  const draft = parseProductPage(fixture('hm-jeans-0941666089.html'), HM_URL);

  it('czyta nazwę i markę z JSON-LD, nie z tytułu strony', () => {
    // og:title is "… - Jasnoniebieski denim - ONA | H&M PL" — the shop's own
    // chrome. JSON-LD has the garment's name on its own.
    expect(draft.name).toBe('Mom Slim Fit High Waist Ankle Jeans');
    expect(draft.brand).toBe('H&M');
    expect(draft.provenance.name).toBe('json-ld');
  });

  it('znajduje cenę, choć leży w wariancie, a nie w korzeniu', () => {
    expect(draft.price).toBe(79.99);
    expect(draft.currency).toBe('PLN');
  });

  it('bierze zdjęcie tego koloru, który wskazuje link', () => {
    // The first variant in the file is a different colour (Niebieski denim,
    // its own product page). Taking `hasVariant[0]` would show her the wrong
    // jeans and look perfectly successful doing it.
    expect(draft.imageUrl).toContain('4c878eab0647cc26cf0a86a050864a0f1658edbf');
    expect(draft.imageUrl).not.toContain('dc77bcec6f1bd9d93e3236a172efa05d189a7149');
  });

  it('zbiera rozmiary dostępne w tym kolorze', () => {
    expect(draft.sizes).toBe('32, 34, 36');
  });

  it('nie ogłasza braku towaru, bo obcy kolor jest wyprzedany', () => {
    expect(draft.availability).toBeUndefined();
    expect(draft.warnings.join(' ')).not.toContain('out of stock');
  });
});

describe('Zara — ProductGroup ze składem w additionalProperty', () => {
  const draft = parseProductPage(fixture('zara-spodnie-p02017305.html'), ZARA_URL);

  it('czyta nazwę, markę i cenę', () => {
    expect(draft.name).toBe('SPODNIE Z ZASZEWKAMI I WEŁNĄ Z KOLEKCJI ZW');
    expect(draft.brand).toBe('ZARA');
    expect(draft.price).toBe(259);
  });

  it('bierze skład z procentami, nie samą listę włókien', () => {
    // `material` says "welna/poliamid/elastan" — the fibres with no shares,
    // which tells the stretch model nothing. The percentages are published
    // one field over, and that is the field worth reading.
    expect(draft.material).toBe('88% welna, 8% poliamid, 4% elastan');
  });

  it('a ten skład przechodzi przez nasz parser składu', () => {
    const entries = parseComposition(draft.material);
    expect(entries.map(e => e.fiber)).toEqual(['wool', 'polyamide', 'elastane']);
    expect(entries[0].percent).toBe(88);
    expect(naturalShare(entries)).toBe(88);
  });

  it('zbiera rozmiary i zdjęcie', () => {
    expect(draft.sizes).toBe('XS, S, M, L');
    expect(draft.imageUrl).toContain('02017305401-p');
  });

  it('nie ostrzega o braku składu, skoro skład jest', () => {
    expect(draft.warnings.join(' ')).not.toContain('no fabric composition');
  });
});

describe('Reserved — skład i rozmiary leżą poza JSON-LD', () => {
  const draft = parseProductPage(fixture('reserved-sukienka-838kb-88x.html'), RESERVED_URL);

  it('bierze nazwę, markę i cenę z JSON-LD', () => {
    expect(draft.name).toBe('Lniana sukienka midi');
    expect(draft.brand).toBe('Reserved');
    expect(draft.price).toBe(229.99);
  });

  it('czyta skład, którego JSON-LD nie zawiera', () => {
    // The five LPP shops publish it in their own page JSON only. Before this,
    // every product imported from them reached Paula with no composition, so
    // the stretch model guessed from the product name.
    expect(draft.material).toBe('100% LEN');
    expect(draft.provenance.material).toBe('shop-json');
  });

  it('a ten skład przechodzi przez nasz parser składu', () => {
    const entries = parseComposition(draft.material);
    expect(entries.map(e => e.fiber)).toEqual(['linen']);
    expect(naturalShare(entries)).toBe(100);
  });

  it('podaje tylko rozmiar, który da się kupić', () => {
    // XS, S, M and L are all stockQuantity 0 on this page.
    expect(draft.sizes).toBe('XL');
    expect(draft.provenance.sizes).toBe('shop-json');
  });

  it('nie ostrzega o braku składu, skoro skład jest', () => {
    expect(draft.warnings.join(' ')).not.toContain('no fabric composition');
  });

  it('nie ogłasza wyprzedania, skoro jeden rozmiar został', () => {
    expect(draft.availability).toBeUndefined();
    expect(draft.warnings.join(' ')).not.toContain('out of stock');
  });
});

describe('Sinsay — na stronie są też rozmiary produktów polecanych', () => {
  const draft = parseProductPage(
    fixture('sinsay-jogger-620jm-77x.html'),
    'https://www.sinsay.com/pl/pl/spodnie-jogger-slim-fit-620jm-77x',
  );

  it('bierze rozmiary tych spodni, a nie butów spod nich', () => {
    // The page carries three size blocks: 486JH-99X is a shoe run (39-46),
    // 449JM-77X another garment, 620JM-77X this one. Before the SKU match
    // these joggers imported in sizes 39, 42, 43, 44.
    expect(draft.sizes).toBe('XS, S, M');
    expect(draft.provenance.sizes).toBe('shop-json');
  });

  it('czyta skład i kategorię z nazwy', () => {
    expect(draft.material).toBe('60% BAWEŁNA, 40% POLIESTER');
    expect(draft.category).toBe('bottoms');
  });
});

describe('kolor — każdy sklep trzyma go gdzie indziej', () => {
  it('H&M: bierze kolor wariantu, na który wskazuje link', () => {
    // `hasVariant` opens with "Niebieski denim", a different colour with its
    // own product page. Taking the first would name the wrong jeans.
    const draft = parseProductPage(fixture('hm-jeans-0941666089.html'), HM_URL);
    expect(draft.color).toBe('Jasnoniebieski denim');
    expect(draft.provenance.color).toBe('json-ld');
  });

  it('Zara: bierze kolor z JSON-LD', () => {
    const draft = parseProductPage(fixture('zara-spodnie-p02017305.html'), ZARA_URL);
    expect(draft.color).toBe('Granatowy');
  });

  it('Reserved: bierze kolor z tytułu strony, bo nigdzie indziej go nie ma', () => {
    const draft = parseProductPage(fixture('reserved-sukienka-838kb-88x.html'), RESERVED_URL);
    expect(draft.color).toBe('brązowy');
    expect(draft.provenance.color).toBe('open-graph');
  });

  it('a każdy z nich przechodzi przez nasz słownik kolorów', () => {
    const hm = parseProductPage(fixture('hm-jeans-0941666089.html'), HM_URL);
    const zara = parseProductPage(fixture('zara-spodnie-p02017305.html'), ZARA_URL);
    const reserved = parseProductPage(fixture('reserved-sukienka-838kb-88x.html'), RESERVED_URL);
    expect(colorFromText(hm.color)).toBe('blue');
    expect(colorFromText(zara.color)).toBe('navy');
    expect(colorFromText(reserved.color)).toBe('brown');
  });
});

describe('Reserved — tabela obwodów tego fasonu', () => {
  const draft = parseProductPage(fixture('reserved-sukienka-838kb-88x.html'), RESERVED_URL);

  it('wchodzi do draftu razem z resztą', () => {
    expect(draft.sizeChart?.[0]).toEqual({ size: 'XS', bust: 82, waist: 64, hips: 90 });
    expect(draft.provenance.sizeChart).toBe('shop-json');
  });

  it('przechodzi do produktu, który zapisujemy', () => {
    const result = draftToRawProduct(draft, { category: 'dresses' });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.product.sizeChart?.map(r => r.size)).toContain('M');
      expect(result.product.color).toBe('brązowy');
    }
  });
});
