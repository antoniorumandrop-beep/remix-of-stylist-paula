import { describe, it, expect } from 'vitest';
import {
  parseProductPage,
  draftToRawProduct,
  checkProductImage,
  findProductNode,
  readMeta,
  readJsonLd,
  decodeEntities,
  type LinkDraft,
} from './link';
import { parseRobots, isAllowed } from './robots';

/**
 * The fixtures below are trimmed from the pages measured in
 * `research/bodytech-09-og-image-test.md`. Each one carries the shape that
 * broke a naive parser during that test, so these are regression tests for
 * mistakes already made once, not hypotheticals.
 */

/** Answear: the shop logo sits in `og:image`; the dress is only in JSON-LD. */
const ANSWEAR = `
<html><head>
<meta property="og:title" content="Sukienka answear.LAB" />
<meta property="og:image" content="https://cdn.ans-media.com/assets/front/multi/static/images/logo_share.ans.png" />
<meta property="og:description" content="Sukienka z kolekcji answear.LAB" />
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":"Sukienka answear.LAB",
 "brand":{"@type":"Brand","name":"answear.LAB"},
 "image":["https://img2.ans-media.com/i/700x1050/AW26-SUDZ33-99X_F1.avif"],
 "offers":{"@type":"Offer","price":"249.90","priceCurrency":"PLN","availability":"https://schema.org/InStock"}}
</script>
</head><body></body></html>`;

/** Zalando: the Product hides inside `@graph`, and prices live only in JSON-LD. */
const ZALANDO = `
<html><head>
<meta property="og:title" content="Sukienka koktajlowa - black" />
<meta property="og:image" content="https://img01.ztat.net/article/spp-media/500x750/ab12.jpg" />
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
  {"@type":"BreadcrumbList","itemListElement":[]},
  {"@type":"Product","name":"Sukienka koktajlowa","brand":{"name":"Vero Moda"},
   "image":"https://img01.ztat.net/article/spp-media/762x1100/ab12.jpg",
   "offers":[
     {"@type":"Offer","price":199.99,"priceCurrency":"PLN","size":"36","availability":"https://schema.org/OutOfStock"},
     {"@type":"Offer","price":199.99,"priceCurrency":"PLN","size":"38","availability":"https://schema.org/InStock"},
     {"@type":"Offer","price":199.99,"priceCurrency":"PLN","size":"40","availability":"https://schema.org/InStock"}]}]}
</script>
</head><body></body></html>`;

/** Reserved: the well-behaved case — everything published, in both places. */
const RESERVED = `
<html><head>
<meta property="og:title" content="Sp&oacute;dnica midi" />
<meta property="og:image" content="https://www.reserved.com/media/cache/850/skirt.jpg" />
<meta property="product:price:amount" content="159,99" />
<meta property="product:price:currency" content="PLN" />
<script type="application/ld+json">
[{"@type":"Organization","name":"Reserved"},
 {"@type":"Product","name":"Spódnica midi plisowana","category":"spódnice",
  "brand":"Reserved","material":"100% poliester",
  "image":"https://www.reserved.com/media/cache/850/1275/skirt.jpg",
  "description":"Plisowana spódnica midi.",
  "offers":{"@type":"Offer","price":"159.99","priceCurrency":"PLN","availability":"InStock"}}]
</script>
</head><body></body></html>`;

/** No structured data at all — the fallback path, and the weakest one. */
const OG_ONLY = `
<html><head>
<meta name="og:title" content="Bluzka z lnu" />
<meta property="og:image" content="https://sklep-malej-marki.pl/img/800x1200/bluzka.jpg" />
<meta property="og:description" content="Lniana bluzka" />
</head><body></body></html>`;

describe('HTML surface', () => {
  it('decodes the entities shops actually emit', () => {
    expect(decodeEntities('Sp&oacute;dnica &amp; bluzka &#8211; nowo&#347;&#263;')).toBe('Spódnica & bluzka – nowość');
  });

  it('reads meta by property or name, in any attribute order', () => {
    expect(readMeta(ANSWEAR, 'og:title')).toBe('Sukienka answear.LAB');
    expect(readMeta(OG_ONLY, 'og:title')).toBe('Bluzka z lnu');
    expect(readMeta(`<meta content="x" property="og:site_name">`, 'og:site_name')).toBe('x');
    expect(readMeta(ANSWEAR, 'og:nonexistent')).toBeUndefined();
  });

  it('survives one unparseable JSON-LD block among good ones', () => {
    const html = `<script type="application/ld+json">{bad json,}</script>` + RESERVED;
    const blocks = readJsonLd(html);
    expect(blocks.length).toBeGreaterThan(0);
    expect(findProductNode(blocks[0])).toBeDefined();
  });

  it('finds a Product nested inside @graph', () => {
    const node = findProductNode(readJsonLd(ZALANDO)[0]);
    expect(node?.name).toBe('Sukienka koktajlowa');
  });
});

describe('image validation', () => {
  it('rejects shop chrome by filename', () => {
    expect(checkProductImage('https://cdn.ans-media.com/.../logo_share.ans.png').ok).toBe(false);
    expect(checkProductImage('https://x.pl/placeholder.jpg').ok).toBe(false);
    expect(checkProductImage('https://x.pl/img/default.png').ok).toBe(false);
  });

  it('rejects square crops, which are logos far more often than garments', () => {
    expect(checkProductImage('https://x.pl/i/600x600/a.jpg').ok).toBe(false);
    expect(checkProductImage('https://x.pl/a.jpg?w=500&h=500').ok).toBe(false);
  });

  it('accepts portrait product photography', () => {
    expect(checkProductImage('https://img2.ans-media.com/i/700x1050/AW26.avif').ok).toBe(true);
    expect(checkProductImage('https://img01.ztat.net/article/spp-media/762x1100/ab12.jpg').ok).toBe(true);
    expect(checkProductImage('https://www.reserved.com/media/cache/850/skirt.jpg').ok).toBe(true);
  });
});

describe('parseProductPage', () => {
  it('prefers JSON-LD over Open Graph for the image (the Answear trap)', () => {
    const draft = parseProductPage(ANSWEAR, 'https://answear.com/k/p/sukienka-123');
    expect(draft.imageUrl).toBe('https://img2.ans-media.com/i/700x1050/AW26-SUDZ33-99X_F1.avif');
    expect(draft.provenance.imageUrl).toBe('json-ld');
    expect(draft.brand).toBe('answear.LAB');
    expect(draft.price).toBe(249.9);
  });

  it('never silently falls back to a rejected image', () => {
    // Same page with the good JSON-LD image removed: the logo must not win.
    const stripped = ANSWEAR.replace('"image":["https://img2.ans-media.com/i/700x1050/AW26-SUDZ33-99X_F1.avif"],', '');
    const draft = parseProductPage(stripped, 'https://answear.com/k/p/sukienka-123');
    expect(draft.imageUrl).toBeUndefined();
    expect(draft.warnings.join(' ')).toContain('no usable product photo');
  });

  it('reads a Product out of @graph and keeps only the sizes in stock', () => {
    const draft = parseProductPage(ZALANDO, 'https://www.zalando.pl/vero-moda-sukienka-ve121c1x9-q11.html');
    expect(draft.name).toBe('Sukienka koktajlowa');
    expect(draft.brand).toBe('Vero Moda');
    expect(draft.price).toBe(199.99);
    expect(draft.sizes).toBe('38, 40'); // 36 is OutOfStock
  });

  it('takes the whole record when a shop publishes one properly', () => {
    const draft = parseProductPage(RESERVED, 'https://www.reserved.com/pl/pl/spodnica-1234');
    expect(draft.name).toBe('Spódnica midi plisowana');
    expect(draft.brand).toBe('Reserved');
    expect(draft.material).toBe('100% poliester');
    expect(draft.category).toBe('skirts'); // "spódnice" normalised through the feed's synonyms
    expect(draft.currency).toBe('PLN');
    expect(draft.warnings.join(' ')).not.toContain('no fabric');
  });

  it('falls back to Open Graph and says so', () => {
    const draft = parseProductPage(OG_ONLY, 'https://sklep-malej-marki.pl/bluzka-lniana');
    expect(draft.name).toBe('Bluzka z lnu');
    expect(draft.provenance.name).toBe('open-graph');
    expect(draft.imageUrl).toBe('https://sklep-malej-marki.pl/img/800x1200/bluzka.jpg');
    expect(draft.brand).toBe('Sklep Malej Marki'); // from the hostname, last resort
    expect(draft.provenance.brand).toBe('url');
    expect(draft.warnings.join(' ')).toContain('no JSON-LD Product');
  });

  it('does not call a product sold out just because the shop is silent about stock', () => {
    // Reserved's live pages publish an Offer with price and currency and no
    // `availability` at all. Treating that as "out of stock" put a false
    // warning on an available dress; this test is that bug.
    const html = `<script type="application/ld+json">
      {"@type":"Product","name":"Sukienka","brand":"Reserved",
       "offers":{"@type":"Offer","price":"49.99","priceCurrency":"PLN"}}</script>`;
    const draft = parseProductPage(html, 'https://www.reserved.com/pl/pl/sukienka-1');
    expect(draft.availability).toBeUndefined();
    expect(draft.warnings.join(' ')).not.toContain('out of stock');
  });

  it('still reports a genuine sell-out, when the page says so', () => {
    const html = `<script type="application/ld+json">
      {"@type":"Product","name":"Sukienka","brand":"X","offers":[
        {"@type":"Offer","price":"10","size":"36","availability":"https://schema.org/OutOfStock"},
        {"@type":"Offer","price":"10","size":"38","availability":"https://schema.org/SoldOut"}]}</script>`;
    const draft = parseProductPage(html, 'https://x.pl/p/1');
    expect(draft.availability).toBe('out-of-stock');
    expect(draft.warnings.join(' ')).toContain('out of stock');
  });

  it('flags a missing composition every time, because no shop publishes one', () => {
    const draft = parseProductPage(ZALANDO, 'https://www.zalando.pl/x.html');
    expect(draft.material).toBeUndefined();
    expect(draft.warnings.join(' ')).toContain('no fabric composition');
  });

  it('resolves relative image URLs against the page', () => {
    const html = `<meta property="og:image" content="/img/700x1000/a.jpg">`;
    const draft = parseProductPage(html, 'https://sklep.pl/produkt/1');
    expect(draft.imageUrl).toBe('https://sklep.pl/img/700x1000/a.jpg');
  });
});

describe('draftToRawProduct', () => {
  it('refuses to guess what the page did not say', () => {
    // Price stays un-guessable: a number nobody published is a number we would
    // be inventing. The category is different — it is read from the product
    // name ("Bluzka z lnu"), recorded as a guess, and shown for a human to
    // confirm. See `categoryFromName`.
    const draft = parseProductPage(OG_ONLY, 'https://sklep-malej-marki.pl/bluzka');
    const result = draftToRawProduct(draft);
    expect(result.status).toBe('incomplete');
    if (result.status === 'incomplete') expect(result.missing).toEqual(['price']);
    expect(draft.category).toBe('tops');
    expect(draft.provenance.category).toBe('guess');
  });

  it('accepts a category supplied by a human', () => {
    const draft = parseProductPage(ZALANDO, 'https://www.zalando.pl/x.html');
    const result = draftToRawProduct(draft, { category: 'dresses', fetchedAt: '2026-09-09T00:00:00.000Z' });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      // Built from the page's own address, not its name — see below.
      expect(result.product.id).toBe('link:vero-moda-x-html');
      expect(result.product.category).toBe('dresses');
      expect(result.product.currency).toBe('PLN');
      expect(result.product.url).toBe('https://www.zalando.pl/x.html');
    }
  });

  /**
   * A name is a label, not an identity. Reserved sells four coats called
   * "Płaszcz handmade z wełną" and they differ only in colour; when the id was
   * the brand plus the name, importing all four left one product and three
   * ghosts that nothing could open. Happened on 2026-09-14 with a real batch.
   */
  const coat = (url: string): LinkDraft => ({
    url,
    name: 'Płaszcz handmade z wełną',
    brand: 'Reserved',
    price: 499.99,
    provenance: {},
    warnings: [],
  });

  const idOf = (draft: LinkDraft) => {
    const result = draftToRawProduct(draft, { category: 'outerwear' });
    return result.status === 'ok' ? result.product.id : result.status;
  };

  it('daje dwóm kolorom tej samej rzeczy dwa różne id', () => {
    const beige = idOf(coat('https://www.reserved.com/pl/pl/plaszcz-handmade-z-welna-147ky-80m'));
    const grey = idOf(coat('https://www.reserved.com/pl/pl/plaszcz-handmade-z-welna-147ky-85m'));
    expect(beige).toBe('link:reserved-plaszcz-handmade-z-welna-147ky-80m');
    expect(grey).not.toBe(beige);
  });

  it('bierze kod z zapytania, gdy sklep nie ma go w ścieżce', () => {
    const first = idOf(coat('https://sklep.pl/produkt?id=11'));
    const second = idOf(coat('https://sklep.pl/produkt?id=12'));
    expect(first).toBe('link:reserved-produkt-id-11');
    expect(second).not.toBe(first);
  });

  it('czyta kod spod ukośnika na końcu adresu', () => {
    // A shop that ends its addresses with "/" leaves an empty last segment,
    // and an empty key falls back to the name — which is the collision again.
    const first = idOf(coat('https://sklep.pl/plaszcz-80m/'));
    const second = idOf(coat('https://sklep.pl/plaszcz-85m/'));
    expect(first).toBe('link:reserved-plaszcz-80m');
    expect(second).not.toBe(first);
  });

  it('wraca do nazwy, gdy adresu nie da się rozebrać', () => {
    // Without a usable address the name is all there is; one product from one
    // paste is still better than no id at all.
    expect(idOf(coat('nie-adres'))).toBe('link:reserved-plaszcz-handmade-z-welna');
  });
});

describe('robots.txt', () => {
  // Zalando's real shape: open to everyone, closed to named AI crawlers.
  const ZALANDO_ROBOTS = `
User-agent: *
Disallow: /api/
Disallow: /cart/

User-agent: ClaudeBot
User-agent: GPTBot
Disallow: /
`;

  it('lets an honestly named agent through where the wildcard group allows it', () => {
    const rules = parseRobots(ZALANDO_ROBOTS, 'PaulaBot');
    expect(isAllowed(rules, '/vero-moda-sukienka-ve121c1x9-q11.html')).toBe(true);
    expect(isAllowed(rules, '/api/products')).toBe(false);
  });

  it('honours a group that bans a named crawler outright', () => {
    const rules = parseRobots(ZALANDO_ROBOTS, 'ClaudeBot');
    expect(isAllowed(rules, '/vero-moda-sukienka.html')).toBe(false);
  });

  it('lets a longer Allow override a broad Disallow', () => {
    const rules = parseRobots('User-agent: *\nDisallow: /\nAllow: /produkt/', 'PaulaBot');
    expect(isAllowed(rules, '/produkt/123')).toBe(true);
    expect(isAllowed(rules, '/konto')).toBe(false);
  });

  it('treats an empty Disallow as permission and a missing file as permission', () => {
    expect(isAllowed(parseRobots('User-agent: *\nDisallow:', 'PaulaBot'), '/x')).toBe(true);
    expect(isAllowed(parseRobots('', 'PaulaBot'), '/x')).toBe(true);
  });

  it('supports * and $ wildcards', () => {
    const rules = parseRobots('User-agent: *\nDisallow: /*.pdf$', 'PaulaBot');
    expect(isAllowed(rules, '/a/b/file.pdf')).toBe(false);
    expect(isAllowed(rules, '/a/b/file.pdf?x=1')).toBe(true);
  });
});
