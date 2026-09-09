import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchPage from './SearchPage';
import { LanguageProvider } from '@/i18n/LanguageContext';

/**
 * Between pressing send and Paula answering, nothing on screen moved. A slow
 * turn was indistinguishable from a message that never sent, and the only
 * thing a person can do about that is send it again.
 */
function renderSearch() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <LanguageProvider>
          <SearchPage />
        </LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const send = (text: string) => {
  const input = screen.getByPlaceholderText(/Ask Paula/i);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('SearchPage — wskaźnik pisania', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('paula-lang', 'en');
  });

  it('shows that Paula is answering as soon as a message is sent', async () => {
    renderSearch();
    send('szukam sukienki na wesele');
    expect(screen.getByText('Paula is typing…')).toBeInTheDocument();
  });

  it('takes the indicator away once the answer arrives', async () => {
    renderSearch();
    send('szukam sukienki na wesele');
    await waitFor(() => {
      expect(screen.queryByText('Paula is typing…')).not.toBeInTheDocument();
    });
  });

  it('shows the message the user sent regardless', async () => {
    renderSearch();
    send('coś na biuro');
    expect(screen.getByText('coś na biuro')).toBeInTheDocument();
  });

  it('does not show the indicator before anything is sent', () => {
    renderSearch();
    expect(screen.queryByText('Paula is typing…')).not.toBeInTheDocument();
  });
});
