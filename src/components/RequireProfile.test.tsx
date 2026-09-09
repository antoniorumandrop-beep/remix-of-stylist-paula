import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/backend/queryClient';
import { RequireProfile } from './RequireProfile';
import { backend } from '@/lib/backend';

/**
 * Without this gate a signed-in woman with no measurements landed on the feed,
 * where every Fit Score is null because there is nothing to score against.
 * The app looked broken; it was only unfinished.
 */
function renderGate() {
  const client = createQueryClient();
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path="/onboarding" element={<p>ekran onboardingu</p>} />
          <Route
            path="/app"
            element={
              <RequireProfile>
                <p>kanał produktów</p>
              </RequireProfile>
            }
          />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('RequireProfile', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sends someone without a body profile to onboarding', async () => {
    renderGate();
    expect(await screen.findByText('ekran onboardingu')).toBeInTheDocument();
    expect(screen.queryByText('kanał produktów')).not.toBeInTheDocument();
  });

  it('lets a measured profile through', async () => {
    await backend.profile.set({
      source: 'measured',
      bust: 90,
      waist: 70,
      hips: 100,
      updatedAt: new Date().toISOString(),
    });
    renderGate();
    expect(await screen.findByText('kanał produktów')).toBeInTheDocument();
  });

  it('lets a hand-picked shape through too', async () => {
    // Someone with no tape measure still has a profile Fit Score can use.
    await backend.profile.set({
      source: 'selected',
      shape: 'triangle',
      updatedAt: new Date().toISOString(),
    });
    renderGate();
    expect(await screen.findByText('kanał produktów')).toBeInTheDocument();
  });

  it('shows nothing at all while the profile is still being read', () => {
    // Not a flash of onboarding for a woman who does have a profile.
    const { container } = renderGate();
    expect(container.textContent).toBe('');
  });
});
