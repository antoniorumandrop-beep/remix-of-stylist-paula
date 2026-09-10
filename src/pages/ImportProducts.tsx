import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Trash2, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { categoryLabel } from '@/lib/catalog/categories';
import { parseBrandFeed, FEED_TEMPLATE_CSV, type FeedParseResult } from '@/lib/catalog/feed';
import { useCatalogImport } from '@/lib/catalog/useCatalog';
import { enrichFromText } from '@/lib/catalog/enrich';
import type { FitAttributes } from '@/lib/fit/attributes';
import type { RawProduct } from '@/lib/catalog/types';
import { ProductImage } from '@/components/ProductImage';
import { LinkImport } from '@/components/LinkImport';
import { BulkLinkImport } from '@/components/BulkLinkImport';
import { aiMode } from '@/lib/ai';

/**
 * Brand-side import. Not linked from the app's navigation — the path is
 * /admin/import. A small brand fills the CSV template, someone on our side
 * pastes it here, and the products appear in Paula with photos, shop links
 * and the fit attributes the rules could read.
 *
 * PLUG(supabase): the same screen, with `backend.catalog.importRaw` writing
 * to the `products` table instead of localStorage, and an admin-only RLS
 * policy in front of it.
 */

function attributeSummary(fit: FitAttributes): string[] {
  const out: string[] = [];
  const push = (label: string, attr?: { value: string; confidence: number }) => {
    if (attr) out.push(`${label}: ${attr.value} (${Math.round(attr.confidence * 100)}%)`);
  };
  push('silhouette', fit.silhouette);
  push('waist', fit.waistDefinition);
  push('rise', fit.rise);
  push('length', fit.lengthClass);
  push('sleeve', fit.sleeveLength);
  push('neckline', fit.neckline);
  push('closure', fit.closureType);
  push('stretch', fit.stretchLevel);
  return out;
}

export default function ImportProducts() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<FeedParseResult | null>(null);
  const { imported, importRaw, clearImported, importing } = useCatalogImport();

  const preview = () => setParsed(parseBrandFeed(text, { source: 'brand' }));

  /**
   * The eighteen real products from H&M and Zara, ready to load.
   *
   * Both shops answer a bot wall, so their pages cannot be read through the
   * link importer above — the file is how these clothes reach Paula. It ships
   * with the app rather than living in one browser's storage, so a fresh
   * install is one click away from a catalogue with real photos, prices,
   * compositions and size runs instead of drawn placeholders.
   */
  const loadSeed = async () => {
    const res = await fetch('/katalog-hm-zara.csv');
    if (!res.ok) { toast.error(t('adminSeedFailed')); return; }
    const csv = await res.text();
    setText(csv);
    setParsed(parseBrandFeed(csv, { source: 'seed' }));
  };

  /**
   * A product pulled from a link joins the same pending list as the CSV rows,
   * so it goes through the same preview, the same enrichment and the same
   * import button. One product can come from two intake paths; it must not
   * come from two code paths.
   */
  const addFromLink = (product: RawProduct) => addManyFromLinks([product]);

  const addManyFromLinks = (incoming: RawProduct[]) => {
    setParsed(prev => {
      const products = prev?.products ?? [];
      const fresh = incoming.filter(
        p => !products.some(existing => existing.id === p.id),
      );
      if (fresh.length === 0) return prev;
      return { products: [...products, ...fresh], errors: prev?.errors ?? [] };
    });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText(content);
    setParsed(parseBrandFeed(content, { source: 'brand' }));
    e.target.value = '';
  };

  const previewRows = useMemo(
    () => (parsed?.products ?? []).map(raw => ({
      raw,
      attrs: attributeSummary(enrichFromText({ name: raw.name, description: raw.description, material: raw.material })),
    })),
    [parsed],
  );

  const doImport = async () => {
    if (!parsed || parsed.products.length === 0) return;
    const n = await importRaw(parsed.products);
    toast.success(t('adminImportedToast', n));
    setParsed(null);
    setText('');
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8 lg:py-12">
        <button onClick={() => navigate('/app/search')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          {t('adminBackToApp')}
        </button>

        <h1 className="font-display text-3xl mb-2">{t('adminImportTitle')}</h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-2xl">{t('adminImportDesc')}</p>

        <LinkImport onAdd={addFromLink} />

        <BulkLinkImport onAdd={addManyFromLinks} />

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t('adminPasteHere')}
          rows={8}
          className="w-full px-4 py-3 bg-card rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-foreground/10"
        />

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button
            type="button"
            onClick={preview}
            disabled={!text.trim()}
            className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium disabled:opacity-40"
          >
            {t('adminPreview')}
          </button>
          <label className="px-5 py-2.5 rounded-full border border-border text-sm font-medium cursor-pointer hover:bg-card flex items-center gap-2">
            <Upload className="w-4 h-4" />
            {t('adminChooseFile')}
            <input type="file" accept=".csv,.json,.txt,text/csv,application/json" onChange={onFile} className="hidden" />
          </label>
          <button
            type="button"
            onClick={loadSeed}
            className="px-5 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-card flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {t('adminLoadSeed')}
          </button>
          <span className="text-xs text-muted-foreground ml-auto">{t('adminHowEnriched', aiMode)}</span>
        </div>

        <p className="text-xs text-muted-foreground mt-3 leading-relaxed max-w-2xl">{t('adminSeedNote')}</p>

        <details className="mt-6 bg-card rounded-xl p-4">
          <summary className="text-sm font-medium cursor-pointer">{t('adminTemplate')}</summary>
          <pre className="mt-3 text-xs overflow-x-auto whitespace-pre">{FEED_TEMPLATE_CSV}</pre>
        </details>

        {parsed && (
          <section className="mt-10">
            {parsed.errors.length > 0 && (
              <div className="bg-card rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  {t('adminSkippedRows')} ({parsed.errors.length})
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {parsed.errors.map((err, i) => (
                    <li key={i}>{t('adminRow')} {err.row}: {err.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {previewRows.length > 0 && (
              <>
                <div className="space-y-3">
                  {previewRows.map(({ raw, attrs }) => (
                    <div key={raw.id} className="bg-card rounded-2xl p-4 flex gap-4">
                      <ProductImage product={raw} className="w-16 h-20 rounded-xl shrink-0 relative overflow-hidden" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{raw.brand} · {categoryLabel(raw.category, t)}</p>
                        <p className="text-sm font-medium truncate">{raw.name}</p>
                        <p className="text-sm">{raw.price} PLN</p>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          <span className="font-medium">{t('adminDetected')}:</span>{' '}
                          {attrs.length > 0 ? attrs.join(' · ') : t('adminNoAttributes')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={doImport}
                  disabled={importing}
                  className="mt-6 px-6 py-3 rounded-full bg-foreground text-background text-sm font-medium flex items-center gap-2 disabled:opacity-40"
                >
                  <Check className="w-4 h-4" />
                  {t('adminImportN', previewRows.length)}
                </button>
              </>
            )}
          </section>
        )}

        <section className="mt-14 pt-8 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">{t('adminImported')} ({imported.length})</h2>
            {imported.length > 0 && (
              <button
                type="button"
                onClick={() => void clearImported()}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {t('adminClearImported')}
              </button>
            )}
          </div>
          {imported.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('adminNothingYet')}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {imported.map(p => (
                <button key={p.id} onClick={() => navigate(`/app/product/${p.id}`)} className="text-left group">
                  <div className="aspect-[3/4] rounded-xl relative overflow-hidden bg-card mb-2">
                    <ProductImage product={p} className="absolute inset-0 w-full h-full" />
                  </div>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{p.brand}</p>
                  <p className="text-sm truncate">{p.name}</p>
                  <p className="text-sm font-medium">{p.price} PLN</p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
