import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/backend/queryClient';
import Onboarding from './Onboarding';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { backend } from '@/lib/backend';
import * as photoMeasure from '@/lib/body/photoMeasure';

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

/**
 * Krok proporcji (indeks 2) nie przepuszcza pustych pól, więc każdy przechód
 * przez onboarding musi podać obwody — tak samo jak człowiek. Wcześniej pola
 * startowały wypełnione, więc walkery mogły je minąć; komentarz „defaults are
 * already valid" opisywał wtedy błąd jako cechę.
 */
const fillProportions = () => {
  fireEvent.change(screen.getByLabelText('Bust (cm)'), { target: { value: '92' } });
  fireEvent.change(screen.getByLabelText('Waist (cm)'), { target: { value: '74' } });
  fireEvent.change(screen.getByLabelText('Hips (cm)'), { target: { value: '100' } });
};

/** Przechodzi `steps` kroków od początku, podając obwody tam, gdzie trzeba. */
const continueThrough = (steps: number) => {
  for (let i = 0; i < steps; i++) {
    if (i === 2) fillProportions();
    clickContinue();
  }
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

    clickContinue(); // 1 — height
    fillProportions();
    clickContinue(); // 2 — proportions
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
    continueThrough(4);

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
    continueThrough(7);
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

  /**
   * Idzie do kroku proporcji. Od 2026-09-13 jest trzeci, nie drugi: wzrost
   * pytamy przed zdjęciem, bo jest jedyną liczbą, której model ze zdjęcia nie
   * umie odczytać (mylił się o 8,9 cm) — a bez niego nie ma jak sprawdzić, czy
   * to, co model odczytał, w ogóle trzyma się kupy.
   */
  const goToProportions = () => {
    renderOnboarding();
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Gabriela' } });
    clickContinue(); // 0 → 1, wzrost
    clickContinue(); // 1 → 2, proporcje
  };

  // Po dołożeniu kotwicy z taśmy w panelu zdjęcia na tym kroku jest więcej niż
  // trzy pola liczbowe, więc szukanie po kolejności zaczęło trafiać w cudze.
  const field = (label: string) => screen.getByLabelText(`${label} (cm)`);

  it('says nothing about ordinary measurements', () => {
    goToProportions();
    expect(screen.queryByText(/looks like a slip/)).not.toBeInTheDocument();
  });

  /**
   * Trzy obwody startowały z 88/68/96 i to wystarczało, żeby przejść dalej —
   * `measurementsValid` sprawdza `> 0`, więc był prawdziwy od pierwszego
   * renderu. Kto kliknął „dalej", nie dotykając pól, dostawał zapisany profil
   * `source: "measured"` z liczbami, których nigdy nie podał, sylwetkę
   * wyliczoną z tych liczb i Fit Score liczony z nich na każdym produkcie.
   *
   * Przy produkcie, którego całą obietnicą jest „trzy wymiary zamiast rozmiaru
   * z metki", to jest najcięższa postać udawania, jakie ten projekt sobie
   * zabronił: nie „nie umiemy policzyć", tylko „policzyliśmy z czegoś, czego
   * nie masz". Zero znaczy teraz „nie podano" — ta sama konwencja, którą
   * `highHip` miał od początku.
   */
  it('nie przepuszcza dalej, póki obwody nie są podane', async () => {
    goToProportions();

    expect(screen.getByText('Continue').closest('button')).toBeDisabled();
    // I nic nie zdążyło się zapisać jako zmierzone.
    await waitFor(async () => expect(await backend.profile.get()).toBeNull());
  });

  it('odblokowuje dalej dopiero po trzecim obwodzie', () => {
    goToProportions();
    fireEvent.change(field('Bust'), { target: { value: '92' } });
    expect(screen.getByText('Continue').closest('button')).toBeDisabled();
    fireEvent.change(field('Waist'), { target: { value: '74' } });
    expect(screen.getByText('Continue').closest('button')).toBeDisabled();
    fireEvent.change(field('Hips'), { target: { value: '100' } });
    expect(screen.getByText('Continue').closest('button')).not.toBeDisabled();
  });

  /**
   * Wzrost startował z '165' — ten sam błąd co obwody, tylko cichszy, bo krok
   * wzrostu nikogo nie blokuje. Kto go przeklikał, dostawał zapisane 165 cm
   * jako swój wzrost, a wzrost wchodzi do Fit Score i do sylwetki. Pusty wzrost
   * ma zostać pusty: `heightCm` jest w profilu opcjonalny i kod już to obsługuje.
   */
  it('nie zmyśla wzrostu, gdy nikt go nie podał', async () => {
    goToProportions();
    fillProportions();
    clickContinue();

    await waitFor(async () => {
      const profil = await backend.profile.get();
      expect(profil).not.toBeNull();
      expect(profil && 'heightCm' in profil ? profil.heightCm : undefined).toBeUndefined();
    });
  });

  it('zapisuje wzrost, gdy został podany', async () => {
    renderOnboarding();
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Gabriela' } });
    clickContinue();
    fireEvent.change(screen.getByLabelText('Height (cm)'), { target: { value: '171' } });
    clickContinue();
    fillProportions();
    clickContinue();

    await waitFor(async () => {
      const profil = await backend.profile.get();
      expect(profil && 'heightCm' in profil ? profil.heightCm : undefined).toBe(171);
    });
  });

  it('nie orzeka sylwetki, zanim dostanie obwody', () => {
    goToProportions();
    expect(screen.queryByText('Hourglass')).not.toBeInTheDocument();
  });

  it('points out a slipped digit without blocking the step', () => {
    goToProportions();
    // Komplet obwodów, żeby sprawdzać ostrzeżenie, a nie brak danych.
    fireEvent.change(field('Bust'), { target: { value: '92' } });
    fireEvent.change(field('Hips'), { target: { value: '100' } });
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

describe('Onboarding — dostępność', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('paula-lang', 'en');
  });

  const walkTo = (steps: number) => {
    renderOnboarding();
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Gabriela' } });
    continueThrough(steps);
  };

  it('names each measurement field for a screen reader', () => {
    // The visible labels are sibling spans, so without this a screen reader
    // announces four identical unnamed number fields.
    walkTo(2);
    expect(screen.getByLabelText('Bust (cm)')).toBeInTheDocument();
    expect(screen.getByLabelText('Waist (cm)')).toBeInTheDocument();
    expect(screen.getByLabelText('Hips (cm)')).toBeInTheDocument();
  });

  it('tells the two budget sliders apart', () => {
    // They differ only by position on screen; a screen reader had no way to
    // know which one it was on.
    walkTo(7);
    expect(screen.getByRole('slider', { name: 'Lowest price' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Highest price' })).toBeInTheDocument();
  });

  it('names the height field', () => {
    walkTo(1);
    expect(screen.getByLabelText('Height (cm)')).toBeInTheDocument();
  });
});

describe('Onboarding — pomiar ze zdjęcia', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('paula-lang', 'en');
    vi.restoreAllMocks();
  });

  /**
   * Wzrost ze zdjęcia jest odrzucany świadomie.
   *
   * Zmierzone 2026-09-13 na sześciu zdjęciach jednej osoby, przy taśmie jako
   * odniesieniu: talia −0,1 cm, biodra −1,1 cm, **wzrost −8,9 cm**. I wzrost
   * był przy tym najrówniejszy ze wszystkiego — rozrzut 0,6 cm — czyli model
   * był najpewniejszy dokładnie tam, gdzie mylił się najbardziej. Gdyby ktoś
   * kiedyś „dokończył" tę funkcję, dopisując brakujące przypisanie wzrostu,
   * ten test ma go zatrzymać.
   */
  it('bierze ze zdjęcia obwody, ale nigdy wzrostu', async () => {
    vi.spyOn(photoMeasure, 'measureFromPhoto').mockResolvedValue({
      status: 'ok',
      measurements: { bust: 107, waist: 93, hips: 109, heightCm: 170 },
    });

    renderOnboarding();
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Antonio' } });
    clickContinue(); // 0 → 1, wzrost
    fireEvent.change(screen.getByLabelText('Height (cm)'), { target: { value: '179' } });
    clickContinue(); // 1 → 2, proporcje ze zdjęciem

    // Talia z taśmy jest kotwicą pomiaru — bez niej wybór pliku jest zablokowany.
    fireEvent.change(screen.getByLabelText('Your waist, with a tape'), { target: { value: '93' } });
    fireEvent.change(screen.getByTestId('photo-input'), {
      target: { files: [new File([new Uint8Array([1])], 'ja.jpg', { type: 'image/jpeg' })] },
    });
    await waitFor(() => screen.getByText('Use these measurements'));
    fireEvent.click(screen.getByText('Use these measurements'));

    expect((screen.getByLabelText('Bust (cm)') as HTMLInputElement).value).toBe('107');
    expect((screen.getByLabelText('Waist (cm)') as HTMLInputElement).value).toBe('93');
    expect((screen.getByLabelText('Hips (cm)') as HTMLInputElement).value).toBe('109');

    // Wracamy na krok wzrostu: ma stać tam liczba, którą podał człowiek.
    // Gdyby zdjęcie ją nadpisało, stałoby tu 170 — i użytkowniczka nosiłaby
    // cudzy wzrost, nie wiedząc o tym.
    fireEvent.click(screen.getByText('Back'));
    expect((screen.getByLabelText('Height (cm)') as HTMLInputElement).value).toBe('179');
  });
});
