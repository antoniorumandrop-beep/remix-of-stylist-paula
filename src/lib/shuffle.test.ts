import { describe, it, expect, beforeEach } from 'vitest';
import { shuffle, mulberry32, sessionSeed, FEED_SEED_KEY } from './shuffle';

const items = ['a', 'b', 'c', 'd', 'e', 'f'];

describe('shuffle', () => {
  it('returns a permutation, losing and inventing nothing', () => {
    const out = shuffle(items, 12345);
    expect([...out].sort()).toEqual([...items].sort());
    expect(out).toHaveLength(items.length);
  });

  it('does not touch the input', () => {
    const input = [...items];
    shuffle(input, 7);
    expect(input).toEqual(items);
  });

  it('gives the same order for the same seed', () => {
    expect(shuffle(items, 99)).toEqual(shuffle(items, 99));
  });

  it('gives a different order for a different seed', () => {
    expect(shuffle(items, 1)).not.toEqual(shuffle(items, 2));
  });

  it('handles empty and single-item lists', () => {
    expect(shuffle([], 1)).toEqual([]);
    expect(shuffle(['only'], 1)).toEqual(['only']);
  });

  /**
   * The bug this replaced: a random sort comparator leaves items close to where
   * they started. With six items a fair shuffle puts the first item back in
   * first place about one time in six; the old comparator did it far more
   * often. Deterministic, because every seed here is fixed.
   */
  it('spreads the first item across every position, unlike a random comparator', () => {
    const runs = 6000;
    const positions = new Array(items.length).fill(0);
    for (let seed = 0; seed < runs; seed++) {
      positions[shuffle(items, seed).indexOf('a')]++;
    }
    const expected = runs / items.length;
    for (const count of positions) {
      expect(count).toBeGreaterThan(expected * 0.85);
      expect(count).toBeLessThan(expected * 1.15);
    }
  });
});

describe('mulberry32', () => {
  it('stays inside [0, 1)', () => {
    const random = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('is deterministic', () => {
    const a = mulberry32(5);
    const b = mulberry32(5);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('sessionSeed', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('keeps the same seed for the whole session', () => {
    const first = sessionSeed();
    expect(sessionSeed()).toBe(first);
    expect(sessionStorage.getItem(FEED_SEED_KEY)).toBe(String(first));
  });

  it('ignores a stored value that is not a number', () => {
    sessionStorage.setItem(FEED_SEED_KEY, 'nonsense');
    expect(Number.isFinite(sessionSeed())).toBe(true);
  });
});
