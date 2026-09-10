import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

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
  'fiberModal',   // the fibre is called "modal" in Polish too
  'fiberLyocell', // likewise — a trade name, not a translatable word
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

/**
 * The table itself can be complete while the interface still speaks English,
 * because a screen can simply not use the table at all. That is how the 404
 * page and "Product not found." stayed in English: both were hard-coded.
 */
describe('teksty poza tabelą tłumaczeń', () => {
  const pagesDir = resolve(__dirname, '..', 'pages');
  const componentsDir = resolve(__dirname, '..', 'components');

  /** Reads every screen and component we own, skipping shadcn and tests. */
  function ourFiles(): { path: string; text: string }[] {
    const out: { path: string; text: string }[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'ui') continue; // shadcn, not ours to translate
          walk(full);
          continue;
        }
        if (!entry.name.endsWith('.tsx') || entry.name.includes('.test.')) continue;
        out.push({ path: full, text: readFileSync(full, 'utf8') });
      }
    };
    walk(pagesDir);
    walk(componentsDir);
    return out;
  }

  it('nie zostawia widocznego tekstu wpisanego na sztywno', () => {
    const offenders: string[] = [];
    for (const { path, text } of ourFiles()) {
      text.split('\n').forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
        // Text sitting directly between JSX tags, with no {t(...)} around it.
        for (const match of line.matchAll(/>([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż][^<>{}\n]{6,})</g)) {
          offenders.push(`${path.split('/src/')[1]}:${i + 1} — ${match[1].trim()}`);
        }
      });
    }

    // The error boundary is the one deliberate exception: it renders when
    // there may be no language context left to read, so its copy is fixed.
    const real = offenders.filter(o => !o.startsWith('components/ErrorBoundary.tsx'));
    expect(real, real.join('\n')).toEqual([]);
  });
});

/**
 * The third way English reaches the screen: `src/data/`.
 *
 * The first guard reads the translation table, the second reads the screens.
 * Neither looks at the mock data, which is where the body-shape descriptions
 * that rated women's bodies were sitting — translated headings above English
 * sentences nobody had checked, because no test could see them.
 *
 * A field is either on the register below, on record as mock prose that leaves
 * with the mock catalogue, or it is a defect. New English prose in `src/data/`
 * fails this test.
 */
describe('angielska proza w danych', () => {
  const dataDir = resolve(__dirname, '..', 'data');

  /** Mock prose that is known, unrendered or short-lived. Nothing may join it. */
  const REGISTERED = new Map<string, string>([
    ['text', 'review bodies — mock, they go when a real catalogue arrives'],
    ['description', 'material prose — nothing reads it since the fibre dictionary landed'],
    ['behavior', 'likewise: the panel now generates this from the composition'],
  ]);

  function prose(): { field: string; file: string; line: number; text: string }[] {
    const out: { field: string; file: string; line: number; text: string }[] = [];
    for (const name of readdirSync(dataDir)) {
      if (!name.endsWith('.ts') || name.includes('.test.')) continue;
      readFileSync(join(dataDir, name), 'utf8').split('\n').forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        for (const match of line.matchAll(/(\w+):\s*'((?:\\.|[^'])*)'/g)) {
          const text = match[2];
          if (text.length <= 25 || !text.includes(' ')) continue;
          out.push({ field: match[1], file: name, line: i + 1, text });
        }
      });
    }
    return out;
  }

  it('nie wpuszcza nowej angielskiej prozy do src/data', () => {
    const offenders = prose()
      .filter(p => !REGISTERED.has(p.field))
      .map(p => `${p.file}:${p.line} — ${p.field}: ${p.text.slice(0, 60)}`);

    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('trzyma rejestr uczciwym', () => {
    // A field that no longer holds prose should leave the register rather than
    // sit here excusing something that is not there any more.
    const present = new Set(prose().map(p => p.field));
    for (const field of REGISTERED.keys()) {
      expect(present.has(field), `${field} nie ma już prozy — usuń go z rejestru`).toBe(true);
    }
  });
});
