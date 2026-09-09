import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guards against English leaking into the Polish interface.
 *
 * `buildYourStyle` sat in the Polish table as the literal English string while
 * its own description right underneath was translated — so it read as "Brain
 * of your style" in the middle of a Polish navigation bar, and nothing flagged
 * it. Paula is a Polish product; an untranslated label is a defect, not a
 * cosmetic detail.
 *
 * Four entries are the same in both languages on purpose. They are listed here
 * so that staying the same is a decision on record rather than an oversight
 * nobody noticed.
 */
const DELIBERATELY_IDENTICAL = new Set([
  'pillInspo',    // "Inspo" — used as a loanword in Polish
  'secondHand',   // "Second-hand" — the usual Polish term
  'fit',          // the badge reads "fit 94%" in both languages
  'Streetwear',   // an aesthetic name, not translated in Polish either
]);

/** Reads the single-line string entries out of each language block. */
function readBlock(source: string, from: number, to: number): Map<string, string> {
  const entries = new Map<string, string>();
  const pattern = /^ {4}'?([A-Za-z][A-Za-z0-9 /]*)'?:\s*(['"`])((?:\\.|(?!\2).)*)\2,\s*$/gm;
  const block = source.slice(from, to);
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(block)) !== null) entries.set(match[1], match[3]);
  return entries;
}

const source = readFileSync(resolve(__dirname, 'translations.ts'), 'utf8');
const enStart = source.indexOf('en: {');
const plStart = source.indexOf('pl: {');
const en = readBlock(source, enStart, plStart);
const pl = readBlock(source, plStart, source.length);

describe('pokrycie tłumaczeń', () => {
  it('reads both tables', () => {
    expect(en.size).toBeGreaterThan(300);
    expect(pl.size).toBe(en.size);
  });

  it('has a Polish entry for every English one', () => {
    const missing = [...en.keys()].filter(key => !pl.has(key));
    expect(missing).toEqual([]);
  });

  it('leaves no English text in the Polish interface', () => {
    const identical = [...pl.entries()]
      .filter(([key, value]) => en.get(key) === value && value.length > 2)
      .map(([key]) => key)
      .filter(key => !DELIBERATELY_IDENTICAL.has(key));

    expect(identical).toEqual([]);
  });

  it('keeps the deliberate exceptions honest', () => {
    // If one of these ever gets a real Polish translation, it should leave the
    // list rather than sit here claiming to be an exception.
    for (const key of DELIBERATELY_IDENTICAL) {
      expect(pl.get(key), `${key} nie jest już identyczne — usuń je z listy wyjątków`).toBe(en.get(key));
    }
  });
});
