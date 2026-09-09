import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * The last line of defence. Without it a single thrown exception anywhere in
 * the tree unmounts everything and leaves a white page — no message, no way
 * back, nothing in the interface to say what happened.
 *
 * It sits **outside** the providers on purpose. `LanguageProvider` reads
 * `localStorage` while initialising state, and a browser with site data
 * blocked throws on that read, so a boundary placed inside the providers
 * would miss one of the few crashes a real user can actually hit.
 *
 * That placement is also why the copy here is hard-coded rather than
 * translated: at this point there may be no language context to read, and a
 * fallback that can itself throw is not a fallback. Polish first, because
 * Polish is the product's language; the English line is for anyone else.
 */

interface Props {
  children: ReactNode;
  /** Test seam: lets a test assert what was caught without reading the console. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // PLUG(supabase): this is where crash reporting goes, once there is a
    // backend to report to. Until then the console is the only record.
    console.error('[Paula] Nieobsłużony błąd:', error, info.componentStack);
    this.props.onError?.(error, info);
  }

  private reload = () => {
    window.location.assign('/');
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Coś poszło nie tak</h1>
        <p style={{ margin: 0, maxWidth: '32rem', opacity: 0.7 }}>
          Paula napotkała błąd i nie mogła wyświetlić tej strony. Twoje dane są
          bezpieczne — nic nie zostało utracone.
        </p>
        <p style={{ margin: 0, maxWidth: '32rem', opacity: 0.5, fontSize: '0.875rem' }}>
          Something went wrong. Your data is safe.
        </p>
        <button
          type="button"
          onClick={this.reload}
          style={{
            marginTop: '0.5rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            background: '#111',
            color: '#fff',
            fontSize: '0.875rem',
          }}
        >
          Wróć na stronę główną
        </button>
        {import.meta.env.DEV && (
          <pre
            style={{
              marginTop: '1rem',
              maxWidth: '48rem',
              overflowX: 'auto',
              textAlign: 'left',
              fontSize: '0.75rem',
              opacity: 0.6,
            }}
          >
            {error.message}
          </pre>
        )}
      </div>
    );
  }
}
