import { test, expect } from '@playwright/test';
import { seedSignedIn } from './helpers';

/**
 * Every route, loaded directly.
 *
 * Splitting the routes into separate chunks broke two of them, and the first
 * round of end-to-end tests did not notice: they all reached their screens by
 * navigating from somewhere else, and the crash only happens on a cold load,
 * where an auth or profile gate renders `null` and then swaps synchronously to
 * a chunk that has not arrived yet.
 *
 * So this walks in through the front door of each address, which is what a
 * bookmark, a shared link or a refresh does.
 */

const CRASH = 'Coś poszło nie tak';

const GATED = [
  '/onboarding',
  '/app/for-you',
  '/app/search',
  '/app/saved',
  '/app/profile',
  '/app/alerts',
  '/app/add',
  '/app/fitting-room',
  '/app/build-your-style',
  '/app/product/1',
  '/app/brand/COS',
  '/app/collection/1',
  '/admin/import',
];

for (const route of GATED) {
  test(`wejście prosto na ${route} nie wywala aplikacji`, async ({ page }) => {
    await seedSignedIn(page);
    await page.goto(route);

    await expect(page.getByText(CRASH)).toBeHidden();
    // Something has to actually render; a blank page would also pass a
    // "no crash" check on its own.
    await expect(page.locator('body')).not.toBeEmpty();
  });
}

test('strona publiczna i logowanie działają bez sesji', async ({ page }) => {
  for (const route of ['/', '/login']) {
    await page.goto(route);
    await expect(page.getByText(CRASH)).toBeHidden();
  }
});

test('nieznany adres pokazuje stronę 404, a nie ekran awarii', async ({ page }) => {
  await seedSignedIn(page);
  await page.goto('/nie-ma-takiej-strony');

  await expect(page.getByText(CRASH)).toBeHidden();
  await expect(page.getByText('Tej strony nie ma')).toBeVisible();
});
