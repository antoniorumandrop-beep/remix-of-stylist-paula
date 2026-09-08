import type {
  Attr,
  ClosureType,
  FitAttributes,
  LengthClass,
  Neckline,
  Rise,
  Silhouette,
  SleeveLength,
  WaistDefinition,
} from '@/lib/fit/attributes';
import { parseStretch } from '@/lib/fit/stretch';

/**
 * Rule-based enrichment: turns the text a feed gives us (name, description,
 * material) into fit attributes. Deterministic and free. It is the v0 of the
 * enrichment layer — the AI layer will take the same input and fill the gaps
 * this misses, but the rules stay as the cheap first pass.
 *
 * Every rule is a keyword the shop itself used. Nothing here guesses: a dress
 * whose name says nothing about length gets no length, and the scorer says so.
 */

type Rule<T> = { value: T; re: RegExp };

const SILHOUETTE: Rule<Silhouette>[] = [
  { value: 'wrap', re: /\b(wrap|kopertow)/i },
  { value: 'a-line', re: /\b(a-?line|trapez)/i },
  { value: 'flared', re: /\b(flared?|flowy|tiered|pleated|swing|rozkloszowan|plisowan|falban)/i },
  { value: 'empire', re: /\b(empire)/i },
  { value: 'oversized', re: /\b(oversize[d]?|boxy|relaxed)/i },
  { value: 'fitted', re: /\b(fitted|bodycon|slim|pencil|ribbed|smocked|tailored|dopasowan|o[łl]ówkow|prążkowan|marszczon|taliowan)/i },
  { value: 'straight', re: /\b(straight|shift|slip|column|prost[ay]|koszulow)/i },
];

const LENGTH: Rule<LengthClass>[] = [
  { value: 'cropped', re: /\b(cropped|crop|krótk[ai]|skrócon)/i },
  { value: 'mini', re: /\b(mini)\b/i },
  { value: 'midi', re: /\b(midi)\b/i },
  { value: 'maxi', re: /\b(maxi)\b/i },
  { value: 'knee', re: /\b(knee[- ]length|do kolan)/i },
  { value: 'full', re: /\b(full[- ]length|wide[- ]leg|straight[- ]leg|długie|szerokie nogawki)/i },
];

const RISE: Rule<Rise>[] = [
  { value: 'high', re: /\b(high[- ]?(waist|rise)|wysoki stan|z wysokim stanem)/i },
  { value: 'low', re: /\b(low[- ]?(waist|rise)|niski stan)/i },
  { value: 'mid', re: /\b(mid[- ]?(waist|rise)|średni stan)/i },
];

const SLEEVE: Rule<SleeveLength>[] = [
  { value: 'sleeveless', re: /\b(sleeveless|cami(sole)?|tank|strappy|halter|bez rękawów|na ramiączkach)/i },
  { value: 'three-quarter', re: /\b(3\/4|three[- ]quarter|rękaw 3\/4)/i },
  { value: 'long', re: /\b(long[- ]sleeve[sd]?|długi rękaw|z długim rękawem)/i },
  { value: 'short', re: /\b(short[- ]sleeve[sd]?|krótki rękaw|z krótkim rękawem)/i },
];

const NECKLINE: Rule<Neckline>[] = [
  { value: 'v', re: /\b(v[- ]?neck|w serek)/i },
  { value: 'square', re: /\b(square[- ]?neck|karo)/i },
  { value: 'halter', re: /\b(halter)/i },
  { value: 'off-shoulder', re: /\b(off[- ]?(the[- ])?shoulder|hiszpank)/i },
  { value: 'boat', re: /\b(boat[- ]?neck|bardot|łódk)/i },
  { value: 'scoop', re: /\b(scoop)/i },
  { value: 'crew', re: /\b(crew[- ]?neck|round[- ]?neck|okrągły dekolt)/i },
];

const CLOSURE: Rule<ClosureType>[] = [
  { value: 'wrap-tie', re: /\b(wrap|kopertow)/i },
  { value: 'buttons', re: /\b(button|shirt|cardigan|blazer|polo|guzik|koszul|kardigan|marynark)/i },
  { value: 'zip', re: /\b(zip|jeans|trousers|skirt|zamek|dżins|jeans|spodni|spódnic)/i },
  { value: 'elastic', re: /\b(elastic|smocked|gumk|marszczon)/i },
];

const WAIST: Rule<WaistDefinition>[] = [
  { value: 'elasticated', re: /\b(smocked|elasticated|shirred|gumk|marszczon)/i },
  { value: 'high', re: /\b(high[- ]?(waist|rise)|empire|wysoki stan|z wysokim stanem)/i },
  { value: 'low', re: /\b(drop[- ]waist|low[- ]?(waist|rise)|niski stan)/i },
  { value: 'natural', re: /\b(belted|cinched|wrap|fitted|tailored|a-?line|z paskiem|kopertow|taliowan|dopasowan)/i },
  { value: 'none', re: /\b(oversize[d]?|shift|slip|boxy|relaxed|straight|prost[ay])/i },
];

const NAME_CONFIDENCE = 0.75;
const DESCRIPTION_CONFIDENCE = 0.6;

function match<T>(rules: Rule<T>[], name: string, description?: string): Attr<T> | undefined {
  for (const rule of rules) {
    if (rule.re.test(name)) return { value: rule.value, confidence: NAME_CONFIDENCE };
  }
  if (description) {
    for (const rule of rules) {
      if (rule.re.test(description)) return { value: rule.value, confidence: DESCRIPTION_CONFIDENCE };
    }
  }
  return undefined;
}

export interface EnrichInput {
  name: string;
  description?: string;
  material?: string | { name: string; percent: number }[] | null;
}

export function enrichFromText(input: EnrichInput): FitAttributes {
  const { name, description } = input;
  const out: FitAttributes = {};

  const set = <K extends keyof FitAttributes>(key: K, value: FitAttributes[K]) => {
    if (value !== undefined) out[key] = value;
  };

  set('silhouette', match(SILHOUETTE, name, description));
  set('lengthClass', match(LENGTH, name, description));
  set('rise', match(RISE, name, description));
  set('sleeveLength', match(SLEEVE, name, description));
  set('neckline', match(NECKLINE, name, description));
  set('closureType', match(CLOSURE, name, description));
  set('waistDefinition', match(WAIST, name, description));

  const stretch = parseStretch(input.material ?? null);
  if (stretch.level !== 'unknown') {
    set('stretchLevel', { value: stretch.level, confidence: stretch.confidence });
  }

  return out;
}

/**
 * Human corrections win over rules; anything the human did not touch keeps
 * the rule's value. Confidence travels with each attribute, so the scorer
 * still knows which is which.
 */
export function mergeAttributes(base: FitAttributes, override: FitAttributes | undefined): FitAttributes {
  if (!override) return base;
  return { ...base, ...override };
}
