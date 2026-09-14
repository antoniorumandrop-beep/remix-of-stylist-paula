import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FitBadge } from './FitBadge';
import { LanguageProvider } from '@/i18n/LanguageContext';

/**
 * The badge is where a Fit Score is read most often — a list of twelve of
 * them, side by side. Until now it took only the score, so a result computed
 * from a full attribute set and one computed from a single word in the product
 * name looked exactly the same.
 *
 * A real example from the catalogue on 2026-09-14: ZARA's "DŁUGA SUKIENKA W
 * ZWIERZĘCY WZÓR" scored 100% — top of the results — on one known attribute,
 * `stretchLevel: high`, inferred from "5% elastan". Nothing about its cut,
 * waist or length was known, and the score was high *because* the unknowns
 * carry no penalty.
 */
const show = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe('FitBadge', () => {
  it('pokazuje sam wynik, gdy wiadomo o rzeczy dość', () => {
    show(<FitBadge score={92} confidence={0.9} />);
    expect(screen.getByText(/92%/)).toBeInTheDocument();
    expect(screen.queryByText(/~/)).not.toBeInTheDocument();
  });

  it('zaznacza, że wynik jest przybliżony, gdy wiadomo mało', () => {
    show(<FitBadge score={100} confidence={0.34} />);
    expect(screen.getByText(/~\s*100%/)).toBeInTheDocument();
  });

  it('mówi czytnikowi ekranu, na czym ten wynik stoi', () => {
    // The tilde is the visual shorthand; on its own it explains nothing to
    // someone who cannot see it, and nothing to someone who can either.
    show(<FitBadge score={100} confidence={0.34} />);
    const label = screen.getByRole('img', { hidden: true }).getAttribute('aria-label') ?? '';
    expect(label).toMatch(/100/);
    expect(label.length).toBeGreaterThan(20);
  });

  it('zachowuje się jak dawniej, gdy pewności nie podano', () => {
    // Called without `confidence` from anywhere we have not updated yet.
    show(<FitBadge score={88} />);
    expect(screen.getByText(/88%/)).toBeInTheDocument();
    expect(screen.queryByText(/~/)).not.toBeInTheDocument();
  });
});
