import type { WardrobeItem } from '@/lib/wardrobe';

/**
 * Which things in the wardrobe are worth asking about.
 *
 * The "did it fit?" answers are the dataset this product is built on, and the
 * button asking for them sits on each wardrobe tile — invisible past the first
 * few items. So the wardrobe now leads with the ones still missing an answer.
 *
 * Two rules keep that from turning into nagging:
 *
 * - **Nothing is asked about for the first few days.** A thing ordered on
 *   Monday has not arrived by Tuesday, and a question she cannot answer
 *   teaches her that the question is noise.
 * - **Wearing it overrides the wait.** If she marked it worn, it is on her,
 *   and the delivery guess no longer matters.
 *
 * Paula stays reactive either way: this appears inside a screen she opened, in
 * a row she can ignore. It never leaves the app.
 */
export const DAYS_BEFORE_ASKING = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export function dueForFeedback(
  items: WardrobeItem[],
  answered: Set<string>,
  now: Date = new Date(),
): WardrobeItem[] {
  return items
    .filter(item => {
      if (answered.has(item.productId)) return false;
      if (item.timesWorn > 0) return true;
      const added = Date.parse(item.addedAt);
      // An unparseable date is not a reason to pester her about the item.
      if (Number.isNaN(added)) return false;
      return now.getTime() - added >= DAYS_BEFORE_ASKING * DAY_MS;
    })
    // Oldest first: the thing she has had longest is the one she can speak to.
    .sort((a, b) => Date.parse(a.addedAt) - Date.parse(b.addedAt));
}
