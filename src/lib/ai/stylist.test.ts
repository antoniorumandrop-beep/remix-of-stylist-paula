import { describe, it, expect } from 'vitest';
import { localStylist } from './stylist';
import type { StylistInput, StylistMessage, ContextPill } from './stylist';
import type { Product } from '@/lib/catalog/types';

/**
 * The rules that decide what Paula says and what she shows.
 *
 * This is her whole brain today, and it is the behaviour the edge function
 * will have to reproduce when the model takes over — `StylistProvider` exists
 * precisely so the screen cannot tell which one answered. Writing it down here
 * makes the contract checkable instead of implied.
 *
 * Everything is exercised in Polish, because that is the language the shop,
 * the prices and the users are in.
 */

const product = (id: string, price: number, category: string, extra: Partial<Product> = {}): Product => ({
  id: `stylist-test-${id}`,
  name: `Produkt ${id}`,
  brand: 'Marka',
  price,
  fitScore: 0,
  category,
  isSecondHand: false,
  store: 'Marka',
  ...extra,
});

const CATALOG: Product[] = [
  product('sukienka-tania', 120, 'dresses'),
  product('sukienka-droga', 450, 'dresses'),
  product('spodnica', 150, 'skirts'),
  product('buty', 300, 'shoes'),
  product('sukienka-uzywana', 80, 'dresses', { isSecondHand: true }),
];

const ask = (text: string, over: Partial<StylistInput> = {}): StylistInput => ({
  text,
  history: [],
  pills: [],
  profile: null,
  catalog: CATALOG,
  lang: 'pl',
  ...over,
});

const pill = (pills: ContextPill[], key: string) => pills.find(p => p.key === key);
const turns = (count: number): StylistMessage[] =>
  Array.from({ length: count }, (_, i) => ({ sender: 'user' as const, text: `wiadomość ${i}` }));

describe('localStylist — co wyłapuje ze zdania', () => {
  it('reads a budget written the way a Polish speaker writes it', async () => {
    for (const phrase of ['sukienka do 200 zł', 'coś za 200 PLN', 'budżet 200', 'max 200']) {
      const { pills } = await localStylist.respond(ask(phrase));
      expect(pill(pills, 'budget')?.value, phrase).toBe('200 PLN');
    }
  });

  it('reads the occasion through Polish inflection', async () => {
    // Nobody types the dictionary form. "biuro" never appears in a sentence;
    // "do biura" and "w biurze" do, and neither used to match.
    const cases: [string, string][] = [
      ['sukienka na wesele', 'Wedding'],
      ['sukienka na weselu siostry', 'Wedding'],
      ['coś do biura', 'Office'],
      ['coś w biurze', 'Office'],
      ['do pracy', 'Office'],
      ['na randkę', 'Date night'],
      ['na imprezę', 'Party'],
      ['na wakacje', 'Vacation'],
      ['something for the office', 'Office'],
    ];
    for (const [phrase, expected] of cases) {
      expect(pill((await localStylist.respond(ask(phrase))).pills, 'occasion')?.value, phrase).toBe(expected);
    }
  });

  it('reads the style through Polish inflection too', async () => {
    // Colours used to be listed here as styles ("czarna sukienka" → Style:
    // Black) and were then ignored by the filter. They are their own pill now
    // and they filter — see the "kolor" block below.
    const cases: [string, string][] = [
      ['coś eleganckiego', 'Elegant'],
      ['sukienka w kwiaty', 'Floral'],
      ['satynowa sukienka', 'Satin'],
      ['w pastelach', 'Pastels'],
    ];
    for (const [phrase, expected] of cases) {
      expect(pill((await localStylist.respond(ask(phrase))).pills, 'style')?.value, phrase).toBe(expected);
    }
  });

  it('reads the category from an inflected Polish word', async () => {
    // "sukienki", "sukienkę", "sukienka" — the table matches on the stem.
    for (const phrase of ['szukam sukienki', 'chcę sukienkę', 'jakaś sukienka']) {
      expect(pill((await localStylist.respond(ask(phrase))).pills, 'category')?.value, phrase).toBe('Dresses');
    }
    expect(pill((await localStylist.respond(ask('spódnica midi'))).pills, 'category')?.value).toBe('Skirts');
  });

  it('recognises a request for second-hand', async () => {
    expect(pill((await localStylist.respond(ask('coś używanego'))).pills, 'source')?.value).toBe('Second-hand');
    expect(pill((await localStylist.respond(ask('z Vinted'))).pills, 'source')?.value).toBe('Second-hand');
  });

  it('keeps what she said earlier and overwrites only what she changed', async () => {
    const first = await localStylist.respond(ask('sukienka na wesele'));
    const second = await localStylist.respond(
      ask('jednak do 300 zł', { pills: first.pills, history: turns(1) }),
    );

    expect(pill(second.pills, 'occasion')?.value).toBe('Wedding');
    expect(pill(second.pills, 'budget')?.value).toBe('300 PLN');

    const third = await localStylist.respond(
      ask('a jednak do 150 zł', { pills: second.pills, history: turns(2) }),
    );
    expect(pill(third.pills, 'budget')?.value).toBe('150 PLN');
    expect(third.pills.filter(p => p.key === 'budget')).toHaveLength(1);
  });
});

describe('localStylist — czym filtruje wyniki', () => {
  it('honours the budget literally', async () => {
    const { products } = await localStylist.respond(ask('sukienka do 200 zł'));
    expect(products!.length).toBeGreaterThan(0);
    for (const p of products!) expect(p.price).toBeLessThanOrEqual(200);
  });

  it('honours the category', async () => {
    const { products } = await localStylist.respond(ask('sukienka do 500 zł'));
    for (const p of products!) expect(p.category).toBe('dresses');
  });

  it('honours a request for second-hand', async () => {
    const { products } = await localStylist.respond(ask('używana sukienka do 500 zł'));
    expect(products!.length).toBeGreaterThan(0);
    for (const p of products!) expect(p.isSecondHand).toBe(true);
  });

  it('returns an empty list rather than something outside what she asked for', async () => {
    // Nothing in the catalogue is a dress under 50; the honest answer is none.
    const { products } = await localStylist.respond(ask('sukienka do 50 zł'));
    expect(products).toEqual([]);
  });
});

describe('localStylist — jak prowadzi rozmowę', () => {
  it('asks rather than guessing when it has almost nothing to go on', async () => {
    const { products, chips } = await localStylist.respond(ask('cześć'));
    // Paula is reactive: one vague word is not a reason to show a catalogue.
    expect(products).toBeUndefined();
    expect(chips?.length).toBeGreaterThan(0);
  });

  it('shows something once two things are known', async () => {
    const { products } = await localStylist.respond(ask('sukienka na wesele do 500 zł'));
    expect(products).toBeDefined();
  });

  it('stops asking after three turns even if it still knows little', async () => {
    // Otherwise a person who phrases things unusually never gets past the
    // questions.
    const { products } = await localStylist.respond(ask('hmm', { history: turns(3) }));
    expect(products).toBeDefined();
  });

  it('answers in the language it was asked in', async () => {
    const pl = await localStylist.respond(ask('sukienka na wesele do 500 zł'));
    const en = await localStylist.respond(ask('sukienka na wesele do 500 zł', { lang: 'en' }));
    expect(pl.reply).not.toBe(en.reply);
    expect(pl.pills.map(p => p.key)).toEqual(en.pills.map(p => p.key));
  });

  it('never puts a body judgement in its reply', async () => {
    // Paula reports risk of misfit; she does not rate bodies. This is a
    // licence condition, not only a matter of tone.
    const banned = /wyszczupl|ukrywa|maskuj|unikaj|figur[ay] problem|slimming|flatter/i;
    for (const phrase of ['sukienka na wesele do 500 zł', 'coś do biura', 'cześć', 'używana spódnica']) {
      const { reply } = await localStylist.respond(ask(phrase));
      expect(reply, phrase).not.toMatch(banned);
    }
  });
});

describe('localStylist — kolor', () => {
  /**
   * Colour is the one criterion Paula used to recognise, display and then
   * ignore. Asking for "czarna sukienka midi do 150 zł" produced a pill
   * reading "Styl: Black" and a first result in an animal print, because
   * `applyPills` filtered on budget, category and second-hand only.
   *
   * What makes colour different from the rest is how little of it the catalogue
   * knows: on 2026-09-14, 8 of 57 products named a colour anywhere. A filter
   * that dropped the other 49 would answer "nothing found" to almost every
   * question, which is a worse lie than showing them.
   */
  const colored: Product[] = [
    product('czarna-sukienka', 100, 'dresses', { name: 'Czarna sukienka midi' }),
    product('czerwona-sukienka', 100, 'dresses', { name: 'Czerwona sukienka midi' }),
    product('sukienka-bez-koloru', 100, 'dresses', { name: 'Lniana sukienka midi' }),
  ];

  it('wyłapuje kolor jako kolor, nie jako styl', async () => {
    const { pills } = await localStylist.respond(ask('czarna sukienka', { catalog: colored }));
    expect(pill(pills, 'color')?.value).toBe('czarny');
    expect(pill(pills, 'style')).toBeUndefined();
  });

  it('odrzuca rzeczy w innym kolorze', async () => {
    const { products } = await localStylist.respond(ask('czarna sukienka do 200 zł', { catalog: colored }));
    expect(products!.map(p => p.name)).not.toContain('Czerwona sukienka midi');
  });

  it('zostawia rzeczy, o których kolorze nic nie wiadomo', async () => {
    // "Lniana sukienka midi" is a real Reserved product: brown, and the name
    // does not say so. Dropping it would be claiming it is not black.
    const { products } = await localStylist.respond(ask('czarna sukienka do 200 zł', { catalog: colored }));
    expect(products!.map(p => p.name)).toContain('Lniana sukienka midi');
  });

  it('pokazuje trafione w kolorze przed tymi bez koloru', async () => {
    const { products } = await localStylist.respond(ask('czarna sukienka do 200 zł', { catalog: colored }));
    expect(products![0].name).toBe('Czarna sukienka midi');
  });

  it('liczy w odpowiedzi, ile rzeczy jest w tym kolorze', async () => {
    // The count is the honest part: two results, one of them actually black.
    const { reply } = await localStylist.respond(ask('czarna sukienka do 200 zł', { catalog: colored }));
    expect(reply).toContain('1');
    expect(reply.toLowerCase()).toContain('czarny');
  });

  it('nie dokłada noty o kolorze, gdy o kolor nie pytała', async () => {
    const { reply } = await localStylist.respond(ask('sukienka do 200 zł', { catalog: colored }));
    expect(reply.toLowerCase()).not.toContain('czarny');
  });
});
