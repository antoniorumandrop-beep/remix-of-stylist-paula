import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, ImagePlus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { useFit, useFits, useFitPhotoUrls } from '@/lib/fits';
import { MAX_PHOTOS_PER_FIT, UnsupportedImageError } from '@/lib/fitPhoto';
import { useWardrobe } from '@/lib/wardrobe';
import { useSaved } from '@/lib/saved';
import { useCatalog } from '@/lib/catalog/useCatalog';
import { ProductImage } from '@/components/ProductImage';
import type { FitItem } from '@/lib/wardrobe';

/**
 * Adding a fit, and editing one.
 *
 * The photo comes first and the rows are labels stuck to it, which is the
 * opposite of the wardrobe's builder — and deliberately so. A fit is not
 * assembled out of catalogue products: most of what she wears is not in the
 * catalogue, so picking from it would be a feature pretending to work. She
 * writes what she has on, one line per thing, and a line may *also* carry a
 * product when Paula happens to have it. That optional link is where "and
 * where do I buy this" comes from later.
 */

/** The list always ends in a blank line, so there is always somewhere to type. */
function withTrailingBlank(items: FitItem[]): FitItem[] {
  const last = items[items.length - 1];
  if (last && !last.productId && last.label === '') return items;
  return [...items, { label: '' }];
}

const isReal = (item: FitItem) => item.label.trim() !== '' || Boolean(item.productId);

export default function FitEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { fit, loading } = useFit(id);
  const {
    create, update, saving, addPhoto, dropPhoto, photosAvailable, photosStayLocal,
  } = useFits();
  const { items: owned, incWear } = useWardrobe();
  const { ids: savedIds } = useSaved();
  const { byId } = useCatalog();

  const [name, setName] = useState('');
  const [rows, setRows] = useState<FitItem[]>(() => withTrailingBlank([]));
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  /**
   * `null` until she says otherwise, and it defaults to on once there is a
   * photo: a photo in a fit means she had it on. Her own click always wins, and
   * nothing is counted without one of the two.
   */
  const [markWorn, setMarkWorn] = useState<boolean | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [search, setSearch] = useState('');

  const urls = useFitPhotoUrls(photoIds);
  const rowFields = useRef<(HTMLInputElement | null)[]>([]);
  const [focusRow, setFocusRow] = useState<number | null>(null);

  /**
   * Seeded from the query, not from `useState`'s initial value: that value is
   * read once, before the fit has arrived, and would leave the editor showing
   * an empty form that then saves over a real fit. This project has already
   * paid for that mistake once, in the "did it fit?" form.
   */
  const seeded = useRef(false);
  const untouched = useRef<string[]>([]);
  useEffect(() => {
    if (seeded.current || !fit) return;
    seeded.current = true;
    untouched.current = fit.photoIds;
    setName(fit.name);
    setRows(withTrailingBlank(fit.items));
    setPhotoIds(fit.photoIds);
  }, [fit]);

  useEffect(() => {
    if (focusRow === null) return;
    rowFields.current[focusRow]?.focus();
    setFocusRow(null);
  }, [focusRow]);

  const editing = Boolean(id);
  if (editing && !fit && loading) return null;

  const filled = rows.filter(isReal);
  const canSave = filled.length > 0 || photoIds.length > 0;

  /** Rows pointing at something she owns — the only ones a wear count can mean. */
  const wornCandidates = filled.filter(item => item.productId && owned.some(o => o.productId === item.productId));
  const countWorn = markWorn ?? photoIds.length > 0;

  const pickPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = MAX_PHOTOS_PER_FIT - photoIds.length;
    if (room <= 0) {
      toast(t('photoLimitReached', MAX_PHOTOS_PER_FIT));
      return;
    }
    setBusy(true);
    try {
      for (const file of Array.from(files).slice(0, room)) {
        try {
          const photoId = await addPhoto(file);
          setPhotoIds(current => [...current, photoId]);
        } catch (error) {
          // HEIC is the iPhone default, so it is the most common way for this
          // to fail — and "pick a JPEG" is advice, while "something broke" is
          // not. Same split as the measurement screen.
          toast(error instanceof UnsupportedImageError && error.kind === 'heic'
            ? t('photoHeicRefused')
            : t('photoUnreadable'));
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async (photoId: string) => {
    setPhotoIds(current => current.filter(p => p !== photoId));
    // Gone the moment she says so, not at save time: one button, one deletion.
    await dropPhoto(photoId).catch(() => {});
  };

  const movePhoto = (from: number, to: number) => {
    if (to < 0 || to >= photoIds.length) return;
    setPhotoIds(current => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const setRow = (index: number, label: string) => {
    setRows(current => withTrailingBlank(current.map((item, i) => (i === index ? { ...item, label } : item))));
  };

  const removeRow = (index: number) => {
    setRows(current => withTrailingBlank(current.filter((_, i) => i !== index)));
  };

  const attach = (productId: string) => {
    const product = byId.get(productId);
    if (!product) return;
    setRows(current => {
      const kept = current.filter(isReal);
      // Pre-filled as a sentence she would have written herself, and editable:
      // the label is hers, the link is a bonus.
      return withTrailingBlank([...kept, { label: `${product.name}, ${product.brand}`, productId }]);
    });
    setAttaching(false);
    setSearch('');
  };

  const leave = async () => {
    // Photos picked in this sitting and never saved have nothing pointing at
    // them, so they go with the editor rather than linger in the store.
    const orphans = photoIds.filter(p => !untouched.current.includes(p));
    await Promise.allSettled(orphans.map(p => dropPhoto(p)));
    navigate(editing && id ? `/app/fits/${id}` : '/app/fits');
  };

  const save = async () => {
    if (!canSave) return;
    const draft = {
      name: name.trim() || t('fitOnDay', new Date().toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-GB', {
        day: 'numeric', month: 'long',
      })),
      items: filled.map(item => ({ label: item.label.trim(), productId: item.productId ?? null })),
      photoIds,
    };

    if (editing && id) {
      await update({ id, draft });
      navigate(`/app/fits/${id}`);
      return;
    }

    const created = await create(draft);
    // Never on its own initiative: she ticked the box, and only a thing she
    // owns can be counted as worn.
    if (countWorn) {
      for (const item of wornCandidates) await incWear(item.productId!);
    }
    navigate(`/app/fits/${created.id}`);
  };

  const attachable = [...new Set([...owned.map(o => o.productId), ...savedIds])]
    .map(productId => byId.get(productId))
    .filter(Boolean)
    .filter(product => {
      const needle = search.trim().toLowerCase();
      if (!needle) return true;
      return `${product!.name} ${product!.brand}`.toLowerCase().includes(needle);
    })
    .slice(0, 24);

  return (
    <div className="max-w-xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={leave}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
          {t('cancel')}
        </button>
        <button
          onClick={save}
          disabled={!canSave || saving || busy}
          className="px-5 py-2 rounded-full bg-foreground text-background text-sm font-medium disabled:opacity-40"
        >
          {t('save')}
        </button>
      </div>

      {/* Photos, first and biggest: they are the fit, the rows describe it. */}
      {photoIds.length === 0 ? (
        <label
          className={`block aspect-[3/4] rounded-2xl border border-dashed border-border bg-card/40 ${
            photosAvailable ? 'cursor-pointer hover:bg-card/70' : 'opacity-60'
          } transition-colors`}
        >
          <div className="h-full flex flex-col items-center justify-center gap-3 px-8 text-center">
            <ImagePlus className="w-7 h-7 text-muted-foreground" />
            <p className="text-sm font-medium">{t('addPhotos')}</p>
            <p className="text-xs text-muted-foreground">{t('photosAngleHint')}</p>
          </div>
          {photosAvailable && (
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={event => { void pickPhotos(event.target.files); event.target.value = ''; }}
            />
          )}
        </label>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {photoIds.map((photoId, index) => (
            <div key={photoId} className="aspect-[3/4] rounded-2xl bg-muted relative overflow-hidden group">
              {urls[photoId] && (
                <img src={urls[photoId]} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <button
                onClick={() => void removePhoto(photoId)}
                aria-label={t('removePhoto')}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/85 text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {/* Order is the order she turns in, so it has to be changeable. */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <button
                  onClick={() => movePhoto(index, index - 1)}
                  disabled={index === 0}
                  aria-label={t('movePhotoEarlier')}
                  className="p-1.5 rounded-full bg-background/85 disabled:opacity-0"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => movePhoto(index, index + 1)}
                  disabled={index === photoIds.length - 1}
                  aria-label={t('movePhotoLater')}
                  className="p-1.5 rounded-full bg-background/85 disabled:opacity-0"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {photoIds.length < MAX_PHOTOS_PER_FIT && photosAvailable && (
            <label className="aspect-[3/4] rounded-2xl border border-dashed border-border bg-card/40 cursor-pointer hover:bg-card/70 transition-colors flex flex-col items-center justify-center gap-2">
              <ImagePlus className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('addPhotos')}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={event => { void pickPhotos(event.target.files); event.target.value = ''; }}
              />
            </label>
          )}
        </div>
      )}

      {/* Where her photos are, read off the backend rather than typed here —
          copy that is a function of the backend cannot go stale silently. */}
      <p className="text-xs text-muted-foreground mt-3">
        {!photosAvailable
          ? t('photosUnavailable')
          : photosStayLocal ? t('photosStayOnDevice') : t('photosGoToAccount')}
      </p>

      <div className="mt-8">
        <label htmlFor="fit-name" className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
          {t('fitName')}
        </label>
        <input
          id="fit-name"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder={t('fitNamePlaceholder')}
          className="mt-2 w-full bg-card rounded-xl px-4 py-3 text-sm border border-border"
        />
      </div>

      <section className="mt-8">
        <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">
          {t('whatImWearing')}
        </h2>
        <p className="text-xs text-muted-foreground mb-3">{t('whatImWearingHint')}</p>

        <div className="space-y-2">
          {rows.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                ref={element => { rowFields.current[index] = element; }}
                value={item.label}
                onChange={event => setRow(index, event.target.value)}
                onKeyDown={event => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  if (item.label.trim() === '') return;
                  setRows(current => withTrailingBlank(current));
                  setFocusRow(index + 1);
                }}
                placeholder={index === 0 ? t('garmentPlaceholder') : t('garmentPlaceholderNext')}
                className="flex-1 min-w-0 bg-card rounded-xl px-4 py-3 text-sm border border-border"
              />
              {/* The trailing blank has nothing to remove. */}
              {isReal(item) && (
                <button
                  onClick={() => removeRow(index)}
                  aria-label={t('removeGarment')}
                  className="p-2 rounded-full hover:bg-card text-muted-foreground shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Optional and folded away on purpose: linking a product is a bonus,
            not the way a fit is built. */}
        <button
          onClick={() => setAttaching(current => !current)}
          className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${attaching ? 'rotate-180' : ''}`} />
          {t('attachFromPaula')}
        </button>

        {attaching && (
          <div className="mt-3 bg-card rounded-2xl p-3">
            <div className="flex items-center gap-2 px-2 pb-2">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={t('searchYourThings')}
                className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {attachable.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-3">{t('nothingToAttach')}</p>
              ) : attachable.map(product => (
                <button
                  key={product!.id}
                  onClick={() => attach(product!.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-background/60 transition-colors text-left"
                >
                  <div className="w-9 aspect-[3/4] rounded-md bg-muted overflow-hidden shrink-0 relative">
                    <ProductImage product={product!} fallback="icon" className="absolute inset-0 w-full h-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{product!.brand}</p>
                    <p className="text-sm truncate">{product!.name}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {owned.some(o => o.productId === product!.id) ? t('fromWardrobe') : t('fromSaved')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Only when creating, only for things she owns, never ticked for her
          unless there is a photo — a photo in a fit means she wore it. */}
      {!editing && wornCandidates.length > 0 && (
        <label className="mt-8 flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={countWorn}
            onChange={event => setMarkWorn(event.target.checked)}
            className="w-4 h-4 rounded border-border accent-foreground"
          />
          <span className="text-sm">{t('countAsWorn', wornCandidates.length)}</span>
        </label>
      )}
    </div>
  );
}
