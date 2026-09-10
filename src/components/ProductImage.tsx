import { useState } from 'react';
import type { Product } from '@/lib/catalog/types';
import { ProductPlaceholder } from './ProductPlaceholder';

interface ProductImageProps {
  product: Pick<Product, 'id' | 'imageUrl' | 'name' | 'category'>;
  className?: string;
  /**
   * `blank` keeps the drawn placeholder out of small chrome — a 14 px avatar
   * in a list does not want a garment drawing in it.
   */
  fallback?: 'blank' | 'icon';
}

/**
 * The product photo, or a drawing of the garment when there is none.
 *
 * Imported and pasted products bring a URL; the mock catalogue brings nothing,
 * and used to render as a plain grey rectangle everywhere. A failed load lands
 * in the same place, which matters more than it sounds: a brand feed with one
 * dead CDN link should degrade into something that looks deliberate.
 */
export function ProductImage({ product, className = '', fallback = 'icon' }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const src = !failed ? product.imageUrl : undefined;

  if (!src) {
    if (fallback === 'blank') return <div className={`bg-muted ${className}`} />;
    return (
      <ProductPlaceholder
        id={product.id}
        category={product.category}
        className={`object-cover ${className}`}
      />
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
