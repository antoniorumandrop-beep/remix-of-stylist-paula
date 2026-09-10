import { describe, it, expect } from 'vitest';
import { plPlural } from './plural';

const rzecz = (n: number) => `${n} ${plPlural(n, 'rzecz', 'rzeczy', 'rzeczy')}`;
const form = (n: number) => plPlural(n, 'one', 'few', 'many');

describe('plPlural', () => {
  it('takes the singular only for exactly one', () => {
    expect(form(1)).toBe('one');
    expect(form(0)).toBe('many');
  });

  it('takes the 2-4 form', () => {
    expect([2, 3, 4, 22, 23, 104].map(form)).toEqual(['few', 'few', 'few', 'few', 'few', 'few']);
  });

  it('sends the teens to the many form, where 2-4 would be wrong', () => {
    // "12 rzeczy", never "12 rzeczy" in the 2-4 shape — this is the case that
    // a naive `n % 10` check gets wrong.
    expect([12, 13, 14, 112, 113].map(form)).toEqual(['many', 'many', 'many', 'many', 'many']);
  });

  it('takes the many form from five up', () => {
    expect([5, 9, 11, 25, 100].map(form)).toEqual(['many', 'many', 'many', 'many', 'many']);
  });

  it('reads correctly in a real sentence', () => {
    expect(rzecz(1)).toBe('1 rzecz');
    expect(rzecz(3)).toBe('3 rzeczy');
    expect(rzecz(5)).toBe('5 rzeczy');
  });
});
