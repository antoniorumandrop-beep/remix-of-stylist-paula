import { describe, it, expect } from 'vitest';
import {
  accuracy,
  brandMemory,
  joinFeedback,
  memoryForBrand,
  predictionMatches,
  type AnsweredGarment,
} from './learning';
import type { Product } from '@/lib/catalog/types';
import type { FitFeedback } from '@/lib/fitFeedback';

const product = (id: string, brand: string): Product => ({
  id,
  name: `Rzecz ${id}`,
  brand,
  price: 100,
  fitScore: 0,
  category: 'dresses',
  isSecondHand: false,
  store: brand,
});

const garment = (productId: string, brand: string, answers: AnsweredGarment['answers']): AnsweredGarment =>
  ({ productId, brand, answers });

describe('brandMemory', () => {
  it('counts answers per body point', () => {
    const memory = memoryForBrand(
      [
        garment('1', 'Reserved', { waist: 'tight', bust: 'ok' }),
        garment('2', 'Reserved', { waist: 'tight' }),
        garment('3', 'Reserved', { waist: 'ok' }),
      ],
      'Reserved',
    );

    expect(memory?.garments).toBe(3);
    const waist = memory?.points.find(p => p.point === 'waist');
    expect(waist).toMatchObject({ tight: 2, ok: 1, loose: 0, total: 3, lean: 'tight' });
  });

  it('says nothing about a point answered only once', () => {
    const memory = memoryForBrand([garment('1', 'Zara', { hips: 'tight' })], 'Zara');
    expect(memory?.points.find(p => p.point === 'hips')).toMatchObject({ total: 1, lean: null });
  });

  it('leans only on a strict majority — a tie is not knowledge', () => {
    const memory = memoryForBrand(
      [garment('1', 'Mohito', { bust: 'tight' }), garment('2', 'Mohito', { bust: 'loose' })],
      'Mohito',
    );
    expect(memory?.points.find(p => p.point === 'bust')?.lean).toBeNull();
  });

  it('reports a good fit as a lean too, not only a problem', () => {
    const memory = memoryForBrand(
      [garment('1', 'Sinsay', { waist: 'ok' }), garment('2', 'Sinsay', { waist: 'ok' })],
      'Sinsay',
    );
    expect(memory?.points.find(p => p.point === 'waist')?.lean).toBe('ok');
  });

  it('drops points she never answered', () => {
    const memory = memoryForBrand([garment('1', 'Reserved', { waist: 'ok' })], 'Reserved');
    expect(memory?.points.map(p => p.point)).toEqual(['waist']);
  });

  it('keeps brands apart and puts the most-answered first', () => {
    const all = brandMemory([
      garment('1', 'Zara', { waist: 'tight' }),
      garment('2', 'Reserved', { waist: 'ok' }),
      garment('3', 'Reserved', { waist: 'ok' }),
    ]);
    expect(all.map(m => m.brand)).toEqual(['Reserved', 'Zara']);
    expect(all.find(m => m.brand === 'Zara')?.points[0]).toMatchObject({ tight: 1, ok: 0 });
  });

  it('returns null for a brand she has never answered for', () => {
    expect(memoryForBrand([garment('1', 'Zara', { waist: 'ok' })], 'Mango')).toBeNull();
  });
});

describe('joinFeedback', () => {
  const byId = new Map([
    ['1', product('1', 'Reserved')],
    ['2', product('2', 'Zara')],
  ]);
  const record = (productId: string, answers: FitFeedback['answers']): FitFeedback =>
    ({ productId, answers, createdAt: '2026-09-10T00:00:00.000Z' });

  it('attaches the brand from the catalogue', () => {
    const joined = joinFeedback([record('1', { waist: 'tight' })], byId);
    expect(joined).toEqual([{ productId: '1', brand: 'Reserved', answers: { waist: 'tight' } }]);
  });

  it('drops feedback for a product that is no longer in the catalogue', () => {
    expect(joinFeedback([record('999', { waist: 'tight' })], byId)).toEqual([]);
  });

  it('drops an empty record so it cannot inflate the garment count', () => {
    expect(joinFeedback([record('1', {})], byId)).toEqual([]);
  });
});

describe('predictionMatches', () => {
  it('agrees when the verdict and the answer say the same thing', () => {
    expect(predictionMatches('tight', 'tight')).toBe(true);
    expect(predictionMatches('loose', 'loose')).toBe(true);
    expect(predictionMatches('neutral', 'ok')).toBe(true);
  });

  it('disagrees otherwise', () => {
    expect(predictionMatches('tight', 'loose')).toBe(false);
    expect(predictionMatches('neutral', 'tight')).toBe(false);
  });

  it('never counts "unknown" as a match', () => {
    expect(predictionMatches('unknown', 'ok')).toBe(false);
  });
});

describe('accuracy', () => {
  it('counts hits over the predictions that were made', () => {
    const result = accuracy([
      { verdicts: { waist: 'tight', bust: 'neutral' }, answers: { waist: 'tight', bust: 'ok' } },
      { verdicts: { waist: 'loose' }, answers: { waist: 'ok' } },
    ]);
    expect(result).toMatchObject({ hits: 2, total: 3 });
    expect(result.points.find(p => p.point === 'waist')).toMatchObject({ hits: 1, total: 2 });
  });

  it('leaves "unknown" out of the denominator', () => {
    // Paula saying "I cannot tell" is not a wrong prediction. Counting it as
    // one would make the scoreboard worse the more honest the scorer is.
    const result = accuracy([{ verdicts: { waist: 'unknown' }, answers: { waist: 'tight' } }]);
    expect(result).toMatchObject({ hits: 0, total: 0, points: [] });
  });

  it('ignores a point predicted but never answered, and the other way round', () => {
    const result = accuracy([{ verdicts: { waist: 'tight' }, answers: { hips: 'tight' } }]);
    expect(result.total).toBe(0);
  });

  it('is empty, not divided by zero, with no feedback at all', () => {
    expect(accuracy([])).toEqual({ hits: 0, total: 0, points: [] });
  });
});
