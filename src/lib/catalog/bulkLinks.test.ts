import { describe, it, expect, vi } from 'vitest';
import { parseUrlList, fetchDrafts, BULK_LIMIT } from './bulkLinks';

vi.mock('./linkFetch', () => ({
  fetchProductDraft: vi.fn(async (url: string) =>
    url.includes('zly')
      ? { status: 'error' as const, error: 'HTTP 404' }
      : { status: 'ok' as const, draft: { url, warnings: [], sources: {} } },
  ),
}));

describe('lista linków', () => {
  it('bierze po jednym z linii i pomija puste', () => {
    expect(parseUrlList('  https://a.pl/1  \n\n https://a.pl/2 \n')).toEqual([
      'https://a.pl/1',
      'https://a.pl/2',
    ]);
  });

  it('nie czyta dwa razy tego samego adresu', () => {
    // The same page pasted twice is a slip, not a request for two products —
    // and it would be a second hit on somebody else's server for nothing.
    expect(parseUrlList('https://a.pl/1\nhttps://A.pl/1/\nhttps://a.pl/2')).toEqual([
      'https://a.pl/1',
      'https://a.pl/2',
    ]);
  });

  it('trzyma się limitu', () => {
    const many = Array.from({ length: 40 }, (_, i) => `https://a.pl/${i}`).join('\n');
    expect(parseUrlList(many)).toHaveLength(BULK_LIMIT);
  });
});

describe('czytanie listy stron', () => {
  it('czyta po kolei i melduje postęp', async () => {
    const seen: [number, number][] = [];
    const rows = await fetchDrafts(
      ['https://a.pl/1', 'https://a.pl/2'],
      (done, total) => seen.push([done, total]),
      0,
    );
    expect(rows.map(r => r.status)).toEqual(['ok', 'ok']);
    expect(seen).toEqual([[1, 2], [2, 2]]);
  });

  it('jedna strona, której nie da się odczytać, nie przerywa reszty', async () => {
    const rows = await fetchDrafts(['https://a.pl/zly', 'https://a.pl/2'], undefined, 0);
    expect(rows[0]).toMatchObject({ status: 'error', error: 'HTTP 404' });
    expect(rows[1].status).toBe('ok');
  });
});
