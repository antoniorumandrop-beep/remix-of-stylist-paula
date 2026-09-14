// @vitest-environment node
//
// Środowisko `node`, nie jsdom: to jest kod middleware'u, który biegnie po
// stronie serwera. W jsdom nie ma `AbortSignal.timeout`, więc każde żądanie
// wywracałoby się na tworzeniu limitu czasu i test mierzyłby brak przeglądarki
// zamiast zachowania wtyczki.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Reguły ścieżki zdjęcia zapisane jako test, nie jako akapit.
 *
 * Zdjęcie fitu jedzie do wycięcia tła na cudzy serwer, więc obowiązują te same
 * cztery reguły, co przy pomiarze, i wszystkie są jedną linijką, którą da się
 * skasować bez niczyjego zauważenia. Czwarta jest tutaj nowa i najważniejsza:
 * **adres wyniku u fal nie może trafić do przeglądarki**, bo wszedłby do
 * IndexedDB i został tam jako odnośnik do czegoś, co było publiczne.
 */

const { env } = vi.hoisted(() => ({ env: {} as Record<string, string> }));
vi.mock('vite', () => ({ loadEnv: () => env }));

const { cutoutPhotoPlugin } = await import('../../vite-plugins/cutout-photo');

const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
const MASK_URL = 'https://v3b.fal.media/files/b/tajne/maska.png';
const MASK_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]);

interface Sent {
  status: number;
  headers: Record<string, string>;
  text: string;
  bytes: Uint8Array | null;
}

async function callPlugin(opts: {
  payload: unknown;
  method?: string;
  fal?: { ok?: boolean; status?: number; json: unknown };
  maskOk?: boolean;
}): Promise<{ result: Sent; falUrl?: string; falInit?: RequestInit; fetched: string[] }> {
  const plugin = cutoutPhotoPlugin();
  (plugin.configResolved as (c: unknown) => void)({ mode: 'development', root: '/tmp', envDir: '/tmp' });

  let handler: ((req: IncomingMessage, res: ServerResponse) => unknown) | null = null;
  (plugin.configureServer as (s: unknown) => void)({
    middlewares: { use: (_path: string, fn: typeof handler) => { handler = fn; } },
  });
  if (!handler) throw new Error('middleware się nie zarejestrował');

  const fetched: string[] = [];
  let falUrl: string | undefined;
  let falInit: RequestInit | undefined;
  const fal = opts.fal;
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    fetched.push(url);
    // Drugie wywołanie to pobranie maski spod adresu, który oddał model.
    if (url.startsWith('https://v3b.fal.media/')) {
      return Promise.resolve({
        ok: opts.maskOk ?? true,
        status: opts.maskOk === false ? 404 : 200,
        arrayBuffer: () => Promise.resolve(MASK_BYTES.buffer),
      } as unknown as Response);
    }
    falUrl = url;
    falInit = init;
    return Promise.resolve({
      ok: fal?.ok ?? true,
      status: fal?.status ?? 200,
      json: () => Promise.resolve(fal?.json ?? { masks: [{ url: MASK_URL }] }),
    } as Response);
  });

  const req = {
    method: opts.method ?? 'POST',
    on(event: string, cb: (arg?: Buffer) => void) {
      if (event === 'data') cb(Buffer.from(JSON.stringify(opts.payload)));
      if (event === 'end') cb();
      return this;
    },
    destroy() {},
  } as unknown as IncomingMessage;

  const result: Sent = { status: 0, headers: {}, text: '', bytes: null };
  const res = {
    set statusCode(v: number) { result.status = v; },
    get statusCode() { return result.status; },
    setHeader(name: string, value: string) { result.headers[name] = value; },
    end(payload: string | Buffer) {
      if (typeof payload === 'string') result.text = payload;
      else { result.bytes = new Uint8Array(payload); result.text = ''; }
    },
  } as unknown as ServerResponse;

  await (handler as (r: IncomingMessage, s: ServerResponse) => Promise<void>)(req, res);
  return { result, falUrl, falInit, fetched };
}

beforeEach(() => {
  for (const key of Object.keys(env)) delete env[key];
  env.FAL_KEY = 'test-key';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('middleware wycinania sylwetki', () => {
  it('bez klucza mówi wprost, że nie ma czym wycinać', async () => {
    delete env.FAL_KEY;
    const { result } = await callPlugin({ payload: { image: PHOTO } });
    expect(result.status).toBe(503);
    expect(JSON.parse(result.text).code).toBe('not-configured');
  });

  it('wysyła zdjęcie w treści żądania, a nie jako plik wgrany do CDN-u', async () => {
    const { falInit, falUrl } = await callPlugin({ payload: { image: PHOTO } });
    expect(falUrl).toContain('fal.run/fal-ai/sam-3/image');
    const body = JSON.parse(String(falInit?.body));
    expect(body.image_url).toBe(PHOTO);
    // Pytamy o pojęcie, żeby na zdjęciu w pokoju nie wyciął krzesła.
    expect(body.text_prompt).toBe('person');
  });

  it('wyłącza trzydziestodniowe przechowywanie treści u dostawcy', async () => {
    const { falInit } = await callPlugin({ payload: { image: PHOTO } });
    const headers = falInit?.headers as Record<string, string>;
    expect(headers['X-Fal-Store-IO']).toBe('0');
    const life = JSON.parse(headers['X-Fal-Object-Lifecycle-Preference']);
    expect(life.expiration_duration_seconds).toBeGreaterThan(0);
    expect(life.expiration_duration_seconds).toBeLessThanOrEqual(300);
  });

  it('oddaje bajty maski, a adresu u dostawcy nie pokazuje przeglądarce', async () => {
    const { result, fetched } = await callPlugin({ payload: { image: PHOTO } });
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('image/png');
    expect(result.bytes).toEqual(MASK_BYTES);
    // Bajty pobrał serwer...
    expect(fetched).toContain(MASK_URL);
    // ...a do przeglądarki adres nie poszedł ani w treści, ani w nagłówku.
    expect(result.text).not.toContain('fal.media');
    expect(JSON.stringify(result.headers)).not.toContain('fal.media');
  });

  it('mówi, że nie ma osoby, zamiast oddawać pustą maskę', async () => {
    const { result } = await callPlugin({ payload: { image: PHOTO }, fal: { json: { masks: [] } } });
    expect(result.status).toBe(422);
    expect(JSON.parse(result.text).code).toBe('no-person');
  });

  it('przy dwóch osobach nie zgaduje, która jest ta właściwa', async () => {
    const { result } = await callPlugin({
      payload: { image: PHOTO },
      fal: { json: { masks: [{ url: MASK_URL }, { url: MASK_URL }] } },
    });
    expect(result.status).toBe(422);
    expect(JSON.parse(result.text).error).toContain('2');
  });

  it('odrzuca treść, która nie jest data: URI obrazu', async () => {
    const { result } = await callPlugin({ payload: { image: 'https://cudzy.serwer/zdjecie.jpg' } });
    expect(result.status).toBe(400);
    expect(JSON.parse(result.text).code).toBe('bad-file');
  });

  it('nie daje się wywołać metodą inną niż POST', async () => {
    const { result } = await callPlugin({ payload: {}, method: 'GET' });
    expect(result.status).toBe(405);
  });
});
