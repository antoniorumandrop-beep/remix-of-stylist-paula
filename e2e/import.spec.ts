import { test, expect } from '@playwright/test';
import { seedSignedIn } from './helpers';

/**
 * Getting real products into Paula.
 *
 * This is the intake path the whole product depends on — a small brand fills a
 * spreadsheet, someone pastes it here, and the clothes appear with photos,
 * shop links and the fit attributes the rules could read. It was covered by
 * unit tests on the parser and by nothing that checked the two ends met.
 */

const FEED = [
  'id;name;brand;price;category;url;image_url;material;description;sizes',
  'E2E-1;Sukienka kopertowa midi z wiskozy;Marka Testowa;249,00;sukienki;https://sklep.example.pl/1;;95% wiskoza, 5% elastan;Kopertowa sukienka midi.;34-42',
  'E2E-2;Spódnica ołówkowa;Marka Testowa;159,00;spódnice;https://sklep.example.pl/2;;100% poliester;Prosta spódnica.;S-XL',
  'E2E-3;Bez ceny;Marka Testowa;;sukienki;;;;;',
].join('\n');

test('feed marki przechodzi przez podgląd do katalogu', async ({ page }) => {
  await seedSignedIn(page);
  await page.goto('/admin/import');

  await page.getByPlaceholder('Wklej tutaj CSV albo JSON').fill(FEED);
  await page.getByRole('button', { name: 'Podgląd' }).click();

  // The pasted CSV is still sitting in the textarea, and Playwright counts a
  // textarea's value as text — so each product name matches twice. The preview
  // is rendered after the textarea, hence `.last()`.
  await expect(page.getByText('Sukienka kopertowa midi z wiskozy').last()).toBeVisible();
  await expect(page.getByText('Spódnica ołówkowa').last()).toBeVisible();

  // The row with no price is reported, not silently dropped — a brand has to
  // be able to fix its own file.
  await expect(page.getByText(/Pominięte wiersze/)).toBeVisible();
  await expect(page.getByText(/missing or unreadable price/)).toBeVisible();

  // The rules read the composition: 5% elastane is a stretch fabric.
  await expect(page.getByText(/stretch/).first()).toBeVisible();

  await page.getByRole('button', { name: /Importuj/ }).click();
  await expect(page.getByText(/Zaimportowane produkty \(2\)/)).toBeVisible();

  // And the point of all of it: they are in the app, not only in the admin.
  await page.goto('/app/search');
  const input = page.getByPlaceholder('Zapytaj Paulę o cokolwiek...');
  await input.fill('sukienka do 300 zł');
  await input.press('Enter');

  await expect(page.getByText('Sukienka kopertowa midi z wiskozy').first()).toBeVisible();
});

test('zaimportowane produkty można usunąć', async ({ page }) => {
  await seedSignedIn(page);
  await page.goto('/admin/import');

  await page.getByPlaceholder('Wklej tutaj CSV albo JSON').fill(FEED);
  await page.getByRole('button', { name: 'Podgląd' }).click();
  await page.getByRole('button', { name: /Importuj/ }).click();
  await expect(page.getByText(/Zaimportowane produkty \(2\)/)).toBeVisible();

  await page.getByRole('button', { name: /Usuń wszystkie zaimportowane/ }).click();
  await expect(page.getByText(/Zaimportowane produkty \(0\)/)).toBeVisible();
});
