import type { TranslationKey } from '@/i18n/translations';
import type { Category } from './types';

/**
 * Category ids are English strings inside the data, and until now every screen
 * printed them raw — the product page showed "dresses" in the middle of a
 * Polish page, with `capitalize` making it look deliberate. There was not one
 * category key in the translation table.
 *
 * Typing the map by `Category` rather than by `string` is the point: adding a
 * category to `CATEGORIES` without a label here stops compiling.
 */
const KEYS: Record<Category, TranslationKey> = {
  dresses: 'categoryDresses',
  tops: 'categoryTops',
  bottoms: 'categoryBottoms',
  skirts: 'categorySkirts',
  outerwear: 'categoryOuterwear',
  shoes: 'categoryShoes',
  accessories: 'categoryAccessories',
};

/** The category id we recognise, or an empty string when we do not know it. */
export function categoryOf(category: string | undefined): string {
  const key = category?.toLowerCase() ?? '';
  return key in KEYS ? key : '';
}

/**
 * The label for a category id, or the id itself when a feed sends one we do
 * not know yet — an unfamiliar category should still be readable, not blank.
 */
export function categoryLabel(
  category: string,
  t: (key: TranslationKey) => string,
): string {
  const key = KEYS[category?.toLowerCase() as Category];
  return key ? t(key) : category;
}
