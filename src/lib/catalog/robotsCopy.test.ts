import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Jedna reguła robots, dwa pliki.
 *
 * Edge function nie może zaimportować `src/lib/catalog/robots.ts`: bundler
 * Supabase pakuje to, co leży pod `supabase/functions/`, a sprawdzić tego
 * lokalnie nie ma czym — na tej maszynie nie ma ani deno, ani CLI Supabase.
 * Zamiast stawiać na zachowanie, którego nie zweryfikowaliśmy, kopia leży obok
 * funkcji, a rozjazd łapie ten test.
 *
 * Gdy więc zmieniasz czytanie robots.txt, zmieniasz OBA pliki. Test pęka
 * natychmiast, zamiast pozwolić, żeby przeglądarka i serwer trzymały się dwóch
 * różnych wersji tej samej uprzejmości wobec sklepu.
 */
describe('kopia robots.ts przy edge function', () => {
  it('jest co do znaku taka sama jak źródło', () => {
    const root = resolve(__dirname, '../../..');
    const zrodlo = readFileSync(resolve(root, 'src/lib/catalog/robots.ts'), 'utf8');
    const kopia = readFileSync(resolve(root, 'supabase/functions/_shared/robots.ts'), 'utf8');
    expect(kopia).toBe(zrodlo);
  });
});
