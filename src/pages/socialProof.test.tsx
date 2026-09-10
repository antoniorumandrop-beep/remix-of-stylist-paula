import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/backend/queryClient';
import { LanguageProvider } from '@/i18n/LanguageContext';
import ProductDetail from './ProductDetail';
import ForYou from './ForYou';

/**
 * Invented data about other people has to say that it is invented.
 *
 * The product page carries two blocks of it: sample reviews, and a row headed
 * "what people with proportions like yours added to their wardrobe". Both are
 * fixtures. Nobody has written a review in Paula and nobody has bought
 * anything through it, so both were claims about real people that were not
 * true — and a fabricated consumer review is named outright in Annex I of the
 * Unfair Commercial Practices Directive, unlike the reference price the app
 * already labels.
 *
 * The same rule that made the demo reference price say "demo" applies here.
 * This test is that rule, so the marker cannot quietly fall out of a redesign.
 */
function renderFeed() {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={createQueryClient()}>
        <LanguageProvider><ForYou /></LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function renderProduct(id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/app/product/${id}`]}>
      <QueryClientProvider client={createQueryClient()}>
        <LanguageProvider>
          <Routes>
            <Route path="/app/product/:id" element={<ProductDetail />} />
          </Routes>
        </LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('wymyślone dane o innych osobach', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('paula-lang', 'pl');
  });

  it('mówi, że opinie są danymi przykładowymi', async () => {
    renderProduct();
    expect(await screen.findByText(/te opinie to wymyślone dane przykładowe/)).toBeInTheDocument();
  });

  it('mówi, że nikt jeszcze niczego przez Paulę nie kupił', async () => {
    renderProduct();
    expect(await screen.findByText(/Nikt jeszcze niczego przez Paulę nie kupił/)).toBeInTheDocument();
  });

  it('nie koloruje procentu podobieństwa na zielono ani żółto', async () => {
    // A percentage in a coloured pill reads as a measurement. That is exactly
    // what `qualityScore` cost us, and this number is not even measured.
    const { container } = renderProduct();
    // The badge splits the number and the label across nodes, so wait on the
    // note that renders in the same block instead.
    await screen.findByText(/te opinie to wymyślone dane przykładowe/);
    const html = container.innerHTML;
    expect(html).toContain('podobne proporcje');
    expect(html).not.toContain('text-green-700');
    expect(html).not.toContain('text-yellow-700');
  });

  it('mówi to samo na kanale, nie tylko na karcie produktu', async () => {
    // The marker was added to the product page while the feed kept the same
    // fixtures unlabelled — the row existed twice, in two copies of the markup.
    renderFeed();
    expect(await screen.findByText(/Nikt jeszcze niczego przez Paulę nie kupił/)).toBeInTheDocument();
  });
});

describe('granica wokół wymyślonych danych o kupujących', () => {
  /** Every screen and component we own, minus shadcn and the tests. */
  function ourFiles(): { path: string; text: string }[] {
    const out: { path: string; text: string }[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'ui') continue;
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name) || entry.name.includes('.test.')) continue;
        out.push({ path: full, text: readFileSync(full, 'utf8') });
      }
    };
    walk(resolve(__dirname));
    walk(resolve(__dirname, '..', 'components'));
    return out;
  }

  it('tylko SimilarBodiesRow sięga po wymyślonych kupujących', () => {
    // Two copies of the markup are how the unlabelled one survived. One owner
    // of the data means a third screen has to go through the labelled row.
    const offenders = ourFiles()
      .filter(({ text }) => text.includes('getSimilarBodiesBought'))
      .map(({ path }) => path.split('/src/')[1])
      .filter(path => path !== 'components/SimilarBodiesRow.tsx');

    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
