import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useObjectUrls } from './useObjectUrls';

/**
 * jsdom implements neither createObjectURL nor revokeObjectURL, so both are
 * stubbed here. That is the point of the test anyway: what matters is that
 * every URL handed out is handed back.
 */
let created: string[] = [];
let revoked: string[] = [];

beforeEach(() => {
  created = [];
  revoked = [];
  let counter = 0;
  URL.createObjectURL = vi.fn(() => {
    const url = `blob:paula/${counter++}`;
    created.push(url);
    return url;
  });
  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url);
  });
});

const file = () => new Blob(['x'], { type: 'image/jpeg' });

describe('useObjectUrls', () => {
  it('hands out a URL per file', () => {
    const { result } = renderHook(() => useObjectUrls());
    act(() => {
      result.current.create(file());
      result.current.create(file());
    });
    expect(created).toHaveLength(2);
    expect(result.current.held()).toEqual(created);
  });

  it('releases one URL and stops holding it', () => {
    const { result } = renderHook(() => useObjectUrls());
    let first = '';
    act(() => {
      first = result.current.create(file());
      result.current.create(file());
    });
    act(() => result.current.revoke(first));

    expect(revoked).toEqual([first]);
    expect(result.current.held()).not.toContain(first);
    expect(result.current.held()).toHaveLength(1);
  });

  it('releases everything at once', () => {
    const { result } = renderHook(() => useObjectUrls());
    act(() => {
      result.current.create(file());
      result.current.create(file());
    });
    act(() => result.current.revokeAll());

    expect(revoked).toHaveLength(2);
    expect(result.current.held()).toEqual([]);
  });

  it('releases what is still held when the screen goes away', () => {
    // This is the leak: navigating away from a review form used to keep every
    // attached photo resident for the life of the tab.
    const { result, unmount } = renderHook(() => useObjectUrls());
    act(() => {
      result.current.create(file());
      result.current.create(file());
    });
    unmount();

    expect(revoked).toHaveLength(2);
    expect(revoked).toEqual(created);
  });

  it('does not release the same URL twice', () => {
    const { result, unmount } = renderHook(() => useObjectUrls());
    let url = '';
    act(() => {
      url = result.current.create(file());
    });
    act(() => result.current.revoke(url));
    unmount();

    expect(revoked).toEqual([url]);
  });
});
