import { test, expect, type Page } from '@playwright/test';
import { seedSignedIn } from './helpers';

/**
 * Własne fity — jedyne pokrycie warstwy zdjęć.
 *
 * Ten plik istnieje, bo vitest nie ma czym tego sprawdzić: jsdom nie
 * implementuje ani IndexedDB, ani canvasu, więc test jednostkowy musiałby
 * najpierw zbudować atrapę obu — a atrapa potrafi przejść dokładnie wtedy, gdy
 * prawdziwe API pada. Tutaj jest prawdziwy Chromium, prawdziwy `<input
 * type="file">`, prawdziwe skalowanie w canvasie i prawdziwy magazyn.
 *
 * Ścieżka pliku jest opisana w `docs/own-fits-photos.md`; te testy pilnują,
 * żeby dokument dalej opisywał rzeczywistość — bo dokument nie przerywa builda.
 */

/** Najmniejszy poprawny PNG. Chromium go zdekoduje, czyli przejdzie całą ścieżkę. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const photo = (name: string) => ({ name, mimeType: 'image/png', buffer: PNG });

/**
 * Ile blobów naprawdę leży w magazynie — czytane z tej samej bazy, do której
 * pisze aplikacja, a nie ze stanu Reacta. Bez tego „usunęłam zdjęcie" znaczy
 * tylko tyle, że zniknęło z ekranu.
 */
async function storedPhotos(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const request = indexedDB.open('paula.photos');
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('photos')) {
            resolve(0);
            return;
          }
          const count = db.transaction('photos', 'readonly').objectStore('photos').count();
          count.onsuccess = () => resolve(count.result);
          count.onerror = () => reject(count.error);
        };
        request.onerror = () => reject(request.error);
      }),
  );
}

async function startFit(page: Page) {
  await seedSignedIn(page);
  await page.goto('/app/fits');
  await page.getByRole('button', { name: 'Dodaj fit' }).first().click();
  await expect(page).toHaveURL(/\/app\/fits\/new$/);
}

test('fit ze zdjęciami i wypisanymi rzeczami przeżywa odświeżenie', async ({ page }) => {
  await startFit(page);

  await page.locator('input[type="file"]').setInputFiles([photo('przod.png'), photo('bok.png')]);
  await expect(page.getByRole('button', { name: 'Usuń zdjęcie' })).toHaveCount(2);

  await page.locator('#fit-name').fill('Sobota, kawa z Zosią');

  // Jedna rzecz w linijce, Enter dodaje następną — to jest cały mechanizm
  // „zaznacz, co masz na sobie" i nie przechodzi przez katalog.
  const first = page.getByPlaceholder('sweter oversize, Zara');
  await first.fill('sweter oversize, Zara');
  await first.press('Enter');
  await page.getByPlaceholder('a co jeszcze?').first().fill('jeansy mom fit, second hand');

  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page).toHaveURL(/\/app\/fits\/o-/);

  // Zimne wejście: zakładka, wklejony link, odświeżenie.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sobota, kawa z Zosią' })).toBeVisible();
  await expect(page.getByText('sweter oversize, Zara')).toBeVisible();
  await expect(page.getByText('jeansy mom fit, second hand')).toBeVisible();

  // Zdjęcia wracają z magazynu jako obrazy, a nie jako puste ramki.
  const frames = page.getByRole('group', { name: /przeciągnij w bok/i }).locator('img');
  await expect(frames).toHaveCount(2);
  await expect(frames.first()).toHaveAttribute('src', /^blob:/);

  expect(await storedPhotos(page)).toBe(2);
});

test('zdjęcie wyjęte z fitu ginie z magazynu od razu', async ({ page }) => {
  await startFit(page);

  await page.locator('input[type="file"]').setInputFiles([photo('a.png'), photo('b.png')]);
  await expect(page.getByRole('button', { name: 'Usuń zdjęcie' })).toHaveCount(2);
  expect(await storedPhotos(page)).toBe(2);

  await page.getByRole('button', { name: 'Usuń zdjęcie' }).first().click();
  await expect(page.getByRole('button', { name: 'Usuń zdjęcie' })).toHaveCount(1);

  // Nie przy zapisie, tylko w chwili, w której ona tak powiedziała.
  await expect.poll(() => storedPhotos(page)).toBe(1);
});

test('skasowany fit zabiera swoje zdjęcia ze sobą', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await startFit(page);

  await page.locator('input[type="file"]').setInputFiles([photo('a.png')]);
  await page.locator('#fit-name').fill('Do wyrzucenia');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page).toHaveURL(/\/app\/fits\/o-/);
  expect(await storedPhotos(page)).toBe(1);

  await page.getByRole('button', { name: 'Usuń', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/fits$/);
  await expect(page.getByText('Nie ma jeszcze fitów')).toBeVisible();

  // Żadnych osieroconych bajtów.
  await expect.poll(() => storedPhotos(page)).toBe(0);
});

test('porzucony edytor nie zostawia zdjęć w magazynie', async ({ page }) => {
  await startFit(page);

  await page.locator('input[type="file"]').setInputFiles([photo('a.png'), photo('b.png')]);
  await expect(page.getByRole('button', { name: 'Usuń zdjęcie' })).toHaveCount(2);
  expect(await storedPhotos(page)).toBe(2);

  // Zdjęcia wgrane w tym posiedzeniu i nigdy niezapisane nie mają na co
  // wskazywać, więc wychodzą razem z edytorem.
  await page.getByRole('button', { name: 'Anuluj' }).click();
  await expect(page).toHaveURL(/\/app\/fits$/);
  await expect.poll(() => storedPhotos(page)).toBe(0);
});
