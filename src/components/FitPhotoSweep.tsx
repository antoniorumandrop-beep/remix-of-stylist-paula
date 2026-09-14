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
 *
 * Two things make it read as a turn rather than as photos swapping:
 *
 * - It plays itself once when the fit opens. A gif turns on its own; stepping
 *   through frames by hand never feels like one, however good the transition.
 * - A stepped frame arrives a few pixels off and settles. Both the leaving and
 *   the arriving frame travel the same way, which is what the eye reads as
 *   rotation — while a drag keeps the plain hard cut, because under a moving
 *   finger any easing is lag.
 */

/**
 * How far a stepped frame starts from where it settles, and how much bigger
 * than the frame every photo is drawn.
 *
 * Both in percent of the frame's own width, and the overscan is deliberately
 * the larger of the two: a fixed pixel offset went past a fixed overscan on a
 * narrow phone and uncovered a strip of background mid-step. As percentages the
 * one can never outrun the other, whatever the screen.
 */
const PARALLAX = 3;
const OVERSCAN = 1.07;

export function FitPhotoSweep({
  photoIds,
  className = 'aspect-[3/4]',
  autoplay = false,
}: {
  photoIds: string[];
  className?: string;
  autoplay?: boolean;
}) {
  const { t } = useLanguage();
  const urls = useFitPhotoUrls(photoIds);
  const [index, setIndex] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [playing, setPlaying] = useState(autoplay);
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; from: number; moved: boolean } | null>(null);

  /**
   * Tylko te zdjęcia, które naprawdę się wczytały. Kropka bez klatki wyglądała
   * jak zepsuty ekran, a obrót zatrzymywał się na pustym kadrze — zdarza się,
   * gdy przeglądarka wyczyści dane witryny spod zapisanego fitu.
   */
  const shown = photoIds.filter(id => urls[id]);
  const count = shown.length;
  const clamp = (value: number) => Math.max(0, Math.min(count - 1, value));
  /**
   * Liczone przy rysowaniu, nie trzymane w stanie: liczba klatek spada także
   * wtedy, gdy któreś zdjęcie się nie wczyta, a wtedy zapamiętany numer
   * wskazuje poza to, co widać, i kadr jest pusty do pierwszego ruchu.
   */
  const active = clamp(index);
  /**
   * Ile jedna klatka stoi podczas samoczynnego obrotu. Więcej klatek to mniejszy
   * kąt między nimi, więc krótsze przytrzymanie — czas całego obrotu zostaje
   * mniej więcej ten sam.
   */
  const hold = count > 4 ? 170 : 300;
  /**
   * Klatka, która schodzi. Trzymana nieprzezroczysta POD wchodzącą, a nie
   * wygaszana razem z nią: gdyby obie przenikały naraz, w połowie przejścia
   * prześwitywałoby tło i obrót gasłby na moment.
   */
  const previous = useRef(0);
  const behind = playing ? previous.current : -1;

  useEffect(() => { previous.current = active; });

  // Editing a fit can take a photo away from under the finger.
  useEffect(() => {
    setIndex(current => Math.min(current, Math.max(photoIds.length - 1, 0)));
  }, [photoIds.length]);

  /**
   * One turn there and back, then it rests. A loop that never stops turns the
   * page into a shop window and eats a phone battery; one pass says "these are
   * angles of the same look, drag me" without being asked.
   */
  useEffect(() => {
    if (!playing) return;
    // Bez `setPlaying(false)`: przy pierwszym rysowaniu żadne zdjęcie nie jest
    // jeszcze wczytane, więc klatek jest zero. Wyłączenie tutaj gasiło obrót
    // na zawsze, zanim w ogóle miał co obracać.
    if (count < 2) return;
    // Ruch, którego nie da się zatrzymać, jest dla części osób nie do
    // zniesienia — ustawienie systemowe wyłącza go, a nie tylko spowalnia.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setPlaying(false);
      return;
    }
    let at = 0;
    let direction = 1;
    // Chwila zwłoki: klatki zdążą się zdekodować, a ekran nie rusza się już
    // w momencie, w którym ona na niego patrzy.
    let timer = window.setTimeout(function step() {
      if (at === count - 1) direction = -1;
      at += direction;
      setIndex(at);
      // Obrót kończy się dopiero po ostatnim przenikaniu, a nie w chwili
      // powrotu na pierwszą klatkę — inaczej ostatni krok jako jedyny
      // przeskakiwał twardo.
      timer = window.setTimeout(at === 0 ? () => setPlaying(false) : step, hold);
    }, 420);
    return () => window.clearTimeout(timer);
  }, [playing, count, hold]);

  if (photoIds.length === 0) return null;

  /**
   * A full drag across the frame covers every angle, so the gesture feels the
   * same whether there are two photos or four.
   */
  const step = () => Math.max(24, (frame.current?.clientWidth ?? 300) / Math.max(count, 1));

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
        setPlaying(false);
        drag.current = { x: event.clientX, from: active, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        if (!drag.current) return;
        const delta = event.clientX - drag.current.x;
        // Wyłączane dopiero przy ruchu, nie przy dotknięciu: gdyby przejście
        // znikało już na wciśnięciu, stuknięcie zmieniałoby klatkę i przejście
        // w tym samym rysowaniu, a wtedy przeglądarka nic nie animuje.
        if (Math.abs(delta) > 4 && !drag.current.moved) {
          drag.current.moved = true;
          setScrubbing(true);
        }
        setIndex(clamp(drag.current.from - Math.round(delta / step())));
      }}
      onPointerUp={event => {
        const gesture = drag.current;
        drag.current = null;
        setScrubbing(false);
        if (!gesture || gesture.moved || count < 2) return;
        // A tap is not a failed drag: on a mouse, halves of the frame are the
        // obvious way to turn, and nobody drags a photo with a trackpad.
        const box = event.currentTarget.getBoundingClientRect();
        setIndex(clamp(active + (event.clientX - box.left < box.width / 2 ? -1 : 1)));
      }}
      onPointerCancel={() => { drag.current = null; setScrubbing(false); }}
      onKeyDown={event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        setPlaying(false);
        setIndex(clamp(active + (event.key === 'ArrowLeft' ? -1 : 1)));
      }}
    >
      {shown.map((id, i) => (
          <img
            key={id}
            src={urls[id]}
            alt=""
            draggable={false}
            style={{
              // Klatki przed aktywną czekają z lewej, za nią z prawej, więc
              // przy każdym kroku obie — ta wchodząca i ta schodząca — jadą
              // w tę samą stronę. To dopiero czyta się jako obrót.
              transform: `translateX(${i === active ? 0 : i < active ? -PARALLAX : PARALLAX}%) scale(${OVERSCAN})`,
              // Przenikanie TYLKO w samoczynnym obrocie. Przy stuknięciu i przy
              // przeciąganiu zostaje twarde cięcie: tam ona sama steruje
              // tempem, a rozmycie między kadrami czyta się wtedy jako
              // opóźnienie, nie jako ruch.
              transition: scrubbing
                ? 'none'
                : playing && i === active
                  ? `transform ${hold}ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity ${hold}ms linear`
                  : 'transform 260ms cubic-bezier(0.22, 0.61, 0.36, 1)',
              zIndex: i === active ? 2 : i === behind ? 1 : 0,
            }}
            // Every frame stays mounted and decoded, so turning does not flash
            // white while the browser reads the next file.
            className={`absolute inset-0 w-full h-full object-cover ${i === active || i === behind ? 'opacity-100' : 'opacity-0'}`}
          />
      ))}

      {count > 1 && (
        <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5">
          {shown.map((id, i) => (
            <span
              key={id}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === active ? 'bg-background' : 'bg-background/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
