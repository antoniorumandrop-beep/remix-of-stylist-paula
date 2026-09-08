import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { allProducts } from '@/data/mockData';
import { ProductCard } from '@/components/ProductCard';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBodyProfile } from '@/lib/profile';
import { scoreProduct, sortByFit } from '@/lib/fit/product';

export default function BrandPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const brandName = decodeURIComponent(id || '');

  const brandProducts = allProducts.filter(p => p.brand === brandName);
  const { profile } = useBodyProfile();
  const topFit = sortByFit(brandProducts, profile).filter(p => scoreProduct(p, profile));
  const bestMatches = topFit.slice(0, 4);
  const restProducts = topFit.slice(4);

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-card">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-2xl lg:text-3xl">{brandName}</h1>
      </div>

      {bestMatches.length > 0 && (
        <section className="mb-12">
          <h2 className="font-display text-xl mb-4">{t('bestMatchesProportions')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {bestMatches.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-xl mb-4">{t('allProducts')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {(restProducts.length > 0 ? restProducts : brandProducts).map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {brandProducts.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('noProductsFound')}</p>
        )}
      </section>
    </div>
  );
}
