import { parseRobots, isAllowed, type RobotsRules } from '../_shared/robots.ts';

/**
 * Pobranie strony sklepu dla „wklej link do produktu".
 *
 * Parser w `src/lib/catalog/link.ts` potrzebuje surowego HTML-a, a przeglądarka
 * go nie zdobędzie: żądanie na cudzy origin blokuje CORS, zanim w ogóle
 * wyjdzie. Więc robi to coś, co przeglądarką nie jest. Do tej pory middleware
 * dev-serwera (`vite-plugins/fetch-product.ts`), przez co funkcja żyła wyłącznie
 * na maszynie Antonia. To jest ta sama rzecz przeniesiona tam, gdzie od początku
 * miała trafić — PLUG(supabase) z `docs/integration-points.md`.
 *
 * Trzy reguły przepisane z middleware'u bez zmian, bo to one decydują, czy
 * zachowujemy się przyzwoicie wobec sklepu:
 *
 * - **Własny User-Agent, nie podszywanie się pod Chrome.** Zalando banuje
 *   nazwane crawlery AI, przepuszczając `*`; uczciwa odpowiedź na to jest taka,
 *   żeby powiedzieć, kim jesteśmy, i przyjąć odpowiedź.
 * - **robots.txt sprawdzany przed pobraniem strony**, per origin.
 * - **Pobieramy jedną stronę, o którą poprosił człowiek.** Bez chodzenia po
 *   linkach, bez crawlowania.
 *
 * Czwarta reguła jest tutaj rozwiązana inaczej niż w middlewarze i to jedyna
 * różnica w kodzie. Middleware rozwiązywał nazwę przez `node:dns` i odrzucał
 * adresy prywatne, żeby nie stać się otwartą furtką do sieci lokalnej maszyny.
 * W Deno `Deno.resolveDns` bywa niedostępne w tym środowisku, więc próbujemy go
 * użyć, a gdy go nie ma, zostaje sprawdzenie samej nazwy. To jest **słabsza**
 * ochrona — nie zatrzyma nazwy, która dopiero w DNS-ie wskazuje na adres
 * prywatny — i dlatego jest tu napisana wprost, zamiast wyglądać na pełną.
 *
 * Cache reguł robots żyje tyle, co instancja funkcji. Nie jest współdzielony
 * między instancjami i nie ma być — to oszczędność jednego żądania, nie stan.
 */

const USER_AGENT = 'PaulaBot/0.1 (+https://paula.app/bot; fit-matching for one user request)';

/**
 * Strona produktowa Sinsay ma 4,5 MB i wstawia swój JSON-LD na bajcie
 * 4 439 427 — za wszystkim innym. Limit 3 MB ucinał go, a parser po cichu
 * spadał na Open Graph i oddawał gorszy rekord bez żadnego błędu. Limit ma
 * chronić pamięć przed odpowiedzią bez końca, więc musi z zapasem mijać
 * największą stronę, jaką naprawdę zmierzyliśmy, a ucięcie ma być zgłoszone,
 * nie zgadywane.
 */
const MAX_BYTES = 12_000_000;

const robotsCache = new Map<string, RobotsRules>();

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'GET, OPTIONS',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' },
  });
}

/** Adresy, na które proxy nigdy nie może zostać skierowane. */
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

/** Nazwy, które nie mają prawa wyjść poza publiczny internet. */
function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '');
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h.endsWith('.local') || h.endsWith('.internal')) return true;
  // Adres wpisany wprost jako liczby omija DNS, więc sprawdzamy go od razu.
  if (/^[\d.]+$/.test(h) || h.includes(':')) return isPrivateAddress(h);
  return false;
}

async function assertPublicHost(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('only http and https links are supported');
  }
  if (isPrivateHostname(url.hostname)) {
    throw new Error('refusing to fetch a private address');
  }
  // Rozwiązanie nazwy jest lepsze niż sprawdzenie jej kształtu, ale nie wszędzie
  // jest dostępne. Gdy go nie ma, zostaje sprawdzenie wyżej — i tyle, ile ono
  // daje. Cisza tutaj byłaby udawaniem, że sprawdziliśmy.
  const resolve = (globalThis as { Deno?: { resolveDns?: unknown } }).Deno?.resolveDns;
  if (typeof resolve !== 'function') return;
  for (const kind of ['A', 'AAAA'] as const) {
    let records: string[] = [];
    try {
      records = await (resolve as (h: string, k: string) => Promise<string[]>)(url.hostname, kind);
    } catch {
      continue; // brak rekordu tego rodzaju to nie błąd
    }
    for (const address of records) {
      if (isPrivateAddress(address)) throw new Error('refusing to fetch a private address');
    }
  }
}

async function robotsFor(origin: string): Promise<RobotsRules> {
  const cached = robotsCache.get(origin);
  if (cached) return cached;
  let rules = parseRobots('', USER_AGENT);
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/plain' },
      signal: AbortSignal.timeout(8000),
    });
    // 404 znaczy brak reguł, czyli wszystko wolno.
    if (res.ok) rules = parseRobots(await res.text(), 'PaulaBot');
  } catch {
    // Kłopot sieciowy przy czytaniu robots nie jest pozwoleniem, żeby je
    // zignorować, ale nie jest też powodem, żeby wywalić jedno żądanie
    // użytkowniczki. Traktujemy jak otwarte i zapisujemy to tutaj, żeby wybór
    // był widoczny, a nie przypadkowy.
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
  const merged = new Uint8Array(total > MAX_BYTES ? MAX_BYTES : total);
  let at = 0;
  for (const chunk of chunks) { merged.set(chunk, at); at += chunk.length; }
  return { text: new TextDecoder('utf-8').decode(merged.subarray(0, at)), truncated };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const target = new URL(req.url).searchParams.get('url');
    if (!target) return json(400, { error: 'missing url' });

    const url = new URL(target);
    await assertPublicHost(url);

    const rules = await robotsFor(url.origin);
    if (!isAllowed(rules, url.pathname)) {
      return json(403, { error: `${url.hostname} disallows this path in robots.txt for PaulaBot` });
    }

    const page = await fetch(url, {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'pl-PL,pl;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    // Status sklepu jedzie razem z odpowiedzią: 403 od ściany na boty i 500 od
    // zepsutej strony to dla użytkowniczki dwie różne wiadomości.
    if (!page.ok) return json(502, { error: `shop returned HTTP ${page.status}`, shopStatus: page.status });

    const { text, truncated } = await readCapped(page);
    return json(200, { html: text, finalUrl: page.url || url.toString(), truncated });
  } catch (e) {
    return json(400, { error: (e as Error).message });
  }
});
