import { useState } from 'react';
import { Check, Heart, Link as LinkIcon, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ProductImage } from '@/components/ProductImage';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSaved } from '@/lib/saved';
import { useCollections } from '@/lib/collections';
import type { Product } from '@/lib/catalog/types';

/**
 * One place to put a product away, opened from anywhere a product is shown.
 *
 * What it replaces on the product card was a menu that opened another menu:
 * heart → "Add to collection" → the list. Three clicks to reach the thing the
 * heart is for, and the same interaction had to be rebuilt on every screen
 * that wanted it. This is one component, so the wardrobe and the product page
 * get the same gesture for free.
 */
export function SaveSheet({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLanguage();
  const { isSaved, toggle } = useSaved();
  const { collections, contains, addProduct, removeProduct, createWith } = useCollections();
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState('');

  const saved = isSaved(product.id);

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await createWith(name, product.id);
    setNewName('');
    setNaming(false);
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/app/product/${product.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(t('linkCopied'));
    } catch {
      // Clipboard access is refused in plenty of ordinary situations (an
      // insecure origin, a permission the browser never granted). Saying
      // nothing would look like the button is broken.
      toast(url);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">{t('saveSheetTitle')}</DialogTitle>
          <DialogDescription className="sr-only">{t('saveToCollectionHint')}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <div className="w-12 aspect-[3/4] rounded-lg bg-muted overflow-hidden shrink-0 relative">
            <ProductImage product={product} fallback="icon" className="absolute inset-0 w-full h-full" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{product.brand}</p>
            <p className="text-sm truncate">{product.name}</p>
            <p className="text-sm font-medium">{product.price} PLN</p>
          </div>
        </div>

        <button
          onClick={() => toggle(product.id)}
          className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl hover:bg-card transition-colors text-left"
        >
          <Heart className={`w-4 h-4 shrink-0 ${saved ? 'fill-foreground' : ''}`} />
          <span className="flex-1 text-sm">{t('saved')}</span>
          {saved && <Check className="w-4 h-4 shrink-0" />}
        </button>

        <div className="border-t border-border pt-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground px-3 mb-1">
            {t('collections')}
          </p>
          <div className="max-h-48 overflow-y-auto">
            {collections.map(col => {
              const inside = contains(col.id, product.id);
              return (
                <button
                  key={col.id}
                  onClick={() =>
                    inside
                      ? removeProduct({ id: col.id, productId: product.id })
                      : addProduct({ id: col.id, productId: product.id })
                  }
                  className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl hover:bg-card transition-colors text-left"
                >
                  <span className="w-4 shrink-0 text-center">{col.emoji ?? '·'}</span>
                  <span className="flex-1 text-sm truncate">{col.name}</span>
                  {inside && <Check className="w-4 h-4 shrink-0" />}
                </button>
              );
            })}
          </div>

          {naming ? (
            <form onSubmit={submitNew} className="flex items-center gap-2 px-3 pt-2">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={t('collectionNamePlaceholder')}
                className="flex-1 min-w-0 bg-card rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
              />
              <button
                type="submit"
                disabled={!newName.trim()}
                className="shrink-0 p-2 rounded-xl bg-foreground text-background disabled:opacity-40"
                aria-label={t('createAction')}
              >
                <Check className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setNaming(true)}
              className="flex items-center gap-3 w-full py-2.5 px-3 rounded-xl hover:bg-card transition-colors text-left"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="text-sm">{t('newCollection')}</span>
            </button>
          )}
        </div>

        <div className="border-t border-border pt-3 flex items-center gap-2">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-3 py-2 rounded-full text-sm text-muted-foreground hover:bg-card transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
            {t('copyLink')}
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="ml-auto px-5 py-2 rounded-full bg-foreground text-background text-sm font-medium"
          >
            {t('doneAction')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
