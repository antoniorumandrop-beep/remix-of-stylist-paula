import { describe, it, expect } from 'vitest';
import { checkMeasurement, inchesToCm } from './validate';

/**
 * The bounds exist to catch typos, not to tell anyone their body is wrong.
 * These cases are as much about what must be *accepted* as about what is
 * flagged.
 */
describe('checkMeasurement', () => {
  it('accepts ordinary measurements without comment', () => {
    expect(checkMeasurement('bust', 90)).toBeNull();
    expect(checkMeasurement('waist', 70)).toBeNull();
    expect(checkMeasurement('hips', 100)).toBeNull();
    expect(checkMeasurement('height', 168)).toBeNull();
  });

  it('accepts bodies well outside the average, in both directions', () => {
    // A narrow range would tell real women their bodies are wrong. These all
    // have to pass.
    expect(checkMeasurement('bust', 68)).toBeNull();
    expect(checkMeasurement('bust', 160)).toBeNull();
    expect(checkMeasurement('waist', 55)).toBeNull();
    expect(checkMeasurement('waist', 150)).toBeNull();
    expect(checkMeasurement('hips', 175)).toBeNull();
    expect(checkMeasurement('height', 145)).toBeNull();
    expect(checkMeasurement('height', 196)).toBeNull();
  });

  it('says nothing about an empty field', () => {
    expect(checkMeasurement('bust', 0)).toBeNull();
    expect(checkMeasurement('bust', Number.NaN)).toBeNull();
    expect(checkMeasurement('waist', -5)).toBeNull();
  });

  it('catches a slipped digit', () => {
    expect(checkMeasurement('waist', 7)).toBe('too-small');
    expect(checkMeasurement('bust', 900)).toBe('too-large');
    expect(checkMeasurement('hips', 1000)).toBe('too-large');
    expect(checkMeasurement('height', 17)).toBe('too-small');
    expect(checkMeasurement('height', 1680)).toBe('too-large');
  });

  it('recognises a circumference typed in inches', () => {
    // The tape she owns may well be imperial on one side.
    expect(checkMeasurement('bust', 35)).toBe('maybe-inches');
    expect(checkMeasurement('waist', 28)).toBe('maybe-inches');
    expect(checkMeasurement('hips', 40)).toBe('maybe-inches');
  });

  it('does not mistake a small centimetre value for inches once it is plausible', () => {
    expect(checkMeasurement('waist', 56)).toBeNull();
    expect(checkMeasurement('bust', 60)).toBeNull();
  });

  it('never guesses inches for a height', () => {
    // 66 inches is a real height, but so is 166 cm; the field is in cm and
    // 66 cm is simply a typo.
    expect(checkMeasurement('height', 66)).toBe('too-small');
  });

  it('converts a likely inches value for the hint', () => {
    expect(inchesToCm(35)).toBe(89);
    expect(inchesToCm(28)).toBe(71);
  });
});
