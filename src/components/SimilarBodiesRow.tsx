import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { getSimilarBodiesBought } from '@/data/mockData';
import { ProductCard } from '@/components/ProductCard';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCatalog } from '@/lib/catalog/useCatalog';

/**
 * "What people with proportions like yours added to their wardrobe."
 *
 * Nobody has bought anything through Paula. The row is built from the review
 * fixtures, so every number in it is invented, and it has to say so — a made-up
 * claim about other shoppers is named outright in Annex I of the Unfair
 * Commercial Practices Directive.
 *
 * It lives in one component because it did not: the product page and the feed
 * each had their own copy of the markup, the demo marker was added to one of
 * them, and the other kept presenting the same fixtures as fact. So this is now
 * the only file allowed to touch `getSimilarBodiesBought`, and a test says so.
 */
export function SimilarBodiesRow({
  excludeProductId = '',
  limit = 8,
  layout = 'scroll',
}: {
  excludeProductId?: string;
  limit?: number;
  layout?: 'scroll' | 'grid';
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { products } = useCatalog();

  // Computed here rather than at module load: it used to be frozen at import
  // time, before the catalogue existed.
  //
  // Kept to what Paula may recommend, which is where the mock catalogue stops
  // once real clothes arrive — see `useCatalog`. The row was the last place
  // showing the pictureless demo rows, eight at a time, under a heading about
  // what other women bought.
  const shown = useMemo(() => new Set(products.map(p => p.id)), [products]);
  const rows = useMemo(
    () => getSimilarBodiesBought(excludeProductId, 75, limit).filter(r => shown.has(r.product.id)),
    [excludeProductId, limit, shown],
  );

  if (rows.length === 0) return null;

  const wrapper =
    layout === 'grid'
      ? 'grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6'
      : 'flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide';
  const tile = layout === 'grid' ? 'flex flex-col gap-2' : 'min-w-[180px] max-w-[180px] flex flex-col gap-2';

  return (
    <section className="mt-16 mb-12 first:mt-0">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4" />
        <h2 className="font-display text-xl">{t('similarBodiesBought')}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{t('similarBodiesBoughtDesc')}</p>
      <p className="text-xs text-muted-foreground mb-4">{t('similarBodiesDemoNote')}</p>

      <div className={wrapper}>
        {rows.map(({ product, buyersCount }) => (
          <div key={product.id} className={tile}>
            <ProductCard product={product} onBrandClick={b => navigate(`/app/brand/${encodeURIComponent(b)}`)} />
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground px-2">
              <Users className="w-3 h-3" />
              {t('buyersWithSimilarBody', buyersCount)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
