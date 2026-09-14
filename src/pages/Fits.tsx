import { Camera, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useFits, useFitPhotoUrls } from '@/lib/fits';
import { useCatalog } from '@/lib/catalog/useCatalog';
import { ProductImage } from '@/components/ProductImage';
import type { Outfit } from '@/lib/wardrobe';

/**
 * Her own fits.
 *
 * Deliberately not a feed and not anything social: with two people using this,
 * a channel of other people's fits would be an empty shelf. What it is instead
 * is the same record shaped so that showing it to someone later needs no
 * rewrite — photos, a name, and what she had on.
 */

/** The cover: her first photo, or the products if this fit predates photos. */
function FitCover({ fit }: { fit: Outfit }) {
  const cover = fit.photoIds.slice(0, 1);
  const urls = useFitPhotoUrls(cover);
  const { byId } = useCatalog();
  const url = cover.length > 0 ? urls[cover[0]] : undefined;

  if (url) {
    return <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />;
  }

  const products = fit.items
    .map(item => (item.productId ? byId.get(item.productId) : undefined))
    .filter(Boolean)
    .slice(0, 4);

  if (products.length > 0) {
    return (
      <div className="absolute inset-0 grid grid-cols-2 gap-px">
        {products.map(product => (
          <ProductImage key={product!.id} product={product!} fallback="icon" className="relative w-full h-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
      <Camera className="w-6 h-6" />
    </div>
  );
}

export default function Fits() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { fits, loading } = useFits();

  const day = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-GB', { day: 'numeric', month: 'long' });

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 lg:py-10">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <Camera className="w-6 h-6" />
          <h1 className="font-display text-3xl">{t('fits')}</h1>
        </div>
        <button
          onClick={() => navigate('/app/fits/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t('addFit')}
        </button>
      </div>
      <p className="text-muted-foreground mb-8">{t('fitsDesc')}</p>

      {loading ? null : fits.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/50 p-10 text-center">
          <p className="text-sm text-muted-foreground mb-5">{t('emptyFits')}</p>
          <button
            onClick={() => navigate('/app/fits/new')}
            className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium"
          >
            {t('addFit')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {fits.map(fit => (
            <button
              key={fit.id}
              onClick={() => navigate(`/app/fits/${fit.id}`)}
              className="text-left group"
            >
              <div className="aspect-[3/4] rounded-2xl bg-card relative overflow-hidden">
                <FitCover fit={fit} />
              </div>
              <div className="mt-2.5 px-1">
                <p className="text-sm truncate">{fit.name}</p>
                <p className="text-xs text-muted-foreground">
                  {day(fit.createdAt)} · {t('fitItemsCount', fit.items.length)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
