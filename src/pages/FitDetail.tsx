import { ArrowLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useFit, useFits } from '@/lib/fits';
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
  const { remove } = useFits();
  const { byId } = useCatalog();

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

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <button
        onClick={() => navigate('/app/fits')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('fits')}
      </button>

      <FitPhotoSweep photoIds={fit.photoIds} autoplay />

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
