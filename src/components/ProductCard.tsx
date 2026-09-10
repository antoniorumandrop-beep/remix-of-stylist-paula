import { Heart } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '@/data/mockData';
import { getProductAverageRating } from '@/data/mockData';
import { FitBadge } from './FitBadge';
import { Star } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useProductFit } from '@/lib/fit/product';
import { useSaved } from '@/lib/saved';
import { SaveSheet } from './SaveSheet';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  onBrandClick?: (brand: string) => void;
}

export function ProductCard({ product, onBrandClick }: ProductCardProps) {
  const { isSaved } = useSaved();
  const saved = isSaved(product.id);
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();
  const { avg, count } = getProductAverageRating(product.id);
  const { t } = useLanguage();
  const fit = useProductFit(product);

  const goToBrand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBrandClick) onBrandClick(product.brand);
    else navigate(`/app/brand/${encodeURIComponent(product.brand)}`);
  };

  const goToProduct = () => navigate(`/app/product/${product.id}`);

  /**
   * One click from the heart to everything you can do with a product. It used
   * to open a menu that opened another menu.
   */
  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSheetOpen(true);
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
          aria-label={t('saveSheetTitle')}
          className={`absolute top-3 right-3 z-20 p-1.5 rounded-full bg-background/80 backdrop-blur-sm transition-opacity ${
            saved || sheetOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
          }`}
        >
          <Heart className={`w-4 h-4 ${saved ? 'fill-foreground text-foreground' : 'text-foreground'}`} />
        </button>

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

      <div onClick={e => e.stopPropagation()}>
        <SaveSheet product={product} open={sheetOpen} onOpenChange={setSheetOpen} />
      </div>
    </div>
  );
}
