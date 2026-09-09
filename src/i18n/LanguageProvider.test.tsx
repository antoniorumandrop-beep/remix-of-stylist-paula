import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { memo, useState } from 'react';
import { LanguageProvider, useLanguage } from './LanguageContext';

/**
 * The context value was rebuilt on every render of the provider, because `t`
 * was a fresh closure each time. Every screen in the app reads this context.
 *
 * The consumer below is wrapped in `React.memo`, which is what makes the
 * difference measurable: a memoised component skips a re-render when its props
 * are unchanged, but a changed context value forces it through anyway. With an
 * unstable value that escape hatch never worked for anything reading language.
 */

let consumerRenders = 0;

function Consumer() {
  const { t } = useLanguage();
  consumerRenders++;
  return <span>{t('continue')}</span>;
}

const MemoConsumer = memo(Consumer);

/** Holds state above the provider so we can re-render without touching language. */
function Harness() {
  const [tick, setTick] = useState(0);
  return (
    <LanguageProvider>
      <button onClick={() => setTick(tick + 1)}>przerysuj</button>
      <span data-testid="tick">{tick}</span>
      <MemoConsumer />
    </LanguageProvider>
  );
}

describe('LanguageProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('paula-lang', 'en');
    consumerRenders = 0;
  });

  it('does not re-render consumers when nothing about the language changed', () => {
    render(<Harness />);
    const before = consumerRenders;

    fireEvent.click(screen.getByText('przerysuj'));
    expect(screen.getByTestId('tick').textContent).toBe('1');

    // The provider rendered again; the consumer had no reason to.
    expect(consumerRenders).toBe(before);
  });

  it('still updates consumers when the language actually changes', () => {
    function Switcher() {
      const { setLang, t } = useLanguage();
      return (
        <div>
          <button onClick={() => setLang('pl')}>polski</button>
          <span data-testid="label">{t('continue')}</span>
        </div>
      );
    }
    render(
      <LanguageProvider>
        <Switcher />
      </LanguageProvider>,
    );
    expect(screen.getByTestId('label').textContent).toBe('Continue');
    fireEvent.click(screen.getByText('polski'));
    expect(screen.getByTestId('label').textContent).toBe('Dalej');
  });

  it('remembers the choice', () => {
    function Switcher() {
      const { setLang } = useLanguage();
      return <button onClick={() => setLang('pl')}>polski</button>;
    }
    render(
      <LanguageProvider>
        <Switcher />
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByText('polski'));
    expect(localStorage.getItem('paula-lang')).toBe('pl');
  });
});

describe('LanguageProvider — przeglądarka z zablokowanymi danymi witryny', () => {
  let getItem: typeof Storage.prototype.getItem;
  let setItem: typeof Storage.prototype.setItem;

  beforeEach(() => {
    getItem = Storage.prototype.getItem;
    setItem = Storage.prototype.setItem;
    // Not a hypothetical: with site data blocked the property access itself
    // throws, and this one runs inside a state initialiser on the first render.
    Storage.prototype.getItem = vi.fn(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    Storage.prototype.setItem = vi.fn(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
  });

  afterEach(() => {
    Storage.prototype.getItem = getItem;
    Storage.prototype.setItem = setItem;
  });

  function Reader() {
    const { t } = useLanguage();
    return <span data-testid="label">{t('continue')}</span>;
  }

  it('still renders instead of taking the whole app down', () => {
    render(
      <LanguageProvider>
        <Reader />
      </LanguageProvider>,
    );
    // jsdom reports an English browser, so English is the correct answer here.
    // What matters is that there is an answer at all.
    expect(screen.getByTestId('label').textContent).toBe('Continue');
  });

  it('falls back to Polish for a browser that did not ask for English', () => {
    const language = vi.spyOn(navigator, 'language', 'get').mockReturnValue('pl-PL');
    render(
      <LanguageProvider>
        <Reader />
      </LanguageProvider>,
    );
    expect(screen.getByTestId('label').textContent).toBe('Dalej');
    language.mockRestore();
  });

  it('lets her switch language for this visit even if it cannot be remembered', () => {
    function Switcher() {
      const { setLang, t } = useLanguage();
      return (
        <div>
          <button onClick={() => setLang('en')}>english</button>
          <span data-testid="label">{t('continue')}</span>
        </div>
      );
    }
    render(
      <LanguageProvider>
        <Switcher />
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByText('english'));
    expect(screen.getByTestId('label').textContent).toBe('Continue');
  });
});
