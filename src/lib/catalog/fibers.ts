import type { TranslationKey } from '@/i18n/translations';

/**
 * One record per fibre, so that a product description can be generated from
 * `product.material` — the field real shops actually publish — instead of
 * being written by hand per product.
 *
 * The prose lives in the translation table, not here: this file holds the
 * structure and the keys, so the panel renders in whatever language is active.
 * The 16 hand-written English descriptions this replaces would have evaporated
 * together with the mock catalogue.
 */
export type FiberId =
  | 'linen'
  | 'cotton'
  | 'viscose'
  | 'modal'
  | 'lyocell'
  | 'wool'
  | 'cashmere'
  | 'silk'
  | 'polyester'
  | 'polyamide'
  | 'acrylic'
  | 'elastane'
  | 'leather';

/** Strictest wins when several fibres disagree. Order is the strictness order. */
export const WASH_ORDER = ['dryClean', 'hand', 'cold', 'warm'] as const;
export type WashCare = (typeof WASH_ORDER)[number];

export const IRON_ORDER = ['none', 'low', 'medium', 'high'] as const;
export type IronCare = (typeof IRON_ORDER)[number];

export interface FiberFacts {
  id: FiberId;
  nameKey: TranslationKey;
  behaviorKey: TranslationKey;
  /**
   * Whether the fibre comes from a plant or an animal. Viscose, modal and
   * lyocell are made from wood but chemically regenerated, so they are not
   * natural — and that is a fact about origin, not a verdict on the garment.
   */
  natural: boolean;
  /** 0-100, generalisations about the fibre. Never a measurement of one item. */
  breathability: number;
  abrasion: number;
  pillingResistance: number;
  wash: WashCare;
  tumbleDry: boolean;
  iron: IronCare;
}

/**
 * Matched against the composition string after it is folded to plain ASCII
 * lowercase, so a single ASCII pattern covers "bawełna", "bawelna" and
 * "Bawełny". Word boundaries matter: "blend" contains "len".
 */
const ALIASES: Record<FiberId, RegExp> = {
  linen: /\b(len|lnu|lnian\w*|linen|flax)\b/,
  cotton: /\b(baweln\w*|bawelny|cotton|coton)\b/,
  viscose: /\b(wiskoz\w*|viscose|rayon)\b/,
  modal: /\b(modal\w*)\b/,
  lyocell: /\b(lyocell|liocel\w*|tencel)\b/,
  wool: /\b(welna|welny|welnian\w*|wool|merino|merynos\w*)\b/,
  cashmere: /\b(kaszmir\w*|cashmere)\b/,
  silk: /\b(jedwab\w*|silk)\b/,
  polyester: /\b(poliester\w*|poliestr\w*|polyester)\b/,
  polyamide: /\b(poliamid\w*|polyamide|nylon\w*)\b/,
  acrylic: /\b(akryl\w*|acrylic|acryl)\b/,
  elastane: /\b(elastan\w*|elastane|elasthan\w*|spandex|lycra)\b/,
  leather: /\b(skor[ay]|skorzan\w*|leather|suede|zamsz\w*)\b/,
};

export const FIBERS: Record<FiberId, FiberFacts> = {
  linen: {
    id: 'linen', nameKey: 'fiberLinen', behaviorKey: 'fiberLinenBehavior',
    natural: true, breathability: 95, abrasion: 80, pillingResistance: 90,
    wash: 'warm', tumbleDry: false, iron: 'high',
  },
  cotton: {
    id: 'cotton', nameKey: 'fiberCotton', behaviorKey: 'fiberCottonBehavior',
    natural: true, breathability: 85, abrasion: 70, pillingResistance: 70,
    wash: 'warm', tumbleDry: true, iron: 'high',
  },
  viscose: {
    id: 'viscose', nameKey: 'fiberViscose', behaviorKey: 'fiberViscoseBehavior',
    natural: false, breathability: 75, abrasion: 45, pillingResistance: 40,
    wash: 'cold', tumbleDry: false, iron: 'low',
  },
  modal: {
    id: 'modal', nameKey: 'fiberModal', behaviorKey: 'fiberModalBehavior',
    natural: false, breathability: 80, abrasion: 60, pillingResistance: 65,
    wash: 'warm', tumbleDry: true, iron: 'medium',
  },
  lyocell: {
    id: 'lyocell', nameKey: 'fiberLyocell', behaviorKey: 'fiberLyocellBehavior',
    natural: false, breathability: 85, abrasion: 70, pillingResistance: 70,
    wash: 'warm', tumbleDry: true, iron: 'medium',
  },
  wool: {
    id: 'wool', nameKey: 'fiberWool', behaviorKey: 'fiberWoolBehavior',
    natural: true, breathability: 80, abrasion: 75, pillingResistance: 45,
    wash: 'hand', tumbleDry: false, iron: 'low',
  },
  cashmere: {
    id: 'cashmere', nameKey: 'fiberCashmere', behaviorKey: 'fiberCashmereBehavior',
    natural: true, breathability: 80, abrasion: 50, pillingResistance: 25,
    wash: 'hand', tumbleDry: false, iron: 'low',
  },
  silk: {
    id: 'silk', nameKey: 'fiberSilk', behaviorKey: 'fiberSilkBehavior',
    natural: true, breathability: 80, abrasion: 45, pillingResistance: 75,
    wash: 'hand', tumbleDry: false, iron: 'low',
  },
  polyester: {
    id: 'polyester', nameKey: 'fiberPolyester', behaviorKey: 'fiberPolyesterBehavior',
    natural: false, breathability: 30, abrasion: 90, pillingResistance: 50,
    wash: 'warm', tumbleDry: true, iron: 'low',
  },
  polyamide: {
    id: 'polyamide', nameKey: 'fiberPolyamide', behaviorKey: 'fiberPolyamideBehavior',
    natural: false, breathability: 35, abrasion: 92, pillingResistance: 60,
    wash: 'warm', tumbleDry: true, iron: 'low',
  },
  acrylic: {
    id: 'acrylic', nameKey: 'fiberAcrylic', behaviorKey: 'fiberAcrylicBehavior',
    natural: false, breathability: 35, abrasion: 55, pillingResistance: 20,
    wash: 'warm', tumbleDry: false, iron: 'low',
  },
  elastane: {
    id: 'elastane', nameKey: 'fiberElastane', behaviorKey: 'fiberElastaneBehavior',
    natural: false, breathability: 30, abrasion: 60, pillingResistance: 70,
    wash: 'cold', tumbleDry: false, iron: 'low',
  },
  leather: {
    id: 'leather', nameKey: 'fiberLeather', behaviorKey: 'fiberLeatherBehavior',
    natural: true, breathability: 40, abrasion: 90, pillingResistance: 100,
    wash: 'dryClean', tumbleDry: false, iron: 'none',
  },
};

/** Folds Polish diacritics away so one ASCII pattern matches every spelling. */
export function foldToAscii(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** The fibre a fragment of a composition names, or null when we do not know it. */
export function matchFiber(fragment: string): FiberId | null {
  const folded = foldToAscii(fragment);
  for (const id of Object.keys(ALIASES) as FiberId[]) {
    if (ALIASES[id].test(folded)) return id;
  }
  return null;
}
