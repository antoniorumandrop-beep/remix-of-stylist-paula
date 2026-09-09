import { useState } from 'react';
import { Link2, Loader2, Plus, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { fetchProductDraft } from '@/lib/catalog/linkFetch';
import { draftToRawProduct, type LinkDraft } from '@/lib/catalog/link';
import { CATEGORIES, type RawProduct } from '@/lib/catalog/types';

/**
 * Paste a shop link, get a product.
 *
 * The screen shows where every field came from. That is not decoration: the
 * measured failure mode is a *plausible* wrong answer — Answear publishes its
 * logo as `og:image`, so a parser can hand back a complete-looking record with
 * a picture of nothing. A visible "open-graph" badge next to a photo is how a
 * person catches that in a second; a silent record is how it ships.
 *
 * Category is the one field a human is asked for, because shops rarely publish
 * one in a form we can map, and guessing it wrong quietly misfiles the product
 * in every screen downstream.
 */

const SOURCE_STYLE: Record<string, string> = {
  'json-ld': 'bg-foreground/10 text-foreground',
  'open-graph': 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  url: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  guess: 'bg-muted text-muted-foreground',
};

function Field({ label, value, source }: { label: string; value?: string; source?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-muted-foreground w-24 flex-shrink-0">{label}</span>
      <span className="min-w-0 break-words">{value}</span>
      {source && (
        <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${SOURCE_STYLE[source] ?? ''}`}>
          {source}
        </span>
      )}
    </div>
  );
}

export function LinkImport({ onAdd }: { onAdd: (product: RawProduct) => void }) {
  const { t } = useLanguage();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<LinkDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('');

  const load = async () => {
    setBusy(true);
    setError(null);
    setDraft(null);
    const result = await fetchProductDraft(url);
    setBusy(false);
    if (result.status === 'error') { setError(result.error); return; }
    setDraft(result.draft);
    setCategory(result.draft.category ?? '');
  };

  const add = () => {
    if (!draft) return;
    const converted = draftToRawProduct(draft, { category: category || undefined });
    if (converted.status === 'incomplete') { setError(t('linkMissing', converted.missing.join(', '))); return; }
    onAdd(converted.product);
    setDraft(null);
    setUrl('');
    setCategory('');
  };

  return (
    <section className="bg-card rounded-2xl p-5 mb-8">
      <div className="flex items-center gap-2 mb-1">
        <Link2 className="w-4 h-4" />
        <h2 className="text-sm font-medium">{t('linkImportTitle')}</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{t('linkImportDesc')}</p>

      <div className="flex gap-2">
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && url.trim() && !busy) void load(); }}
          placeholder={t('linkPlaceholder')}
          className="flex-1 min-w-0 px-4 py-2.5 bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
        />
        <button
          type="button"
          onClick={() => void load()}
          disabled={!url.trim() || busy}
          className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium disabled:opacity-40 flex items-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('linkFetch')}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-muted-foreground flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </p>
      )}

      {draft && (
        <div className="mt-5 border border-border rounded-2xl p-4 bg-background">
          <div className="flex gap-4">
            <div className="w-24 aspect-[3/4] rounded-xl bg-card overflow-hidden flex-shrink-0">
              {draft.imageUrl ? (
                <img src={draft.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-[10px] text-muted-foreground text-center px-2">
                  {t('linkNoImage')}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <Field label={t('linkFieldName')} value={draft.name} source={draft.provenance.name} />
              <Field label={t('linkFieldBrand')} value={draft.brand} source={draft.provenance.brand} />
              <Field
                label={t('linkFieldPrice')}
                value={draft.price !== undefined ? `${draft.price} ${draft.currency ?? ''}`.trim() : undefined}
                source={draft.provenance.price}
              />
              <Field label={t('linkFieldSizes')} value={draft.sizes} source={draft.provenance.sizes} />
              <Field label={t('linkFieldMaterial')} value={draft.material} source={draft.provenance.material} />
              <Field label={t('linkFieldImage')} value={draft.imageUrl} source={draft.provenance.imageUrl} />
            </div>
          </div>

          {draft.warnings.length > 0 && (
            <ul className="mt-4 text-xs text-muted-foreground space-y-1">
              {draft.warnings.map((warning, i) => (
                <li key={i} className="flex gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-sm text-muted-foreground">{t('linkFieldCategory')}</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-card text-sm capitalize focus:outline-none focus:ring-2 focus:ring-foreground/10"
            >
              <option value="">{t('linkPickCategory')}</option>
              {/* Raw category ids, the same way every other screen shows them
                  (`ProductDetail` capitalises the stored value). Translating
                  them here alone would make the admin screen disagree with the
                  app. */}
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={add}
              disabled={!category}
              className="ml-auto px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium disabled:opacity-40 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('linkAdd')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
