import { useCallback, useEffect, useRef } from 'react';

/**
 * Blob URLs that clean up after themselves.
 *
 * `URL.createObjectURL` hands back a string that keeps the underlying file
 * alive until the URL is revoked or the document is torn down. The review form
 * created one per attached photo and revoked none, so the bytes stayed
 * resident for as long as the tab was open — and submitting the review threw
 * the list away without releasing any of it.
 *
 * The hook owns the list, so leaving the screen releases whatever is still
 * held. The ref, rather than state, is deliberate: the cleanup has to see the
 * final list, not the one captured when the effect was created.
 */
export function useObjectUrls() {
  const urls = useRef<string[]>([]);

  useEffect(
    () => () => {
      urls.current.forEach(url => URL.revokeObjectURL(url));
      urls.current = [];
    },
    [],
  );

  const create = useCallback((file: Blob): string => {
    const url = URL.createObjectURL(file);
    urls.current = [...urls.current, url];
    return url;
  }, []);

  const revoke = useCallback((url: string) => {
    URL.revokeObjectURL(url);
    urls.current = urls.current.filter(held => held !== url);
  }, []);

  const revokeAll = useCallback(() => {
    urls.current.forEach(url => URL.revokeObjectURL(url));
    urls.current = [];
  }, []);

  /** What is still held. Exposed for tests and debugging, not for rendering. */
  const held = useCallback(() => [...urls.current], []);

  return { create, revoke, revokeAll, held };
}
