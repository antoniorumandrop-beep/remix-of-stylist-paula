import { pickClothingMeasurements, hasCoreMeasurements, type ClothingMeasurements } from './measurements';

/**
 * Pomiar ze zdjęcia — strona przeglądarki.
 *
 * Zdjęcie nie jest tu nigdzie zapisywane i nie dostaje adresu. Nie ma
 * `URL.createObjectURL`, bo obiekt spod takiego adresu żyje do końca życia
 * karty i przecieka do wszystkiego, co go zdąży złapać. Plik idzie do `data:`
 * URI, ten do treści jednego żądania, i na tym jego historia się kończy.
 * Pełny projekt tej ścieżki: `docs/photo-measurement.md`.
 *
 * PLUG(photo): dziś liczy to middleware dev-serwera
 * (`vite-plugins/measure-photo.ts`), bo przeglądarka nie ma jak wywołać modelu
 * z kluczem API, a klucza nie wolno wysłać do przeglądarki. Docelowo ta sama
 * odpowiedź przyjdzie z edge function. Wszystko powyżej tej funkcji zostaje bez
 * zmian — o to chodzi w tym podziale.
 */

const DEV_ENDPOINT = '/__paula/measure-photo';

/**
 * 12 MB. Zdjęcie z telefonu to dziś 3–8 MB, a `data:` URI puchnie o jedną
 * trzecią przy kodowaniu — próg musi być wyraźnie ponad tym, co realnie
 * przychodzi, i musi być komunikatem, a nie zawieszonym żądaniem.
 */
export const MAX_PHOTO_BYTES = 12_000_000;

/**
 * Formaty, które model przyjmuje.
 *
 * **iPhone zapisuje domyślnie HEIC**, a `accept="image/*"` go przepuszcza — plik
 * dochodzi do modelu i dostaje odmowę, której użytkowniczka nie ma jak
 * zrozumieć. Przeglądarka też go nie przekonwertuje: Safari umie HEIC w canvas,
 * Chrome nie, więc konwersja po naszej stronie działałaby u jednych, a u
 * drugich nie. Uczciwa odmowa z nazwą formatu jest lepsza niż połowiczna
 * konwersja. Wpadłem w to przy pierwszym prawdziwym zdjęciu z telefonu.
 */
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export type PhotoMeasureError =
  /** Klucz do modelu nie jest ustawiony — funkcja nie ma czym liczyć. */
  | 'not-configured'
  /** Middleware nie odpowiada: aplikacja stoi na zbudowanych plikach, nie na dev-serwerze. */
  | 'no-dev-server'
  /** Model nie znalazł na zdjęciu osoby. */
  | 'no-person'
  /** Znalazł, ale nie dało się z tego wyprowadzić trzech obwodów. */
  | 'incomplete'
  /** Plik za duży albo nie jest obrazem. */
  | 'bad-file'
  /** Obraz, ale w formacie, którego model nie przyjmie — zwykle HEIC z iPhone'a. */
  | 'bad-format'
  /** Sieć, limit, awaria po tamtej stronie. */
  | 'failed';

export type PhotoMeasureResult =
  | { status: 'ok'; measurements: ClothingMeasurements & Record<'bust' | 'waist' | 'hips', number> }
  /** `detail` zostaje do konsoli i logu; `code` jest tym, co renderuje interfejs. */
  | { status: 'error'; code: PhotoMeasureError; detail?: string };

/** `File` → `data:` URI. Bez adresu obiektowego, bez zapisu, bez śladu poza pamięcią karty. */
export function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

/** Sprawdzenie pliku przed wysłaniem — po to, żeby odmowa była natychmiastowa i zrozumiała. */
export function checkPhotoFile(file: File): PhotoMeasureError | null {
  if (!file.type.startsWith('image/')) return 'bad-file';
  if (file.size > MAX_PHOTO_BYTES) return 'bad-file';
  if (!ACCEPTED_TYPES.includes(file.type)) return 'bad-format';
  return null;
}

export async function measureFromPhoto(file: File): Promise<PhotoMeasureResult> {
  const badFile = checkPhotoFile(file);
  if (badFile) return { status: 'error', code: badFile };

  let dataUri: string;
  try {
    dataUri = await fileToDataUri(file);
  } catch (e) {
    return { status: 'error', code: 'bad-file', detail: (e as Error).message };
  }

  let res: Response;
  try {
    res = await fetch(DEV_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: dataUri }),
    });
  } catch (e) {
    return { status: 'error', code: 'no-dev-server', detail: (e as Error).message };
  }

  // Zbudowana aplikacja serwuje `index.html` na nieznany adres, więc odpowiedź
  // przychodzi jako HTML ze statusem 200 i wygląda na sukces. Bez tego
  // sprawdzenia funkcja „działałaby" wszędzie i nie robiła nic — dokładnie ta
  // pułapka, którą naprawił commit ffae147 przy imporcie z linku.
  const body = await res.json().catch(() => null);
  if (body === null) return { status: 'error', code: 'no-dev-server' };

  if (!res.ok) {
    const { code, error } = body as { code?: PhotoMeasureError; error?: string };
    return { status: 'error', code: code ?? 'failed', detail: error };
  }

  const measurements = pickClothingMeasurements((body as { measurements?: unknown }).measurements);
  if (!hasCoreMeasurements(measurements)) {
    return { status: 'error', code: 'incomplete' };
  }
  return { status: 'ok', measurements };
}
