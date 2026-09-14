import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/backend/queryClient';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { backend } from '@/lib/backend';
import ProductDetail from './ProductDetail';
import type { RawProduct } from '@/lib/catalog/types';

/**
 * The product page contradicted itself out loud.
 *
 * On a real Reserved blazer the breakdown printed "Talia — powinno leżeć jak
 * trzeba" four centimetres above "W talii zabraknie około 2 cm", both computed
 * from the same body. The breakdown reads the cut and knows nothing about
 * where a brand stops grading; the shop's own size chart made that case real
 * for the first time, because the generic table runs to size 50 and something
 * always fitted.
 */
const BLAZER: RawProduct = {
  id: 'link:blazer', source: 'link', externalId: 'blazer',
  name: 'Dwurzędowa marynarka', brand: 'Reserved', price: 229.99, currency: 'PLN',
  category: 'outerwear', imageUrl: 'https://static.reserved.com/1.jpg',
  material: '63% POLIESTER, 33% WISKOZA, 4% ELASTAN',
  sizes: 'XS, S, M, L, XL, XXL',
  sizeChart: [
    { size: 'XS', bust: 82, waist: 64, hips: 90 },
    { size: 'S', bust: 86, waist: 68, hips: 94 },
    { size: 'M', bust: 90, waist: 72, hips: 98 },
    { size: 'L', bust: 96, waist: 78, hips: 104 },
    { size: 'XL', bust: 102, waist: 84, hips: 110 },
    { size: 'XXL', bust: 108, waist: 90, hips: 116 },
  ],
  fetchedAt: 'now',
};

function renderBlazer() {
  return render(
    <MemoryRouter initialEntries={['/app/product/link:blazer']}>
      <QueryClientProvider client={createQueryClient()}>
        <LanguageProvider>
          <Routes>
            <Route path="/app/product/:id" element={<ProductDetail />} />
          </Routes>
        </LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

/** The row for one body point in "Gdzie leży dobrze — a gdzie może nie". */
const rowFor = (label: string) => screen.getByText(label).closest('li')!;

describe('werdykt punktu ciała a rozmiarówka marki', () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('paula-lang', 'pl');
    // Waist 92 against Reserved's largest waist of 90.
    localStorage.setItem('paula.bodyProfile', JSON.stringify({
      source: 'measured', bust: 106, waist: 92, hips: 110, heightCm: 179,
      updatedAt: '2026-09-14T00:00:00.000Z',
    }));
    await backend.catalog.importRaw([BLAZER]);
  });

  it('nie mówi, że w talii będzie dobrze, skoro rozmiaru tam brakuje', async () => {
    renderBlazer();
    await screen.findByText('Gdzie leży dobrze — a gdzie może nie');
    const waist = rowFor('Talia');
    expect(within(waist).queryByText('powinno leżeć jak trzeba')).not.toBeInTheDocument();
    expect(within(waist).getByText('może być ciasno')).toBeInTheDocument();
  });

  it('pisze, ilu centymetrów brakuje, w tym samym wierszu', async () => {
    renderBlazer();
    await screen.findByText('Gdzie leży dobrze — a gdzie może nie');
    expect(within(rowFor('Talia')).getByText(/największy rozmiar tego sklepu jest tu o 2 cm za mały/))
      .toBeInTheDocument();
  });

  it('zostawia w spokoju obwody, które się mieszczą', async () => {
    renderBlazer();
    await screen.findByText('Gdzie leży dobrze — a gdzie może nie');
    expect(within(rowFor('Biodra')).getByText('powinno leżeć jak trzeba')).toBeInTheDocument();
  });

  it('mówi to samo, co panel rozmiaru pod spodem', async () => {
    // The two used to disagree on one screen; this is the pair, asserted
    // together, so they cannot drift apart again.
    renderBlazer();
    await screen.findByText('Gdzie leży dobrze — a gdzie może nie');
    expect(within(rowFor('Talia')).getByText('może być ciasno')).toBeInTheDocument();
    expect(screen.getByText(/W talii zabraknie około 2 cm/)).toBeInTheDocument();
  });
});
