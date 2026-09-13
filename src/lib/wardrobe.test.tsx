import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createQueryClient } from '@/lib/backend/queryClient';
import { useWardrobe } from './wardrobe';

/**
 * The wardrobe is where the "did it fit?" loop starts.
 *
 * A click through to a shop marks a purchase as pending; confirming it puts
 * the garment in the wardrobe; and only an owned garment can be asked about.
 * If any link in that chain drops something, the feedback dataset — the one
 * thing Paula has that nobody else does — quietly stops filling up.
 */
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
}

/** Named without the `use` prefix: it is a test helper, not a hook. */
const mountWardrobe = () => renderHook(() => useWardrobe(), { wrapper });

describe('useWardrobe', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty', async () => {
    const { result } = mountWardrobe();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toEqual([]);
    expect(result.current.pending).toEqual([]);
    expect(result.current.outfits).toEqual([]);
  });

  it('follows a purchase from click, through confirmation, into the wardrobe', async () => {
    const { result } = mountWardrobe();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.markPending('produkt-1'); });
    await waitFor(() => expect(result.current.pending.map(p => p.productId)).toEqual(['produkt-1']));
    expect(result.current.has('produkt-1')).toBe(false);

    await act(async () => { await result.current.addItem('produkt-1'); });
    await waitFor(() => expect(result.current.has('produkt-1')).toBe(true));
  });

  it('lets her say she did not buy it after all', async () => {
    const { result } = mountWardrobe();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.markPending('produkt-2'); });
    await waitFor(() => expect(result.current.pending).toHaveLength(1));

    await act(async () => { await result.current.dismissPending('produkt-2'); });
    await waitFor(() => expect(result.current.pending).toHaveLength(0));
    expect(result.current.has('produkt-2')).toBe(false);
  });

  it('counts wears without losing the item', async () => {
    const { result } = mountWardrobe();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.addItem('produkt-3'); });
    await waitFor(() => expect(result.current.has('produkt-3')).toBe(true));
    const before = result.current.items.find(i => i.productId === 'produkt-3')!.timesWorn;

    await act(async () => { await result.current.incWear('produkt-3'); });
    await waitFor(() => {
      const after = result.current.items.find(i => i.productId === 'produkt-3')!.timesWorn;
      expect(after).toBe(before + 1);
    });
  });

  it('does not add the same garment twice', async () => {
    const { result } = mountWardrobe();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.addItem('produkt-4'); });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    await act(async () => { await result.current.addItem('produkt-4'); });

    await waitFor(() => {
      expect(result.current.items.filter(i => i.productId === 'produkt-4')).toHaveLength(1);
    });
  });

  it('builds and removes an outfit', async () => {
    const { result } = mountWardrobe();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.createOutfit('Na wesele', ['produkt-1', 'produkt-2']); });
    await waitFor(() => expect(result.current.outfits).toHaveLength(1));
    expect(result.current.outfits[0].name).toBe('Na wesele');
    expect(result.current.outfits[0].items.map(i => i.productId)).toEqual(['produkt-1', 'produkt-2']);
    expect(result.current.outfits[0].photoIds).toEqual([]);

    const id = result.current.outfits[0].id;
    await act(async () => { await result.current.deleteOutfit(id); });
    await waitFor(() => expect(result.current.outfits).toHaveLength(0));
  });

  it('removing a garment leaves the rest alone', async () => {
    const { result } = mountWardrobe();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addItem('produkt-a');
      await result.current.addItem('produkt-b');
    });
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    await act(async () => { await result.current.removeItem('produkt-a'); });
    await waitFor(() => {
      expect(result.current.has('produkt-a')).toBe(false);
      expect(result.current.has('produkt-b')).toBe(true);
    });
  });
});
