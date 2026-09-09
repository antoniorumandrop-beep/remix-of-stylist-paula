import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from './NotFound';
import { LanguageProvider } from '@/i18n/LanguageContext';

/**
 * The last screen still carrying the project template: English copy in a
 * Polish product, and a plain anchor that reloaded the whole application to
 * get back to a page it was already running.
 */
function renderNotFound(lang: 'pl' | 'en') {
  localStorage.setItem('paula-lang', lang);
  return render(
    <MemoryRouter initialEntries={['/nie-ma-takiej-strony']}>
      <LanguageProvider>
        <NotFound />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

describe('NotFound', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('speaks Polish', () => {
    renderNotFound('pl');
    expect(screen.getByText('Tej strony nie ma')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Wróć do Pauli' })).toBeInTheDocument();
  });

  it('speaks English when asked to', () => {
    renderNotFound('en');
    expect(screen.getByText('This page does not exist')).toBeInTheDocument();
  });

  it('goes back through the router rather than reloading the app', () => {
    renderNotFound('pl');
    const link = screen.getByRole('link', { name: 'Wróć do Pauli' });
    // A react-router Link renders a relative href; a full reload would not.
    expect(link.getAttribute('href')).toBe('/');
  });

  it('records which address was missed', () => {
    renderNotFound('pl');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('404'), '/nie-ma-takiej-strony');
  });
});
