import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { LinkImport } from '@/components/LinkImport';
import { ProductCard } from '@/components/ProductCard';
import { useLanguage } from '@/i18n/LanguageContext';
import { useUserProducts } from '@/lib/catalog/useCatalog';
import type { RawProduct } from '@/lib/catalog/types';

/**
 * The user's own side of the link importer.
 *
 * Half of this already worked: `/admin/import` reads a pasted shop link,
 * checks `robots.txt`, fetches the page with our own User-Agent and parses it,
 * verified against live Reserved, Answear and Sinsay pages. What it lacked was
 * a door for the person the product is for.
 *
 * These products are stored apart from the shared catalogue and never enter
 * the feed or the search results — see `CatalogRepository.addUserProduct`.
 */
export default function AddProduct() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { products, add, remove, loading } = useUserProducts();

  // `LinkImport` hands back a `RawProduct` built with the default source; the
  // id has to carry `user` so nothing downstream can mistake it for a feed.
  const handleAdd = (product: RawProduct) => {
    const mine: RawProduct = {
      ...product,
      source: 'user',
      id: `user:${product.externalId}`,
    };
    void add(mine);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        {t('back')}
      </button>

      <h1 className="font-display text-2xl lg:text-3xl mb-1">{t('addYourOwn')}</h1>
      <p className="text-sm text-muted-foreground mb-8">{t('addYourOwnDesc')}</p>

      <LinkImport onAdd={handleAdd} />

      <h2 className="text-sm font-medium mb-4">{t('addYourOwnTitle')}</h2>
      {products.length === 0 ? (
        !loading && <p className="text-sm text-muted-foreground">{t('addYourOwnEmpty')}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {products.map(product => (
            <div key={product.id} className="relative group">
              <ProductCard product={product} />
              <button
                onClick={() => remove(product.id)}
                className="absolute top-12 left-3 z-20 p-1.5 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                aria-label={t('removeYourOwn')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
