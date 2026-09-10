import { useState } from 'react';
import { AlertTriangle, ListPlus, Loader2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { BULK_LIMIT, fetchDrafts, parseUrlList, type BulkRow } from '@/lib/catalog/bulkLinks';
import { draftToRawProduct } from '@/lib/catalog/link';
import { CATEGORIES, type RawProduct } from '@/lib/catalog/types';
import { categoryLabel } from '@/lib/catalog/categories';
import { fetchErrorKey } from '@/lib/catalog/fetchErrors';
import { ProductImage } from './ProductImage';

/**
 * Twenty links at once, because filling a catalogue one paste at a time is
 * how a catalogue does not get filled.
 *
 * The single-link screen (`LinkImport`) stays: it shows where every field came
 * from, which is the thing that catches a plausible wrong answer. Here the
 * check is per row and coarser — a photo, a name, a price and a source badge —
 * so the trade is deliberate and worth naming: this is for filling, that is
 * for checking.
 */
export function BulkLinkImport({ onAdd }: { onAdd: (products: RawProduct[]) => void }) {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [rows, setRows] = useState<BulkRow[] | null>(null);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [categories, setCategories] = useState<Record<string, string>>({});

  const urls = parseUrlList(text);

  const read = async () => {
    setRows(null);
    setProgress([0, urls.length]);
    const result = await fetchDrafts(urls, (done, total) => setProgress([done, total]));
    setProgress(null);
    setRows(result);
    // Pre-fill whatever the shop published; the rest is the one thing a human
    // has to answer, because guessing it misfiles the product everywhere.
    setCategories(
      Object.fromEntries(
        result.flatMap(r => (r.status === 'ok' && r.draft?.category ? [[r.url, r.draft.category]] : [])),
      ),
    );
  };

  const ready = (rows ?? []).filter(r => r.status === 'ok' && categories[r.url]);

  const addAll = () => {
    const products: RawProduct[] = [];
    for (const row of ready) {
      const converted = draftToRawProduct(row.draft!, { category: categories[row.url] });
      if (converted.status === 'ok') products.push(converted.product);
    }
    onAdd(products);
    setRows(null);
    setText('');
    setCategories({});
  };

  return (
    <section className="bg-card rounded-2xl p-5 mb-8">
      <div className="flex items-center gap-2 mb-1">
        <ListPlus className="w-4 h-4" />
        <h2 className="text-sm font-medium">{t('bulkTitle')}</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{t('bulkDesc')}</p>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={4}
        placeholder={t('bulkPlaceholder')}
        className="w-full bg-background rounded-xl px-4 py-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-foreground/10"
      />

      <div className="flex items-center gap-3 mt-3">
        <button
          type="button"
          onClick={read}
          disabled={urls.length === 0 || progress !== null}
          className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium disabled:opacity-40 flex items-center gap-2"
        >
          {progress && <Loader2 className="w-4 h-4 animate-spin" />}
          {progress ? t('bulkReading', progress[0], progress[1]) : t('bulkRead')}
        </button>
        {urls.length > 0 && progress === null && (
          <span className="text-xs text-muted-foreground">
            {urls.length} / {BULK_LIMIT}
          </span>
        )}
      </div>

      {rows && rows.length > 0 && (
        <div className="mt-5 space-y-2">
          {rows.map(row => (
            <div key={row.url} className="flex items-center gap-3 bg-background rounded-xl p-3">
              <div className="w-10 aspect-[3/4] rounded-lg bg-muted overflow-hidden shrink-0 relative">
                {/* A row that could not be read gets nothing: a drawn garment
                    next to "could not be read" claims a product we do not have. */}
                {row.status === 'ok' && (
                  <ProductImage
                    product={{
                      id: row.url,
                      name: row.draft?.name ?? row.url,
                      imageUrl: row.draft?.imageUrl,
                      category: categories[row.url],
                    }}
                    className="absolute inset-0 w-full h-full"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {row.status === 'error' ? (
                  <div className="text-sm text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{row.url}</span>
                    </p>
                    {/* The reason, not just "failed". A shop refusing a robot and a
                        broken page are different news, and only one of them is
                        something she can do anything about. */}
                    <p className="text-xs mt-0.5 leading-relaxed">{t(fetchErrorKey(row.code))}</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm truncate">{row.draft?.name ?? row.url}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {row.draft?.brand}
                      {row.draft?.price !== undefined && ` · ${row.draft.price} PLN`}
                    </p>
                  </>
                )}
              </div>
              {row.status === 'ok' && (
                <select
                  value={categories[row.url] ?? ''}
                  onChange={e => setCategories(prev => ({ ...prev, [row.url]: e.target.value }))}
                  className="shrink-0 px-3 py-2 rounded-xl bg-card text-xs focus:outline-none focus:ring-2 focus:ring-foreground/10"
                >
                  <option value="">{t('linkPickCategory')}</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{categoryLabel(c, t)}</option>
                  ))}
                </select>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addAll}
            disabled={ready.length === 0}
            className="mt-2 w-full py-3 rounded-full bg-foreground text-background text-sm font-medium disabled:opacity-40"
          >
            {t('bulkAddAll', ready.length)}
          </button>
        </div>
      )}

      {rows && rows.length > 0 && ready.length === 0 && rows.every(r => r.status === 'error') && (
        <>
          <p className="text-sm text-muted-foreground mt-4">{t('bulkNothingRead')}</p>
          {rows.some(r => r.code === 'blocked' || r.code === 'timeout') && (
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('importBlockedHint')}</p>
          )}
        </>
      )}
    </section>
  );
}
