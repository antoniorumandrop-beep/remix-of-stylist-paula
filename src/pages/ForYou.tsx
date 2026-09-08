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

// Social proof is still mock data (reviews live in mockData.ts).
const similarBodiesFeed = getSimilarBodiesBought('', 75, 8);

export default function ForYou() {
  const [tab, setTab] = useState<'foryou' | 'trending'>('foryou');
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { prefs } = useUserPrefs();
  const userName = prefs.name ?? '';
  const { profile, loading: profileLoading } = useBodyProfile();
  const { products } = useCatalog();
  const feedProducts = useMemo(() => [...products].sort(() => Math.random() - 0.5), [products]);
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
        <div className="flex gap-1 bg-card rounded-full p-1">
          <button
            onClick={() => setTab('foryou')}
            className={`px-4 py-2 rounded-full text-sm transition-all ${
              tab === 'foryou' ? 'bg-foreground text-background' : 'text-muted-foreground'
            }`}
          >
            {t('forYou')}
          </button>
          <button
            onClick={() => setTab('trending')}
            className={`px-4 py-2 rounded-full text-sm transition-all ${
              tab === 'trending' ? 'bg-foreground text-background' : 'text-muted-foreground'
            }`}
          >
            {t('trending')}
          </button>
        </div>
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
        <h2 className="font-display text-xl mb-4">
          {tab === 'foryou' ? t('curatedForYou') : t('trendingNow')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {feedProducts.map(product => (
            <ProductCard key={product.id} product={product} onBrandClick={b => navigate(`/app/brand/${encodeURIComponent(b)}`)} />
          ))}
        </div>
      </section>
    </div>
  );
}
