import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/backend/queryClient';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { BrandFitMemory } from './BrandFitMemory';
import { FitLearningPanel } from './FitLearningPanel';

/**
 * The loop, closed.
 *
 * "Did it fit?" collected answers from day one and nothing ever read them
 * back. A question asked and then ignored stops being answered, so these are
 * the tests that say the answers now come out somewhere she can see them.
 */
function renderIt(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={createQueryClient()}>
        <LanguageProvider>{ui}</LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

/** Products 1, 11 and 17 are H&M in the mock catalogue. */
function seedFeedback(records: { productId: string; answers: Record<string, string> }[]) {
  localStorage.setItem(
    'paula.fitFeedback',
    JSON.stringify(records.map(r => ({ ...r, createdAt: '2026-09-10T10:00:00.000Z' }))),
  );
}

function seedProfile() {
  localStorage.setItem(
    'paula.bodyProfile',
    JSON.stringify({ source: 'measured', bust: 90, waist: 70, hips: 100, heightCm: 168, updatedAt: '2026-09-10T10:00:00.000Z' }),
  );
}

describe('pamięć marki', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('paula-lang', 'pl');
  });

  it('nie pokazuje się, dopóki nie ma ani jednej oceny', () => {
    const { container } = renderIt(<BrandFitMemory brand="H&M" />);
    expect(container.textContent).toBe('');
  });

  it('pokazuje oceny tej marki razem z liczbami', async () => {
    seedFeedback([
      { productId: '1', answers: { waist: 'tight' } },
      { productId: '11', answers: { waist: 'tight' } },
      { productId: '17', answers: { waist: 'ok' } },
    ]);
    renderIt(<BrandFitMemory brand="H&M" />);

    expect(await screen.findByText(/3 rzeczy tej marki mają Twoją ocenę/)).toBeInTheDocument();
    expect(screen.getByText(/2 × ciasno · 1 × dobrze/)).toBeInTheDocument();
    // The lean, and the sentence that keeps it from reading as a score change.
    expect(screen.getByText('ciasno')).toBeInTheDocument();
    expect(screen.getByText(/Fit Score się przez nie nie zmienia/)).toBeInTheDocument();
  });

  it('nie miesza marek', async () => {
    // Both cards are mounted so the H&M one proves the query resolved. Without
    // it the assertion would pass on an unfinished render, which is exactly the
    // way a "nothing is shown" test quietly stops testing anything.
    seedFeedback([{ productId: '1', answers: { waist: 'tight' } }]);
    renderIt(<><BrandFitMemory brand="H&M" /><BrandFitMemory brand="Zara" /></>);

    expect(await screen.findByText(/o marce H&M/)).toBeInTheDocument();
    expect(screen.queryByText(/o marce Zara/)).not.toBeInTheDocument();
  });
});

describe('tablica wyników Pauli', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('paula-lang', 'pl');
  });

  it('mówi wprost, że jeszcze niczego nie wie', async () => {
    renderIt(<FitLearningPanel />);
    expect(await screen.findByText(/Jeszcze nic/)).toBeInTheDocument();
  });

  it('liczy trafienia, gdy są oceny i profil z wymiarami', async () => {
    seedProfile();
    seedFeedback([
      { productId: '1', answers: { waist: 'ok', bust: 'ok', hips: 'ok' } },
      { productId: '11', answers: { waist: 'tight' } },
    ]);
    renderIt(<FitLearningPanel />);

    expect(await screen.findByText(/tyle razy przewidywanie Pauli/)).toBeInTheDocument();
    // "x z y" — whatever the scorer says today, the denominator must be real.
    // The headline comes first in the DOM; the per-point rows use the same shape.
    const headline = screen.getAllByText(/^\d+ z \d+$/)[0];
    const [hits, total] = headline.textContent!.split(' z ').map(Number);
    expect(total).toBeGreaterThan(0);
    expect(hits).toBeLessThanOrEqual(total);
    expect(screen.getByText(/„Nie wiem” nie wchodzi do rachunku/)).toBeInTheDocument();
  });

  it('nie udaje wyniku, gdy nie ma z czym porównać przewidywań', async () => {
    // No body profile means no prediction was ever made, so there is nothing
    // to score — and saying "0 z 0" would read as a failure rather than a gap.
    seedFeedback([{ productId: '1', answers: { waist: 'ok' } }]);
    renderIt(<FitLearningPanel />);

    expect(await screen.findByText(/Paula niczego nie przewidziała/)).toBeInTheDocument();
    expect(screen.queryByText(/^\d+ z \d+$/)).not.toBeInTheDocument();
  });
});
