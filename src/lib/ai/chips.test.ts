import { describe, it, expect } from 'vitest';
import { localStylist, toChip } from './stylist';
import type { StylistInput } from './stylist';
import type { Language } from '@/i18n/translations';

/**
 * Chips used to be bare translated strings, and the search screen decided what
 * a tap meant by comparing that visible text against `t('findSame')` and
 * friends. Rewording a Polish label, or switching language mid-conversation,
 * silently turned a photo-search chip into an ordinary message.
 */

const ask = (lang: Language): StylistInput => ({
  text: 'szukam sukienki',
  history: [],
  pills: [],
  profile: null,
  catalog: [],
  lang,
});

describe('chips carry an id that does not depend on language', () => {
  it('gives the same ids in Polish and English', async () => {
    const pl = await localStylist.respond(ask('pl'));
    const en = await localStylist.respond(ask('en'));

    expect(pl.chips?.length).toBeGreaterThan(0);
    expect(pl.chips?.map(c => c.id)).toEqual(en.chips?.map(c => c.id));
  });

  it('still translates what the user actually reads', async () => {
    const pl = await localStylist.respond(ask('pl'));
    const en = await localStylist.respond(ask('en'));
    expect(pl.chips?.map(c => c.label)).not.toEqual(en.chips?.map(c => c.label));
  });

  it('never emits an empty or duplicated id', async () => {
    for (const lang of ['pl', 'en'] as Language[]) {
      const { chips } = await localStylist.respond(ask(lang));
      const ids = chips?.map(c => c.id) ?? [];
      expect(ids.every(id => id.length > 0)).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('toChip', () => {
  it('passes a proper chip through untouched', () => {
    const chip = { id: 'office', label: 'Biuro' };
    expect(toChip(chip)).toBe(chip);
  });

  it('accepts a bare string from an older remote reply', () => {
    // The edge function contract may still send strings; a string is its own id.
    expect(toChip('Biuro')).toEqual({ id: 'Biuro', label: 'Biuro' });
  });
});
