import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, TrendingDown, Tag } from 'lucide-react';
import { allProducts } from '@/data/mockData';
import { useLanguage } from '@/i18n/LanguageContext';

const mockAlerts = [
  {
    id: '1',
    productId: '1',
    product: allProducts[0],
    type: 'price_drop' as const,
    oldPrice: 189,
    newPrice: 149,
    date: '2026-03-30',
    read: false,
  },
  {
    id: '2',
    productId: '4',
    product: allProducts[3],
    type: 'price_drop' as const,
    oldPrice: 499,
    newPrice: 399,
    date: '2026-03-28',
    read: false,
  },
  {
    id: '3',
    productId: '7',
    product: allProducts[6],
    type: 'back_in_stock' as const,
    oldPrice: 120,
    newPrice: 120,
    date: '2026-03-25',
    read: true,
  },
];

export default function Alerts() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        {t('back')}
      </button>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl lg:text-3xl">{t('alerts')}</h1>
        <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
          <BellOff className="w-4 h-4" />
          {t('manage')}
        </button>
      </div>

      {mockAlerts.length > 0 ? (
        <div className="space-y-3">
          {mockAlerts.map(alert => (
            <button
              key={alert.id}
              onClick={() => navigate(`/app/product/${alert.productId}`)}
              className={`w-full text-left flex items-center gap-4 p-4 rounded-xl transition-colors ${
                alert.read ? 'bg-card' : 'bg-card ring-1 ring-foreground/5'
              } hover:bg-card/80`}
            >
              <div className="w-14 h-18 rounded-lg bg-muted flex-shrink-0 aspect-[3/4]" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {alert.type === 'price_drop' ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                      <TrendingDown className="w-3 h-3" />
                      {t('priceDrop')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                      <Tag className="w-3 h-3" />
                      {t('backInStock')}
                    </span>
                  )}
                  {!alert.read && <span className="w-1.5 h-1.5 rounded-full bg-foreground" />}
                </div>
                <p className="text-sm font-medium truncate">{alert.product.name}</p>
                <p className="text-xs text-muted-foreground">{alert.product.brand}</p>
                {alert.type === 'price_drop' && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs line-through text-muted-foreground">{alert.oldPrice} PLN</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">{alert.newPrice} PLN</span>
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">{alert.date}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('noAlertsYet')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('saveItemsNotified')}</p>
        </div>
      )}
    </div>
  );
}
