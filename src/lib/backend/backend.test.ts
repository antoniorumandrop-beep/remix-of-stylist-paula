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
    const outfit = await b.wardrobe.createOutfit({
      name: 'Work',
      items: [
        { label: 'marynarka', productId: '1' },
        { label: 'spódnica, H&M', productId: '2' },
        { label: '', productId: '3' },
      ],
      photoIds: [],
    });
    expect((await b.wardrobe.listOutfits())[0].id).toBe(outfit.id);

    // Giving the skirt away does not unhappen the day she wore it: the row she
    // named stays and only loses the link to a product she no longer owns.
    await b.wardrobe.removeItem('2');
    expect((await b.wardrobe.listOutfits())[0].items).toEqual([
      { label: 'marynarka', productId: '1' },
      { label: 'spódnica, H&M', productId: null },
      { label: '', productId: '3' },
    ]);

    // A row that was never anything but a product id has nothing left to show.
    await b.wardrobe.removeItem('3');
    expect((await b.wardrobe.listOutfits())[0].items).toEqual([
      { label: 'marynarka', productId: '1' },
      { label: 'spódnica, H&M', productId: null },
    ]);

    await b.wardrobe.deleteOutfit(outfit.id);
    expect(await b.wardrobe.listOutfits()).toHaveLength(0);
  });

  it('fits: a fit is photos plus what she says she has on', async () => {
    const fit = await b.wardrobe.createOutfit({
      name: 'Sobota',
      items: [{ label: 'sweter oversize, Zara' }, { label: 'jeansy, second hand' }],
      photoIds: ['p-1', 'p-2'],
    });
    expect(fit.photoIds).toEqual(['p-1', 'p-2']);
    expect(fit.items.map(i => i.label)).toEqual(['sweter oversize, Zara', 'jeansy, second hand']);

    await b.wardrobe.updateOutfit(fit.id, {
      name: 'Sobota, kawa',
      items: [{ label: 'sweter oversize, Zara', productId: '7' }],
      photoIds: ['p-2'],
    });
    const after = (await b.wardrobe.listOutfits())[0];
    expect(after.name).toBe('Sobota, kawa');
    expect(after.photoIds).toEqual(['p-2']);
    expect(after.items).toEqual([{ label: 'sweter oversize, Zara', productId: '7' }]);

    // Updating something that is not there changes nothing and does not throw.
    await b.wardrobe.updateOutfit('nie-ma-takiego', { name: 'x', items: [], photoIds: [] });
    expect(await b.wardrobe.listOutfits()).toHaveLength(1);
  });

  it('fits: two created in the same millisecond get different ids', async () => {
    const a = await b.wardrobe.createOutfit({ name: 'A', items: [], photoIds: [] });
    const c = await b.wardrobe.createOutfit({ name: 'B', items: [], photoIds: [] });
    expect(a.id).not.toBe(c.id);
    await b.wardrobe.deleteOutfit(a.id);
    expect((await b.wardrobe.listOutfits()).map(o => o.name)).toEqual(['B']);
  });

  it('fits: stylizacje zapisane przed zdjęciami czytają się dalej', async () => {
    // Exactly the shape earlier builds wrote, straight into storage.
    localStorage.setItem('paula.outfits', JSON.stringify([
      { id: 'o-1', name: 'Na wesele', productIds: ['1', '2'], createdAt: '2026-09-01T10:00:00.000Z' },
    ]));
    const [legacy] = await b.wardrobe.listOutfits();
    expect(legacy.name).toBe('Na wesele');
    expect(legacy.photoIds).toEqual([]);
    expect(legacy.items).toEqual([{ label: '', productId: '1' }, { label: '', productId: '2' }]);
    // Zapisane, zanim skany istniały: pusta mapa, nie `undefined` — ekrany nie
    // mają sprawdzać, czy pole w ogóle jest.
    expect(legacy.cutouts).toEqual({});
  });

  it('fits: wycinek żyje obok oryginału i ginie razem z nim', async () => {
    const fit = await b.wardrobe.createOutfit({ name: 'Skan', items: [], photoIds: ['p-1', 'p-2'] });
    expect(fit.cutouts).toEqual({});

    await b.wardrobe.setCutouts(fit.id, { 'p-1': 'c-1', 'p-2': 'c-2' });
    expect((await b.wardrobe.listOutfits())[0].cutouts).toEqual({ 'p-1': 'c-1', 'p-2': 'c-2' });

    /**
     * Zapis samej nazwy NIE rusza skanu. To jest cały powód, dla którego
     * wycinki nie są polem `OutfitDraft`: gdyby jechały razem ze szkicem,
     * edytor zapisujący zmianę nazwy kasowałby je bez niczyjego zauważenia.
     */
    await b.wardrobe.updateOutfit(fit.id, { name: 'Skan, inaczej', items: [], photoIds: ['p-1', 'p-2'] });
    expect((await b.wardrobe.listOutfits())[0].cutouts).toEqual({ 'p-1': 'c-1', 'p-2': 'c-2' });

    // Zdjęcie wyjęte z fitu zabiera swój wycinek — wycinek bez oryginału jest
    // sierotą, bo pokazuje się go zawsze na miejscu zdjęcia, z którego powstał.
    await b.wardrobe.updateOutfit(fit.id, { name: 'Skan', items: [], photoIds: ['p-2'] });
    expect((await b.wardrobe.listOutfits())[0].cutouts).toEqual({ 'p-2': 'c-2' });

    // Skan nieznanego fitu nic nie psuje i nie rzuca.
    await b.wardrobe.setCutouts('nie-ma-takiego', { 'p-9': 'c-9' });
    expect(await b.wardrobe.listOutfits()).toHaveLength(1);

    await b.wardrobe.deleteOutfit(fit.id);
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

  it('catalog: what the user adds herself stays out of the shared channel', async () => {
    const raw = {
      id: 'user:sukienka-z-innego-sklepu',
      source: 'user',
      externalId: 'sukienka-z-innego-sklepu',
      name: 'Sukienka z innego sklepu',
      brand: 'Nieznana Marka',
      price: 199,
      currency: 'PLN' as const,
      category: 'dresses',
      url: 'https://sklep.example.pl/sukienka',
      fetchedAt: 'now',
    };
    const before = (await b.catalog.list()).length;
    const added = await b.catalog.addUserProduct(raw);
    expect(added.name).toBe('Sukienka z innego sklepu');

    // The feed, the search and the "similar products" rows all read `list()`.
    // A piece pasted from a shop we do not carry never enters any of them.
    const shared = await b.catalog.list();
    expect(shared).toHaveLength(before);
    expect(shared.some(p => p.id === raw.id)).toBe(false);

    // But she has to be able to open what she added, so `get` is wider.
    expect((await b.catalog.get(raw.id))?.name).toBe('Sukienka z innego sklepu');
    expect(await b.catalog.listUserProducts()).toHaveLength(1);

    // Pasting the same link twice replaces the record rather than doubling it.
    await b.catalog.addUserProduct({ ...raw, price: 179 });
    const mine = await b.catalog.listUserProducts();
    expect(mine).toHaveLength(1);
    expect(mine[0].price).toBe(179);

    await b.catalog.removeUserProduct(raw.id);
    expect(await b.catalog.listUserProducts()).toEqual([]);
    expect(await b.catalog.get(raw.id)).toBeNull();
  });

  it('collections: create, rename, add, remove, delete', async () => {
    expect(await b.collections.list()).toEqual([]);

    const wedding = await b.collections.create('Na wesele');
    const winter = await b.collections.create('Zima', '❄️');
    // Newest first, the same order as saved products.
    expect((await b.collections.list()).map(c => c.name)).toEqual(['Zima', 'Na wesele']);
    expect(winter.emoji).toBe('❄️');
    // An emoji is never assigned for the user, only chosen by her.
    expect(wedding.emoji).toBeNull();
    expect(wedding.productIds).toEqual([]);

    await b.collections.addProduct(wedding.id, '1');
    await b.collections.addProduct(wedding.id, '2');
    // The menu on a product card cannot know what is already inside, so
    // adding twice has to be a no-op rather than a duplicate or an error.
    await b.collections.addProduct(wedding.id, '1');
    const withProducts = (await b.collections.list()).find(c => c.id === wedding.id);
    expect(withProducts?.productIds).toEqual(['2', '1']);

    await b.collections.rename(wedding.id, '  Na ślub  ');
    expect((await b.collections.list()).find(c => c.id === wedding.id)?.name).toBe('Na ślub');

    await b.collections.removeProduct(wedding.id, '2');
    expect((await b.collections.list()).find(c => c.id === wedding.id)?.productIds).toEqual(['1']);

    await b.collections.remove(wedding.id);
    expect((await b.collections.list()).map(c => c.name)).toEqual(['Zima']);
  });

  it('collections: a collection is not an outfit, even though the shape matches', async () => {
    const c = await b.collections.create('Na wesele');
    await b.collections.addProduct(c.id, '1');
    await b.wardrobe.createOutfit({
      name: 'Look na wesele',
      items: [{ label: '', productId: '1' }, { label: '', productId: '2' }],
      photoIds: [],
    });

    // Two separate stores. Deleting one must not touch the other — this is
    // the whole reason they were not merged.
    const outfits = await b.wardrobe.listOutfits();
    await b.wardrobe.deleteOutfit(outfits[0].id);
    expect((await b.collections.list())[0].productIds).toEqual(['1']);

    await b.collections.remove(c.id);
    expect(await b.collections.list()).toEqual([]);
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
    // Spelled out rather than spread from `list[0]`: that is the enriched view
    // of the product, not the raw record the importer takes, and casting one to
    // the other hid the difference instead of stating it.
    await b.catalog.importRaw([{
      id: 'brand:x', source: 'brand', externalId: 'x', name: 'Sukienka midi kopertowa z dekoltem w serek',
      brand: 'Marka', price: 149, currency: 'PLN', category: 'dresses', imageUrl: 'https://x/1.jpg',
      material: '95% wiskoza, 5% elastan', fetchedAt: 'later',
    }]);
    expect((await b.catalog.get('brand:x'))?.price).toBe(149);
    expect(await b.catalog.listImported()).toHaveLength(1);
    await b.catalog.clearImported();
    expect(await b.catalog.list()).toHaveLength(mockCount);
  });
});
