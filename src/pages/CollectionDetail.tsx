import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Pencil, Trash2, X } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCollections } from '@/lib/collections';
import { useCatalog } from '@/lib/catalog/useCatalog';

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { collections, loading, rename, remove, removeProduct } = useCollections();
  const { byId } = useCatalog();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');

  const collection = collections.find(c => c.id === id);

  if (!collection) {
    // While the query is still pending there is nothing to find yet, and
    // "collection not found" would flash on every cold load of this address.
    if (loading) return null;
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">{t('collectionNotFound')}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm underline underline-offset-4">{t('goBack')}</button>
      </div>
    );
  }

  const products = collection.productIds.map(pid => byId.get(pid)).filter(Boolean);

  const submitRename = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = draftName.trim();
    if (name) await rename({ id: collection.id, name });
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(t('deleteCollectionConfirm'))) return;
    await remove(collection.id);
    navigate('/app/saved');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        {t('backToSaved')}
      </button>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          {editing ? (
            <form onSubmit={submitRename} className="flex items-center gap-2">
              <input
                autoFocus
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                className="font-display text-2xl lg:text-3xl bg-card rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-foreground/10"
              />
              <button type="submit" disabled={!draftName.trim()} className="p-2 rounded-full hover:bg-card disabled:opacity-40" aria-label={t('renameAction')}>
                <Check className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setEditing(false)} className="p-2 rounded-full hover:bg-card" aria-label={t('cancel')}>
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <h1 className="font-display text-2xl lg:text-3xl truncate">
              {collection.emoji ? `${collection.emoji} ` : ''}{collection.name}
            </h1>
          )}
          <p className="text-sm text-muted-foreground mt-1">{t('itemsCount', collection.productIds.length)}</p>
        </div>

        {!editing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => { setDraftName(collection.name); setEditing(true); }}
              className="p-2 rounded-full hover:bg-card transition-colors"
              aria-label={t('renameAction')}
            >
              <Pencil className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-full hover:bg-card transition-colors"
              aria-label={t('deleteCollection')}
            >
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">{t('collectionEmpty')}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {products.map(product => (
            <div key={product.id} className="relative group">
              <ProductCard product={product} />
              {/* Below the fit badge at top-3 left-3, clear of the heart at
                  top-3 right-3, and inside the image rather than the caption. */}
              <button
                onClick={() => removeProduct({ id: collection.id, productId: product.id })}
                className="absolute top-12 left-3 z-20 p-1.5 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                aria-label={t('removeFromCollection')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
