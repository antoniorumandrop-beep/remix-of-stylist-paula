import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/backend/queryClient';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { WEIGHTS } from '@/lib/fit/score';
import HowItWorks from './HowItWorks';

/**
 * The ranking disclosure, guarded.
 *
 * Two obligations sit on this screen, and neither is a matter of taste. A
 * service that ranks products has to say what decides the order and whether
 * anyone paid for a position — the Omnibus amendments, in force in Poland
 * since 2023. So the sentences that carry those two statements are asserted
 * here: deleting one during a redesign has to break the build, not slip out
 * quietly in a diff nobody reads.
 *
 * The third guard is against drift. The weights are printed from the engine,
 * and the import is checked, so the page cannot claim a weight the scorer does
 * not use.
 */
function renderPage() {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={createQueryClient()}>
        <LanguageProvider><HowItWorks /></LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('jak działa Paula', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('paula-lang', 'pl');
  });

  it('mówi, co decyduje o kolejności', () => {
    renderPage();
    expect(screen.getByText(/Co decyduje o kolejności/)).toBeInTheDocument();
    expect(screen.getByText(/Fit Score od najwyższego do najniższego/)).toBeInTheDocument();
    expect(screen.getByText(/Dwie rzeczy z tym samym wynikiem ustawia cena/)).toBeInTheDocument();
  });

  it('mówi wprost, czy ktoś płaci za miejsce', () => {
    renderPage();
    expect(screen.getByText(/Nic nie jest płatnym plasowaniem/)).toBeInTheDocument();
    expect(screen.getByText(/Nie ma linków afiliacyjnych/)).toBeInTheDocument();
  });

  it('wypisuje wagi silnika, a nie własne liczby', () => {
    renderPage();
    // Every weight the scorer uses has to be on the page.
    for (const weight of Object.values(WEIGHTS)) {
      expect(screen.getAllByText(String(weight)).length).toBeGreaterThan(0);
    }
  });

  it('czyta wagi z silnika, zamiast je przepisywać', () => {
    // The render check above would pass just as happily on numbers typed by
    // hand that happen to match today. This is the part that keeps them
    // matching tomorrow.
    const source = readFileSync(resolve(__dirname, 'HowItWorks.tsx'), 'utf8');
    expect(source).toMatch(/import \{ WEIGHTS \} from '@\/lib\/fit\/score'/);
  });

  it('nie obiecuje niczego o cenach, czego nie mamy', () => {
    renderPage();
    expect(screen.getByText(/trzydziestu dni historii ceny/)).toBeInTheDocument();
  });
});
