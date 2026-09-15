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
 * „Dodaj z linku" — ekran, który przestał już być martwy.
 *
 * Pobranie strony sklepu żyło wyłącznie w middlewarze dev-serwera
 * (`vite-plugins/fetch-product.ts`), więc w zbudowanej aplikacji nie było pod
 * tym adresem niczego: statyczny host oddawał SPA-fallback `index.html` (200,
 * `text/html`), `res.json()` się wywracał, `linkFetch.ts` łapał to jako pustą
 * treść i ekran pokazywał „Sklep zwrócił pustą stronę" — obwiniając sklep o
 * żądanie, które do sklepu nie wyszło.
 *
 * Od czasu edge function `supabase/functions/fetch-product` warunek jest już
 * inny i to jest sedno tych testów: **nie chodzi o to, czy jesteśmy w dev,
 * tylko czy jest dokąd wysłać żądanie**. W dev to middleware, w produkcji edge
 * function, a gdy nie ma ani jednego, ani drugiego — ekran mówi to wprost,
 * zamiast udawać działające pole. Sam wybór adresu pilnuje
 * `src/lib/catalog/linkFetchEndpoint.test.ts`.
 */
describe('"dodaj z linku" i to, czy jest dokąd wysłać żądanie', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('w dev pokazuje prawdziwy formularz', async () => {
    vi.stubEnv('DEV', true);
    renderPage('add');
    // The single-link field, not the bulk textarea below it — both share a
    // placeholder starting with "https://", so match the one field is exact.
    expect(await screen.findByPlaceholderText('https://sklep.example.pl/produkt/...')).toBeInTheDocument();
  });

  it('w produkcji z edge function też pokazuje formularz', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SUPABASE_URL', 'https://przyklad.supabase.co');
    renderPage('add');
    expect(await screen.findByPlaceholderText('https://sklep.example.pl/produkt/...')).toBeInTheDocument();
  });

  it('bez edge function nie pokazuje formularza, tylko wyjaśnienie', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SUPABASE_URL', '');
    renderPage('add');
    expect(screen.queryByPlaceholderText('https://sklep.example.pl/produkt/...')).not.toBeInTheDocument();
    expect(await screen.findByText(/Jeszcze nie działa w tej wersji/)).toBeInTheDocument();
  });

  it('bez edge function wyłącza wejście z ekranu zapisanych, zamiast prowadzić do martwego formularza', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SUPABASE_URL', '');
    renderPage('saved');
    const addButton = await screen.findByText('Dodaj z linku');
    expect(addButton.closest('button')).toBeDisabled();
  });

  it('z edge function wejście z ekranu zapisanych jest otwarte', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SUPABASE_URL', 'https://przyklad.supabase.co');
    renderPage('saved');
    const addButton = await screen.findByText('Dodaj z linku');
    expect(addButton.closest('button')).not.toBeDisabled();
  });
});
