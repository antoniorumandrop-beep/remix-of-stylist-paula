import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/backend/queryClient';
import { LanguageProvider } from '@/i18n/LanguageContext';
import Saved from './Saved';

/**
 * Collections, from the screen down.
 *
 * The whole feature was a facade: four hard-coded collections filled with
 * slices of the catalogue, a "New collection" button that was disabled because
 * there was nowhere to put one, and an "Add to collection" item on every
 * product card that hearted the product instead. This is the test that says
 * the button now does what it is called.
 */
function renderSaved() {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={createQueryClient()}>
        <LanguageProvider><Saved /></LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

async function openCollectionsTab() {
  const tab = await screen.findByRole('button', { name: /Kolekcje/ });
  fireEvent.click(tab);
}

describe('kolekcje', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('paula-lang', 'pl');
  });

  it('zaczyna od pustego stanu, a nie od czterech cudzych kolekcji', async () => {
    renderSaved();
    await openCollectionsTab();
    expect(await screen.findByText(/Nie masz jeszcze kolekcji/)).toBeInTheDocument();
    expect(screen.queryByText('Fall faves')).not.toBeInTheDocument();
  });

  it('tworzy kolekcję i pokazuje ją z licznikiem', async () => {
    renderSaved();
    await openCollectionsTab();

    fireEvent.click(await screen.findByRole('button', { name: /Nowa kolekcja/ }));
    fireEvent.change(screen.getByPlaceholderText('Nazwa kolekcji'), { target: { value: 'Na wesele' } });
    fireEvent.click(screen.getByRole('button', { name: /Utwórz/ }));

    await waitFor(() => expect(screen.getByText('Na wesele')).toBeInTheDocument());
    expect(screen.getByText(/0 elementów/)).toBeInTheDocument();
    expect(screen.queryByText(/Nie masz jeszcze kolekcji/)).not.toBeInTheDocument();
  });

  it('zapisuje ją trwale, a nie tylko w stanie ekranu', async () => {
    const first = renderSaved();
    await openCollectionsTab();
    fireEvent.click(await screen.findByRole('button', { name: /Nowa kolekcja/ }));
    fireEvent.change(screen.getByPlaceholderText('Nazwa kolekcji'), { target: { value: 'Na wesele' } });
    fireEvent.click(screen.getByRole('button', { name: /Utwórz/ }));
    await waitFor(() => expect(screen.getByText('Na wesele')).toBeInTheDocument());
    first.unmount();

    // A fresh render with a fresh query client: anything that only lived in
    // React state is gone by now.
    renderSaved();
    await openCollectionsTab();
    expect(await screen.findByText('Na wesele')).toBeInTheDocument();
  });

  it('nie tworzy kolekcji bez nazwy', async () => {
    renderSaved();
    await openCollectionsTab();
    fireEvent.click(await screen.findByRole('button', { name: /Nowa kolekcja/ }));
    fireEvent.change(screen.getByPlaceholderText('Nazwa kolekcji'), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: /Utwórz/ })).toBeDisabled();
  });
});
