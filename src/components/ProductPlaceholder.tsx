import { categoryOf } from '@/lib/catalog/categories';

/**
 * What a product looks like before it has a photo.
 *
 * The mock catalogue has no images at all, so every card, every collection
 * cover and every wardrobe tile was a plain grey rectangle — the app read as
 * broken rather than unfinished. This draws the garment instead: line art per
 * category, on a ground whose shade is derived from the product id, so a grid
 * of twenty is not a wall of identical boxes.
 *
 * Deliberately a drawing and not a stock photo. A photo of a dress that is not
 * this dress would be the same class of lie as the invented price drops: it
 * would look like information. A silhouette cannot be mistaken for one.
 */

interface Garment {
  /** The outline, filled. */
  body: string;
  /** Seams, pleats, lapels — drawn as a line, never filled. */
  detail?: string;
}

/**
 * Every silhouette is one closed path. A second subpath inside the same `d`
 * gets the fill too, which is how the first attempt gave the blazer a diamond
 * floating on its chest and the dress a funnel above the shoulders.
 */
const SHAPES: Record<string, Garment> = {
  dresses: {
    body: 'M32 24 L40 24 Q50 32 60 24 L68 24 L62 56 L78 112 Q50 119 22 112 L38 56 Z',
    detail: 'M38 56 L62 56',
  },
  skirts: {
    body: 'M33 40 L67 40 L79 108 Q50 116 21 108 Z',
    detail: 'M33 49 L67 49 M43 49 L39 107 M57 49 L61 107',
  },
  tops: {
    body: 'M30 31 Q50 24 70 31 L80 44 L71 52 L69 46 L70 97 Q50 103 30 97 L31 46 L29 52 L20 44 Z',
    detail: 'M40 28 Q50 37 60 28',
  },
  bottoms: {
    body: 'M33 32 L67 32 L65 114 L54 114 L50 66 L46 114 L35 114 Z',
    detail: 'M33 41 L67 41 M42 41 L40 112 M58 41 L60 112',
  },
  outerwear: {
    body: 'M28 30 Q50 22 72 30 L83 46 L73 55 L71 49 L72 110 Q50 117 28 110 L29 49 L27 55 L17 46 Z',
    detail: 'M39 27 L50 47 L61 27 M50 47 L50 111',
  },
  shoes: {
    // A slip-on in profile, toe to the left. A heeled shoe was tried first and
    // read as a blob at card size; the low wedge is legible at 60 px.
    body: 'M18 100 C18 91 25 82 38 76 C50 70 64 68 74 72 C80 75 82 81 82 89 '
      + 'L82 96 C82 99 80 100 77 100 Z',
    detail: 'M38 78 C48 87 63 88 76 81 M18 96 L82 96',
  },
  accessories: {
    body: 'M28 48 L72 48 L77 104 L23 104 Z',
    detail: 'M38 48 Q38 30 50 30 Q62 30 62 48',
  },
};

/** Five near-neutral grounds. The palette is black, white and grey; this stays in it. */
const GROUNDS = ['0 0% 97%', '0 0% 94.5%', '0 0% 96%', '0 0% 93%', '0 0% 95.5%'];

/** djb2 over the id, so the same product always gets the same ground. */
function pick(id: string): string {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  return GROUNDS[Math.abs(h) % GROUNDS.length];
}

export function ProductPlaceholder({
  id,
  category,
  className = '',
}: {
  id: string;
  category?: string;
  className?: string;
}) {
  const garment = SHAPES[categoryOf(category)] ?? SHAPES.tops;

  return (
    <svg
      viewBox="0 0 100 133"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={className}
    >
      <rect width="100" height="133" fill={`hsl(${pick(id)})`} />
      {/* Shrunk about the centre so nothing crowds the edge of the card. */}
      <g
        transform="translate(50 66.5) scale(0.84) translate(-50 -66.5)"
        stroke="hsl(var(--foreground) / 0.24)"
        strokeWidth="1.1"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d={garment.body} fill="hsl(var(--foreground) / 0.05)" />
        {garment.detail && <path d={garment.detail} fill="none" />}
      </g>
    </svg>
  );
}
