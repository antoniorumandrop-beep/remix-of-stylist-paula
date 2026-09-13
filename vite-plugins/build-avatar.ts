import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Sylwetka z wymiarów — middleware dev-serwera.
 *
 * Warsztat w `body-lab/` dopasowuje ciało Anny do trzech obwodów i wzrostu, a
 * potem eksportuje siatkę. Trwa to około jedenastu sekund, więc liczy się raz i
 * wynik jest trzymany w pamięci procesu: te same wymiary drugi raz odpowiadają
 * natychmiast. PLUG(avatar): w produkcji zrobi to edge function albo kolejka —
 * przeglądarka dostanie ten sam GLB tą samą drogą.
 *
 * **Awatar powstaje z Anny, nie z siatki zwróconej przez SAM 3D Body.** Tamta
 * ma zaszyty błąd wzrostu rzędu 7 cm (zmierzone 2026-09-13), więc ciało
 * wychodziłoby za niskie i przez to za krępe. Tutaj wzrost pochodzi od
 * człowieka, a obwody z pomiaru — i dlatego sylwetka wygląda tak samo,
 * niezależnie od tego, czy obwody przyszły z taśmy, czy ze zdjęcia.
 */

const ENDPOINT = '/__paula/build-avatar';

/** Jedenaście sekund na dopasowanie plus zapas na wolniejszą maszynę. */
const TIMEOUT_MS = 120_000;

interface Wanted {
  bust: number;
  waist: number;
  hips: number;
  heightCm: number;
}

/** Klucz pamięci podręcznej. Wymiary w pełnych centymetrach — poniżej tego
 *  progu różnica jest niewidoczna na sylwetce, a liczy się drugie tyle. */
function cacheKey(w: Wanted): string {
  return [w.bust, w.waist, w.hips, w.heightCm].map(Math.round).join('/');
}

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 10_000) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function runBridge(python: string, script: string, wanted: Wanted): Promise<
  { status: 'ok'; body: unknown } | { status: 'failed'; detail: string }
> {
  return new Promise(resolveRun => {
    const child = spawn(python, [script], { stdio: ['pipe', 'pipe', 'pipe'] });
    const timer = setTimeout(() => child.kill('SIGKILL'), TIMEOUT_MS);
    let out = '';
    let err = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('error', e => {
      clearTimeout(timer);
      resolveRun({ status: 'failed', detail: `nie udało się uruchomić Pythona: ${e.message}` });
    });
    child.on('close', () => {
      clearTimeout(timer);
      let parsed: unknown;
      try {
        parsed = JSON.parse(out);
      } catch {
        return resolveRun({ status: 'failed', detail: err.trim().slice(-400) || 'brak odpowiedzi z body-lab' });
      }
      const asError = (parsed as { error?: { code?: string; detail?: string } }).error;
      if (asError) return resolveRun({ status: 'failed', detail: `${asError.code}: ${asError.detail}` });
      return resolveRun({ status: 'ok', body: parsed });
    });
    child.stdin.end(JSON.stringify(wanted));
  });
}

export function buildAvatarPlugin(): Plugin {
  let python = '';
  let script = '';
  const cache = new Map<string, unknown>();

  return {
    name: 'paula-build-avatar',
    apply: 'serve',

    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir ?? process.cwd(), '');
      python = env.PAULA_BODYLAB_PYTHON
        ?? resolve(config.root, '..', 'body-lab', '.venv', 'bin', 'python');
      script = resolve(config.root, '..', 'body-lab', 'build_avatar.py');
    },

    configureServer(server) {
      server.middlewares.use(ENDPOINT, async (req, res) => {
        const send = (status: number, payload: unknown) => {
          res.statusCode = status;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(payload));
        };

        if (req.method !== 'POST') return send(405, { code: 'failed', error: 'użyj POST' });
        if (!existsSync(python) || !existsSync(script)) {
          return send(503, { code: 'not-configured', error: `brak warsztatu body-lab (${python})` });
        }

        let wanted: Wanted;
        try {
          const parsed = JSON.parse(await readBody(req)) as Partial<Wanted>;
          const numbers = [parsed.bust, parsed.waist, parsed.hips, parsed.heightCm];
          if (numbers.some(n => typeof n !== 'number' || !Number.isFinite(n))) {
            return send(400, { code: 'bad-input', error: 'oczekiwano bust, waist, hips, heightCm' });
          }
          wanted = parsed as Wanted;
        } catch (e) {
          return send(400, { code: 'bad-input', error: (e as Error).message });
        }

        const key = cacheKey(wanted);
        const cached = cache.get(key);
        if (cached) return send(200, cached);

        const built = await runBridge(python, script, wanted);
        if (built.status === 'failed') return send(500, { code: 'failed', error: built.detail });

        cache.set(key, built.body);
        return send(200, built.body);
      });
    },
  };
}
