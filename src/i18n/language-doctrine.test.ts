import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * The language rule, made checkable.
 *
 * Paula reports **where a garment is likely to fit badly and why**. She never
 * rates a body. That is not a matter of tone: the models this product will run
 * on are licensed under OpenRAIL-M, whose Attachment A forbids exploiting the
 * vulnerabilities of a group of people based on physical characteristics
 * (pt. 8) and forbids medical advice (pt. 10). Evaluative body copy breaks the
 * licence, not only the voice.
 *
 * Until now the rule lived in a document. Documents do not fail a build, and
 * this file is edited by hand, by more than one author, and by Lovable's agent.
 * So the rule is a test.
 *
 * The list is deliberately narrow: every term here is one with no legitimate
 * use anywhere in this interface. Terms that read as evaluative in body copy
 * but are ordinary elsewhere are left out on purpose, and named below, so that
 * this test never cries wolf — a guard people learn to ignore protects nothing.
 */

/** Terms that would always be a body judgement, in Polish and English. */
const FORBIDDEN = [
  // Polish
  'wyszczupl',      // "wyszczupla", "optycznie wyszczuplający"
  'maskuj',         // "maskuje brzuch"
  'kamufl',
  'zatuszuj',
  'niedoskonał',    // "niedoskonałości sylwetki"
  'problematyczn',  // "problematyczne partie"
  'unikaj',         // named explicitly in the product's own language rules
  'ukrywa',         // "ukrywa biodra" — the imperative "ukryj" is left out; it
                    // is an ordinary interface word for collapsing something
  'schudn',
  'otył',
  // English
  'slimming',
  'flatter',        // covers "flattering" and "flatters"
  'conceal',
  'camouflage',
  'problem area',
  'figure flaw',
];

/**
 * Words about weight, health and diet — banned as *subjects*, but the file
 * legitimately contains sentences promising the opposite ("never to estimate
 * weight or health") and one measuring instruction ("weight on both feet").
 * So these are checked only outside those sentences.
 */
const MEDICAL = ['bmi', 'kalori', 'calorie', ' diet', 'dieta'];

const source = readFileSync(resolve(__dirname, 'translations.ts'), 'utf8');

/** Only the quoted user-facing strings, not identifiers or comments. */
function userFacingStrings(): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  source.split('\n').forEach((line, i) => {
    if (line.trim().startsWith('//')) return;
    for (const match of line.matchAll(/(['"`])((?:\\.|(?!\1).){4,})\1/g)) {
      out.push({ line: i + 1, text: match[2] });
    }
  });
  return out;
}

describe('zasady języka', () => {
  const strings = userFacingStrings();

  it('reads the translation file', () => {
    expect(strings.length).toBeGreaterThan(300);
  });

  it('nigdy nie ocenia ciała', () => {
    const offenders = strings
      .filter(({ text }) => FORBIDDEN.some(term => text.toLowerCase().includes(term)))
      .map(({ line, text }) => `linia ${line}: ${text}`);

    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('nie zapuszcza się w wagę, dietę ani zdrowie jako temat', () => {
    const offenders = strings
      .filter(({ text }) => {
        const lower = text.toLowerCase();
        // A sentence that promises Paula does *not* do this is the opposite of
        // a violation, and has to be allowed to say so.
        if (lower.includes('never') || lower.includes('nigdy') || lower.includes('only to judge fit')) return false;
        return MEDICAL.some(term => lower.includes(term));
      })
      .map(({ line, text }) => `linia ${line}: ${text}`);

    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('faktycznie by zauważyła naruszenie', () => {
    // The guard is only worth having if it can fail. This is that proof.
    const sample = 'Ta sukienka optycznie wyszczupla sylwetkę.';
    expect(FORBIDDEN.some(term => sample.toLowerCase().includes(term))).toBe(true);

    const english = 'A flattering cut that hides your problem areas.';
    expect(FORBIDDEN.some(term => english.toLowerCase().includes(term))).toBe(true);
  });

  it('nie potyka się o zdania, które są w porządku', () => {
    const fine = [
      'Paula uses these numbers only to judge fit — never to estimate weight or health.',
      'Feet together, arms down, weight on both feet.',
      'Twoje biodra mają o 12 cm więcej niż talia, więc prosta spódnica może ciągnąć.',
      'Ukryj szczegóły',
    ];
    for (const sentence of fine) {
      const lower = sentence.toLowerCase();
      expect(FORBIDDEN.some(term => lower.includes(term)), sentence).toBe(false);
    }
  });
});

/**
 * The same rule, applied to every file we own — not only to the translation
 * table.
 *
 * This is not hypothetical tidiness. The hand-picked body shapes carried their
 * descriptions in `data/mockData.ts`, in English, telling women which
 * silhouettes "work beautifully on you", what "creates beautiful balance" and
 * which necklines were "your best friend". It sat in the one screen for
 * someone with no tape measure, and a guard that read only the translation
 * file could never have seen it.
 */
describe('zasady języka — poza tabelą tłumaczeń', () => {
  const srcDir = resolve(__dirname, '..');

  function ourStrings(): { path: string; line: number; text: string }[] {
    const out: { path: string; line: number; text: string }[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'ui' || entry.name === 'test') continue;
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name) || entry.name.includes('.test.')) continue;
        readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
          for (const match of line.matchAll(/(['"`])((?:\\.|(?!\1).){8,})\1/g)) {
            out.push({ path: full.split('/src/')[1], line: i + 1, text: match[2] });
          }
        });
      }
    };
    walk(srcDir);
    return out;
  }

  it('żaden plik nie ocenia ciała', () => {
    const offenders = ourStrings()
      .filter(({ text }) => FORBIDDEN.some(term => text.toLowerCase().includes(term)))
      .map(({ path, line, text }) => `${path}:${line} — ${text}`);

    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
