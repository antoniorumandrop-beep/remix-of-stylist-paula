import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Heart, ExternalLink, Star, Send, ImageIcon, Camera, X, Users, Check, Shirt } from 'lucide-react';
import { getProductReviews, getProductAverageRating, getSimilarBodiesBought, productMaterials } from '@/data/mockData';
import type { Review } from '@/data/mockData';
import { useObjectUrls } from '@/lib/useObjectUrls';
import { FitBadge } from '@/components/FitBadge';
import { ProductCard } from '@/components/ProductCard';
import { ProductImage } from '@/components/ProductImage';
import { useCatalog } from '@/lib/catalog/useCatalog';
import { useUserPrefs } from '@/lib/prefs';
import { useSaved } from '@/lib/saved';
import { useLanguage } from '@/i18n/LanguageContext';
import { useWardrobe } from '@/lib/wardrobe';
import { useBodyProfile } from '@/lib/profile';
import { getProductFitAttributes, scoreProduct, sortByFit } from '@/lib/fit/product';
import { evaluateLength } from '@/lib/fit/length';
import { lengthKey, pointKey, reasonText, shapeKey, verdictKey } from '@/lib/fit/copy';
import { useFitFeedback, type FitAnswer } from '@/lib/fitFeedback';
import { predictionMatches } from '@/lib/fit/learning';
import { BrandFitMemory } from '@/components/BrandFitMemory';
import { FitFeedbackForm } from '@/components/FitFeedbackForm';
import { MaterialPanel } from '@/components/MaterialPanel';
import { SaveSheet } from '@/components/SaveSheet';
import { SizeAdvicePanel } from '@/components/SizeAdvicePanel';
import { categoryLabel } from '@/lib/catalog/categories';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [localReviews, setLocalReviews] = useState<Review[]>([]);
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);

  // Owns the blob URLs behind the attached photos and releases them — on
  // removal, on submit, and on leaving the screen. See useObjectUrls.
  const photoUrls = useObjectUrls();

  const removeReviewPhoto = (index: number) => {
    setReviewPhotos(prev => {
      const url = prev[index];
      if (url) photoUrls.revoke(url);
      return prev.filter((_, i) => i !== index);
    });
  };
  const { t } = useLanguage();
  const { has, addItem, markPending } = useWardrobe();
  const { profile, loading: profileLoading } = useBodyProfile();
  const { forProduct } = useFitFeedback();
  const { prefs } = useUserPrefs();
  const { isSaved } = useSaved();
  const [showFeedback, setShowFeedback] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const { products: catalog, byId, loading: catalogLoading } = useCatalog();

  const product = id ? byId.get(id) : undefined;

  /**
   * These sit above the "product not found" return because hooks have to run
   * in the same order on every render, and they are memoised because sorting
   * by fit runs the scorer over every product in the category. Left bare in
   * the render body it ran again on every keystroke in the review box —
   * invisible with fifty fixtures, a stutter with a brand feed of several
   * hundred, and none of it depends on what she is typing.
   */
  const allReviews = useMemo(
    () => (product ? [...getProductReviews(product.id), ...localReviews] : []),
    [product, localReviews],
  );
  const totalAvg = useMemo(
    () => (allReviews.length > 0
      ? Math.round((allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length) * 10) / 10
      : 0),
    [allReviews],
  );
  const fit = useMemo(() => (product ? scoreProduct(product, profile) : null), [product, profile]);
  const lengthNote = useMemo(
    () => (product ? evaluateLength(getProductFitAttributes(product)?.lengthClass?.value, profile?.heightCm) : null),
    [product, profile?.heightCm],
  );
  const similar = useMemo(
    () => (product
      ? sortByFit(catalog.filter(p => p.id !== product.id && p.category === product.category), profile).slice(0, 4)
      : []),
    [catalog, product, profile],
  );
  const similarBodies = useMemo(
    () => (product ? getSimilarBodiesBought(product.id, 75, 4) : []),
    [product],
  );

  if (!product) {
    if (catalogLoading) return null;
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">{t('productNotFound')}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm underline underline-offset-4">{t('goBack')}</button>
      </div>
    );
  }

  // Imported products carry their composition as free text; the mock catalogue
  // carries it structured, in the only field of that table still worth reading.
  // Everything the panel shows is derived from whichever of the two exists, so
  // for the first time imported products get the panel as well.
  const composition = product.material ?? productMaterials[product.id]?.composition ?? null;
  const { avg, count } = getProductAverageRating(product.id);
  const totalCount = count + localReviews.length;
  const feedback = forProduct(product.id);
  const owned = has(product.id);
  const feedbackLabel = (a: FitAnswer) =>
    a === 'tight' ? t('feedbackTight') : a === 'ok' ? t('feedbackOk') : t('feedbackLoose');

  const handleSubmitReview = () => {
    if (!reviewText.trim()) return;
    const newReview: Review = {
      id: `local-${Date.now()}`,
      productId: product.id,
      author: prefs.name ?? 'Ty',
      rating: reviewRating,
      text: reviewText.trim(),
      date: new Date().toISOString().split('T')[0],
    };
    setLocalReviews(prev => [...prev, { ...newReview, photoCount: reviewPhotos.length || undefined }]);
    setReviewText('');
    setReviewRating(5);
    photoUrls.revokeAll();
    setReviewPhotos([]);
  };

  const handleAddPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        Array.from(files).forEach(file => {
          const url = photoUrls.create(file);
          setReviewPhotos(prev => [...prev, url]);
        });
      }
    };
    input.click();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <button onClick={() => location.key !== 'default' ? navigate(-1) : navigate('/app/search')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" />
        {t('back')}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        <div className="aspect-[3/4] rounded-2xl bg-card relative overflow-hidden">
          <ProductImage product={product} className="absolute inset-0 w-full h-full" />
          {fit && (
            <div className="absolute top-4 left-4">
              <FitBadge score={fit.score} size="md" />
            </div>
          )}
          {product.isSecondHand && (
            <div className="absolute bottom-4 left-4 text-[11px] font-medium tracking-widest uppercase bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-muted-foreground">
              {t('secondHand')}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <button
            onClick={() => navigate(`/app/brand/${encodeURIComponent(product.brand)}`)}
            className="text-xs text-muted-foreground tracking-widest uppercase hover:text-foreground transition-colors w-fit"
          >
            {product.brand}
          </button>
          <h1 className="font-display text-2xl lg:text-3xl mt-2">{product.name}</h1>
          <p className="text-xl font-medium mt-3">{product.price} PLN</p>
          {product.description && (
            <p className="text-sm text-muted-foreground mt-3">{product.description}</p>
          )}

          {fit ? (
            <div className="bg-card rounded-xl p-5 mt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">{t('fitConfidence')}</span>
                <span className="text-sm font-medium">{fit.score}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground rounded-full transition-all"
                  style={{ width: `${fit.score}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {t('basedOnProportions', t(shapeKey(fit.shape)).toLowerCase(), profile?.heightCm ?? '—')}
              </p>
              {fit.confidence < 0.6 && (
                <p className="text-xs text-muted-foreground mt-1">{t('fitConfidenceLow')}</p>
              )}

              <div className="mt-5 pt-4 border-t border-border">
                <div className="text-sm font-medium mb-3">{t('fitBreakdownTitle')}</div>
                <ul className="space-y-2.5">
                  {fit.points.map(point => {
                    const reasons = point.reasons.map(r => reasonText(r, t)).filter(Boolean) as string[];
                    return (
                      <li key={point.point} className="text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span>{t(pointKey(point.point))}</span>
                          <span className={point.verdict === 'neutral' || point.verdict === 'unknown' ? 'text-muted-foreground' : 'font-medium'}>
                            {t(verdictKey(point.verdict))}
                          </span>
                        </div>
                        {reasons.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">{reasons.join(' · ')}</p>
                        )}
                        {feedback?.answers[point.point] && (
                          <p className="text-xs mt-0.5">
                            <span className="text-muted-foreground">{t('yourFeedback')}: </span>
                            <span className="font-medium">{feedbackLabel(feedback.answers[point.point]!)}</span>
                            <span className="text-muted-foreground">
                              {' — '}
                              {predictionMatches(point.verdict, feedback.answers[point.point]!) ? t('predictionMatched') : t('predictionMissed')}
                            </span>
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {lengthNote && (
                  <p className="text-xs text-muted-foreground mt-4">{t(lengthKey(lengthNote.note))}</p>
                )}
              </div>
            </div>
          ) : !profile && !profileLoading ? (
            <div className="bg-card rounded-xl p-5 mt-6">
              <p className="text-sm text-muted-foreground">{t('fitNoProfile')}</p>
              <button
                onClick={() => navigate('/onboarding')}
                className="mt-3 text-sm font-medium underline underline-offset-4"
              >
                {t('addMeasurements')}
              </button>
            </div>
          ) : null}

          {/* Only for a measured profile: a shape picked off a list has no
              circumferences, and a size read from a picked shape would be a
              guess wearing the same typeface as a calculation. */}
          {profile?.source === 'measured' && (
            <SizeAdvicePanel product={product} profile={profile} />
          )}

          <BrandFitMemory brand={product.brand} />

          {owned && (
            <div className="mt-4">
              {showFeedback ? (
                <FitFeedbackForm productId={product.id} onDone={() => setShowFeedback(false)} />
              ) : (
                <button
                  onClick={() => setShowFeedback(true)}
                  className="text-sm font-medium underline underline-offset-4"
                >
                  {feedback ? t('editFeedback') : t('tellPaulaHowItFit')}
                </button>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                // Imported products have a real shop link; the mock catalog has none.
                // The click is deliberate and visible — no automatic redirects.
                void markPending(product.id);
                if (product.url) window.open(product.url, '_blank', 'noopener,noreferrer');
              }}
              className="flex-1 py-3.5 bg-foreground text-background rounded-full text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <ExternalLink className="w-4 h-4" />
              {t('viewOn')} {product.store}
            </button>
            <button
              onClick={() => setSaveOpen(true)}
              aria-label={t('saveSheetTitle')}
              aria-pressed={isSaved(product.id)}
              className="p-3.5 border border-border rounded-full hover:bg-card transition-colors"
            >
              <Heart className={`w-5 h-5 ${isSaved(product.id) ? 'fill-foreground' : ''}`} />
            </button>
          </div>
          <button
            onClick={() => addItem(product.id)}
            disabled={has(product.id)}
            className="mt-3 w-full py-3 border border-border rounded-full text-sm font-medium flex items-center justify-center gap-2 hover:bg-card transition-colors disabled:opacity-60"
          >
            {has(product.id) ? <><Check className="w-4 h-4" />{t('inWardrobe')}</> : <><Shirt className="w-4 h-4" />{t('addToWardrobe')}</>}
          </button>

          {/* Added from a link by the user herself. She should be told what
              that costs her: this shop's page is all we have to go on. */}
          {product.source === 'user' && (
            <div className="mt-6 bg-card rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{t('yourOwnBadge')}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{t('yourOwnNote')}</p>
            </div>
          )}

          <div className="mt-8 space-y-4 text-sm">
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-muted-foreground">{t('category')}</span>
              <span>{categoryLabel(product.category, t)}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-muted-foreground">{t('store')}</span>
              <span>{product.store}</span>
            </div>
            {product.material && (
              <div className="flex justify-between gap-6 py-3 border-b border-border">
                <span className="text-muted-foreground">{t('composition')}</span>
                <span className="text-right">{product.material}</span>
              </div>
            )}
            {product.sizes && (
              <div className="flex justify-between gap-6 py-3 border-b border-border">
                <span className="text-muted-foreground">{t('sizes')}</span>
                <span className="text-right">{product.sizes}</span>
              </div>
            )}
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-muted-foreground">{t('condition')}</span>
              <span>{product.isSecondHand ? t('preOwned') : t('new')}</span>
            </div>
          </div>
        </div>
      </div>

      <SaveSheet product={product} open={saveOpen} onOpenChange={setSaveOpen} />

      <MaterialPanel composition={composition} />

      <section className="mt-16">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="font-display text-xl">{t('reviews')}</h2>
          {totalCount > 0 && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="w-4 h-4 fill-foreground text-foreground" />
              {totalAvg} · {totalCount} {totalCount === 1 ? t('review') : t('reviewsPlural')}
            </span>
          )}
        </div>

        {allReviews.length > 0 ? (
          <div className="space-y-4 mb-8">
            {allReviews.map(review => (
              <div key={review.id} className="bg-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{review.author}</span>
                    {review.bodyMatch && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        review.bodyMatch >= 85 ? 'bg-green-500/10 text-green-700' :
                        review.bodyMatch >= 65 ? 'bg-yellow-500/10 text-yellow-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        <Users className="w-3 h-3" />
                        {review.bodyMatch}% {t('bodyMatchLabel')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < review.rating ? 'fill-foreground text-foreground' : 'text-muted'}`}
                      />
                    ))}
                  </div>
                </div>
                {review.reviewerHeight && review.reviewerShape && (
                  <p className="text-[11px] text-muted-foreground mb-1.5">
                    {review.reviewerHeight} cm · {review.reviewerShape}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">{review.text}</p>
                {review.photoCount && review.photoCount > 0 && (
                  <div className="flex gap-2 mt-3">
                    {Array.from({ length: review.photoCount }).map((_, i) => (
                      <div key={i} className="w-20 h-24 rounded-lg bg-muted flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted mt-2">{review.date}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-8">{t('noReviewsYet')}</p>
        )}

        <div className="bg-card rounded-xl p-5">
          <h3 className="text-sm font-medium mb-1">{t('writeReview')}</h3>
          {/* Reviews live in component state and go nowhere. Persisting them
              locally would be worse than losing them: she would write one, see
              it appear, and reasonably conclude it had been published. Saying
              so is the only honest option until reviews have a table behind
              them — PLUG(supabase), and a schema decision that is not mine. */}
          <p className="text-xs text-muted-foreground mb-3">{t('reviewDemoNote')}</p>
          <div className="flex items-center gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} onClick={() => setReviewRating(i + 1)} className="p-0.5">
                <Star className={`w-5 h-5 transition-colors ${i < reviewRating ? 'fill-foreground text-foreground' : 'text-muted hover:text-muted-foreground'}`} />
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <textarea
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                placeholder={t('shareThoughts')}
                className="flex-1 min-h-[60px] rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
              <div className="flex flex-col gap-2 self-end">
                <button
                  onClick={handleAddPhoto}
                  className="p-3 rounded-full border border-border hover:bg-muted transition-colors"
                  title={t('addPhoto')}
                >
                  <Camera className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={!reviewText.trim()}
                  className="p-3 rounded-full bg-foreground text-background disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            {reviewPhotos.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {reviewPhotos.map((photo, i) => (
                  <div key={i} className="relative w-20 h-24 rounded-lg overflow-hidden group">
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeReviewPhoto(i)}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {similarBodies.length > 0 && (
        <section className="mt-16">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4" />
            <h2 className="font-display text-xl">{t('similarBodiesBought')}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">{t('similarBodiesBoughtDesc')}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {similarBodies.map(({ product: p, buyersCount }) => (
              <div key={p.id} className="flex flex-col gap-2">
                <ProductCard product={p} />
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground px-2">
                  <Users className="w-3 h-3" />
                  {t('buyersWithSimilarBody', buyersCount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-xl mb-6">{t('similarItems')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {similar.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
