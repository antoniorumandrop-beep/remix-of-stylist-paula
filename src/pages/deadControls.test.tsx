import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/backend/queryClient';
import { LanguageProvider } from '@/i18n/LanguageContext';
import Saved from './Saved';
import Alerts from './Alerts';

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
function renderPage(page: 'saved' | 'alerts') {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={createQueryClient()}>
        <LanguageProvider>{page === 'saved' ? <Saved /> : <Alerts />}</LanguageProvider>
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
