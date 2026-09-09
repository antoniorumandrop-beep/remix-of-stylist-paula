import { test, expect } from '@playwright/test';
import { KEYS, usePolish, readStorage } from './helpers';

/**
 * The whole way in: sign up, answer every question, land in the app.
 *
 * This is the flow that decides whether Paula knows anything about the person
 * using her. It had two silent failures inside a week — the final button
 * skipped the save entirely, and two of the questions had no screen to be
 * answered on — and neither showed up as an error. Both were invisible until
 * someone walked the whole thing.
 */

interface StoredPrefs {
  name?: string;
  aesthetics: string[];
  fitPrefs: string[];
  occasions: string[];
  budgetMin: number | null;
  budgetMax: number | null;
}

test('cała ścieżka od logowania do kanału zapisuje profil i preferencje', async ({ page }) => {
  await usePolish(page);
  await page.goto('/login');

  await page.getByPlaceholder('Adres e-mail').fill('e2e@paula.test');
  await page.getByRole('button', { name: 'Zarejestruj się', exact: true }).click();

  await expect(page).toHaveURL(/\/onboarding/);

  // 0 — imię
  await page.getByPlaceholder('Twoje imię').fill('Gabriela');
  const dalej = page.getByRole('button', { name: /^Dalej/ });
  await dalej.click();

  // 1 — proporcje (wartości domyślne są poprawne), 2 — wzrost, 3 — inspiracje
  await dalej.click();
  await dalej.click();
  await dalej.click();

  // 4 — estetyki
  await expect(page.getByRole('heading', { name: 'Które z nich to Ty?' })).toBeVisible();
  await page.getByRole('button', { name: 'Minimalistyczny' }).click();
  await page.getByRole('button', { name: 'Klasyczny' }).click();
  await dalej.click();

  // 5 — jak mają leżeć ubrania
  await expect(page.getByRole('heading', { name: 'Jak lubisz, żeby ubrania leżały?' })).toBeVisible();
  await page.getByRole('button', { name: 'Swobodne', exact: true }).click();
  await dalej.click();

  // 6 — okazje
  await page.getByRole('button', { name: 'Biuro', exact: true }).click();
  await dalej.click();

  // 7 — budżet, 8 — marki
  await dalej.click();
  await dalej.click();

  // 9 — podsumowanie. Stopka jest tu ukryta, więc zapis idzie z tego przycisku.
  await expect(page.getByRole('heading', { name: /Paula jest gotowa/i })).toBeVisible();
  await page.getByRole('button', { name: 'Zacznij eksplorować' }).click();

  await expect(page).toHaveURL(/\/app\/for-you/);

  const prefs = await readStorage<StoredPrefs>(page, KEYS.prefs);
  expect(prefs).not.toBeNull();
  expect(prefs!.name).toBe('Gabriela');
  expect(prefs!.aesthetics).toEqual(['minimalist', 'classic']);
  expect(prefs!.fitPrefs).toEqual(['relaxed']);
  expect(prefs!.occasions).toContain('Office');
  expect(prefs!.budgetMin).toBeLessThanOrEqual(prefs!.budgetMax!);

  const profile = await readStorage<{ source: string; bust: number }>(page, KEYS.profile);
  expect(profile).not.toBeNull();
  expect(profile!.source).toBe('measured');
  expect(profile!.bust).toBeGreaterThan(0);
});

test('bez profilu ciała aplikacja odsyła do onboardingu', async ({ page }) => {
  await usePolish(page);
  await page.addInitScript(
    ([key]) =>
      localStorage.setItem(
        key,
        JSON.stringify({ userId: 'e2e-user', email: 'e2e@paula.test', createdAt: new Date().toISOString() }),
      ),
    [KEYS.session] as const,
  );

  await page.goto('/app/for-you');
  await expect(page).toHaveURL(/\/onboarding/);
});
