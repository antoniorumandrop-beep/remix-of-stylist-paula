import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/backend/queryClient';
import Onboarding from './Onboarding';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { backend } from '@/lib/backend';

/**
 * Onboarding is the only place these answers are ever collected, so a step
 * that does not exist is indistinguishable from a step nobody filled in: the
 * prefs come out empty either way, and the profile screen says "not set"
 * forever. `selectedAesthetics` and `selectedFit` had state, options and a
 * summary row, but no step rendered them — that is the bug this walks.
 */

function renderOnboarding() {
  const client = createQueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <LanguageProvider>
          <Onboarding />
        </LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const clickText = (text: string) => fireEvent.click(screen.getByText(text));

/** The footer button; disabled until the current step is answered. */
const clickContinue = () => {
  const button = screen.getByText('Continue').closest('button')!;
  expect(button).not.toBeDisabled();
  fireEvent.click(button);
};

describe('Onboarding — the whole walk', () => {
  beforeEach(() => {
    localStorage.clear();
    // Pin the language: these tests assert on copy, and the default is Polish.
    // Without this they would silently depend on jsdom's navigator locale.
    localStorage.setItem('paula-lang', 'en');
  });

  it('collects aesthetics and fit preferences and saves them to prefs', async () => {
    renderOnboarding();

    // 0 — name. The only step that blocks on an empty answer.
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Gabriela' } });
    clickContinue();

    clickContinue(); // 1 — proportions (defaults are already valid)
    clickContinue(); // 2 — height
    clickContinue(); // 3 — style inspiration

    // 4 — aesthetics
    expect(screen.getByText('Which of these feel like you?')).toBeInTheDocument();
    clickText('Minimalist');
    clickText('Classic');
    clickContinue();

    // 5 — how clothes should sit
    expect(screen.getByText('How do you like clothes to sit?')).toBeInTheDocument();
    clickText('Relaxed');
    clickContinue();

    clickContinue(); // 6 — occasions
    clickContinue(); // 7 — budget
    clickContinue(); // 8 — brands

    // 9 — summary. The footer is gone here, so the save runs from this button.
    clickText('Start exploring');

    await waitFor(async () => {
      const prefs = await backend.prefs.get();
      expect(prefs.aesthetics).toEqual(['minimalist', 'classic']);
      expect(prefs.fitPrefs).toEqual(['relaxed']);
    });
  });

  it('saves each of the two steps on leaving it, not only at the summary', async () => {
    // Someone who closes the tab after picking an aesthetic should not lose it.
    renderOnboarding();

    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Gabriela' } });
    clickContinue();
    clickContinue();
    clickContinue();
    clickContinue();

    clickText('Bohemian');
    clickContinue();

    await waitFor(async () => {
      const prefs = await backend.prefs.get();
      expect(prefs.aesthetics).toEqual(['bohemian']);
    });
  });

  it('shows every step, and the summary last', () => {
    renderOnboarding();
    expect(screen.getByText('1 / 10')).toBeInTheDocument();
  });
});

describe('Onboarding — budżet', () => {
  beforeEach(() => {
    localStorage.clear();
    // Pin the language: these tests assert on copy, and the default is Polish.
    // Without this they would silently depend on jsdom's navigator locale.
    localStorage.setItem('paula-lang', 'en');
  });

  /** Walks to the budget step, which sits after the two taste steps. */
  const goToBudget = () => {
    renderOnboarding();
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Gabriela' } });
    for (let i = 0; i < 7; i++) clickContinue();
    expect(screen.getByText("What's your usual budget per item?")).toBeInTheDocument();
  };

  const sliders = () => screen.getAllByRole('slider') as HTMLInputElement[];

  it('never lets the minimum climb past the maximum', () => {
    goToBudget();
    const [min] = sliders();
    // The minimum slider runs to 500 while the maximum sits at 300, so the raw
    // bounds allow an impossible range. Clamping is the only thing stopping it.
    fireEvent.change(min, { target: { value: '500' } });
    const [minAfter, maxAfter] = sliders();
    expect(Number(minAfter.value)).toBeLessThanOrEqual(Number(maxAfter.value));
    expect(Number(minAfter.value)).toBe(300);
  });

  it('never lets the maximum drop below the minimum', () => {
    goToBudget();
    const [min, max] = sliders();
    fireEvent.change(min, { target: { value: '250' } });
    fireEvent.change(max, { target: { value: '100' } });
    const [minAfter, maxAfter] = sliders();
    expect(Number(maxAfter.value)).toBeGreaterThanOrEqual(Number(minAfter.value));
    expect(Number(maxAfter.value)).toBe(250);
  });

  it('saves a range that is the right way round', async () => {
    goToBudget();
    const [min] = sliders();
    fireEvent.change(min, { target: { value: '500' } });
    clickContinue(); // 8 — brands
    clickContinue(); // 9 — summary
    clickText('Start exploring');

    await waitFor(async () => {
      const prefs = await backend.prefs.get();
      expect(prefs.budgetMin).toBeLessThanOrEqual(prefs.budgetMax!);
    });
  });
});

describe('Onboarding — sensowność wpisanych wymiarów', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('paula-lang', 'en');
  });

  /** Walks to the proportions step, which is now the second one. */
  const goToProportions = () => {
    renderOnboarding();
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Gabriela' } });
    clickContinue();
  };

  const field = (label: string) =>
    screen.getAllByRole('spinbutton').at(['Bust', 'Waist', 'Hips'].indexOf(label))!;

  it('says nothing about ordinary measurements', () => {
    goToProportions();
    expect(screen.queryByText(/looks like a slip/)).not.toBeInTheDocument();
  });

  it('points out a slipped digit without blocking the step', () => {
    goToProportions();
    fireEvent.change(field('Waist'), { target: { value: '7' } });

    expect(screen.getByText(/looks like a slip/)).toBeInTheDocument();
    // A warning, not a gate: she is the one holding the tape.
    expect(screen.getByText('Continue').closest('button')).not.toBeDisabled();
  });

  it('offers the conversion when a number looks like inches', () => {
    goToProportions();
    fireEvent.change(field('Bust'), { target: { value: '35' } });
    expect(screen.getByText(/around 89 cm/)).toBeInTheDocument();
  });

  it('accepts a body well outside the average without comment', () => {
    goToProportions();
    fireEvent.change(field('Hips'), { target: { value: '168' } });
    expect(screen.queryByText(/looks like a slip/)).not.toBeInTheDocument();
  });
});
