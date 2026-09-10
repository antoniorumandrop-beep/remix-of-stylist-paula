import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Who is allowed to touch the generated Supabase client.
 *
 * Turning on Lovable Cloud generated `src/integrations/supabase/client.ts` —
 * a ready client, importable from anywhere. Nothing imports it today. But the
 * whole backend contract exists so that screens talk to data through
 * `src/lib/backend` and nothing else, and one prompt of the shape "save this
 * to the database" is all it takes for that import to appear inside a
 * component. It would work, which is exactly the problem: the app would be
 * half on the contract and half on a client, and the second half would only
 * surface when the Supabase adapter was finally written.
 *
 * `docs/integration-points.md` says this. A document does not fail a build.
 */
const ALLOWED = ['lib/backend/supabase.ts'];

describe('granica importu klienta Supabase', () => {
  const srcDir = resolve(__dirname, '..', '..');

  function sourceFiles(): { path: string; text: string }[] {
    const out: { path: string; text: string }[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          // The generated folder may of course import itself.
          if (full.endsWith('integrations/supabase')) continue;
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.includes('.test.')) continue;
        out.push({ path: full.slice(srcDir.length + 1), text: readFileSync(full, 'utf8') });
      }
    };
    walk(srcDir);
    return out;
  }

  it('tylko adapter backendu może importować wygenerowanego klienta', () => {
    const offenders: string[] = [];
    for (const { path, text } of sourceFiles()) {
      if (ALLOWED.includes(path)) continue;
      text.split('\n').forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (/from\s+['"][^'"]*integrations\/supabase/.test(line)) {
          offenders.push(`${path}:${i + 1} — ${trimmed}`);
        }
      });
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('czyta w ogóle jakiekolwiek pliki', () => {
    // A walk that silently found nothing would pass the check above forever.
    expect(sourceFiles().length).toBeGreaterThan(50);
  });
});
