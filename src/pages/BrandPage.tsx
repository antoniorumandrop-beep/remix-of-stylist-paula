import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCatalog } from '@/lib/catalog/useCatalog';
import { ProductCard } from '@/components/ProductCard';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBodyProfile } from '@/lib/profile';
import { splitTopFit } from '@/lib/fit/product';

export default function BrandPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const brandName = decodeURIComponent(id || '');

  const { products, loading } = useCatalog();
  const brandProducts = products.filter(p => p.brand === brandName);
  const { profile } = useBodyProfile();
  const { top: bestMatches, rest: restProducts } = splitTopFit(brandProducts, profile);

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
          {restProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {!loading && brandProducts.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('noProductsFound')}</p>
        )}
      </section>
    </div>
  );
}
