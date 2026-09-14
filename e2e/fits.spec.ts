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

test('zdjęcia obracają się przeciągnięciem i strzałkami, nie przewijają się jak karty', async ({ page }) => {
  // Ten test steruje obrotem ręcznie, więc autoodtwarzanie musi mu zejść z drogi —
  // tym samym ustawieniem systemowym, którym schodzi z drogi użytkowniczce.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startFit(page);

  await page.locator('input[type="file"]').setInputFiles([photo('1.png'), photo('2.png'), photo('3.png')]);
  await page.locator('#fit-name').fill('Obrót');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page).toHaveURL(/\/app\/fits\/o-/);

  const sweep = page.getByRole('group', { name: /przeciągnij w bok/i });
  const frames = sweep.locator('img');
  await expect(frames).toHaveCount(3);
  await expect(frames.nth(0)).toHaveClass(/opacity-100/);

  // Przeciągnięcie w lewo to obrót w prawo — jedno pełne przeciągnięcie przez
  // kadr przechodzi przez wszystkie kąty, niezależnie od liczby zdjęć.
  const box = (await sweep.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width - 8, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 8, y, { steps: 12 });
  await page.mouse.up();

  await expect(frames.nth(2)).toHaveClass(/opacity-100/);
  await expect(frames.nth(0)).toHaveClass(/opacity-0/);

  // Klawiatura robi to samo, bo przeciąganie myszą nikomu nie przychodzi do głowy.
  await sweep.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(frames.nth(1)).toHaveClass(/opacity-100/);
});

test('panel dopinania zostaje otwarty i pozwala zaznaczyć kilka rzeczy naraz', async ({ page }) => {
  await seedSignedIn(page);
  // Dwie rzeczy w szafie, żeby było co dopinać.
  await page.addInitScript(() => {
    localStorage.setItem('paula.wardrobe', JSON.stringify([
      { productId: '1', addedAt: new Date().toISOString(), timesWorn: 0 },
      { productId: '2', addedAt: new Date().toISOString(), timesWorn: 0 },
    ]));
  });

  await page.goto('/app/fits/new');
  await page.getByRole('button', { name: /Dopnij rzecz z Pauli/ }).click();

  const panel = page.getByPlaceholder('Szukaj w szafie i zapisanych');
  await expect(panel).toBeVisible();

  // Wiersze panelu to przełączniki i mówią to wprost, więc da się je wskazać
  // stanem, a nie wyglądem.
  const offered = page.locator('button[aria-pressed]');
  await expect(offered.first()).toHaveAttribute('aria-pressed', 'false');

  await offered.nth(0).click();
  // Nie zamknął się po pierwszym wyborze — o to chodziło.
  await expect(panel).toBeVisible();
  await offered.nth(1).click();

  const rows = page.getByRole('button', { name: 'Usuń tę rzecz' });
  await expect(rows).toHaveCount(2);
  await expect(page.locator('button[aria-pressed="true"]')).toHaveCount(2);

  // I odznaczenie zabiera linijkę z powrotem.
  await offered.nth(0).click();
  await expect(rows).toHaveCount(1);

  await page.getByRole('button', { name: 'Gotowe' }).click();
  await expect(panel).toBeHidden();
  await expect(rows).toHaveCount(1);
});

test('anulowana edycja nie zabiera zdjęcia zapisanemu fitowi', async ({ page }) => {
  await startFit(page);
  await page.locator('input[type="file"]').setInputFiles([photo('1.png'), photo('2.png')]);
  await page.locator('#fit-name').fill('Nie ruszaj');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page).toHaveURL(/\/app\/fits\/o-/);
  const address = page.url();
  expect(await storedPhotos(page)).toBe(2);

  // Wejście w edycję, wyrzucenie zdjęcia i rozmyślenie się.
  await page.getByRole('button', { name: 'Zmień fit' }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await page.getByRole('button', { name: 'Usuń zdjęcie' }).first().click();
  await expect(page.getByRole('button', { name: 'Usuń zdjęcie' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Anuluj' }).click();

  // Anuluj znaczy anuluj: fit ma z powrotem dwa zdjęcia, oba dają się pokazać.
  await page.goto(address);
  const frames = page.getByRole('group', { name: /przeciągnij w bok/i }).locator('img');
  await expect(frames).toHaveCount(2);
  expect(await storedPhotos(page)).toBe(2);
});

test('zapisana edycja kasuje zdjęcie wyrzucone z fitu', async ({ page }) => {
  await startFit(page);
  await page.locator('input[type="file"]').setInputFiles([photo('1.png'), photo('2.png')]);
  await page.locator('#fit-name').fill('Jedno mniej');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page).toHaveURL(/\/app\/fits\/o-/);

  await page.getByRole('button', { name: 'Zmień fit' }).click();
  await page.getByRole('button', { name: 'Usuń zdjęcie' }).first().click();
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page).toHaveURL(/\/app\/fits\/o-[^/]+$/);

  // Dopiero zapis przesądza, więc dopiero teraz blob znika.
  await expect.poll(() => storedPhotos(page)).toBe(1);
  await expect(page.getByRole('group', { name: /przeciągnij w bok/i }).locator('img')).toHaveCount(1);
});

test('wyjście wstecz, nie przyciskiem, też nie zostawia zdjęć', async ({ page }) => {
  await startFit(page);
  await page.locator('input[type="file"]').setInputFiles([photo('a.png'), photo('b.png')]);
  await expect(page.getByRole('button', { name: 'Usuń zdjęcie' })).toHaveCount(2);
  expect(await storedPhotos(page)).toBe(2);

  // Strzałka wstecz w przeglądarce omija przycisk „Anuluj" w całości.
  await page.goBack();
  await expect(page).toHaveURL(/\/app\/fits$/);
  await expect.poll(() => storedPhotos(page)).toBe(0);
});

test('dziewiąte zdjęcie nie wchodzi i mówi o tym', async ({ page }) => {
  await startFit(page);
  await page.locator('input[type="file"]').setInputFiles([
    photo('1.png'), photo('2.png'), photo('3.png'), photo('4.png'), photo('5.png'),
    photo('6.png'), photo('7.png'), photo('8.png'), photo('9.png'),
  ]);

  await expect(page.getByText(/Fit pomieści do 8 zdjęć/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Usuń zdjęcie' })).toHaveCount(8);
  // Odrzucone zdjęcie nie zostaje też w magazynie.
  await expect.poll(() => storedPhotos(page)).toBe(8);
});

test('fit obraca się sam po otwarciu i wraca na pierwszą klatkę', async ({ page }) => {
  await startFit(page);
  await page.locator('input[type="file"]').setInputFiles([photo('1.png'), photo('2.png'), photo('3.png')]);
  await page.locator('#fit-name').fill('Sam się kręci');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page).toHaveURL(/\/app\/fits\/o-/);

  const frames = page.getByRole('group', { name: /przeciągnij w bok/i }).locator('img');
  // Nikt niczego nie dotknął: obrót sam dojeżdża do ostatniego kąta i wraca.
  await expect(frames.nth(2)).toHaveClass(/opacity-100/);
  await expect(frames.nth(0)).toHaveClass(/opacity-100/);
});

test('przy wyłączonym ruchu fit stoi, dopóki się go nie dotknie', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startFit(page);
  await page.locator('input[type="file"]').setInputFiles([photo('1.png'), photo('2.png'), photo('3.png')]);
  await page.locator('#fit-name').fill('Bez ruchu');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page).toHaveURL(/\/app\/fits\/o-/);

  const frames = page.getByRole('group', { name: /przeciągnij w bok/i }).locator('img');
  await expect(frames).toHaveCount(3);

  /**
   * Liczone są wszystkie zmiany kadru, a nie sprawdzany kadr na końcu: obrót
   * tam i z powrotem kończy się na pierwszym zdjęciu, więc sam pomiar po czasie
   * przechodził tak samo przy wyłączonym ruchu, jak i przy włączonym.
   */
  const zmiany = await page.evaluate(
    () =>
      new Promise<number>(resolve => {
        const sweep = document.querySelector('[role="group"]');
        if (!sweep) {
          resolve(-1);
          return;
        }
        let changes = 0;
        const observer = new MutationObserver(() => { changes += 1; });
        observer.observe(sweep, { attributes: true, attributeFilter: ['class', 'style'], subtree: true });
        // Dłużej, niż trwa cały obrót.
        setTimeout(() => { observer.disconnect(); resolve(changes); }, 1800);
      }),
  );

  expect(zmiany).toBe(0);
  await expect(frames.nth(0)).toHaveClass(/opacity-100/);
});

test('nieudany zapis mówi o sobie, zamiast udawać, że fit powstał', async ({ page }) => {
  await seedSignedIn(page);
  // Przeglądarka z zablokowanymi danymi witryny rzuca na samym zapisie. Tu
  // rzuca tylko na kluczu fitów, żeby reszta ekranu dojechała normalnie.
  await page.addInitScript(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'paula.outfits') throw new DOMException('QuotaExceededError');
      return write.call(this, key, value);
    };
  });

  await page.goto('/app/fits/new');
  await page.getByPlaceholder('sweter oversize, Zara').fill('sweter oversize, Zara');
  await page.getByRole('button', { name: 'Zapisz' }).click();

  await expect(page.getByText(/Nie udało się zapisać fitu/)).toBeVisible();
  // Nadal w edytorze, z tym, co napisała — a nie na liście, gdzie nic nie ma.
  await expect(page).toHaveURL(/\/app\/fits\/new$/);
  await expect(page.getByPlaceholder('sweter oversize, Zara')).toHaveValue('sweter oversize, Zara');
});

test('zgubione zdjęcie nie zostawia po sobie kropki bez kadru', async ({ page }) => {
  await startFit(page);
  await page.locator('input[type="file"]').setInputFiles([photo('1.png'), photo('2.png')]);
  await page.locator('#fit-name').fill('Czyszczone dane');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page).toHaveURL(/\/app\/fits\/o-/);

  // Tak wygląda przeglądarka, która wyczyściła dane witryny spod fitu: rekord
  // w localStorage został, bajty nie.
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('paula.photos');
    request.onsuccess = () => {
      const store = request.result.transaction('photos', 'readwrite').objectStore('photos');
      const keys = store.getAllKeys();
      keys.onsuccess = () => {
        store.delete(keys.result[0]);
        resolve();
      };
      keys.onerror = () => reject(keys.error);
    };
    request.onerror = () => reject(request.error);
  }));
  await page.reload();

  // Jedna klatka, zero kropek — a nie dwie kropki, z których jedna prowadzi
  // donikąd.
  const sweep = page.getByRole('group', { name: /przeciągnij w bok/i });
  await expect(sweep.locator('img')).toHaveCount(1);
  await expect(sweep.locator('img')).toHaveClass(/opacity-100/);
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
