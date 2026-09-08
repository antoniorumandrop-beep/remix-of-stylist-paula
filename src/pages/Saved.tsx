import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { allProducts, sampleCollections } from '@/data/mockData';
import { ProductCard } from '@/components/ProductCard';
import { Plus, Bell } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

export default function Saved() {
  const [tab, setTab] = useState<'saved' | 'collections'>('saved');
  const navigate = useNavigate();
  const savedProducts = allProducts.slice(0, 8);
  const { t } = useLanguage();

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl lg:text-3xl">{t('saved')}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/alerts')}
            className="p-2 rounded-full hover:bg-card transition-colors relative"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-foreground rounded-full" />
          </button>
          <div className="flex gap-1 bg-card rounded-full p-1">
            <button
              onClick={() => setTab('saved')}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                tab === 'saved' ? 'bg-foreground text-background' : 'text-muted-foreground'
              }`}
            >
              {t('allItems')}
            </button>
            <button
              onClick={() => setTab('collections')}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                tab === 'collections' ? 'bg-foreground text-background' : 'text-muted-foreground'
              }`}
            >
              {t('collections')}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">{t('priceDropAlerts')}</p>
            <p className="text-xs text-muted-foreground">{t('getNotifiedSale')}</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-foreground text-background rounded-full text-xs font-medium hover:opacity-90 transition-opacity">
          {t('enable')}
        </button>
      </div>

      {tab === 'saved' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {savedProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
          <button className="aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-muted-foreground transition-colors">
            <Plus className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('newCollection')}</span>
          </button>
          {sampleCollections.map(col => (
            <div
              key={col.id}
              className="group cursor-pointer"
              onClick={() => navigate(`/app/collection/${col.id}`)}
            >
              <div className="aspect-square rounded-2xl bg-card overflow-hidden mb-3 relative">
                <div className="grid grid-cols-2 gap-0.5 p-3 h-full">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="bg-muted rounded-lg" />
                  ))}
                </div>
              </div>
              <p className="text-sm font-medium">
                {col.emoji} {col.name}
              </p>
              <p className="text-xs text-muted-foreground">{col.items.length} {t('items')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
