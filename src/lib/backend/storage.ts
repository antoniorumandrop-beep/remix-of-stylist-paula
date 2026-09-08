/**
 * The only file that touches localStorage for user data.
 *
 * Kept deliberately dumb: read a key, write a key. Reactivity is the query
 * client's job (`queryClient.ts`), not this file's.
 */
export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeStored(key: string) {
  localStorage.removeItem(key);
}
