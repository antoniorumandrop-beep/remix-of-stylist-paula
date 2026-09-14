import type { Plugin } from 'vite';
import { loadEnv } from 'vite';

/**
 * Maska sylwetki ze zdjęcia fitu — middleware dev-serwera.
 *
 * Po co: przy cięciu między dwiema klatkami tego samego fitu telefon stał
 * odrobinę gdzie indziej, więc **skacze tło**, i to ono psuje złudzenie obrotu.
 * Gdy zostaje sama sylwetka na jednolitym polu, zmienia się już tylko ciało i
 * ubranie — i dopiero wtedy czyta się to jako skan, a nie jako trzy zdjęcia.
 *
 * Ta funkcja nie może żyć w przeglądarce z tego samego powodu co pomiar: klucz
 * byłby w paczce, którą pobiera każdy. W produkcji zrobi to edge function.
 *
 * Cztery reguły, wszystkie przepisane z `vite-plugins/measure-photo.ts`, bo
 * ścieżka zdjęcia jest tu identyczna, a jedna jest nowa:
 *
 * - **Zdjęcie idzie `data:` URI w treści żądania**, nie jako plik wgrany do
 *   CDN-u fal. Plik pod adresem żyje własnym życiem; treść żądania nie.
 * - **`X-Fal-Store-IO: 0`.** Bez tego nagłówka fal trzyma treść żądania 30 dni.
 * - **Krótkie życie wyniku.** Model nie oddaje bajtów, tylko adres na swoim
 *   CDN-ie — czyli jej wycięta sylwetka leży pod publicznym adresem.
 * - **NOWA: ten adres nigdy nie trafia do przeglądarki.** Middleware pobiera
 *   bajty u siebie i oddaje sam obraz. Inaczej adres wszedłby do IndexedDB,
 *   przeżył wygaśnięcie pliku i został w magazynie jako martwy odnośnik do
 *   czegoś, co kiedyś było publiczne.
 *
 * Model: `fal-ai/sam-3/image` z zapytaniem `person`, czyli ta sama rodzina, co
 * pomiar (`sam-3/3d-body`) i ta sama licencja, sprawdzona w `CLAUDE.md`.
 *
 * **Dlaczego NIE BiRefNet, choć jest lepszy w rankingach** (sprawdzone
 * 2026-09-14, krok zero epiku): kod MIT, wagi na Hugging Face oznaczone MIT —
 * ale wytrenowane na `DIS-TR`, czyli zbiorze DIS5K, którego warunki mówią
 * wprost, że użytek komercyjny jest zabroniony „even after copying, editing,
 * processing or any operations of this database". To jest drugi przypadek
 * Leffy: autor nie mógł dać MIT na coś, czego sam nie ma komercyjnie.
 * `bria/background/remove` odpada tą samą drogą — RMBG-2.0 jest już na liście
 * zakazanych w `CLAUDE.md`.
 *
 * Model oddaje **maskę, nie gotowy wycinek**, i to jest lepsze: sklejenie robi
 * przeglądarka, więc wycinek zachowuje naszą rozdzielczość 1200 × 1600 i nie
 * przechodzi drugi raz przez kompresję po drodze.
 */

const ENDPOINT = '/__paula/cutout-photo';
/**
 * Host synchronicznych wywołań u fal to `fal.run`, nie `api.fal.ai` — ten drugi
 * odpowiada `404 Route not found` na każdy model i wygląda przez to jak zła
 * nazwa modelu, a nie zły adres.
 */
const FAL_URL = 'https://fal.run/fal-ai/sam-3/image';

/** Zdjęcie po przeskalowaniu ma ~200 KB, a `data:` URI puchnie o jedną trzecią. */
const MAX_BODY_BYTES = 20_000_000;

/** Ile czekamy na model, zanim powiemy, że nie odpowiada. */
const FAL_TIMEOUT_MS = 60_000;

/**
 * Tyle, ile trwa pobranie wyniku i nic ponadto. Pod tym adresem leży jej
 * sylwetka, więc każda dodatkowa minuta jest czystym kosztem.
 */
const OUTPUT_LIFETIME_SECONDS = 120;

type ErrorCode = 'not-configured' | 'bad-file' | 'no-person' | 'failed';

interface FalMasks {
  masks?: Array<{ url?: unknown }> | null;
}

function readBody(req: { on: (event: string, cb: (chunk?: unknown) => void) => void }): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const parts: Buffer[] = [];
    req.on('data', chunk => {
      const buf = chunk as Buffer;
      size += buf.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('too large'));
        return;
      }
      parts.push(buf);
    });
    req.on('end', () => resolve(Buffer.concat(parts).toString('utf8')));
    req.on('error', () => reject(new Error('read failed')));
  });
}

export function cutoutPhotoPlugin(): Plugin {
  let falKey = '';

  return {
    name: 'paula-cutout-photo',
    apply: 'serve',

    configResolved(config) {
      // `loadEnv` z pustym przedrostkiem czyta też zmienne bez `VITE_`. Tu, w
      // Node, to jest bezpieczne; do przeglądarki i tak nic z tego nie trafi.
      const env = loadEnv(config.mode, config.envDir ?? process.cwd(), '');
      falKey = env.FAL_KEY ?? '';
    },

    configureServer(server) {
      server.middlewares.use(ENDPOINT, async (req, res) => {
        const fail = (status: number, code: ErrorCode, error: string) => {
          res.statusCode = status;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ code, error }));
        };

        if (req.method !== 'POST') return fail(405, 'failed', 'użyj POST');
        if (!falKey) return fail(503, 'not-configured', 'brak FAL_KEY w .env — patrz .env.example');

        let image: string;
        try {
          const parsed = JSON.parse(await readBody(req)) as { image?: unknown };
          if (typeof parsed.image !== 'string' || !parsed.image.startsWith('data:image/')) {
            return fail(400, 'bad-file', 'oczekiwano `image` jako data: URI obrazu');
          }
          image = parsed.image;
        } catch (e) {
          return fail(400, 'bad-file', (e as Error).message);
        }

        let falBody: FalMasks | null;
        try {
          const falRes = await fetch(FAL_URL, {
            method: 'POST',
            signal: AbortSignal.timeout(FAL_TIMEOUT_MS),
            headers: {
              authorization: `Key ${falKey}`,
              'content-type': 'application/json',
              // Bez tego treść żądania — czyli zdjęcie — zostaje u fal na 30 dni.
              'X-Fal-Store-IO': '0',
              'X-Fal-Object-Lifecycle-Preference': JSON.stringify({
                expiration_duration_seconds: OUTPUT_LIFETIME_SECONDS,
              }),
            },
            // SAM 3 pyta o pojęcie, nie o „najbardziej wyrazisty obiekt" —
            // dzięki temu na zdjęciu w pokoju nie wytnie krzesła.
            body: JSON.stringify({ image_url: image, text_prompt: 'person' }),
          });
          falBody = (await falRes.json().catch(() => null)) as FalMasks | null;
          if (!falRes.ok) {
            const detail = (falBody as { detail?: unknown } | null)?.detail;
            return fail(502, 'failed', `fal.ai ${falRes.status}: ${JSON.stringify(detail ?? falBody)}`);
          }
        } catch (e) {
          return fail(502, 'failed', `fal.ai nie odpowiedział: ${(e as Error).message}`);
        }

        const masks = falBody?.masks;
        if (!Array.isArray(masks) || masks.length === 0) {
          return fail(422, 'no-person', 'model nie znalazł osoby na zdjęciu');
        }
        // Więcej niż jedna osoba to nie jest zdjęcie tego fitu i nie zgadujemy,
        // która jest tą właściwą — największa z brzegu byłaby losem. Ta sama
        // reguła co przy pomiarze.
        if (masks.length > 1) {
          return fail(422, 'no-person', `na zdjęciu jest ${masks.length} osób`);
        }

        const url = masks[0]?.url;
        if (typeof url !== 'string' || !url) {
          return fail(502, 'failed', 'fal.ai nie oddał maski');
        }

        // Bajty pobiera serwer, nie przeglądarka — patrz czwarta reguła w
        // nagłówku pliku. Adres kończy życie w tej funkcji.
        let bytes: ArrayBuffer;
        try {
          const file = await fetch(url, { signal: AbortSignal.timeout(FAL_TIMEOUT_MS) });
          if (!file.ok) return fail(502, 'failed', `nie udało się pobrać maski: ${file.status}`);
          bytes = await file.arrayBuffer();
        } catch (e) {
          return fail(502, 'failed', `nie udało się pobrać maski: ${(e as Error).message}`);
        }

        res.statusCode = 200;
        res.setHeader('content-type', 'image/png');
        res.setHeader('cache-control', 'no-store');
        res.end(Buffer.from(bytes));
      });
    },
  };
}
