import { useRef, useState } from 'react';
import { Camera, Info, Loader2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { measureFromPhoto, type PhotoMeasureError } from '@/lib/body/photoMeasure';
import { anchorToWaist, type ClothingMeasurements } from '@/lib/body/measurements';

/**
 * Pomiar ze zdjęcia — uzupełnienie ścieżki z taśmą, nigdy jej zamiennik.
 *
 * **Jedna liczba przychodzi z taśmy: talia.** Zmierzone na dwóch ciałach
 * 2026-09-13: model trafia proporcje ciała, ale myli się co do jego rozmiaru —
 * o 10,6 cm na osobie oddalonej od średniej, i to na wszystkich trzech obwodach
 * naraz. Talia z taśmy mówi, o ile się pomylił, i o tyle przesuwamy resztę;
 * biust i biodra wychodzą wtedy w granicach 0,2 cm. Talia jest kotwicą, bo to
 * jedyny obwód, który człowiek znajduje na sobie bez pomyłki — a biust i biodra
 * to właśnie te, których samemu porządnie się nie zmierzy.
 *
 * Dwie rzeczy w tym pliku są wymogiem, nie decyzją graficzną:
 *
 * - **Komunikat AI Act stoi nad przyciskiem wyboru pliku.** Art. 50 ust. 3
 *   wymaga, żeby człowiek wiedział, że staje przed systemem rozpoznającym
 *   cechy z obrazu, zanim to nastąpi. Po wgraniu jest za późno, a w regulaminie
 *   się nie liczy.
 * - **Zdanie o tym, że taśma jest dokładniejsza, zostaje na ekranie.** Bo jest
 *   prawdziwe (5,7% wobec 5–8 cm MAE) i bez niego nowsze wygląda na lepsze.
 *
 * Zdjęcie żyje wyłącznie w pamięci karty — patrz `docs/photo-measurement.md`.
 */

const ERROR_KEY: Record<PhotoMeasureError, string> = {
  'not-configured': 'photoErrNotConfigured',
  'no-dev-server': 'photoErrNoDevServer',
  'no-person': 'photoErrNoPerson',
  incomplete: 'photoErrIncomplete',
  'bad-file': 'photoErrBadFile',
  'bad-format': 'photoErrBadFormat',
  failed: 'photoErrFailed',
};

interface Props {
  /** Wywoływane dopiero, gdy użytkowniczka potwierdzi odczytane wymiary. */
  onMeasured: (m: ClothingMeasurements & Record<'bust' | 'waist' | 'hips', number>) => void;
}

/** Obwód talii poza tym zakresem to literówka albo cale wzięte za centymetry. */
const WAIST_RANGE = { min: 40, max: 200 };

type State =
  | { phase: 'idle' }
  | { phase: 'working' }
  | { phase: 'error'; code: PhotoMeasureError }
  | { phase: 'done'; measurements: ClothingMeasurements & Record<'bust' | 'waist' | 'hips', number> };

export function PhotoMeasure({ onMeasured }: Props) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ phase: 'idle' });
  const [waist, setWaist] = useState('');
  const waistCm = Number(waist);
  const waistReady = Number.isFinite(waistCm)
    && waistCm >= WAIST_RANGE.min
    && waistCm <= WAIST_RANGE.max;

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Wyczyszczenie inputa od razu: bez tego przeglądarka trzyma uchwyt do
    // pliku aż do następnego wyboru, a wybranie tego samego zdjęcia drugi raz
    // nie odpala zdarzenia.
    event.target.value = '';
    if (!file) return;

    setState({ phase: 'working' });
    const result = await measureFromPhoto(file);
    if (result.status === 'error') {
      if (result.detail) console.warn('[photo-measure]', result.code, result.detail);
      setState({ phase: 'error', code: result.code });
      return;
    }
    const anchored = anchorToWaist(result.measurements, waistCm) as typeof result.measurements;
    setState({ phase: 'done', measurements: anchored });
  }

  // Poza serwerem deweloperskim nie ma czym tego policzyć, więc karta nie
  // prosi o zdjęcie i nie pokazuje noty o AI Act — ta nota mówi, że zdjęcie
  // staje przed systemem rozpoznającym cechy z obrazu, a tutaj nic takiego by
  // się nie stało. Zostaje sama nazwa funkcji i zdanie dlaczego jej nie ma.
  if (!import.meta.env.DEV) {
    return (
      <div className="border border-border rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Camera className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">{t('photoMeasure')}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t('photoErrNoDevServer')}</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-3 mb-2">
        <Camera className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium">{t('photoMeasure')}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-1">{t('photoMeasureIntro')}</p>
      <p className="text-xs text-muted-foreground mb-4">{t('photoMeasureTapeIsBetter')}</p>

      {/* AI Act art. 50 ust. 3 — nad przyciskiem, nie pod nim. */}
      <div className="flex gap-2.5 bg-card rounded-xl p-3 mb-4">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground leading-relaxed">{t('photoAiActNotice')}</p>
      </div>

      {/* Kotwica z taśmy. Bez niej zdjęcie daje liczby potrafiące być o 10 cm
          obok, więc przycisk wyboru pliku jest do tego czasu zablokowany. */}
      <label className="flex items-center justify-between gap-3 mb-4">
        <span className="text-sm">
          {t('photoWaistAnchor')}
          <span className="block text-xs text-muted-foreground mt-0.5">{t('photoWaistWhy')}</span>
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            inputMode="numeric"
            aria-label={t('photoWaistAnchor')}
            value={waist}
            onChange={e => setWaist(e.target.value)}
            className="w-20 px-3 py-2 bg-card rounded-xl text-center text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
          />
          <span className="text-xs text-muted-foreground">cm</span>
        </span>
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
        data-testid="photo-input"
      />

      {state.phase === 'done' ? (
        <div>
          <div className="text-xs text-muted-foreground mb-2">{t('photoResult')}</div>
          <div className="flex gap-4 text-sm mb-4">
            <span>{t('bust')} <span className="font-medium">{state.measurements.bust} cm</span></span>
            <span>{t('waist')} <span className="font-medium">{state.measurements.waist} cm</span></span>
            <span>{t('hips')} <span className="font-medium">{state.measurements.hips} cm</span></span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onMeasured(state.measurements)}
              className="px-4 py-2.5 rounded-xl bg-foreground text-background text-sm"
            >
              {t('photoUseResult')}
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl border border-border text-sm"
            >
              {t('photoRetake')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            disabled={state.phase === 'working' || !waistReady}
            onClick={() => inputRef.current?.click()}
            className="w-full px-4 py-3 rounded-xl border border-border text-sm hover:bg-card transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {state.phase === 'working' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {state.phase === 'working' ? t('photoMeasuring') : t('photoPick')}
          </button>
          {!waistReady && state.phase !== 'working' && (
            <p className="text-xs text-muted-foreground mt-3">{t('photoWaistFirst')}</p>
          )}
          {state.phase === 'error' && (
            <p role="alert" className="text-xs text-muted-foreground mt-3">
              {t(ERROR_KEY[state.code] as Parameters<typeof t>[0])}
            </p>
          )}
        </>
      )}
    </div>
  );
}
