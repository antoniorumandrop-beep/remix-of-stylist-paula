// @vitest-environment node
//
// Środowisko `node`, nie jsdom: to jest kod middleware'u, który biegnie po
// stronie serwera. W jsdom nie ma `AbortSignal.timeout`, więc każde żądanie
// wywracałoby się na tworzeniu limitu czasu i test mierzyłby brak przeglądarki
// zamiast zachowania wtyczki.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Reguły ścieżki zdjęcia zapisane jako test, nie jako akapit.
 *
 * `docs/photo-measurement.md` obiecuje trzy rzeczy: zdjęcie idzie w treści
 * żądania a nie do CDN-u dostawcy, nagłówek wyłącza trzydziestodniowe
 * przechowywanie treści u dostawcy, i do Pythona nie trafia obraz. Wszystkie
 * trzy są jedną linijką w kodzie, którą można skasować bez niczyjego
 * zauważenia — a lekcja z sesji 4 brzmi, że reguła zapisana w dokumencie nie
 * obowiązuje.
 */

// Podmieniamy całe `vite`, a nie tylko `loadEnv` przez `importActual` —
// prawdziwy moduł ciągnie za sobą esbuild, który w jsdom się nie uruchamia.
// Wtyczka bierze stamtąd wyłącznie `loadEnv` i typ, więc tyle wystarczy.
const { env } = vi.hoisted(() => ({ env: {} as Record<string, string> }));
vi.mock('vite', () => ({ loadEnv: () => env }));

const { measurePhotoPlugin } = await import('../../../vite-plugins/measure-photo');

/** Katalog udający projekt: `<root>/app` obok `<root>/body-lab`. */
function fakeProject(bridgeOutput: string) {
  const root = mkdtempSync(join(tmpdir(), 'paula-photo-'));
  const appDir = join(root, 'app');
  const labDir = join(root, 'body-lab');
  mkdirSync(appDir);
  mkdirSync(labDir);
  // Most do warsztatu podmieniony na skrypt powłoki: zjada stdin i wypisuje
  // gotowe liczby. Test ma sprawdzać middleware, nie instalację Pythona.
  const bridge = join(labDir, 'measure_from_sam3d.py');
  writeFileSync(bridge, `#!/bin/sh\ncat > "$STDIN_COPY"\necho '${bridgeOutput}'\n`);
  chmodSync(bridge, 0o755);
  return { appDir, bridge };
}

interface Captured {
  status: number;
  body: Record<string, unknown>;
}

/** Odpala middleware i oddaje to, co odpisał. */
async function callPlugin(opts: {
  root: string;
  payload: unknown;
  method?: string;
  falResponse?: { ok: boolean; status?: number; json: unknown };
}): Promise<{ result: Captured; request: RequestInit | undefined; url: string | undefined }> {
  const plugin = measurePhotoPlugin();
  (plugin.configResolved as (c: unknown) => void)({ mode: 'development', root: opts.root, envDir: opts.root });

  let handler: ((req: IncomingMessage, res: ServerResponse) => unknown) | null = null;
  (plugin.configureServer as (s: unknown) => void)({
    middlewares: { use: (_path: string, fn: typeof handler) => { handler = fn; } },
  });
  if (!handler) throw new Error('middleware się nie zarejestrował');

  let sentUrl: string | undefined;
  let sentInit: RequestInit | undefined;
  const fal = opts.falResponse;
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    sentUrl = url;
    sentInit = init;
    return Promise.resolve({
      ok: fal?.ok ?? true,
      status: fal?.status ?? 200,
      json: () => Promise.resolve(fal?.json ?? {}),
    } as Response);
  });

  const chunks = [Buffer.from(JSON.stringify(opts.payload))];
  const req = {
    method: opts.method ?? 'POST',
    on(event: string, cb: (arg?: Buffer) => void) {
      if (event === 'data') chunks.forEach(c => cb(c));
      if (event === 'end') cb();
      return this;
    },
    destroy() {},
  } as unknown as IncomingMessage;

  const captured: Captured = { status: 0, body: {} };
  const res = {
    set statusCode(v: number) { captured.status = v; },
    get statusCode() { return captured.status; },
    setHeader() {},
    end(payload: string) { captured.body = JSON.parse(payload); },
  } as unknown as ServerResponse;

  await (handler as (r: IncomingMessage, s: ServerResponse) => Promise<void>)(req, res);
  return { result: captured, request: sentInit, url: sentUrl };
}

const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

const ONE_PERSON = {
  metadata: { num_people: 1, people: [{ shape_params: [0.1, 0.2], scale_params: [1] }] },
};

beforeEach(() => {
  for (const key of Object.keys(env)) delete env[key];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('middleware pomiaru ze zdjęcia', () => {
  it('bez klucza mówi wprost, że nie ma czym liczyć', async () => {
    const { appDir } = fakeProject('{}');
    const { result } = await callPlugin({ root: appDir, payload: { image: PHOTO } });
    expect(result.status).toBe(503);
    expect(result.body.code).toBe('not-configured');
  });

  it('wysyła zdjęcie w treści żądania, a nie jako plik wgrany do CDN-u', async () => {
    const { appDir } = fakeProject('{}');
    env.FAL_KEY = 'test-key';
    env.PAULA_BODYLAB_PYTHON = '/bin/sh';
    const { request, url } = await callPlugin({
      root: appDir,
      payload: { image: PHOTO },
      falResponse: { ok: true, json: { metadata: { people: [] } } },
    });
    // Adres w całości, nie sam fragment: `api.fal.ai/fal-ai/sam-3/3d-body`
    // też zawiera „sam-3/3d-body" i odpowiada 404 na każdy model.
    expect(url).toBe('https://fal.run/fal-ai/sam-3/3d-body');
    const sent = JSON.parse(String(request?.body)) as { image_url: string };
    // Zdjęcie jest treścią żądania. Gdyby tu był `https://…`, znaczyłoby to, że
    // po drodze powstał plik pod adresem — a plik pod adresem żyje własnym życiem.
    expect(sent.image_url).toBe(PHOTO);
    expect(sent.image_url.startsWith('data:image/')).toBe(true);
  });

  it('wyłącza trzydziestodniowe przechowywanie treści żądania u dostawcy', async () => {
    const { appDir } = fakeProject('{}');
    env.FAL_KEY = 'test-key';
    env.PAULA_BODYLAB_PYTHON = '/bin/sh';
    const { request } = await callPlugin({
      root: appDir,
      payload: { image: PHOTO },
      falResponse: { ok: true, json: { metadata: { people: [] } } },
    });
    const headers = request?.headers as Record<string, string>;
    expect(headers['X-Fal-Store-IO']).toBe('0');
    expect(headers['X-Fal-Object-Lifecycle-Preference']).toContain('expiration_duration_seconds');
  });

  it('odmawia czegoś, co nie jest obrazem', async () => {
    const { appDir } = fakeProject('{}');
    env.FAL_KEY = 'test-key';
    env.PAULA_BODYLAB_PYTHON = '/bin/sh';
    const { result } = await callPlugin({ root: appDir, payload: { image: 'https://przyklad.pl/ja.jpg' } });
    expect(result.status).toBe(400);
    expect(result.body.code).toBe('bad-file');
  });

  it('nie zgaduje, którą osobę mierzyć, gdy na zdjęciu jest ich kilka', async () => {
    const { appDir } = fakeProject('{}');
    env.FAL_KEY = 'test-key';
    env.PAULA_BODYLAB_PYTHON = '/bin/sh';
    const { result } = await callPlugin({
      root: appDir,
      payload: { image: PHOTO },
      falResponse: { ok: true, json: { metadata: { people: [{ shape_params: [] }, { shape_params: [] }] } } },
    });
    expect(result.status).toBe(422);
    expect(result.body.code).toBe('no-person');
  });

  it('do warsztatu przekazuje liczby, nigdy obrazu', async () => {
    const { appDir, bridge } = fakeProject('{"waist_cm": 70.0, "bust_cm": 90.0, "hip_cm": 100.0}');
    const stdinCopy = `${bridge}.stdin`;
    process.env.STDIN_COPY = stdinCopy;
    env.FAL_KEY = 'test-key';
    env.PAULA_BODYLAB_PYTHON = '/bin/sh';

    const { result } = await callPlugin({
      root: appDir,
      payload: { image: PHOTO },
      falResponse: { ok: true, json: ONE_PERSON },
    });

    expect(result.status).toBe(200);
    expect(result.body.measurements).toEqual({ waist_cm: 70, bust_cm: 90, hip_cm: 100 });

    const { readFileSync } = await import('node:fs');
    const seenByPython = readFileSync(stdinCopy, 'utf8');
    expect(seenByPython).toContain('shape_params');
    expect(seenByPython).not.toContain('data:image');
    expect(seenByPython).not.toContain('/9j/4AAQ');
    delete process.env.STDIN_COPY;
  });
});
