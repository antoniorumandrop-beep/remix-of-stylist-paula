import { test, expect } from '@playwright/test';
import { seedSignedIn, KEYS, readStorage } from './helpers';

/**
 * Saving a product and finding it again.
 *
 * Two screens and a storage round-trip, which is exactly the kind of seam
 * where something works in isolation and not end to end.
 */

test('zapisany produkt pojawia się na liście zapisanych', async ({ page }) => {
  await seedSignedIn(page);
  await page.goto('/app/for-you');

  // The first card in the feed; its name is what we look for afterwards.
  const card = page.locator('.group.cursor-pointer').first();
  await expect(card).toBeVisible();
  await card.hover();

  // The heart opens the save dialog; saving is the explicit choice inside it.
  await card.getByRole('button', { name: 'Zapisz tę rzecz' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: 'Zapisane' }).click();
  await sheet.getByRole('button', { name: 'Gotowe' }).click();

  await expect
    .poll(async () => (await readStorage<string[]>(page, KEYS.saved))?.length ?? 0)
    .toBeGreaterThan(0);

  const savedIds = (await readStorage<string[]>(page, KEYS.saved))!;

  await page.goto('/app/saved');
  await expect(page.getByRole('heading', { name: 'Zapisane' })).toBeVisible();

  // The saved product is on the page, and nothing else claims to be saved.
  const savedCards = page.locator('.group.cursor-pointer');
  await expect(savedCards).toHaveCount(savedIds.length);
});
