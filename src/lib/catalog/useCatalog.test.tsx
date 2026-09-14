import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/backend/queryClient';
import type { ReactNode } from 'react';
import { backend } from '@/lib/backend';
import { useCatalog } from './useCatalog';
import type { RawProduct } from './types';

/**
 * The mock catalogue carries no photos, and once real garments arrived it read
 * as thirty broken products sitting among them. It cannot simply be deleted —
 * it is also the fixture the rest of the suite runs on — so the feed drops it
 * only when there is something real to show instead.
 */
function wrapper({ children }: { children: ReactNode }) {
  const client = createQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const photographed: RawProduct = {
  id: 'link:z', source: 'link', externalId: 'z', name: 'Dwurzędowa marynarka',
  brand: 'Reserved', price: 229.99, currency: 'PLN', category: 'outerwear',
  imageUrl: 'https://static.reserved.com/1.jpg', fetchedAt: 'now',
};

const catalogue = async () => {
  const { result } = renderHook(() => useCatalog(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  return result;
};

describe('useCatalog — katalog mockowy', () => {
  beforeEach(async () => {
    localStorage.clear();
    await backend.catalog.clearImported();
  });

  it('pokazuje katalog mockowy, dopóki nie ma nic prawdziwego', async () => {
    const result = await catalogue();
    // Nothing imported yet, so filler is all there is and hiding it would
    // leave a blank app.
    expect(result.current.products.length).toBeGreaterThan(0);
    expect(result.current.products.every(p => !p.imageUrl)).toBe(true);
  });

  it('chowa go, gdy w katalogu jest choć jedna rzecz z importu', async () => {
    await backend.catalog.importRaw([photographed]);
    const result = await catalogue();
    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].id).toBe('link:z');
  });

  it('nie chowa produktu marki tylko dlatego, że sklep nie dał zdjęcia', async () => {
    // A small brand fills the spreadsheet and leaves `image_url` empty. That is
    // a real product; dropping it would be a silent no-show for exactly the
    // brands Paula is for.
    await backend.catalog.importRaw([{ ...photographed, id: 'brand:y', source: 'brand', imageUrl: undefined }]);
    const result = await catalogue();
    expect(result.current.products.map(p => p.id)).toEqual(['brand:y']);
  });

  it('nie zabiera ich z byId, żeby zapisana rzecz dalej się otwierała', async () => {
    await backend.catalog.importRaw([photographed]);
    const result = await catalogue();
    // '1' is a mock product: gone from the feed, still openable from a wardrobe
    // that has it saved.
    expect(result.current.byId.get('1')).toBeTruthy();
    expect(result.current.byId.size).toBeGreaterThan(1);
  });
});
