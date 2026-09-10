import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/backend/queryClient';
import { LanguageProvider } from '@/i18n/LanguageContext';
import Alerts from './Alerts';

/**
 * Prices, and the one rule about them that is not a matter of taste.
 *
 * Dyrektywa Omnibus: a struck-through price or a sale badge has to be measured
 * against the lowest price of the previous 30 days. We have no price history
 * for any product — `price_history` is a table in the schema draft and nothing
 * writes to it yet — so we may not show either.
 *
 * The rule was already written in `CLAUDE.md`, and `src/pages/Alerts.tsx` broke
 * it anyway with three invented drops in green with the old price crossed out.
 * A rule in a document does not fail a build. This one does.
 */
describe('prezentacja cen', () => {
  const roots = ['pages', 'components'].map(d => resolve(__dirname, '..', d));

  function ourFiles(): { path: string; text: string }[] {
    const out: { path: string; text: string }[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'ui') continue; // shadcn, not ours
          walk(full);
          continue;
        }
        if (!entry.name.endsWith('.tsx') || entry.name.includes('.test.')) continue;
        out.push({ path: full, text: readFileSync(full, 'utf8') });
      }
    };
    roots.forEach(walk);
    return out;
  }

  it('nie przekreśla żadnej ceny, dopóki nie ma 30 dni historii', () => {
    const offenders: string[] = [];
    for (const { path, text } of ourFiles()) {
      text.split('\n').forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (line.includes('line-through')) {
          offenders.push(`${path.split('/src/')[1]}:${i + 1}`);
        }
      });
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});

describe('strona alertów', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('paula-lang', 'pl');
  });

  function renderAlerts() {
    return render(
      <MemoryRouter>
        <QueryClientProvider client={createQueryClient()}>
          <LanguageProvider><Alerts /></LanguageProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );
  }

  it('mówi wprost, że śledzenie cen nie działa', async () => {
    renderAlerts();
    expect(await screen.findByText(/Śledzenie cen jeszcze nie działa/)).toBeInTheDocument();
  });

  it('nie pokazuje żadnej przeceny, bo nie ma z czego jej policzyć', async () => {
    renderAlerts();
    await screen.findByText(/Śledzenie cen jeszcze nie działa/);
    expect(screen.queryByText(/Spadek ceny/)).not.toBeInTheDocument();
    expect(screen.queryByText(/189 PLN/)).not.toBeInTheDocument();
  });

  it('pokazuje zapisane rzeczy z jedną, dzisiejszą ceną', async () => {
    localStorage.setItem('paula.saved', JSON.stringify(['1']));
    renderAlerts();
    expect(await screen.findByText('Linen Midi Dress')).toBeInTheDocument();
    expect(screen.getByText('129 PLN')).toBeInTheDocument();
  });
});
