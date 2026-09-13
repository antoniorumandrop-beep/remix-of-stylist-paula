import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductCard } from '@/components/ProductCard';
import { Plus, Bell, Heart, Check, FolderOpen, Link2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSaved } from '@/lib/saved';
import { useCatalog } from '@/lib/catalog/useCatalog';
import { useCollections } from '@/lib/collections';
import { ProductImage } from '@/components/ProductImage';

export default function Saved() {
  const [tab, setTab] = useState<'saved' | 'collections'>('saved');
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { ids, loading } = useSaved();
  const { byId } = useCatalog();
  const { collections, loading: collectionsLoading, createWith } = useCollections();
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState('');

  const submitNewCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await createWith(name);
    setNewName('');
    setNaming(false);
  };
  const savedProducts = ids.map(id => byId.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof byId.get>>[];

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
        {/* Price alerts need a backend to watch prices; there is none yet. */}
        <button
          type="button"
          disabled
          title={t('featureNotReady')}
          className="px-4 py-2 bg-foreground text-background rounded-full text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('enable')}
        </button>
      </div>

      <button
        onClick={() => navigate('/app/add')}
        disabled={!import.meta.env.DEV}
        title={import.meta.env.DEV ? undefined : t('featureNotReady')}
        className="w-full bg-card rounded-xl p-4 mb-6 flex items-center gap-3 text-left hover:bg-card/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-card"
      >
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Link2 className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{t('addYourOwn')}</p>
          <p className="text-xs text-muted-foreground">{t('addYourOwnDesc')}</p>
        </div>
      </button>

      {tab === 'saved' ? (
        savedProducts.length === 0 && !loading ? (
          <div className="text-center py-16">
            <Heart className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('savedEmpty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {savedProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
            {naming ? (
              <form
                onSubmit={submitNewCollection}
                className="aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 p-4"
              >
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onBlur={() => { if (!newName.trim()) setNaming(false); }}
                  placeholder={t('collectionNamePlaceholder')}
                  className="w-full bg-card rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-foreground/10"
                />
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="px-4 py-2 rounded-full bg-foreground text-background text-xs font-medium disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {t('createAction')}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setNaming(true)}
                className="aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-foreground/30 transition-colors"
              >
                <Plus className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('newCollection')}</span>
              </button>
            )}
            {collections.map(col => {
              const cover = col.productIds.slice(0, 4).map(id => byId.get(id)).filter(Boolean);
              return (
                <div
                  key={col.id}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/app/collection/${col.id}`)}
                >
                  <div className="aspect-square rounded-2xl bg-card overflow-hidden mb-3 relative">
                    {/* One item gets the whole tile, two get a column each. A
                        fixed 2×2 left half the cover empty on a new collection. */}
                    <div
                      className={`grid gap-0.5 p-3 h-full ${
                        cover.length <= 1 ? 'grid-cols-1' : 'grid-cols-2'
                      }`}
                    >
                      {(cover.length === 0 ? [null] : cover).map((p, i) => (
                        <div key={i} className="bg-muted rounded-lg overflow-hidden relative">
                          {p && <ProductImage product={p} className="absolute inset-0 w-full h-full" />}
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm font-medium">
                    {col.emoji ? `${col.emoji} ` : ''}{col.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('itemsCount', col.productIds.length)}</p>
                </div>
              );
            })}
          </div>
          {collections.length === 0 && !collectionsLoading && !naming && (
            <div className="text-center py-10">
              <FolderOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t('collectionsEmpty')}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
