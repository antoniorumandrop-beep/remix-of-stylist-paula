import type { Page } from '@playwright/test';

/**
 * Shared setup for the end-to-end tests.
 *
 * Everything Paula stores lives in `localStorage` behind the local backend
 * adapter (`src/lib/backend/local.ts`), so seeding it is how a test starts
 * from "already signed in, already measured" without walking onboarding again.
 * The keys are the adapter's own; if they move, these tests should fail loudly
 * rather than quietly testing a signed-out app.
 */
export const KEYS = {
  session: 'paula.session',
  profile: 'paula.bodyProfile',
  prefs: 'paula.prefs',
  saved: 'paula.saved',
  language: 'paula-lang',
} as const;

/** Runs before any page script, so React never sees the un-seeded state. */
export async function seedSignedIn(page: Page): Promise<void> {
  await page.addInitScript(
    ([keys]) => {
      localStorage.setItem(keys.language, 'pl');
      localStorage.setItem(
        keys.session,
        JSON.stringify({ userId: 'e2e-user', email: 'e2e@paula.test', createdAt: new Date().toISOString() }),
      );
      localStorage.setItem(
        keys.profile,
        JSON.stringify({
          source: 'measured',
          bust: 90,
          waist: 70,
          hips: 100,
          heightCm: 168,
          updatedAt: new Date().toISOString(),
        }),
      );
    },
    [KEYS] as const,
  );
}

/** Pins the language for tests that walk the app before anything is stored. */
export async function usePolish(page: Page): Promise<void> {
  await page.addInitScript(
    ([key]) => localStorage.setItem(key, 'pl'),
    [KEYS.language] as const,
  );
}

export async function readStorage<T>(page: Page, key: string): Promise<T | null> {
  const raw = await page.evaluate(k => localStorage.getItem(k), key);
  return raw ? (JSON.parse(raw) as T) : null;
}

/** Every price on screen, as numbers. Prices render as "129 PLN". */
export async function visiblePrices(page: Page): Promise<number[]> {
  const texts = await page.getByText(/^\d[\d\s]*\s*PLN$/).allTextContents();
  return texts.map(text => Number(text.replace(/[^\d]/g, ''))).filter(Number.isFinite);
}
