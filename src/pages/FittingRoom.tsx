import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shirt, Plus, Trash2, Check, X, Sparkles, Heart } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useWardrobe } from '@/lib/wardrobe';
import { useCatalog } from '@/lib/catalog/useCatalog';
import { useFitFeedback } from '@/lib/fitFeedback';
import { dueForFeedback } from '@/lib/feedbackQueue';
import { FitFeedbackForm } from '@/components/FitFeedbackForm';
import { ProductImage } from '@/components/ProductImage';
import { SaveSheet } from '@/components/SaveSheet';

export default function FittingRoom() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { items, pending, outfits, addItem, dismissPending, removeItem, incWear, createOutfit, deleteOutfit } = useWardrobe();
  const [tab, setTab] = useState<'items' | 'outfits'>('items');
  const [saveFor, setSaveFor] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [outfitName, setOutfitName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const { all: feedback, forProduct } = useFitFeedback();

  const { byId } = useCatalog();
  const wardrobeProducts = useMemo(
    () => items.map(i => ({ ...i, product: byId.get(i.productId) })).filter(i => i.product),
    [items, byId],
  );
  const pendingProducts = useMemo(
    () => pending.map(p => ({ ...p, product: byId.get(p.productId) })).filter(p => p.product),
    [pending, byId],
  );

  /**
   * The things still missing an answer, oldest first. Capped at four: the row
   * is a reminder, not a backlog to work through, and a wall of them would be
   * the nagging this product does not do.
   */
  const due = useMemo(() => {
    const answered = new Set(feedback.map(f => f.productId));
    return dueForFeedback(items, answered)
      .map(i => ({ ...i, product: byId.get(i.productId) }))
      .filter(i => i.product)
      .slice(0, 4);
  }, [items, feedback, byId]);

  /**
   * The form renders below the whole grid, so opening it from the row at the
   * top of the screen left it out of sight and the click looked like it had
   * done nothing. Keyed on the product, not on every render — otherwise the
   * page would jump under her hand each time she taps an answer.
   */
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (feedbackFor) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [feedbackFor]);

  const togglePick = (id: string) =>
    setPicked(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const saveOutfit = () => {
    if (picked.length < 2 || !outfitName.trim()) return;
    createOutfit(outfitName.trim(), picked);
    setBuilding(false);
    setOutfitName('');
    setPicked([]);
    setTab('outfits');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 lg:py-10">
      <div className="flex items-center gap-3 mb-2">
        <Shirt className="w-6 h-6" />
        <h1 className="font-display text-3xl">{t('myWardrobe')}</h1>
      </div>
      <p className="text-muted-foreground mb-8">{t('wardrobeDesc')}</p>

      {/* Pending confirmations */}
      {pendingProducts.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-3">{t('pendingPurchases')}</h2>
          <div className="space-y-2">
            {pendingProducts.map(({ product }) => (
              <div key={product!.id} className="bg-card rounded-2xl p-4 flex items-center gap-4">
                <ProductImage product={product!} className="w-14 h-14 rounded-xl shrink-0 relative overflow-hidden" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product!.name}</p>
                  <p className="text-xs text-muted-foreground">{product!.brand} · {t('didYouBuyThis')}</p>
                </div>
                <button
                  onClick={() => addItem(product!.id)}
                  className="px-4 py-2 rounded-full bg-foreground text-background text-xs font-medium flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />{t('yesAdd')}
                </button>
                <button
                  onClick={() => dismissPending(product!.id)}
                  className="p-2 rounded-full hover:bg-muted text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {due.length > 0 && (
        <section className="mb-8">
          <div className="flex items-baseline gap-2 mb-1">
            <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
              {t('feedbackDueTitle')}
            </h2>
            <span className="text-xs text-muted-foreground">{t('feedbackDueCount', due.length)}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{t('feedbackDueDesc')}</p>
          <div className="space-y-2">
            {due.map(({ product }) => (
              <div key={product!.id} className="bg-card rounded-2xl p-4 flex items-center gap-4">
                <ProductImage product={product!} className="w-14 h-14 rounded-xl shrink-0 relative overflow-hidden" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product!.name}</p>
                  <p className="text-xs text-muted-foreground">{product!.brand}</p>
                </div>
                <button
                  onClick={() => { setTab('items'); setFeedbackFor(product!.id); }}
                  className="px-4 py-2 rounded-full bg-foreground text-background text-xs font-medium"
                >
                  {t('feedbackDueAnswer')}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-card rounded-full w-fit mb-6">
        {(['items', 'outfits'] as const).map(k => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-5 py-2 rounded-full text-sm transition-colors ${
              tab === k ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {k === 'items' ? `${t('myWardrobe')} (${items.length})` : `${t('outfits')} (${outfits.length})`}
          </button>
        ))}
      </div>

      {tab === 'items' && (
        <section>
          {wardrobeProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">{t('emptyWardrobe')}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {wardrobeProducts.map(({ product, timesWorn }) => {
                const cpw = timesWorn > 0 ? Math.round(product!.price / timesWorn) : null;
                return (
                  <div key={product!.id} className="group">
                    <button
                      onClick={() => navigate(`/app/product/${product!.id}`)}
                      className="aspect-[3/4] rounded-2xl bg-card w-full block relative overflow-hidden"
                    >
                      <ProductImage product={product!} fallback="icon" className="absolute inset-0 w-full h-full" />
                    </button>
                    <div className="mt-2.5 px-1">
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{product!.brand}</p>
                      <p className="text-sm truncate">{product!.name}</p>
                      <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                        <span>{timesWorn} {t('timesWorn').toLowerCase()}</span>
                        {cpw !== null && <span>{cpw} PLN / wear</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <button
                          onClick={() => incWear(product!.id)}
                          className="flex-1 text-[11px] py-1.5 rounded-full border border-border hover:bg-card"
                        >
                          {t('markAsWorn')}
                        </button>
                        <button
                          onClick={() => setFeedbackFor(feedbackFor === product!.id ? null : product!.id)}
                          className={`flex-1 text-[11px] py-1.5 rounded-full border ${
                            forProduct(product!.id) ? 'border-foreground' : 'border-border'
                          } hover:bg-card`}
                        >
                          {forProduct(product!.id) ? t('editFeedback') : t('didItFit')}
                        </button>
                        <button
                          onClick={() => setSaveFor(product!.id)}
                          aria-label={t('saveSheetTitle')}
                          className="p-1.5 rounded-full hover:bg-card text-muted-foreground"
                        >
                          <Heart className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeItem(product!.id)}
                          className="p-1.5 rounded-full hover:bg-card text-muted-foreground"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {feedbackFor && (
            <div ref={formRef} className="mt-6 max-w-md">
              <FitFeedbackForm productId={feedbackFor} onDone={() => setFeedbackFor(null)} />
            </div>
          )}
        </section>
      )}

      {tab === 'outfits' && (
        <section>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => { setBuilding(true); setPicked([]); setOutfitName(''); }}
              disabled={items.length < 2}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />{t('createOutfit')}
            </button>
          </div>

          {building && (
            <div className="bg-card rounded-2xl p-5 mb-6">
              <input
                aria-label={t('outfitName')}
                value={outfitName}
                onChange={e => setOutfitName(e.target.value)}
                placeholder={t('outfitName')}
                className="w-full bg-background rounded-xl px-4 py-3 text-sm border border-border mb-4"
              />
              <p className="text-xs text-muted-foreground mb-3">{t('selectAtLeastTwo')}</p>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
                {wardrobeProducts.map(({ product }) => {
                  const sel = picked.includes(product!.id);
                  return (
                    <button
                      key={product!.id}
                      onClick={() => togglePick(product!.id)}
                      className={`aspect-[3/4] rounded-xl relative transition-all ${
                        sel ? 'ring-2 ring-foreground bg-card' : 'bg-card opacity-60 hover:opacity-100'
                      }`}
                    >
                      <ProductImage product={product!} fallback="icon" className="absolute inset-0 w-full h-full rounded-xl overflow-hidden" />
                      {sel && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setBuilding(false)} className="px-4 py-2 rounded-full text-sm text-muted-foreground hover:text-foreground">
                  {t('cancel')}
                </button>
                <button
                  onClick={saveOutfit}
                  disabled={picked.length < 2 || !outfitName.trim()}
                  className="px-5 py-2 rounded-full bg-foreground text-background text-sm font-medium disabled:opacity-40"
                >
                  {t('save')}
                </button>
              </div>
            </div>
          )}

          {outfits.length === 0 && !building ? (
            <p className="text-sm text-muted-foreground py-12 text-center">{t('emptyOutfits')}</p>
          ) : (
            <div className="space-y-4">
              {outfits.map(o => (
                <div key={o.id} className="bg-card rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <h3 className="font-display text-lg">{o.name}</h3>
                    </div>
                    <button onClick={() => deleteOutfit(o.id)} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {o.productIds.map(pid => {
                      const p = byId.get(pid);
                      if (!p) return null;
                      return (
                        <button
                          key={pid}
                          onClick={() => navigate(`/app/product/${pid}`)}
                          className="aspect-[3/4] rounded-xl bg-muted relative overflow-hidden"
                        >
                          <ProductImage product={p} fallback="icon" className="absolute inset-0 w-full h-full" />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-1.5">
                            <p className="text-[10px] truncate text-left">{p.name}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* One dialog for the whole screen: the wardrobe can hold a lot of items
          and each one does not need its own copy mounted. */}
      {saveFor && byId.get(saveFor) && (
        <SaveSheet
          product={byId.get(saveFor)!}
          open
          onOpenChange={open => { if (!open) setSaveFor(null); }}
        />
      )}
    </div>
  );
}
