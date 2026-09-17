import type { TranslationKey, TranslationArgs } from '@/i18n/translations';

/**
 * Co warto obejrzeć, zanim produkt z linku wejdzie do katalogu.
 *
 * Ostrzeżenia były wcześniej gotowymi zdaniami po angielsku, wypychanymi wprost
 * z parsera i wyświetlanymi bez tłumaczenia — więc na polskim ekranie, na
 * którym ona dodaje swoje własne rzeczy, stało „no JSON-LD Product on the page
 * — falling back to Open Graph, which is the weaker source".
 *
 * Teraz jest tak, jak ten projekt robi to wszędzie indziej: **silnik nazywa
 * przypadek, interfejs znajduje słowa** — dokładnie ta sama reguła, którą
 * `fetchErrors.ts` stosuje do błędów pobierania. Parser nie zna języka, a
 * dorzucenie nowego ostrzeżenia bez tłumaczenia nie skompiluje się, bo kod musi
 * trafić do `KEYS`.
 */
export type LinkWarning =
  /** Wszystkie rozmiary, które strona wymienia, są opisane jako niedostępne. */
  | { code: 'out-of-stock' }
  /** Brak JSON-LD Product — zostaje Open Graph, czyli słabsze źródło. */
  | { code: 'no-json-ld' }
  /** Żadne ze znalezionych zdjęć nie nadaje się na zdjęcie produktu. */
  | { code: 'no-usable-photo'; rejected: string }
  /** Któreś zdjęcie odpadło, ale inne zostało. */
  | { code: 'skipped-image'; rejected: string }
  /** Strona nie podaje składu materiału. */
  | { code: 'no-fabric' }
  /** Cena w innej walucie niż złotówki. */
  | { code: 'foreign-currency'; currency: string }
  /** Strona nie podaje kategorii. */
  | { code: 'no-category' }
  /** Kategoria odczytana z nazwy produktu, nie podana przez sklep. */
  | { code: 'category-guessed' }
  /** Strona była za duża, żeby przeczytać ją w całości. */
  | { code: 'truncated' };

const KEYS: Record<LinkWarning['code'], TranslationKey> = {
  'out-of-stock': 'linkWarnOutOfStock',
  'no-json-ld': 'linkWarnNoJsonLd',
  'no-usable-photo': 'linkWarnNoPhoto',
  'skipped-image': 'linkWarnSkippedImage',
  'no-fabric': 'linkWarnNoFabric',
  'foreign-currency': 'linkWarnForeignCurrency',
  'no-category': 'linkWarnNoCategory',
  'category-guessed': 'linkWarnCategoryGuessed',
  truncated: 'linkWarnTruncated',
};

/** Klucz tłumaczenia dla ostrzeżenia. Parametry dokłada `warningText`. */
export const linkWarningKey = (warning: LinkWarning): TranslationKey => KEYS[warning.code];

/**
 * Zdanie dla użytkowniczki. Parametry rozdziela `switch`, bo tylko on potrafi
 * zwęzić typ na tyle, żeby `t` dostało argumenty, których wymaga dany klucz.
 */
/** Dokładnie ten kształt, który daje `useLanguage()`. */
type Translate = <K extends TranslationKey>(key: K, ...args: TranslationArgs<K>) => string;

export function warningText(t: Translate, warning: LinkWarning): string {
  const call = t as (key: TranslationKey, ...args: unknown[]) => string;
  switch (warning.code) {
    case 'no-usable-photo':
    case 'skipped-image':
      return call(KEYS[warning.code], warning.rejected);
    case 'foreign-currency':
      return call(KEYS[warning.code], warning.currency);
    default:
      return call(KEYS[warning.code]);
  }
}
