import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalBackend } from './local';
import type { Backend } from './types';

/**
 * Contract tests for the `Backend` interfaces.
 *
 * They run against the local adapter today. When the Supabase adapter exists,
 * point `makeBackend` at it (with a test project) and the same expectations
 * must hold — that is what "plug it in at the end" means in practice.
 */
const makeBackend = (): Backend => createLocalBackend();

describe('backend contract (local)', () => {
  let b: Backend;
  beforeEach(() => {
    localStorage.clear();
    b = makeBackend();
  });

  it('auth: signs in with any email, remembers the session, signs out', async () => {
    expect(await b.auth.getSession()).toBeNull();
    const seen: (string | null)[] = [];
    const off = b.auth.onAuthChange(s => seen.push(s?.userId ?? null));
    const s = await b.auth.signInWithEmail('gabi@example.com');
    expect(s?.email).toBe('gabi@example.com');
    expect((await b.auth.getSession())?.userId).toBe(s!.userId);
    // Same email → same user id, so data survives a re-login.
    expect((await b.auth.signInWithEmail('GABI@example.com '))!.userId).toBe(s!.userId);
    await b.auth.signOut();
    expect(await b.auth.getSession()).toBeNull();
    off();
    expect(seen).toEqual([s!.userId, s!.userId, null]);
  });

  it('profile: set, get, clear', async () => {
    expect(await b.profile.get()).toBeNull();
    await b.profile.set({ source: 'measured', bust: 90, waist: 70, hips: 98, heightCm: 168, updatedAt: 'now' });
    expect((await b.profile.get())?.source).toBe('measured');
    await b.profile.clear();
    expect(await b.profile.get()).toBeNull();
  });

  it('prefs: defaults, partial update, legacy keys migrate', async () => {
    localStorage.setItem('paula-username', 'Kasia');
    localStorage.setItem('paula-inspirations', JSON.stringify(['Zendaya']));
    const before = await b.prefs.get();
    expect(before.name).toBe('Kasia');
    expect(before.inspirations).toEqual(['Zendaya']);
    expect(before.aesthetics).toEqual([]);
    const after = await b.prefs.update({ budgetMin: 100, budgetMax: 300 });
    expect(after.name).toBe('Kasia');
    expect(after.budgetMax).toBe(300);
    expect((await b.prefs.get()).budgetMin).toBe(100);
  });

  it('wardrobe: pending → owned, wear count, outfits lose removed items', async () => {
    await b.wardrobe.markPending('1');
    await b.wardrobe.markPending('1');
    expect(await b.wardrobe.listPending()).toHaveLength(1);
    await b.wardrobe.addItem('1');
    expect(await b.wardrobe.listPending()).toHaveLength(0);
    expect(await b.wardrobe.listItems()).toHaveLength(1);
    await b.wardrobe.markPending('1'); // already owned → ignored
    expect(await b.wardrobe.listPending()).toHaveLength(0);
    await b.wardrobe.addItem('2');
    await b.wardrobe.incrementWear('1');
    expect((await b.wardrobe.listItems()).find(i => i.productId === '1')?.timesWorn).toBe(1);
    const outfit = await b.wardrobe.createOutfit('Work', ['1', '2']);
    expect((await b.wardrobe.listOutfits())[0].id).toBe(outfit.id);
    await b.wardrobe.removeItem('2');
    expect((await b.wardrobe.listOutfits())[0].productIds).toEqual(['1']);
    await b.wardrobe.deleteOutfit(outfit.id);
    expect(await b.wardrobe.listOutfits()).toHaveLength(0);
  });

  it('feedback: one entry per product, replaced on save', async () => {
    await b.feedback.save('1', { bust: 'tight' });
    await b.feedback.save('1', { bust: 'ok', hips: 'loose' });
    const all = await b.feedback.list();
    expect(all).toHaveLength(1);
    expect(all[0].answers).toEqual({ bust: 'ok', hips: 'loose' });
    await b.feedback.remove('1');
    expect(await b.feedback.list()).toHaveLength(0);
  });

  it('saved: add is idempotent, newest first', async () => {
    await b.saved.add('1');
    await b.saved.add('2');
    await b.saved.add('1');
    expect(await b.saved.list()).toEqual(['2', '1']);
    await b.saved.remove('2');
    expect(await b.saved.list()).toEqual(['1']);
  });

  it('catalog: imported products come first, carry fit attributes, and can be cleared', async () => {
    const mockCount = (await b.catalog.list()).length;
    expect(mockCount).toBeGreaterThan(0);
    const n = await b.catalog.importRaw([{
      id: 'brand:x', source: 'brand', externalId: 'x', name: 'Sukienka midi kopertowa z dekoltem w serek',
      brand: 'Marka', price: 199, currency: 'PLN', category: 'dresses', imageUrl: 'https://x/1.jpg',
      material: '95% wiskoza, 5% elastan', fetchedAt: 'now',
    }]);
    expect(n).toBe(1);
    const list = await b.catalog.list();
    expect(list).toHaveLength(mockCount + 1);
    expect(list[0].id).toBe('brand:x');
    expect(list[0].fit?.silhouette?.value).toBe('wrap');
    expect(list[0].fit?.lengthClass?.value).toBe('midi');
    expect(list[0].fit?.stretchLevel?.value).toBe('high');
    expect((await b.catalog.get('brand:x'))?.imageUrl).toBe('https://x/1.jpg');
    // Re-import with the same id replaces, not duplicates.
    await b.catalog.importRaw([{ ...list[0], id: 'brand:x', source: 'brand', externalId: 'x', currency: 'PLN', fetchedAt: 'later', price: 149 } as any]);
    expect((await b.catalog.get('brand:x'))?.price).toBe(149);
    expect(await b.catalog.listImported()).toHaveLength(1);
    await b.catalog.clearImported();
    expect(await b.catalog.list()).toHaveLength(mockCount);
  });
});
