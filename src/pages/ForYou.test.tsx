import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/backend/queryClient';
import ForYou from './ForYou';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { backend } from '@/lib/backend';

/**
 * The feed put the entire catalogue into the DOM at once. That survives a few
 * dozen fixtures and not a brand feed of several hundred, and the cost lands
 * on the cheapest phone rather than on the machine it was written on.
 */
function renderFeed() {
  const client = createQueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <LanguageProvider>
          <ForYou />
        </LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

/** Reads the number the "Show more" button is advertising. */
const remainingFromButton = (): number | null => {
  const button = screen.queryByRole('button', { name: /Show more/ });
  if (!button) return null;
  return Number(button.textContent!.match(/\((\d+)\)/)![1]);
};

describe('ForYou — stronicowanie kanału', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('paula-lang', 'en');
  });

  it('does not render the whole catalogue at once', async () => {
    const catalogue = await backend.catalog.list();
    // The fixture catalogue has to be bigger than one page for this to mean
    // anything; if it ever shrinks, this test should be the thing that says so.
    expect(catalogue.length).toBeGreaterThan(24);

    renderFeed();
    await waitFor(() => expect(remainingFromButton()).not.toBeNull());
    expect(remainingFromButton()).toBe(catalogue.length - 24);
  });

  it('reveals another page on request', async () => {
    renderFeed();
    await waitFor(() => expect(remainingFromButton()).not.toBeNull());
    const before = remainingFromButton()!;

    fireEvent.click(screen.getByRole('button', { name: /Show more/ }));

    const after = remainingFromButton();
    if (after === null) {
      // Fewer than a full page were left, so the button did its last job.
      expect(before).toBeLessThanOrEqual(24);
    } else {
      expect(after).toBe(before - 24);
    }
  });

  it('stops offering more once everything is shown', async () => {
    renderFeed();
    await waitFor(() => expect(remainingFromButton()).not.toBeNull());

    for (let i = 0; i < 50; i++) {
      const button = screen.queryByRole('button', { name: /Show more/ });
      if (!button) break;
      fireEvent.click(button);
    }
    expect(screen.queryByRole('button', { name: /Show more/ })).not.toBeInTheDocument();
  });
});
