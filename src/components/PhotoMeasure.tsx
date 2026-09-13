import { useRef, useState } from 'react';
import { Camera, Info, Loader2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { measureFromPhoto, type PhotoMeasureError } from '@/lib/body/photoMeasure';
import type { ClothingMeasurements } from '@/lib/body/measurements';

/**
 * Pomiar ze zdjęcia — uzupełnienie ścieżki z taśmą, nigdy jej zamiennik.
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
  failed: 'photoErrFailed',
};

interface Props {
  /** Wywoływane dopiero, gdy użytkowniczka potwierdzi odczytane wymiary. */
  onMeasured: (m: ClothingMeasurements & Record<'bust' | 'waist' | 'hips', number>) => void;
}

type State =
  | { phase: 'idle' }
  | { phase: 'working' }
  | { phase: 'error'; code: PhotoMeasureError }
  | { phase: 'done'; measurements: ClothingMeasurements & Record<'bust' | 'waist' | 'hips', number> };

export function PhotoMeasure({ onMeasured }: Props) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ phase: 'idle' });

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
    setState({ phase: 'done', measurements: result.measurements });
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

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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
            disabled={state.phase === 'working'}
            onClick={() => inputRef.current?.click()}
            className="w-full px-4 py-3 rounded-xl border border-border text-sm hover:bg-card transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {state.phase === 'working' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {state.phase === 'working' ? t('photoMeasuring') : t('photoPick')}
          </button>
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
