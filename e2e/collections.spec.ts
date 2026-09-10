import { test, expect } from '@playwright/test';
import { seedSignedIn } from './helpers';

/**
 * Collections, end to end.
 *
 * The point of this test is the refresh at the end. Before this feature, the
 * collections tab rendered four hard-coded collections, "New collection" was
 * disabled, and "Add to collection" on a product card hearted the product
 * instead — so a walk-through that never reloaded the page could have looked
 * fine while nothing was stored anywhere.
 */
test('kolekcja przeżywa odświeżenie razem z produktem', async ({ page }) => {
  await seedSignedIn(page);

  await page.goto('/app/saved');
  await page.getByRole('button', { name: 'Kolekcje' }).click();
  await expect(page.getByText(/Nie masz jeszcze kolekcji/)).toBeVisible();

  await page.getByRole('button', { name: /Nowa kolekcja/ }).click();
  await page.getByPlaceholder('Nazwa kolekcji').fill('Na wesele');
  await page.getByRole('button', { name: /Utwórz/ }).click();
  await expect(page.getByText('Na wesele')).toBeVisible();

  // Now put something in it, from a product card, which is where the gesture
  // actually lives.
  await page.goto('/app/for-you');
  const card = page.locator('.group').filter({ hasText: 'PLN' }).first();
  await card.getByRole('button', { name: 'Akcje produktu' }).click();
  await card.getByRole('button', { name: 'Dodaj do kolekcji' }).click();
  await card.getByRole('button', { name: 'Na wesele' }).click();

  await page.goto('/app/saved');
  await page.getByRole('button', { name: 'Kolekcje' }).click();
  await expect(page.getByText(/1 element/)).toBeVisible();

  await page.getByText('Na wesele').click();
  await expect(page).toHaveURL(/\/app\/collection\//);
  const url = page.url();

  // The cold load: a bookmark, a shared link, a refresh.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Na wesele' })).toBeVisible();
  await expect(page.getByText('PLN').first()).toBeVisible();

  // And renaming survives it too.
  await page.getByRole('button', { name: 'Zmień nazwę' }).click();
  await page.locator('input').first().fill('Na ślub');
  await page.getByRole('button', { name: 'Zmień nazwę' }).nth(0).click();
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Na ślub' })).toBeVisible();
});
