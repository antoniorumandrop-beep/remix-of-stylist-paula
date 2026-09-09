import type { Plugin } from 'vite';
import dns from 'node:dns/promises';
import { parseRobots, isAllowed } from '../src/lib/catalog/robots';

/**
 * Dev-only fetch for "paste a product link".
 *
 * The parser in `src/lib/catalog/link.ts` needs raw HTML, and a browser cannot
 * get it: a cross-origin `fetch` of a shop page is blocked before it starts.
 * So the request has to be made by something that is not the browser. In
 * production that is an edge function — PLUG(supabase), see
 * `docs/integration-points.md`. During development it is this middleware, so
 * the feature is testable today instead of after the backend exists.
 *
 * Three rules it enforces, taken from `research/bodytech-09-og-image-test.md`:
 *
 * - **Our own User-Agent, not a fake Chrome.** The research measured
 *   availability with a Chrome UA; that was a measurement, not a way to
 *   behave. Zalando bans named AI crawlers while allowing `*`, and the honest
 *   answer to that is to say who we are and accept the answer.
 * - **robots.txt is checked before the page is fetched**, per origin, cached
 *   for the life of the dev server.
 * - **We fetch one page a person asked for.** No link-following, no crawling.
 *
 * It is also a proxy, and the dev server listens on every interface, so it
 * refuses anything that is not a public http(s) address — otherwise it would
 * be an open door to the machine's own network.
 */

export const USER_AGENT = 'PaulaBot/0.1 (+https://paula.app/bot; fit-matching for one user request)';

/**
 * Sinsay's product page is 4.5 MB and puts its JSON-LD at byte 4,439,427 —
 * after everything else on the page. A 3 MB cap cut it off, and the parser
 * quietly fell back to Open Graph and produced a worse record with no error.
 * The cap exists so a runaway response cannot fill memory; it must be well
 * clear of the largest page we have actually measured, and truncation must be
 * reported rather than inferred.
 */
const MAX_BYTES = 12_000_000;
const robotsCache = new Map<string, ReturnType<typeof parseRobots>>();

/** Blocks the addresses a proxy must never be pointed at. */
function isPrivateAddress(address: string): boolean {
  if (address.includes(':')) {
    const v6 = address.toLowerCase();
    if (v6 === '::1' || v6 === '::') return true;
    if (/^f[cd][0-9a-f]{2}:/.test(v6)) return true; // unique local
    if (/^fe[89ab][0-9a-f]:/.test(v6)) return true; // link local
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  const [a, b] = address.split('.').map(Number);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

async function assertPublicHost(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('only http and https links are supported');
  }
  const results = await dns.lookup(url.hostname, { all: true });
  if (results.length === 0) throw new Error('host does not resolve');
  for (const { address } of results) {
    if (isPrivateAddress(address)) throw new Error('refusing to fetch a private address');
  }
}

async function robotsFor(origin: string): Promise<ReturnType<typeof parseRobots>> {
  const cached = robotsCache.get(origin);
  if (cached) return cached;
  let rules = parseRobots('', USER_AGENT);
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/plain' },
      signal: AbortSignal.timeout(8000),
    });
    // A 404 means no rules, which means everything is allowed.
    if (res.ok) rules = parseRobots(await res.text(), 'PaulaBot');
  } catch {
    // Network trouble reading robots is not permission to ignore it, but it is
    // also not a reason to fail a single user-requested fetch. Treated as open,
    // and noted here so the choice is visible rather than accidental.
  }
  robotsCache.set(origin, rules);
  return rules;
}

async function readCapped(res: Response): Promise<{ text: string; truncated: boolean }> {
  const reader = res.body?.getReader();
  if (!reader) return { text: await res.text(), truncated: false };
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) { truncated = true; await reader.cancel(); break; }
    chunks.push(value);
  }
  const text = new TextDecoder('utf-8').decode(
    chunks.reduce<Uint8Array>((acc, chunk) => {
      const merged = new Uint8Array(acc.length + chunk.length);
      merged.set(acc);
      merged.set(chunk, acc.length);
      return merged;
    }, new Uint8Array()),
  );
  return { text, truncated };
}

export function fetchProductPlugin(): Plugin {
  return {
    name: 'paula-fetch-product',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__paula/fetch-product', async (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(body));
        };
        try {
          const target = new URL(req.url ?? '', 'http://localhost').searchParams.get('url');
          if (!target) return send(400, { error: 'missing url' });

          const url = new URL(target);
          await assertPublicHost(url);

          const rules = await robotsFor(url.origin);
          if (!isAllowed(rules, url.pathname)) {
            return send(403, { error: `${url.hostname} disallows this path in robots.txt for ${USER_AGENT.split('/')[0]}` });
          }

          const page = await fetch(url, {
            headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml', 'accept-language': 'pl-PL,pl;q=0.9' },
            redirect: 'follow',
            signal: AbortSignal.timeout(15000),
          });
          if (!page.ok) return send(502, { error: `shop returned HTTP ${page.status}` });

          const { text, truncated } = await readCapped(page);
          send(200, { html: text, finalUrl: page.url || url.toString(), truncated });
        } catch (e) {
          send(400, { error: (e as Error).message });
        }
      });
    },
  };
}
