import { test, expect } from '@playwright/test';
import { seedSignedIn, visiblePrices } from './helpers';

/**
 * Asking Paula for something within a budget.
 *
 * The budget is the one constraint a person states in plain words and expects
 * to be honoured literally. It travels from the sentence, through a pill she
 * can see and edit, into the filter that picks the results — and every one of
 * those steps is a place it can quietly stop mattering.
 */

test('budżet z wiadomości pojawia się jako pigułka i ogranicza wyniki', async ({ page }) => {
  await seedSignedIn(page);
  await page.goto('/app/search');

  const input = page.getByPlaceholder('Zapytaj Paulę o cokolwiek...');
  await input.fill('szukam sukienki do 200 zł');
  await input.press('Enter');

  // What she typed is echoed straight away, before any answer.
  await expect(page.getByText('szukam sukienki do 200 zł')).toBeVisible();

  // The pill: her constraint, made visible and editable.
  const pill = page.getByText(/Budżet: 200 PLN/);
  await expect(pill).toBeVisible();

  // The indicator has to clear; if it never does, the turn silently failed.
  await expect(page.getByText('Paula pisze…')).toBeHidden();

  const prices = await visiblePrices(page);
  expect(prices.length).toBeGreaterThan(0);
  for (const price of prices) {
    expect(price).toBeLessThanOrEqual(200);
  }
});

test('rozmowa przeżywa wejście w produkt i powrót', async ({ page }) => {
  await seedSignedIn(page);
  await page.goto('/app/search');

  const input = page.getByPlaceholder('Zapytaj Paulę o cokolwiek...');
  await input.fill('szukam sukienki do 200 zł');
  await input.press('Enter');
  await expect(page.getByText(/Budżet: 200 PLN/)).toBeVisible();

  // Leaving the screen and coming back is the most likely next thing she does.
  await page.goto('/app/profile');
  await page.goto('/app/search');

  await expect(page.getByText('szukam sukienki do 200 zł')).toBeVisible();
  await expect(page.getByText(/Budżet: 200 PLN/)).toBeVisible();
});
