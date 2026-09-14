import { useState } from 'react';
import { ArrowLeft, ChevronRight, Pencil, ScanLine, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { useFit, useFits } from '@/lib/fits';
import { ScanFailed } from '@/lib/fitCutout';
import { useCatalog } from '@/lib/catalog/useCatalog';
import { ProductImage } from '@/components/ProductImage';
import { FitPhotoSweep } from '@/components/FitPhotoSweep';

/**
 * One fit: her photos, and underneath them what she had on.
 *
 * This is the view shaped for the thing Antonio described — photos to turn
 * through, and below them the list of what is in them with a way to the shop.
 * Nothing here is social yet, and nothing here needs to change when it becomes
 * so: the same record, the same rows.
 */
export default function FitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { fit, loading } = useFit(id);
  const { remove, scan, clearScan } = useFits();
  const { byId } = useCatalog();
  const [scanning, setScanning] = useState<{ done: number; total: number } | null>(null);
  // Skan jest tym, po co tu weszła, więc jest domyślny — zdjęcia są o jedno
  // kliknięcie dalej, a nie odwrotnie.
  const [showOriginals, setShowOriginals] = useState(false);

  if (!fit) {
    // Nothing to find while the query is pending, and "no such fit" would flash
    // on every cold load of this address.
    if (loading) return null;
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">{t('fitNotFound')}</p>
        <button onClick={() => navigate('/app/fits')} className="mt-4 text-sm underline underline-offset-4">
          {t('goBack')}
        </button>
      </div>
    );
  }

  const day = new Date(fit.createdAt).toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleDelete = async () => {
    if (!window.confirm(t('deleteFitConfirm'))) return;
    await remove(fit.id);
    navigate('/app/fits');
  };

  const rows = fit.items.filter(item => item.label.trim() !== '' || item.productId);

  /**
   * Skan pokazujemy dopiero wtedy, gdy KAŻDE zdjęcie ma swój wycinek. Połowa
   * fitu bez tła i połowa z pokojem w tle wyglądałaby jak awaria, a nie jak
   * obrót — a zdjęcie dołożone po skanie trzeba i tak przeskanować z resztą,
   * bo wyrównanie liczy się ze wszystkich klatek naraz.
   */
  const scanned = fit.photoIds.length > 0 && fit.photoIds.every(photoId => fit.cutouts[photoId]);
  const showingScan = scanned && !showOriginals;
  const frames = showingScan ? fit.photoIds.map(photoId => fit.cutouts[photoId]) : fit.photoIds;

  const handleScan = async () => {
    if (scanning) return;
    setScanning({ done: 0, total: fit.photoIds.length });
    try {
      await scan(fit, (done, total) => setScanning({ done, total }));
      setShowOriginals(false);
    } catch (error) {
      const kind = error instanceof ScanFailed ? error.kind : 'failed';
      toast(kind === 'no-person' ? t('scanNoPerson')
        : kind === 'not-configured' ? t('scanNotConfigured')
        : t('scanFailed'));
    } finally {
      setScanning(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <button
        onClick={() => navigate('/app/fits')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('fits')}
      </button>

      <FitPhotoSweep photoIds={frames} autoplay backdrop={showingScan ? 'studio' : 'plain'} />

      {fit.photoIds.length > 0 && (
        <div className="mt-3">
          {scanned ? (
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setShowOriginals(current => !current)}
                className="text-sm underline underline-offset-4"
              >
                {showingScan ? t('showOriginals') : t('showScan')}
              </button>
              <button
                onClick={() => void clearScan(fit)}
                className="text-xs text-muted-foreground underline underline-offset-4"
              >
                {t('removeScan')}
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => void handleScan()}
                disabled={Boolean(scanning)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium disabled:opacity-60"
              >
                <ScanLine className="w-4 h-4" />
                {scanning ? t('scanning', scanning.done, scanning.total) : t('makeScan')}
              </button>
              {/* Nad przyciskiem byłoby ładniej, pod nim jest uczciwiej: to jest
                  zdanie o tym, że jej zdjęcie wyjeżdża z telefonu, i ma być
                  widoczne bez przewijania, obok tego, co je wysyła. */}
              <p className="text-xs text-muted-foreground mt-2 max-w-prose">{t('scanNotice')}</p>
            </>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mt-5">
        <div className="min-w-0">
          <h1 className="font-display text-2xl truncate">{fit.name}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{day}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => navigate(`/app/fits/${fit.id}/edit`)}
            aria-label={t('editFit')}
            className="p-2 rounded-full hover:bg-card text-muted-foreground"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            aria-label={t('deleteAction')}
            className="p-2 rounded-full hover:bg-card text-muted-foreground"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3">
            {t('whatImWearing')}
          </h2>
          <div className="space-y-2">
            {rows.map((item, index) => {
              const product = item.productId ? byId.get(item.productId) : undefined;

              // A row she typed and nothing more. That is the normal case, not
              // a gap: most of what she wears is not in the catalogue, and
              // saying so plainly beats an empty product card.
              if (!product) {
                return (
                  <div key={`${item.label}-${index}`} className="bg-card rounded-2xl px-4 py-3.5">
                    <p className="text-sm">{item.label}</p>
                  </div>
                );
              }

              return (
                <button
                  key={item.productId}
                  onClick={() => navigate(`/app/product/${item.productId}`)}
                  className="w-full bg-card rounded-2xl p-3 flex items-center gap-3 text-left hover:bg-card/70 transition-colors"
                >
                  <div className="w-12 aspect-[3/4] rounded-lg bg-muted overflow-hidden shrink-0 relative">
                    <ProductImage product={product} fallback="icon" className="absolute inset-0 w-full h-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{product.brand}</p>
                    <p className="text-sm truncate">{item.label.trim() || product.name}</p>
                    <p className="text-sm font-medium">{product.price} PLN</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
