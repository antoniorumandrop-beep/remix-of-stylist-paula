import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/backend/queryClient';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { FitFeedbackForm } from './FitFeedbackForm';
import { backend } from '@/lib/backend';

/**
 * The "did it fit?" loop.
 *
 * This is the one signal that makes Fit Score falsifiable, and the dataset
 * nobody else on this market has — so an answer that does not reach storage
 * costs more than a bug on any other screen.
 *
 * It has failed exactly that way once: the first version wrote inside a React
 * state updater, and the write never ran because the form unmounted in the
 * same tick. Nothing reported it. These tests are that failure, written down.
 */
function renderForm(productId = 'produkt-1', onDone?: () => void) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <LanguageProvider>
        <FitFeedbackForm productId={productId} onDone={onDone} />
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

/**
 * The row for one body point. Scoped to the row itself: every row offers the
 * same three answers, so a query across the whole form would match five times
 * and silently test the wrong one.
 */
const row = (label: string) => screen.getByText(label).closest('div')!;

describe('FitFeedbackForm', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('paula-lang', 'pl');
  });

  it('nie pozwala zapisać pustej odpowiedzi', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /Zapisz/ })).toBeDisabled();
  });

  it('zapisuje odpowiedź tam, gdzie da się ją odczytać z powrotem', async () => {
    renderForm();
    fireEvent.click(within(row('Talia')).getByRole('button', { name: 'ciasno' }));
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/ }));

    await waitFor(async () => {
      const stored = await backend.feedback.list();
      expect(stored).toHaveLength(1);
      expect(stored[0].productId).toBe('produkt-1');
      expect(stored[0].answers.waist).toBe('tight');
    });
  });

  it('zapisuje kilka punktów ciała naraz', async () => {
    renderForm();
    fireEvent.click(within(row('Biust')).getByRole('button', { name: 'luźno' }));
    fireEvent.click(within(row('Biodra')).getByRole('button', { name: 'dobrze' }));
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/ }));

    await waitFor(async () => {
      const [entry] = await backend.feedback.list();
      expect(entry.answers.bust).toBe('loose');
      expect(entry.answers.hips).toBe('ok');
    });
  });

  it('kończy zapis, nawet gdy formularz znika w tej samej chwili', async () => {
    // This is the historical bug: `onDone` unmounts the form, and the write
    // used to be lost with it.
    const onDone = vi.fn();
    renderForm('produkt-znikajacy', onDone);
    fireEvent.click(within(row('Talia')).getByRole('button', { name: 'ciasno' }));
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/ }));

    expect(onDone).toHaveBeenCalled();
    await waitFor(async () => {
      const stored = await backend.feedback.list();
      expect(stored.map(f => f.productId)).toContain('produkt-znikajacy');
    });
  });

  it('nie kasuje pozostałych punktów, gdy odpowiedź jest poprawiana', async () => {
    // `save` replaces the whole record. A form that opened empty and was then
    // used to change one body point destroyed the other four — silently, in
    // the one dataset this product cannot rebuild.
    await backend.feedback.save('produkt-1', { bust: 'ok', waist: 'loose', hips: 'ok' });
    renderForm();

    await waitFor(() => {
      expect(within(row('Talia')).getByRole('button', { name: 'luźno' }).className).toContain('bg-foreground');
    });

    fireEvent.click(within(row('Talia')).getByRole('button', { name: 'ciasno' }));
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/ }));

    await waitFor(async () => {
      const [entry] = await backend.feedback.list();
      expect(entry.answers.waist).toBe('tight');
      expect(entry.answers.bust).toBe('ok');
      expect(entry.answers.hips).toBe('ok');
    });
  });

  it('pokazuje wcześniejszą odpowiedź, zamiast zaczynać od zera', async () => {
    await backend.feedback.save('produkt-1', { waist: 'loose' });
    renderForm();

    await waitFor(() => {
      const chosen = within(row('Talia')).getByRole('button', { name: 'luźno' });
      // The active answer is the filled one; the others are not.
      expect(chosen.className).toContain('bg-foreground');
    });
  });
});
