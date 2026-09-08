import { Heart, Pin, Share2, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '@/data/mockData';
import { getProductAverageRating, sampleCollections } from '@/data/mockData';
import { FitBadge } from './FitBadge';
import { Star } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useProductFit } from '@/lib/fit/product';
import { useSaved } from '@/lib/saved';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  onBrandClick?: (brand: string) => void;
}

export function ProductCard({ product, onBrandClick }: ProductCardProps) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(product.id);
  const [showActions, setShowActions] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { avg, count } = getProductAverageRating(product.id);
  const { t } = useLanguage();
  const fit = useProductFit(product);

  useEffect(() => {
    if (!showActions && !showCollections) return;
    const handler = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setShowActions(false);
        setShowCollections(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showActions, showCollections]);

  const goToBrand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBrandClick) onBrandClick(product.brand);
    else navigate(`/app/brand/${encodeURIComponent(product.brand)}`);
  };

  const goToProduct = () => {
    if (showActions || showCollections) return;
    navigate(`/app/product/${product.id}`);
  };

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showActions) {
      setShowActions(false);
      setShowCollections(false);
    } else {
      setShowActions(true);
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    void toggle(product.id);
    setShowActions(false);
  };

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCollections(true);
  };

  // Collections are still a mock; adding to one at least saves the product.
  const handleCollectionSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!saved) void toggle(product.id);
    setShowActions(false);
    setShowCollections(false);
  };

  return (
    <div className="group cursor-pointer" onClick={goToProduct}>
      <div className="relative aspect-[3/4] rounded-xl bg-card mb-3 overflow-hidden">
        <ProductImage product={product} className="absolute inset-0 w-full h-full" />
        {fit && (
          <div className="absolute top-3 left-3 z-10">
            <FitBadge score={fit.score} />
          </div>
        )}

        <button
          onClick={handleHeartClick}
          className={`absolute top-3 right-3 z-20 p-1.5 rounded-full bg-background/80 backdrop-blur-sm transition-opacity ${
            saved || showActions ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <Heart className={`w-4 h-4 ${saved ? 'fill-foreground text-foreground' : 'text-foreground'}`} />
        </button>

        {showActions && (
          <div
            ref={actionsRef}
            className="absolute top-12 right-3 z-30 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {!showCollections ? (
              <>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 bg-foreground text-background rounded-xl text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                  {saved ? t('unsave') : t('save')}
                </button>

                <button
                  onClick={handlePinClick}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 bg-foreground text-background rounded-xl text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  <Pin className="w-4 h-4" />
                  {t('addToCollection')}
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); setShowActions(false); }}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 bg-foreground text-background rounded-xl text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  <Share2 className="w-4 h-4" />
                  {t('share')}
                </button>
              </>
            ) : (
              <div className="bg-foreground text-background rounded-xl overflow-hidden min-w-[160px]">
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-background/10">
                  <span className="text-xs font-medium">{t('collections')}</span>
                  <button onClick={(e) => { e.stopPropagation(); setShowCollections(false); }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {sampleCollections.map(col => (
                  <button
                    key={col.id}
                    onClick={handleCollectionSelect}
                    className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-background/10 transition-colors flex items-center gap-2"
                  >
                    <span>{col.emoji}</span>
                    <span>{col.name}</span>
                  </button>
                ))}
                <button
                  onClick={handleCollectionSelect}
                  className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-background/10 transition-colors border-t border-background/10 flex items-center gap-2"
                >
                  <span>+</span>
                  <span>{t('newCollection')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {product.isSecondHand && (
          <div className="absolute bottom-3 left-3 z-10 text-[10px] font-medium tracking-widest uppercase bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full text-muted-foreground">
            {t('secondHand')}
          </div>
        )}
      </div>
      <button
        onClick={goToBrand}
        className="text-xs text-muted-foreground tracking-wide uppercase hover:text-foreground transition-colors"
      >
        {product.brand}
      </button>
      <p className="text-sm mt-0.5 text-foreground">{product.name}</p>
      <div className="flex items-center gap-2 mt-0.5">
        <p className="text-sm font-medium">{product.price} PLN</p>
        {count > 0 && (
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <Star className="w-3 h-3 fill-foreground text-foreground" />
            {avg} ({count})
          </span>
        )}
      </div>
    </div>
  );
}
