/**
 * Shuffling the feed.
 *
 * `[...items].sort(() => Math.random() - 0.5)` is not a shuffle. A comparator
 * has to be consistent — the same pair must compare the same way every time —
 * and a random one is not, so the result depends on the sort algorithm rather
 * than on chance. In V8 that leaves items markedly more likely to stay near
 * where they started. It also re-ran on every change of the products array
 * reference, so the feed jumped around under the user while she scrolled.
 *
 * Fisher–Yates is the shuffle; a seeded generator makes it stable for a
 * session, so the order is arbitrary once rather than arbitrary constantly.
 */

/**
 * mulberry32: small, fast, and good enough for arranging a product feed.
 * Deterministic, which is the whole point — the same seed gives the same feed.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates. Returns a new array; the input is never touched. */
export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  const random = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const FEED_SEED_KEY = 'paula.feedSeed';

/**
 * One seed per browser session: the feed looks freshly arranged when she comes
 * back, and stays put while she is here — including when she opens a product
 * and comes back to the list.
 *
 * `sessionStorage` throws outright in a browser with site data blocked, so the
 * read is guarded and falls back to a per-load seed. A shuffled feed is not
 * worth a white page.
 */
export function sessionSeed(key: string = FEED_SEED_KEY): number {
  try {
    const stored = sessionStorage.getItem(key);
    if (stored !== null) {
      const parsed = Number(stored);
      if (Number.isFinite(parsed)) return parsed;
    }
    const seed = Math.floor(Math.random() * 2 ** 32);
    sessionStorage.setItem(key, String(seed));
    return seed;
  } catch {
    return Math.floor(Math.random() * 2 ** 32);
  }
}
