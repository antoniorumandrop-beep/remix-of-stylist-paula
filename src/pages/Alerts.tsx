import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, Info } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSaved } from '@/lib/saved';
import { useCatalog } from '@/lib/catalog/useCatalog';
import { ProductImage } from '@/components/ProductImage';

/**
 * What was here: three invented price drops, each with the old price struck
 * through and the new one in green.
 *
 * That is not a placeholder like the demo reference price — it is the one
 * thing this project has written down as forbidden. Without 30 days of price
 * history for a product we may not show a struck-through price or a sale
 * badge at all (dyrektywa Omnibus, and `price_history` is in the schema draft
 * precisely for it). The "Enable" button on /app/saved has been honestly
 * disabled the whole time; the page behind the bell next to it was not.
 *
 * So the invented drops are gone. What stays is true: the saved pieces and the
 * price we have for them today, with the reason tracking is not running.
 */
export default function Alerts() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { ids, loading } = useSaved();
  const { byId } = useCatalog();
  const watching = ids.map(id => byId.get(id)).filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        {t('back')}
      </button>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl lg:text-3xl">{t('alerts')}</h1>
        <button
          type="button"
          disabled
          title={t('featureNotReady')}
          className="text-sm text-muted-foreground flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <BellOff className="w-4 h-4" />
          {t('manage')}
          <span className="text-[10px] uppercase tracking-wide">({t('featureNotReady')})</span>
        </button>
      </div>

      <div className="bg-card rounded-xl p-5 mb-8 flex gap-3">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{t('alertsNotRunning')}</p>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('alertsNotRunningWhy')}</p>
        </div>
      </div>

      {watching.length === 0 ? (
        !loading && (
          <div className="text-center py-16">
            <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('noAlertsYet')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('saveItemsNotified')}</p>
          </div>
        )
      ) : (
        <>
          <h2 className="text-sm font-medium mb-1">{t('alertsWatchlist')}</h2>
          <p className="text-xs text-muted-foreground mb-4">{t('alertsWatchlistNote')}</p>
          <div className="space-y-3">
            {watching.map(product => (
              <button
                key={product.id}
                onClick={() => navigate(`/app/product/${product.id}`)}
                className="w-full text-left flex items-center gap-4 p-4 rounded-xl bg-card hover:bg-card/80 transition-colors"
              >
                <div className="w-14 rounded-lg bg-muted shrink-0 aspect-[3/4] overflow-hidden">
                  <ProductImage product={product} className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.brand}</p>
                </div>
                {/* One price, the current one. No strike-through, no badge. */}
                <span className="text-sm font-medium shrink-0">{product.price} PLN</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
