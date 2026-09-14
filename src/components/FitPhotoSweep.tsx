import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useFitPhotoUrls } from '@/lib/fits';

/**
 * A fit's photos, read as a turn rather than a gallery.
 *
 * Antonio's decision, and it is the whole reason there is no 3D here: front,
 * three-quarter, side — a few real photos she clicks or drags through, about a
 * hundred and twenty degrees of it. A 3D avatar was the more impressive answer
 * and the wrong one; her own photos show the clothes, which is what anyone
 * looking at a fit came for.
 *
 * So order in `photoIds` means angle, and dragging scrubs frames instead of
 * paging cards: a hard cut between two photos of the same pose reads as
 * rotation, a slide transition reads as a slideshow.
 */
export function FitPhotoSweep({
  photoIds,
  className = 'aspect-[3/4]',
}: {
  photoIds: string[];
  className?: string;
}) {
  const { t } = useLanguage();
  const urls = useFitPhotoUrls(photoIds);
  const [index, setIndex] = useState(0);
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; from: number; moved: boolean } | null>(null);

  // Editing a fit can take a photo away from under the finger.
  useEffect(() => {
    setIndex(current => Math.min(current, Math.max(photoIds.length - 1, 0)));
  }, [photoIds.length]);

  if (photoIds.length === 0) return null;

  const count = photoIds.length;
  const clamp = (value: number) => Math.max(0, Math.min(count - 1, value));

  /**
   * A full drag across the frame covers every angle, so the gesture feels the
   * same whether there are two photos or four.
   */
  const step = () => Math.max(24, (frame.current?.clientWidth ?? 300) / count);

  return (
    <div
      ref={frame}
      role="group"
      aria-label={t('turnPhotos')}
      tabIndex={0}
      // Vertical scrolling still belongs to the page; only sideways is ours.
      style={{ touchAction: 'pan-y' }}
      className={`relative w-full ${className} rounded-2xl overflow-hidden bg-muted select-none cursor-ew-resize focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20`}
      onPointerDown={event => {
        drag.current = { x: event.clientX, from: index, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        if (!drag.current) return;
        const delta = event.clientX - drag.current.x;
        if (Math.abs(delta) > 4) drag.current.moved = true;
        setIndex(clamp(drag.current.from - Math.round(delta / step())));
      }}
      onPointerUp={event => {
        const gesture = drag.current;
        drag.current = null;
        if (!gesture || gesture.moved || count < 2) return;
        // A tap is not a failed drag: on a mouse, halves of the frame are the
        // obvious way to turn, and nobody drags a photo with a trackpad.
        const box = event.currentTarget.getBoundingClientRect();
        setIndex(clamp(index + (event.clientX - box.left < box.width / 2 ? -1 : 1)));
      }}
      onPointerCancel={() => { drag.current = null; }}
      onKeyDown={event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); setIndex(clamp(index - 1)); }
        if (event.key === 'ArrowRight') { event.preventDefault(); setIndex(clamp(index + 1)); }
      }}
    >
      {photoIds.map((id, i) => {
        const url = urls[id];
        if (!url) return null;
        return (
          <img
            key={id}
            src={url}
            alt=""
            draggable={false}
            // Every frame stays mounted and decoded, so turning does not flash
            // white while the browser reads the next file.
            className={`absolute inset-0 w-full h-full object-cover ${i === index ? 'opacity-100' : 'opacity-0'}`}
          />
        );
      })}

      {count > 1 && (
        <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5">
          {photoIds.map((id, i) => (
            <span
              key={id}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === index ? 'bg-background' : 'bg-background/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
