/**
 * Polish counted nouns.
 *
 * Polish takes three forms after a number, not two: 1 rzecz, 2 rzeczy,
 * 5 rzeczy — and the middle form applies to 2–4 except in the teens, where
 * 12, 13 and 14 fall back to the "many" form. Getting this wrong produces
 * copy like "2 ocenionych rzeczy", which reads as broken Polish to every user
 * of the app and to nobody writing the English side of the table.
 *
 * One function, one test, used by every counted string in `translations.ts`.
 */
export function plPlural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n);
  if (abs % 1 !== 0) return many;
  if (abs === 1) return one;
  const lastTwo = abs % 100;
  const last = abs % 10;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
  return many;
}
