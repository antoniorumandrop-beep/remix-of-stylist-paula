import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * What keeps the public MCP server safe to leave open.
 *
 * The server runs on `auth: none` — anyone on the internet can call
 * `classify_body_shape`, `search_products` and `score_product_fit`. That is
 * only safe because none of the three reaches anyone's saved profile: they
 * take measurements as call parameters and read the shared mock catalogue
 * and the pure fit engine, nothing that goes through `src/lib/backend`.
 *
 * Every screen that touches a person's data — profile, prefs, wardrobe,
 * feedback — goes through `@/lib/backend`, so an import of it here is exactly
 * the signal that a tool started reaching for something it should not. That
 * fact is written down in `CLAUDE.md`, checked here 2026-09-13. A document
 * does not fail a build.
 */
describe('granica narzędzi MCP', () => {
  const mcpDir = resolve(__dirname);

  function sourceFiles(): { path: string; text: string }[] {
    const out: { path: string; text: string }[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.includes('.test.')) continue;
        out.push({ path: full.slice(mcpDir.length + 1), text: readFileSync(full, 'utf8') });
      }
    };
    walk(mcpDir);
    return out;
  }

  it('żadne narzędzie MCP nie importuje z lib/backend', () => {
    const offenders: string[] = [];
    for (const { path, text } of sourceFiles()) {
      text.split('\n').forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (/from\s+['"][^'"]*\/backend(\/|['"])/.test(line) || /from\s+['"]\.\.\/backend/.test(line)) {
          offenders.push(`${path}:${i + 1} — ${trimmed}`);
        }
      });
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('czyta w ogóle jakiekolwiek pliki', () => {
    // A walk that silently found nothing would pass the check above forever.
    expect(sourceFiles().length).toBeGreaterThan(0);
  });
});
