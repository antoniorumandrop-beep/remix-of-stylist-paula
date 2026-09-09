import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/backend/queryClient';
import type { ReactNode } from 'react';
import { useSaved } from './saved';

/**
 * `useSaved` is read by every product card on screen — twenty-four of them on
 * the feed's first page. It used to write `query.data ?? []`, building a fresh
 * empty array on every render while the query was pending, which gave `isSaved`
 * and `toggle` a new identity every render and pushed that churn into every
 * card at once. A single shared empty array fixes it, the same way `useCatalog`
 * already did.
 */
function wrapper({ children }: { children: ReactNode }) {
  const client = createQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useSaved', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps its callbacks stable while nothing has changed', async () => {
    const { result, rerender } = renderHook(() => useSaved(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const before = { isSaved: result.current.isSaved, ids: result.current.ids };
    rerender();
    rerender();

    expect(result.current.isSaved).toBe(before.isSaved);
    expect(result.current.ids).toBe(before.ids);
  });

  it('still reports what is saved', async () => {
    const { result } = renderHook(() => useSaved(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isSaved('produkt-1')).toBe(false);
    await act(async () => {
      await result.current.toggle('produkt-1');
    });
    await waitFor(() => expect(result.current.ids).toContain('produkt-1'));
    expect(result.current.isSaved('produkt-1')).toBe(true);
  });

  it('un-saves what was saved', async () => {
    const { result } = renderHook(() => useSaved(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggle('produkt-2');
    });
    await waitFor(() => expect(result.current.ids).toContain('produkt-2'));

    await act(async () => {
      await result.current.toggle('produkt-2');
    });
    await waitFor(() => expect(result.current.ids).not.toContain('produkt-2'));
  });
});
