import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { getSimilarBodiesBought } from '@/data/mockData';
import { ProductCard } from '@/components/ProductCard';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBodyProfile } from '@/lib/profile';
import { useUserPrefs } from '@/lib/prefs';
import { useCatalog } from '@/lib/catalog/useCatalog';
import { scoreProduct, sortByFit } from '@/lib/fit/product';
import { sessionSeed, shuffle } from '@/lib/shuffle';

/**
 * How much of the feed is rendered at once.
 *
 * The whole catalogue used to go into the DOM in one go. That is survivable
 * with a few dozen fixtures and not with a brand feed of several hundred, and
 * the cost lands on the cheapest phone rather than on the developer's machine.
 * Paging in chunks is the smaller fix; virtualisation only becomes worth its
 * complexity if these pages themselves get long.
 */
const PAGE_SIZE = 24;

export default function ForYou() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { prefs } = useUserPrefs();
  const userName = prefs.name ?? '';
  const { profile, loading: profileLoading } = useBodyProfile();
  const { products } = useCatalog();

  // One seed for the whole browser session, so opening a product and coming
  // back does not rearrange the page underneath her.
  const feedSeed = useMemo(() => sessionSeed(), []);
  const feedProducts = useMemo(() => shuffle(products, feedSeed), [products, feedSeed]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleFeed = useMemo(() => feedProducts.slice(0, visibleCount), [feedProducts, visibleCount]);
  const remaining = feedProducts.length - visibleFeed.length;

  // Social proof is still mock data (reviews live in mockData.ts), but it was
  // being computed once at module load — frozen at import time, before the
  // catalogue existed, and unable to react to anything afterwards.
  const similarBodiesFeed = useMemo(() => getSimilarBodiesBought('', 75, 8), []);
  const topFitProducts = useMemo(
    () => sortByFit(products, profile).filter(p => scoreProduct(p, profile)).slice(0, 8),
    [products, profile],
  );

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl lg:text-3xl">
          {userName ? `${t('hiThere').replace(',', '')} ${userName}` : t('hiThere').replace(',', '')}
        </h1>
        {/* The "Trending" tab is gone rather than hidden behind a flag: it
            rendered the same list as "For You" with a different heading, and
            nothing in the catalogue records popularity or recency, so there is
            no honest way to fill it. It comes back when the "did it fit?" loop
            has enough data to rank by. */}
      </div>

      <section className="mb-12">
        <h2 className="font-display text-xl mb-4">{t('bestForProportions')}</h2>
        {profileLoading ? null : profile ? (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
            {topFitProducts.map(product => (
              <div key={product.id} className="min-w-[180px] max-w-[180px]">
                <ProductCard product={product} onBrandClick={b => navigate(`/app/brand/${encodeURIComponent(b)}`)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-2xl p-6">
            <p className="text-sm text-muted-foreground">{t('fitNoProfile')}</p>
            <button
              onClick={() => navigate('/onboarding')}
              className="mt-3 text-sm font-medium underline underline-offset-4"
            >
              {t('addMeasurements')}
            </button>
          </div>
        )}
      </section>

      {similarBodiesFeed.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4" />
            <h2 className="font-display text-xl">{t('similarBodiesBought')}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t('similarBodiesBoughtDesc')}</p>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
            {similarBodiesFeed.map(({ product, buyersCount }) => (
              <div key={product.id} className="min-w-[180px] max-w-[180px] flex flex-col gap-2">
                <ProductCard product={product} onBrandClick={b => navigate(`/app/brand/${encodeURIComponent(b)}`)} />
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground px-2">
                  <Users className="w-3 h-3" />
                  {t('buyersWithSimilarBody', buyersCount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-xl mb-4">{t('curatedForYou')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {visibleFeed.map(product => (
            <ProductCard key={product.id} product={product} onBrandClick={b => navigate(`/app/brand/${encodeURIComponent(b)}`)} />
          ))}
        </div>

        {remaining > 0 && (
          <div className="flex justify-center mt-8">
            <button
              type="button"
              onClick={() => setVisibleCount(count => count + PAGE_SIZE)}
              className="px-6 py-3 rounded-full border border-border text-sm font-medium hover:bg-card transition-colors"
            >
              {t('showMore', remaining)}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
