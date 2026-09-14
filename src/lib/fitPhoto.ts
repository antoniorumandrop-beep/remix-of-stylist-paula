/**
 * Turning a file she picked into the thing we are willing to store.
 *
 * Scaling is part of saving, not an optimisation: 1600 px on the long edge is
 * enough for a full-screen preview on a retina phone, decodes instantly while
 * she is turning between angles, and takes a 5 MB photo down to 300–500 KB.
 * Full path and reasoning: `docs/own-fits-photos.md`.
 */

export const MAX_PHOTOS_PER_FIT = 4;
const MAX_EDGE = 1600;
const QUALITY = 0.85;

/**
 * Why a photo could not be used, in the two shapes worth telling apart.
 *
 * HEIC is the default format on an iPhone, so it is by far the most common way
 * for this to fail — and "pick a JPEG" is useful advice, while "something went
 * wrong" is not. Everything else is one bucket on purpose: we cannot tell a
 * truncated download from a renamed PDF, and guessing would be worse.
 */
export class UnsupportedImageError extends Error {
  constructor(readonly kind: 'heic' | 'unreadable') {
    super(`image rejected: ${kind}`);
    this.name = 'UnsupportedImageError';
  }
}

/** Recognised by type first, by name second — a browser may report neither. */
export function looksLikeHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === 'image/heic' || type === 'image/heif') return true;
  return /\.(heic|heif)$/i.test(file.name);
}

/**
 * Decoded through an `<img>` rather than `createImageBitmap`, which Safari
 * shipped late and which buys nothing here: the bitmap goes straight onto a
 * canvas either way.
 */
function decode(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode failed'));
    };
    image.src = url;
  });
}

/** The scaled size, keeping the aspect ratio and never scaling up. */
export function fitWithin(width: number, height: number, maxEdge = MAX_EDGE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const factor = maxEdge / longest;
  // Rounded, and never to zero: a 4000×1 strip is not a photo, but it must not
  // produce a canvas of width 0, which throws rather than failing politely.
  return {
    width: Math.max(1, Math.round(width * factor)),
    height: Math.max(1, Math.round(height * factor)),
  };
}

/** Scales and re-encodes as JPEG. Throws `UnsupportedImageError` and nothing else. */
export async function prepareFitPhoto(file: File): Promise<Blob> {
  let image: HTMLImageElement;
  try {
    image = await decode(file);
  } catch {
    // A HEIC that Safari can decode never lands here, which is the point of
    // deciding after the attempt rather than before it.
    throw new UnsupportedImageError(looksLikeHeic(file) ? 'heic' : 'unreadable');
  }

  const { width, height } = fitWithin(image.naturalWidth, image.naturalHeight);
  if (width < 1 || height < 1) throw new UnsupportedImageError('unreadable');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new UnsupportedImageError('unreadable');
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  if (!blob) throw new UnsupportedImageError('unreadable');
  return blob;
}
