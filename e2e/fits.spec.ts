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

test('podczas samoczynnego obrotu klatki przenikają, a pod palcem tną się twardo', async ({ page }) => {
  await startFit(page);
  await page.locator('input[type="file"]').setInputFiles([photo('1.png'), photo('2.png'), photo('3.png')]);
  await page.locator('#fit-name').fill('Przenikanie');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page).toHaveURL(/\/app\/fits\/o-/);

  /**
   * Ile klatek bywa widocznych naraz. Przenikanie znaczy dwie: schodząca leży
   * nieprzezroczysta pod wchodzącą, żeby w połowie przejścia nie prześwitywało
   * tło. Jedna klatka w szczycie znaczy, że obrót nadal przeskakuje.
   */
  const najwiecejNaraz = await page.evaluate(
    () =>
      new Promise<number>(resolve => {
        let peak = 0;
        const probe = setInterval(() => {
          const widoczne = document.querySelectorAll('[role="group"] img.opacity-100').length;
          if (widoczne > peak) peak = widoczne;
        }, 30);
        setTimeout(() => { clearInterval(probe); resolve(peak); }, 1800);
      }),
  );
  expect(najwiecejNaraz).toBe(2);

  // Gdy steruje ona, widać dokładnie jedną klatkę — bo tam rozmycie między
  // kadrami czyta się jako opóźnienie, a nie jako ruch.
  const sweep = page.getByRole('group', { name: /przeciągnij w bok/i });
  await sweep.focus();
  await page.keyboard.press('ArrowRight');
  await expect(sweep.locator('img.opacity-100')).toHaveCount(1);
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

/**
 * Zdjęcie i maska w rozmiarze, na którym da się cokolwiek zmierzyć — sylwetka
 * zajmuje prostokąt 30..90 × 20..140 na kadrze 120 × 160. Jednopikselowy PNG
 * wyżej wystarcza do sprawdzenia magazynu, ale wyrównanie kadrów liczy się z
 * ramki sylwetki, a ramka jednego piksela nic nie znaczy.
 */
const SCAN_PHOTO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAHgAAACgCAIAAABIaz/HAAABQUlEQVR42u3QOxHCAABAscrpjH8BLCzQP+ClDt7AxjV3UZDh+biHV5rSnJa0pi3t6Ujv9EnfNIgWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWfbnocbz9HdGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVr0b9FzWtKatrSnI4kWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWfbnoEx/f7aLbhPVrAAAAAElFTkSuQmCC',
  'base64',
);
const SCAN_MASK = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAHgAAACgCAYAAADHCaiQAAABKElEQVR42u3RAQ0AAAgDoPcvrTXuhAokAAAAAAAAAAAAnDfPCBYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwYIFCxYsWLBgwQAAAAAAAAAAAFRbNAoWEZElDlgAAAAASUVORK5CYII=',
  'base64',
);
/** Maska, na której nie ma ani jednego nieprzezroczystego piksela. */
const EMPTY_MASK = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAHgAAACgCAYAAADHCaiQAAAAYUlEQVR42u3BMQEAAADCoPVPbQlPoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4GcsrwAB9kUWWgAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * Wymiary i typ wszystkiego, co leży w magazynie. Sam licznik nie odróżnia
 * wycinka wstawionego we wspólny kadr od zdjęcia przepisanego jeden do jednego,
 * a to jest cała różnica między skanem a przezroczystym tłem.
 */
async function storedSizes(page: Page): Promise<Array<{ w: number; h: number; type: string }>> {
  return page.evaluate(
    () =>
      new Promise<Array<{ w: number; h: number; type: string }>>((resolve, reject) => {
        const request = indexedDB.open('paula.photos');
        request.onsuccess = async () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('photos')) return resolve([]);
          const all = await new Promise<Blob[]>(done => {
            const query = db.transaction('photos', 'readonly').objectStore('photos').getAll();
            query.onsuccess = () => done(query.result as Blob[]);
          });
          resolve(
            await Promise.all(
              all.map(
                blob =>
                  new Promise<{ w: number; h: number; type: string }>(done => {
                    const url = URL.createObjectURL(blob);
                    const image = new Image();
                    image.onload = () => {
                      URL.revokeObjectURL(url);
                      done({ w: image.naturalWidth, h: image.naturalHeight, type: blob.type });
                    };
                    image.onerror = () => {
                      URL.revokeObjectURL(url);
                      done({ w: 0, h: 0, type: blob.type });
                    };
                    image.src = url;
                  }),
              ),
            ),
          );
        };
        request.onerror = () => reject(request.error);
      }),
  );
}

const duzeZdjecie = (name: string) => ({ name, mimeType: 'image/png', buffer: SCAN_PHOTO });

/**
 * Podstawiony model. Żaden test nie dzwoni do fal — ani razu, ani przypadkiem:
 * gdyby podstawienia zabrakło, `page.route` nie przechwyci żądania i test
 * zawiesi się na prawdziwym wywołaniu zamiast przejść po cichu.
 */
async function podstawModel(
  page: Page,
  reply: { mask?: Buffer; status?: number; code?: string } = {},
) {
  await page.route('**/__paula/cutout-photo', route => {
    if (reply.status) {
      return route.fulfill({
        status: reply.status,
        contentType: 'application/json',
        body: JSON.stringify({ code: reply.code ?? 'failed' }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'image/png', body: reply.mask ?? SCAN_MASK });
  });
}

/** Zapisany fit z dwoma zdjęciami, na których da się zrobić skan. */
async function fitDoSkanu(page: Page, name = 'Do skanu') {
  await startFit(page);
  await page.locator('input[type="file"]').setInputFiles([duzeZdjecie('a.png'), duzeZdjecie('b.png')]);
  await page.locator('#fit-name').fill(name);
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page).toHaveURL(/\/app\/fits\/o-/);
  await expect.poll(() => storedPhotos(page)).toBe(2);
}

/** Druga klatka: ta sama osoba stoi bardziej z lewej i wychodzi niższa. */
const SCAN_PHOTO_B = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAHgAAACgCAIAAABIaz/HAAABFElEQVR42u3QMQ0AIAwAsBni4Z52bhxgBxcsI02qoLH24YFQIFo0okWLtiBaNKJFi7YgWjSiRYtGtGhEixaNaNGIFi0a0aIRLVo0okUjWrRoRItGdLvonKOEaNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq0aNGiRYsWLVq06IpoRItGtGjRiBaNaNHfu0EVET6HA+juAAAAAElFTkSuQmCC',
  'base64',
);
const SCAN_MASK_B = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAHgAAACgCAYAAADHCaiQAAABAUlEQVR42u3RAQ0AAAgDoPcvrTXuhAokAAAAAAAAAAAAAAAAAAAAAAAAcNiUMyQYwYIFCxYsWLBgwYIFC0YwggULFixYsGDBggUjGMGCBQsWLFiwYMGCBQtGsGDBggULFixYsGDBghGMYMGCBQsWLFiwYMEIRrBgwYIFCxYsWLBgwYIRjGDBggULFixYsGDBCEawYMGCBQsWLFiwYAQjWLBgwYIFCxYsWLBgwQhGsGDBggULFixYsGAEI1iwYMGCBQsWLFiwYMEIFixYsGDBggULFixYMIIRLFiwYMGCBQsWLBjBCBYsWLBgwYIFCxYsWDCCESxYsGDBggUDAAAAwEMLYbl/PVd0ZxIAAAAASUVORK5CYII=',
  'base64',
);

/**
 * Ramka sylwetki w każdym zapisanym wycinku, liczona z kanału alfa — czyli
 * dokładnie to, co widać na ekranie, a nie to, co policzyła funkcja.
 */
async function ramkiWycinkow(page: Page): Promise<Array<{ srodekX: number; gora: number; wysokosc: number }>> {
  return page.evaluate(
    () =>
      new Promise<Array<{ srodekX: number; gora: number; wysokosc: number }>>((resolve, reject) => {
        const request = indexedDB.open('paula.photos');
        request.onsuccess = async () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('photos')) return resolve([]);
          const all = await new Promise<Blob[]>(done => {
            const query = db.transaction('photos', 'readonly').objectStore('photos').getAll();
            query.onsuccess = () => done(query.result as Blob[]);
          });
          const out: Array<{ srodekX: number; gora: number; wysokosc: number }> = [];
          for (const blob of all) {
            const image = await new Promise<HTMLImageElement | null>(done => {
              const url = URL.createObjectURL(blob);
              const img = new Image();
              img.onload = () => { URL.revokeObjectURL(url); done(img); };
              img.onerror = () => { URL.revokeObjectURL(url); done(null); };
              img.src = url;
            });
            // Interesują nas tylko wycinki, czyli to, co siedzi we wspólnym kadrze.
            if (!image || image.naturalWidth !== 1200 || image.naturalHeight !== 1600) continue;
            const canvas = document.createElement('canvas');
            canvas.width = 1200;
            canvas.height = 1600;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(image, 0, 0);
            const { data } = ctx.getImageData(0, 0, 1200, 1600);
            let x0 = 1200, y0 = 1600, x1 = -1, y1 = -1;
            for (let y = 0; y < 1600; y += 4) {
              for (let x = 0; x < 1200; x += 4) {
                if (data[(y * 1200 + x) * 4 + 3] <= 24) continue;
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
              }
            }
            if (x1 >= 0) out.push({ srodekX: (x0 + x1) / 2, gora: y0, wysokosc: y1 - y0 });
          }
          resolve(out);
        };
        request.onerror = () => reject(request.error);
      }),
  );
}

test('wyrównanie stawia sylwetkę w tym samym miejscu, choć na zdjęciach stoi inaczej', async ({ page }) => {
  // Dwie różne klatki i dwie różne maski: na drugiej stoi bardziej z lewej i
  // wychodzi niższa. Bez wyrównania sylwetka przeskakiwałaby w połowie obrotu.
  const maski = [SCAN_MASK, SCAN_MASK_B];
  let podane = 0;
  await page.route('**/__paula/cutout-photo', route =>
    route.fulfill({ status: 200, contentType: 'image/png', body: maski[podane++] ?? SCAN_MASK }));

  await startFit(page);
  await page.locator('input[type="file"]').setInputFiles([
    duzeZdjecie('przod.png'),
    { name: 'bok.png', mimeType: 'image/png', buffer: SCAN_PHOTO_B },
  ]);
  await page.locator('#fit-name').fill('Wyrównanie');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page).toHaveURL(/\/app\/fits\/o-/);

  await page.getByRole('button', { name: /Zrób z tego skan/ }).click();
  await expect.poll(() => storedPhotos(page), { timeout: 15000 }).toBe(4);

  const ramki = await ramkiWycinkow(page);
  expect(ramki).toHaveLength(2);
  const [a, b] = ramki;

  // Obie sylwetki środkiem na środku kadru, mimo że na zdjęciach stały w
  // różnych miejscach — 1200 / 2 = 600.
  expect(a.srodekX).toBeGreaterThan(560);
  expect(a.srodekX).toBeLessThan(640);
  expect(b.srodekX).toBeGreaterThan(560);
  expect(b.srodekX).toBeLessThan(640);

  // Obie z czubkiem głowy na tej samej wysokości — 10% z 1600 to 160 px.
  expect(Math.abs(a.gora - b.gora)).toBeLessThan(24);
  expect(a.gora).toBeLessThan(220);

  // I obie tej samej wysokości, choć na zdjęciach różniły się o ~8%.
  expect(Math.abs(a.wysokosc - b.wysokosc)).toBeLessThan(40);
  expect(a.wysokosc).toBeGreaterThan(1150);
});

test('skan wycina tło, zostaje po odświeżeniu i da się z niego wrócić', async ({ page }) => {
  await podstawModel(page);
  await fitDoSkanu(page);

  const sweep = page.getByRole('group', { name: /przeciągnij w bok/i });
  // Przed skanem kadr stoi na zwykłej szarości.
  await expect(sweep).not.toHaveClass(/from-background/);

  await page.getByRole('button', { name: /Zrób z tego skan/ }).click();

  // Wycinki lądują obok oryginałów, a nie zamiast nich: dwa zdjęcia + dwa wycinki.
  await expect.poll(() => storedPhotos(page), { timeout: 15000 }).toBe(4);
  await expect(page.getByRole('button', { name: 'Pokaż zdjęcia' })).toBeVisible();
  // Sylwetka nie przynosi własnego tła, więc dostaje studyjne.
  await expect(sweep).toHaveClass(/from-background/);

  // Przełącznik wraca do zdjęć i z powrotem.
  await page.getByRole('button', { name: 'Pokaż zdjęcia' }).click();
  await expect(sweep).not.toHaveClass(/from-background/);
  await page.getByRole('button', { name: 'Pokaż skan' }).click();
  await expect(sweep).toHaveClass(/from-background/);

  // Skan jest zapisany, nie tylko pokazany.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Pokaż zdjęcia' })).toBeVisible();
  expect(await storedPhotos(page)).toBe(4);

  /**
   * Dowód, że wyrównanie naprawdę się odbyło, a nie tylko wycięcie tła:
   * oryginały zostają w swoim rozmiarze 120 × 160, a oba wycinki siedzą we
   * wspólnym kadrze 1200 × 1600. Gdyby wycinek był samym zdjęciem z
   * przezroczystym tłem, miałby rozmiar oryginału i sylwetka skakałaby między
   * klatkami dokładnie tak, jak przed skanem.
   */
  const rozmiary = await storedSizes(page);
  expect(rozmiary.filter(r => r.w === 120 && r.h === 160)).toHaveLength(2);
  const wycinki = rozmiary.filter(r => r.w === 1200 && r.h === 1600);
  expect(wycinki).toHaveLength(2);
  // Wycinek musi umieć przezroczystość — JPEG by ją zgubił.
  expect(wycinki.every(w => w.type === 'image/webp' || w.type === 'image/png')).toBe(true);
});

test('usunięty skan zabiera wycinki z magazynu, a zdjęcia zostawia', async ({ page }) => {
  await podstawModel(page);
  await fitDoSkanu(page);
  await page.getByRole('button', { name: /Zrób z tego skan/ }).click();
  await expect.poll(() => storedPhotos(page), { timeout: 15000 }).toBe(4);

  await page.getByRole('button', { name: 'Usuń skan' }).click();
  await expect.poll(() => storedPhotos(page)).toBe(2);
  await expect(page.getByRole('button', { name: /Zrób z tego skan/ })).toBeVisible();
});

test('zdjęcie wyjęte z zeskanowanego fitu zabiera swój wycinek', async ({ page }) => {
  await podstawModel(page);
  await fitDoSkanu(page);
  await page.getByRole('button', { name: /Zrób z tego skan/ }).click();
  await expect.poll(() => storedPhotos(page), { timeout: 15000 }).toBe(4);

  await page.getByRole('button', { name: 'Zmień fit' }).click();
  await page.getByRole('button', { name: 'Usuń zdjęcie' }).first().click();
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page).toHaveURL(/\/app\/fits\/o-[^/]+$/);

  // Jedno zdjęcie i jeden wycinek — wycinek bez oryginału byłby sierotą,
  // której nic już nie pokaże.
  await expect.poll(() => storedPhotos(page)).toBe(2);

  // I znika też WPIS, nie tylko bajty: mapa wskazująca na skasowany blob jest
  // niewidoczna, więc nikt by jej nie zauważył, dopóki czegoś nie zepsuje.
  const kluczeWycinkow = await page.evaluate(() => {
    const zapisane = JSON.parse(localStorage.getItem('paula.outfits') ?? '[]') as Array<{
      cutouts?: Record<string, string>;
    }>;
    return Object.keys(zapisane[0]?.cutouts ?? {}).length;
  });
  expect(kluczeWycinkow).toBe(1);
});

test('skasowany zeskanowany fit nie zostawia ani zdjęć, ani wycinków', async ({ page }) => {
  await podstawModel(page);
  await fitDoSkanu(page);
  await page.getByRole('button', { name: /Zrób z tego skan/ }).click();
  await expect.poll(() => storedPhotos(page), { timeout: 15000 }).toBe(4);

  page.on('dialog', dialog => void dialog.accept());
  await page.getByRole('button', { name: 'Usuń', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/fits$/);
  await expect.poll(() => storedPhotos(page)).toBe(0);
});

test('gdy model nie znajdzie osoby, mówi to i nic nie zapisuje', async ({ page }) => {
  await podstawModel(page, { status: 422, code: 'no-person' });
  await fitDoSkanu(page);

  await page.getByRole('button', { name: /Zrób z tego skan/ }).click();
  await expect(page.getByText(/nie widać osoby/)).toBeVisible();
  // Dwa zdjęcia, zero wycinków — i przycisk dalej proponuje skan.
  expect(await storedPhotos(page)).toBe(2);
  await expect(page.getByRole('button', { name: /Zrób z tego skan/ })).toBeVisible();
});

test('pusta maska to to samo, co brak osoby, a nie pusty kadr', async ({ page }) => {
  // Model odpowiedział 200, ale na masce nie ma ani jednego widocznego piksela.
  await podstawModel(page, { mask: EMPTY_MASK });
  await fitDoSkanu(page);

  await page.getByRole('button', { name: /Zrób z tego skan/ }).click();
  await expect(page.getByText(/nie widać osoby/)).toBeVisible();
  expect(await storedPhotos(page)).toBe(2);
});

test('nieudany skan mówi o sobie i nie zostawia bajtów w magazynie', async ({ page }) => {
  await podstawModel(page, { status: 502, code: 'failed' });
  await fitDoSkanu(page);

  await page.getByRole('button', { name: /Zrób z tego skan/ }).click();
  await expect(page.getByText(/Skan nie przeszedł/)).toBeVisible();
  expect(await storedPhotos(page)).toBe(2);
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
