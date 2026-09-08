import { useState } from 'react';
import { Shirt } from 'lucide-react';
import type { Product } from '@/lib/catalog/types';

interface ProductImageProps {
  product: Pick<Product, 'imageUrl' | 'name'>;
  className?: string;
  /** Rendered when there is no image (the mock catalog) or it failed to load. */
  fallback?: 'blank' | 'icon';
}

/**
 * The product photo, or the placeholder the mock catalog always had.
 * Imported brand products bring a URL; mock products bring nothing.
 */
export function ProductImage({ product, className = '', fallback = 'blank' }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const src = !failed ? product.imageUrl : undefined;
  if (!src) {
    return (
      <div className={`bg-card ${className}`}>
        {fallback === 'icon' && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
            <Shirt className="w-10 h-10" />
          </div>
        )}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={product.name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover bg-card ${className}`}
    />
  );
}
