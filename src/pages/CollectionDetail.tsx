import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { sampleCollections } from '@/data/mockData';
import { ProductCard } from '@/components/ProductCard';
import { useLanguage } from '@/i18n/LanguageContext';

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const collection = sampleCollections.find(c => c.id === id);

  if (!collection) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">{t('collectionNotFound')}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm underline underline-offset-4">{t('goBack')}</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        {t('backToSaved')}
      </button>

      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl">{collection.emoji} {collection.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">{collection.items.length} {t('items')}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
        {collection.items.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
