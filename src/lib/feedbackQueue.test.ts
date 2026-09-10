import { describe, it, expect } from 'vitest';
import { dueForFeedback, DAYS_BEFORE_ASKING } from './feedbackQueue';
import type { WardrobeItem } from './wardrobe';

const NOW = new Date('2026-09-10T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

const item = (productId: string, addedAt: string, timesWorn = 0): WardrobeItem =>
  ({ productId, addedAt, timesWorn });

const ids = (items: WardrobeItem[]) => items.map(i => i.productId);

describe('dueForFeedback', () => {
  it('waits a few days before asking about something just added', () => {
    const items = [item('1', daysAgo(0)), item('2', daysAgo(1))];
    expect(dueForFeedback(items, new Set(), NOW)).toEqual([]);
  });

  it('asks once the wait is over', () => {
    const items = [item('1', daysAgo(DAYS_BEFORE_ASKING))];
    expect(ids(dueForFeedback(items, new Set(), NOW))).toEqual(['1']);
  });

  it('asks straight away about something she marked worn', () => {
    // She has it on. Guessing at a delivery date stops being relevant.
    const items = [item('1', daysAgo(0), 2)];
    expect(ids(dueForFeedback(items, new Set(), NOW))).toEqual(['1']);
  });

  it('never asks twice about the same thing', () => {
    const items = [item('1', daysAgo(10)), item('2', daysAgo(10))];
    expect(ids(dueForFeedback(items, new Set(['1']), NOW))).toEqual(['2']);
  });

  it('puts the oldest first', () => {
    const items = [item('new', daysAgo(4)), item('old', daysAgo(30)), item('mid', daysAgo(10))];
    expect(ids(dueForFeedback(items, new Set(), NOW))).toEqual(['old', 'mid', 'new']);
  });

  it('stays quiet about an item with an unreadable date', () => {
    // Storage can hold anything. A broken record is not a reason to pester.
    expect(dueForFeedback([item('1', 'kiedyś')], new Set(), NOW)).toEqual([]);
  });
});
