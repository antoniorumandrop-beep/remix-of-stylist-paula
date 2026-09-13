import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Pomiar ciała ze zdjęcia — middleware dev-serwera.
 *
 * Ta funkcja nie może żyć w przeglądarce z dwóch niezależnych powodów: klucz do
 * modelu byłby w paczce, którą każdy pobiera, a pomiar liczy Python z
 * `body-lab/`, którego w przeglądarce nie ma. W produkcji zrobi to edge
 * function — PLUG(photo), patrz `docs/integration-points.md`.
 *
 * Trzy reguły, których pilnuje, wszystkie z `docs/photo-measurement.md`:
 *
 * - **Zdjęcie idzie `data:` URI w treści żądania, nie jako plik wgrany do
 *   CDN-u fal.** Plik pod adresem żyje własnym życiem; treść żądania nie.
 * - **`X-Fal-Store-IO: 0`.** Bez tego nagłówka fal trzyma treść żądania 30 dni,
 *   żeby pokazać ją w panelu. Czyli zdjęcie leżałoby miesiąc w cudzej historii.
 * - **Do Pythona idą wyłącznie liczby.** Obraz kończy życie po stronie modelu i
 *   nie wchodzi ani do procesu potomnego, ani do żadnego pliku.
 *
 * Klucz nazywa się `FAL_KEY`, bez przedrostka `VITE_`, i to jest istotne:
 * przedrostek jest jedyną rzeczą, która decyduje, czy Vite wstawi zmienną do
 * paczki dla przeglądarki.
 */

const ENDPOINT = '/__paula/measure-photo';
/**
 * Host synchronicznych wywołań u fal to `fal.run`, nie `api.fal.ai` — ten drugi
 * odpowiada `404 Route not found` na każdy model i wygląda przez to jak zła
 * nazwa modelu, a nie zły adres. Sprawdzone 2026-09-13 na żywym kluczu.
 */
const FAL_URL = 'https://fal.run/fal-ai/sam-3/3d-body';

/** Zdjęcie z telefonu ma 3–8 MB, a `data:` URI puchnie o jedną trzecią. */
const MAX_BODY_BYTES = 20_000_000;

/**
 * Siatka GLB, którą fal odsyła obok liczb, jest nam niepotrzebna — awatara
 * budujemy u siebie z Anny. Pięć minut to tyle, ile trwa żądanie i nic ponadto.
 */
const OUTPUT_LIFETIME_SECONDS = 300;

/** Ile czekamy na model, zanim powiemy, że nie odpowiada. */
const FAL_TIMEOUT_MS = 120_000;

type ErrorCode =
  | 'not-configured'
  | 'no-person'
  | 'bad-file'
  | 'failed';

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * Odpala warsztat z `body-lab/` i oddaje to, co wypisze na stdout.
 *
 * Rozróżnik jest napisem, nie polem `boolean` — projekt ma wyłączone
 * `strictNullChecks`, a przy nim TypeScript nie zawęża unii po literale
 * `true`/`false`. Ta sama decyzja i ten sam powód, co w `link.ts`.
 */
function measureWithBodyLab(python: string, script: string, params: unknown): Promise<
  { status: 'ok'; measurements: Record<string, number> } | { status: 'failed'; detail: string }
> {
  return new Promise(resolveRun => {
    const child = spawn(python, [script], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('error', e => resolveRun({ status: 'failed', detail: `nie udało się uruchomić Pythona: ${e.message}` }));
    child.on('close', () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(out);
      } catch {
        return resolveRun({ status: 'failed', detail: err.trim() || out.trim() || 'brak odpowiedzi z body-lab' });
      }
      const asError = (parsed as { error?: { code?: string; detail?: string } }).error;
      if (asError) return resolveRun({ status: 'failed', detail: `${asError.code}: ${asError.detail}` });
      return resolveRun({ status: 'ok', measurements: parsed as Record<string, number> });
    });
    child.stdin.end(JSON.stringify(params));
  });
}

export function measurePhotoPlugin(): Plugin {
  let falKey = '';
  let python = '';
  let script = '';

  return {
    name: 'paula-measure-photo',
    apply: 'serve',

    configResolved(config) {
      // `loadEnv` z pustym przedrostkiem czyta też zmienne bez `VITE_`. Tu, w
      // Node, to jest bezpieczne; do przeglądarki i tak nic z tego nie trafi.
      const env = loadEnv(config.mode, config.envDir ?? process.cwd(), '');
      falKey = env.FAL_KEY ?? '';
      python = env.PAULA_BODYLAB_PYTHON
        ?? resolve(config.root, '..', 'body-lab', '.venv', 'bin', 'python');
      script = resolve(config.root, '..', 'body-lab', 'measure_from_sam3d.py');
    },

    configureServer(server) {
      server.middlewares.use(ENDPOINT, async (req, res) => {
        const send = (status: number, payload: unknown) => {
          res.statusCode = status;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(payload));
        };
        const fail = (status: number, code: ErrorCode, error: string) => send(status, { code, error });

        if (req.method !== 'POST') return fail(405, 'failed', 'użyj POST');

        if (!falKey) {
          return fail(503, 'not-configured', 'brak FAL_KEY w .env — patrz .env.example');
        }
        if (!existsSync(python) || !existsSync(script)) {
          return fail(503, 'not-configured', `brak warsztatu body-lab (${python})`);
        }

        let image: string;
        try {
          const raw = await readBody(req);
          const parsed = JSON.parse(raw) as { image?: unknown };
          if (typeof parsed.image !== 'string' || !parsed.image.startsWith('data:image/')) {
            return fail(400, 'bad-file', 'oczekiwano `image` jako data: URI obrazu');
          }
          image = parsed.image;
        } catch (e) {
          const message = (e as Error).message;
          return fail(message === 'too large' ? 400 : 400, 'bad-file', message);
        }

        let falBody: unknown;
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
            body: JSON.stringify({
              image_url: image,
              include_mhr_params: true,
              // Siatki i punkty kluczowe tylko powiększyłyby odpowiedź; wymiary
              // liczymy z parametrów kształtu, a awatara budujemy z Anny.
              export_meshes: false,
              include_3d_keypoints: false,
            }),
          });
          falBody = await falRes.json().catch(() => null);
          if (!falRes.ok) {
            const detail = (falBody as { detail?: unknown })?.detail;
            return fail(502, 'failed', `fal.ai ${falRes.status}: ${JSON.stringify(detail ?? falBody)}`);
          }
        } catch (e) {
          return fail(502, 'failed', `fal.ai nie odpowiedział: ${(e as Error).message}`);
        }

        const people = (falBody as { metadata?: { people?: unknown[] } })?.metadata?.people;
        if (!Array.isArray(people) || people.length === 0) {
          return fail(422, 'no-person', 'model nie znalazł osoby na zdjęciu');
        }
        // Więcej niż jedna osoba to nie jest zdjęcie do pomiaru i nie zgadujemy,
        // która jest tą właściwą — pierwsza z brzegu byłaby losem, nie pomiarem.
        if (people.length > 1) {
          return fail(422, 'no-person', `na zdjęciu jest ${people.length} osób`);
        }

        const measured = await measureWithBodyLab(python, script, people[0]);
        if (measured.status === 'failed') return fail(500, 'failed', measured.detail);

        return send(200, { measurements: measured.measurements });
      });
    },
  };
}
