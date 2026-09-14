/**
 * Colour, read from whatever prose the shop wrote.
 *
 * No feed in this project carries a colour field the parser can map: the five
 * LPP shops keep it in the page title ("… Kolor brązowy - RESERVED - …"), the
 * H&M/Zara CSV has no such column, and the mock catalogue has none either. So
 * colour is read from the product name and description, the same way the fit
 * attributes are.
 *
 * The important half is what happens when nobody wrote it down. A garment with
 * no colour here is **unknown**, never "not black" — searching for a black
 * dress must not throw away every dress whose colour we simply do not know.
 * That rule lives in the search (`applyPills`), and this module exists to make
 * the difference between "other colour" and "no colour" representable at all.
 */

/** Colours the search can recognise. Stable ids; the label is separate. */
export const COLOR_IDS = [
  'black', 'white', 'grey', 'beige', 'brown', 'navy', 'blue', 'green',
  'red', 'burgundy', 'pink', 'purple', 'yellow', 'orange', 'cream',
  'khaki', 'silver', 'gold',
] as const;

export type ColorId = (typeof COLOR_IDS)[number];

/**
 * Stems, matched at the start of a word, against text with its accents
 * stripped — the same shape as `categoryFromName`, and for the same reason:
 * Polish inflects, and people type "czarna", "czarnym", "czarnej".
 */
const COLOR_STEMS: Record<string, ColorId> = {
  czarn: 'black', czern: 'black', black: 'black',
  bial: 'white', biel: 'white', white: 'white',
  szar: 'grey', grafitow: 'grey', grey: 'grey', gray: 'grey',
  bezow: 'beige', beige: 'beige',
  brazow: 'brown', czekoladow: 'brown', brown: 'brown',
  granatow: 'navy', navy: 'navy',
  niebiesk: 'blue', blekitn: 'blue', blue: 'blue',
  zielon: 'green', green: 'green',
  czerwon: 'red', red: 'red',
  bordow: 'burgundy', burgundy: 'burgundy', wisniow: 'burgundy',
  rozow: 'pink', pudrow: 'pink', pink: 'pink',
  fioletow: 'purple', liliow: 'purple', purple: 'purple',
  zolt: 'yellow', yellow: 'yellow',
  pomaranczow: 'orange', orange: 'orange',
  kremow: 'cream', ecru: 'cream', cream: 'cream',
  khaki: 'khaki', oliwkow: 'khaki',
  srebrn: 'silver', silver: 'silver',
  zlot: 'gold', gold: 'gold',
};

/**
 * Words that begin with a colour stem and are not that colour.
 *
 * "Szarfa" is a sash, not the colour grey, and it turns up in dress names.
 * Kept as an explicit list rather than by lengthening the stem, because
 * "szary" inflects into a dozen forms and "szarf" into three.
 */
const NOT_COLORS = ['szarf', 'zloz', 'zlot-'];

/** Shade prefixes shops compound onto a colour: "jasnoniebieski", "ciemnozielony". */
const PREFIXES = ['jasno', 'ciemno', 'intensywnie', 'glęboko', 'gleboko'];

const ACCENTS: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
};

function deaccent(text: string): string {
  return text.toLowerCase().replace(/[ąćęłńóśźż]/g, ch => ACCENTS[ch] ?? ch);
}

const LABELS_PL: Record<ColorId, string> = {
  black: 'czarny', white: 'biały', grey: 'szary', beige: 'beżowy',
  brown: 'brązowy', navy: 'granatowy', blue: 'niebieski', green: 'zielony',
  red: 'czerwony', burgundy: 'bordowy', pink: 'różowy', purple: 'fioletowy',
  yellow: 'żółty', orange: 'pomarańczowy', cream: 'kremowy', khaki: 'khaki',
  silver: 'srebrny', gold: 'złoty',
};

export function colorLabelPl(id: string): string {
  return LABELS_PL[id as ColorId] ?? id;
}

/**
 * The first colour named in the given texts, or null when none is.
 *
 * Texts are searched in order, so callers pass the name before the
 * description: the name is what the shop chose to call the garment, while
 * descriptions mention colours that belong to other things ("pasuje do
 * czarnych spodni").
 */
export function colorFromText(...texts: (string | undefined)[]): ColorId | null {
  for (const text of texts) {
    if (!text) continue;
    for (const raw of deaccent(text).split(/[^a-z0-9]+/)) {
      if (!raw) continue;
      if (NOT_COLORS.some(bad => raw.startsWith(bad))) continue;
      // Shops compound the shade onto the colour: H&M's variant for one jeans
      // link is "Jasnoniebieski denim" and Zara writes "Ciemnozielony". The
      // stem is there, just not at the front. Stripped only when something
      // follows — "jasne spodnie" names no colour at all.
      const word = PREFIXES.reduce(
        (w, prefix) => (w.startsWith(prefix) && w.length > prefix.length ? w.slice(prefix.length) : w),
        raw,
      );
      for (const [stem, id] of Object.entries(COLOR_STEMS)) {
        if (word.startsWith(stem)) return id;
      }
    }
  }
  return null;
}
