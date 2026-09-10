import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/backend/queryClient';
import { LanguageProvider } from '@/i18n/LanguageContext';
import FittingRoom from './FittingRoom';

/**
 * The wardrobe asks for the answers the rest of the product runs on.
 *
 * The "did it fit?" button was on every tile and invisible past the first few
 * of them, so the dataset depended on her scrolling to find a question she had
 * no reason to look for. The rule about *which* things to ask about lives in
 * `feedbackQueue.ts` and is tested there; this checks the wiring, and the cap
 * that keeps a reminder from turning into a backlog.
 */
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

function seedWardrobe(ids: string[], days = 10) {
  localStorage.setItem(
    'paula.wardrobe',
    JSON.stringify(ids.map(productId => ({ productId, addedAt: daysAgo(days), timesWorn: 0 }))),
  );
}

function renderRoom() {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={createQueryClient()}>
        <LanguageProvider><FittingRoom /></LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('szafa prosi o oceny', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('paula-lang', 'pl');
  });

  it('nie pokazuje wiersza, gdy nie ma o co pytać', async () => {
    seedWardrobe(['1'], 0); // added today, unworn — too early to ask
    renderRoom();
    await screen.findByText('Moja szafa (1)');
    expect(screen.queryByText(/Czekają na Twoją ocenę/)).not.toBeInTheDocument();
  });

  it('wymienia rzeczy bez oceny', async () => {
    seedWardrobe(['1', '4']);
    renderRoom();
    expect(await screen.findByText(/Czekają na Twoją ocenę/)).toBeInTheDocument();
    expect(screen.getByText('2 rzeczy')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Oceń' })).toHaveLength(2);
  });

  it('pomija to, co już oceniła', async () => {
    seedWardrobe(['1', '4']);
    localStorage.setItem(
      'paula.fitFeedback',
      JSON.stringify([{ productId: '1', answers: { waist: 'ok' }, createdAt: daysAgo(1) }]),
    );
    renderRoom();
    expect(await screen.findByText('1 rzecz')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Oceń' })).toHaveLength(1);
  });

  it('to przypomnienie, nie lista zaległości — najwyżej cztery', async () => {
    seedWardrobe(['1', '2', '3', '4', '5', '6']);
    renderRoom();
    expect(await screen.findByText('4 rzeczy')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Oceń' })).toHaveLength(4);
  });
});
