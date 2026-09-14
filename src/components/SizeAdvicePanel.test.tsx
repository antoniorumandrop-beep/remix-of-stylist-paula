import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SizeAdvicePanel } from './SizeAdvicePanel';
import { LanguageProvider } from '@/i18n/LanguageContext';
import type { Product } from '@/lib/catalog/types';
import type { MeasuredProfile } from '@/lib/profile';

/**
 * Reading the shop's own chart made a case real that the generic table hid.
 *
 * The generic table runs to size 50, so some row always fitted and a shortfall
 * never happened. A brand's chart stops where the brand stops grading —
 * Reserved's largest dress size is a 90 cm waist — and a woman who measures
 * more than that gets told "Rozmiar XXL" with nothing else said.
 */
const show = (ui: React.ReactElement) => {
  // Same as the other component tests: the provider reads the stored language
  // and the copy under test is the Polish one, because that is what ships.
  localStorage.setItem('paula-lang', 'pl');
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

const dress = (sizeChart?: Product['sizeChart']): Product => ({
  id: 'test-dress',
  name: 'Lniana sukienka midi',
  brand: 'Reserved',
  price: 229.99,
  fitScore: 0,
  category: 'dresses',
  isSecondHand: false,
  store: 'Reserved',
  sizeChart,
});

const RESERVED: Product['sizeChart'] = [
  { size: 'XS', bust: 82, waist: 64, hips: 90 },
  { size: 'S', bust: 86, waist: 68, hips: 94 },
  { size: 'M', bust: 90, waist: 72, hips: 98 },
  { size: 'L', bust: 96, waist: 78, hips: 104 },
  { size: 'XL', bust: 102, waist: 84, hips: 110 },
  { size: 'XXL', bust: 108, waist: 90, hips: 116 },
];

const body = (over: Partial<MeasuredProfile> = {}): MeasuredProfile => ({
  source: 'measured',
  bust: 106,
  waist: 92,
  hips: 110,
  heightCm: 179,
  ...over,
} as MeasuredProfile);

describe('SizeAdvicePanel', () => {
  it('nazywa rozmiar tak, jak nazywa go sklep', () => {
    show(<SizeAdvicePanel product={dress(RESERVED)} profile={body()} />);
    expect(screen.getByText('Rozmiar XXL')).toBeInTheDocument();
  });

  it('mówi, ile centymetrów zabraknie, gdy rozmiarówka marki się kończy', () => {
    // Waist 92 against Reserved's largest waist of 90.
    show(<SizeAdvicePanel product={dress(RESERVED)} profile={body()} />);
    expect(screen.getByText(/W talii zabraknie około 2 cm/)).toBeInTheDocument();
  });

  it('nie straszy brakiem, gdy rozmiar naprawdę mieści', () => {
    show(<SizeAdvicePanel product={dress(RESERVED)} profile={body({ bust: 86, waist: 68, hips: 94 })} />);
    expect(screen.queryByText(/zabraknie/)).not.toBeInTheDocument();
  });

  it('pisze, z czyjej tabeli to wyszło', () => {
    show(<SizeAdvicePanel product={dress(RESERVED)} profile={body()} />);
    expect(screen.getByText(/tabeli, którą Reserved podaje przy tej rzeczy/)).toBeInTheDocument();
  });

  it('wraca do standardowej tabeli, gdy sklep swojej nie podał', () => {
    show(<SizeAdvicePanel product={dress()} profile={body()} />);
    expect(screen.getByText(/standardowej polskiej tabeli/)).toBeInTheDocument();
  });
});
