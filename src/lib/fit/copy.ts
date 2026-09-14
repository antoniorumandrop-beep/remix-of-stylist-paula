import type { TranslationKey, TranslationArgs } from '@/i18n/translations';
import type { BodyPoint, BodyShape, Verdict } from './types';
import type { LengthNote } from './length';

type T = <K extends TranslationKey>(key: K, ...args: TranslationArgs<K>) => string;

/**
 * Maps the engine's stable reason codes to translation keys. The engine never
 * produces prose; this is the only place where codes become words.
 */

const SHAPE_KEYS: Record<BodyShape, TranslationKey> = {
  'hourglass': 'shapeHourglass',
  'bottom-hourglass': 'shapeBottomHourglass',
  'top-hourglass': 'shapeTopHourglass',
  'spoon': 'shapeSpoon',
  'triangle': 'shapeTriangle',
  'inverted-triangle': 'shapeInvertedTriangle',
  'rectangle': 'shapeRectangle',
  'diamond': 'shapeDiamond',
  'oval': 'shapeOval',
};

const POINT_KEYS: Record<BodyPoint, TranslationKey> = {
  bust: 'bust',
  waist: 'waist',
  hips: 'hips',
  thighs: 'thighs',
  stomach: 'stomach',
};

const VERDICT_KEYS: Record<Verdict, TranslationKey> = {
  tight: 'verdictTight',
  loose: 'verdictLoose',
  neutral: 'verdictNeutral',
  unknown: 'verdictUnknown',
};

const LENGTH_KEYS: Record<LengthNote, TranslationKey> = {
  runsLong: 'lengthRunsLong',
  runsShort: 'lengthRunsShort',
  asIntended: 'lengthAsIntended',
};

const GARMENT_KEYS: Record<string, TranslationKey> = {
  'fitted.amplifies': 'reasonGarmentFitted',
  'flared.relieves': 'reasonGarmentFlared',
  'oversized.loose': 'reasonGarmentOversized',
  'wrap.definesWaist': 'reasonGarmentWrap',
  'empire.skimsStomach': 'reasonGarmentEmpire',
  'definedWaist.closesGap': 'reasonGarmentDefinedWaist',
  'elasticated.adapts': 'reasonGarmentElasticated',
  'highRise.smooths': 'reasonGarmentHighRise',
  'buttons.gape': 'reasonGarmentButtons',
};

export const shapeKey = (shape: BodyShape) => SHAPE_KEYS[shape];
export const pointKey = (point: BodyPoint) => POINT_KEYS[point];
export const verdictKey = (verdict: Verdict) => VERDICT_KEYS[verdict];
export const lengthKey = (note: LengthNote) => LENGTH_KEYS[note];

export function reasonText(code: string, t: T): string | null {
  const [group, a, b, c] = code.split('.');
  if (group === 'shape') {
    const point = t(POINT_KEYS[c as BodyPoint]).toLowerCase();
    return b === 'tight' ? t('reasonShapeTight', point) : t('reasonShapeLoose', point);
  }
  if (group === 'garment') {
    const key = GARMENT_KEYS[`${a}.${b}`];
    return key ? t(key) : null;
  }
  if (group === 'fabric') {
    if (c === 'high') return t('reasonStretchHigh');
    if (c === 'low') return t('reasonStretchLow');
    if (c === 'none') return t('reasonStretchNone');
    return null;
  }
  // `size.short.<cm>` — the number rides in the code because it is measured,
  // not chosen, and the engine still hands the UI codes rather than prose.
  if (group === 'size' && a === 'short') return t('reasonSizeShort', Number(b));
  if (group === 'data') return t('reasonMissingData');
  return null;
}
