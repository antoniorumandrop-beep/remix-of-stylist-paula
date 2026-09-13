import type { PhotoRepository } from './types';

/**
 * Where a fit's photos physically are: IndexedDB, one blob per photo.
 *
 * Not localStorage, and that is not a preference. A phone photo is 3–6 MB, a
 * data URI adds a third on top, and the whole origin gets about 5 MB — shared
 * with her body profile, her wardrobe and the imported catalogue. The third fit
 * would throw on write and lose itself silently. IndexedDB stores blobs
 * natively, without base64, without a practical ceiling, and deletes by key.
 *
 * No wrapper library: this is a browser API and `idb` would be a dependency
 * earning a dozen lines. The whole surface used here is open, put, get, delete.
 *
 * Untestable under Vitest — jsdom implements neither IndexedDB nor canvas — so
 * this file is covered by Playwright against real Chromium instead of a
 * hand-written double that could pass while the real API fails. See
 * `e2e/fits.spec.ts`.
 */

const DB_NAME = 'paula.photos';
const DB_VERSION = 1;
const STORE = 'photos';

/**
 * Reading `indexedDB` is itself the thing that throws in a browser with site
 * data blocked — the same trap as `localStorage`, which this project has
 * already been bitten by. So the check is a try/catch, not a truthiness test.
 */
function hasIndexedDB(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

/** Thrown when the browser cannot keep photos at all, so screens can say so. */
export class PhotosUnavailableError extends Error {
  constructor() {
    super('this browser cannot store photos');
    this.name = 'PhotosUnavailableError';
  }
}

/**
 * One connection, opened on first use. Kept in a promise rather than a
 * variable so two calls racing on a cold store do not open two databases.
 * Dropped on failure and on `onclose`, so the next call reopens instead of
 * handing out a dead handle forever.
 */
let open: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!hasIndexedDB()) return Promise.reject(new PhotosUnavailableError());
  if (open) return open;
  open = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onclose = () => { open = null; };
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error('indexedDB.open failed'));
    request.onblocked = () => reject(new Error('indexedDB.open blocked'));
  });
  open = open.catch(error => { open = null; throw error; });
  return open;
}

/**
 * One transaction, one request, one promise. Resolving on the transaction's
 * `oncomplete` rather than the request's `onsuccess` matters for writes: a
 * request can succeed inside a transaction that then aborts, and a photo that
 * "saved" without being written is exactly the kind of loss this store exists
 * to avoid.
 */
async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = work(tx.objectStore(STORE));
    let value: T;
    request.onsuccess = () => { value = request.result as T; };
    tx.oncomplete = () => resolve(value);
    tx.onabort = () => reject(tx.error ?? request.error ?? new Error('photo transaction aborted'));
    tx.onerror = () => reject(tx.error ?? request.error ?? new Error('photo transaction failed'));
  });
}

/** Enough entropy that two photos picked in the same millisecond differ. */
function photoId(): string {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createPhotoStore(): PhotoRepository {
  return {
    available: hasIndexedDB,
    async put(blob) {
      const id = photoId();
      await run<IDBValidKey>('readwrite', store => store.put(blob, id));
      return id;
    },
    async get(id) {
      const blob = await run<Blob | undefined>('readonly', store => store.get(id));
      return blob ?? null;
    },
    async remove(id) {
      await run<undefined>('readwrite', store => store.delete(id));
    },
  };
}
