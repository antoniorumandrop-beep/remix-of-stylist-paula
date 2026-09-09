import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * React logs every caught error to the console; that is expected here, so the
 * spy keeps the test output readable rather than hiding a real problem.
 */
const silenceReactErrorLog = () => vi.spyOn(console, 'error').mockImplementation(() => {});

function Boom(): JSX.Element {
  throw new Error('coś wybuchło');
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>wszystko działa</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('wszystko działa')).toBeInTheDocument();
  });

  it('shows a Polish message instead of a white page when a child throws', () => {
    silenceReactErrorLog();
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Coś poszło nie tak')).toBeInTheDocument();
    expect(screen.getByText(/Twoje dane są bezpieczne/)).toBeInTheDocument();
  });

  it('offers a way back rather than leaving her stuck', () => {
    silenceReactErrorLog();
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: 'Wróć na stronę główną' })).toBeInTheDocument();
  });

  it('reports the error it caught', () => {
    silenceReactErrorLog();
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe('coś wybuchło');
  });
});
