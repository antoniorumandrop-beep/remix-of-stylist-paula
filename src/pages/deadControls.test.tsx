import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/backend/queryClient';
import { LanguageProvider } from '@/i18n/LanguageContext';
import Saved from './Saved';
import Alerts from './Alerts';
import AddProduct from './AddProduct';

/**
 * Controls that move when clicked and do nothing.
 *
 * Three of them were still on screen: "Manage" on the alerts page, "Enable"
 * for price-drop alerts, and "New collection". Each needed a backend that did
 * not exist. Saying so is the same rule this project already applies to the
 * demo reference price and to the review form — a feature we cannot perform
 * announces that, rather than miming it.
 *
 * "New collection" has since left this file: collections are real now, and
 * `collections.test.tsx` checks that the button does what it says. A control
 * that starts working belongs in a test of the feature, not in the register of
 * things that do not.
 */
function renderPage(page: 'saved' | 'alerts' | 'add') {
  const el = page === 'saved' ? <Saved /> : page === 'alerts' ? <Alerts /> : <AddProduct />;
  return render(
    <MemoryRouter>
      <QueryClientProvider client={createQueryClient()}>
        <LanguageProvider>{el}</LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('kontrolki, które jeszcze nie działają', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('paula-lang', 'pl');
  });

  it('nie oferuje włączenia alertów cenowych, których nie ma czym obsłużyć', async () => {
    renderPage('saved');
    const enable = await screen.findByRole('button', { name: /Włącz/ });
    expect(enable).toBeDisabled();
    expect(enable).toHaveAttribute('title', 'Jeszcze nie działa');
  });

  it('nie oferuje zarządzania alertami, które są atrapą', async () => {
    renderPage('alerts');
    const manage = await screen.findByRole('button', { name: /Zarządzaj/ });
    expect(manage).toBeDisabled();
  });

  it('mówi po polsku, co jest niedostępne', async () => {
    renderPage('alerts');
    expect(await screen.findAllByText(/Jeszcze nie działa/)).not.toHaveLength(0);
  });
});

/**
 * "Dodaj z linku" — same problem, one build away rather than one backend
 * away. `/fetch-product` runs as dev-server middleware
 * (`vite-plugins/fetch-product.ts`); a built app has nothing there, so
 * `vite preview` was used to confirm what actually happens: the static host
 * answers with its SPA-fallback `index.html` (200, `text/html`), the fetch's
 * `res.json()` throws, `linkFetch.ts` catches it into an empty body, and the
 * screen ends up showing "Sklep zwrócił pustą stronę" — blaming the shop for
 * a request that never reached one. `import.meta.env.DEV` is the same signal
 * Vite itself uses to decide whether that middleware is even registered, so
 * it is what gates this screen too, rather than a flag we would have to keep
 * in sync by hand.
 */
describe('"dodaj z linku" poza serwerem deweloperskim', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('w dev pokazuje prawdziwy formularz', async () => {
    vi.stubEnv('DEV', true);
    renderPage('add');
    // The single-link field, not the bulk textarea below it — both share a
    // placeholder starting with "https://", so match the one field is exact.
    expect(await screen.findByPlaceholderText('https://sklep.example.pl/produkt/...')).toBeInTheDocument();
  });

  it('poza devem nie pokazuje formularza, tylko wyjaśnienie', async () => {
    vi.stubEnv('DEV', false);
    renderPage('add');
    expect(screen.queryByPlaceholderText('https://sklep.example.pl/produkt/...')).not.toBeInTheDocument();
    expect(await screen.findByText(/Jeszcze nie działa w tej wersji/)).toBeInTheDocument();
  });

  it('poza devem wyłącza wejście z ekranu zapisanych, zamiast prowadzić do martwego formularza', async () => {
    vi.stubEnv('DEV', false);
    renderPage('saved');
    const addButton = await screen.findByText('Dodaj z linku');
    expect(addButton.closest('button')).toBeDisabled();
  });
});
