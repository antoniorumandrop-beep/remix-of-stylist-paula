/**
 * Skan fitu: sylwetka bez tła, w kadrach ustawionych względem siebie.
 *
 * Po co w ogóle: przy cięciu między dwiema klatkami tego samego fitu telefon
 * stał odrobinę gdzie indziej, więc **skacze pokój**, i to on psuje złudzenie
 * obrotu. Gdy tła nie ma, zmienia się już tylko ciało i ubranie.
 *
 * Tło to jednak dopiero połowa. Druga połowa to **wyrównanie**: jeśli na
 * jednym zdjęciu stoi bliżej albo bardziej z lewej, sylwetka przeskakuje i
 * obrót znów rozpada się na osobne zdjęcia. Dlatego wycinek nie jest samym
 * zdjęciem z wyciętym tłem — jest sylwetką wstawioną w kadr wspólny dla całego
 * fitu.
 *
 * Maskę liczy `vite-plugins/cutout-photo.ts` (SAM 3). Sklejenie robimy tutaj,
 * a nie po stronie modelu, żeby wycinek zachował naszą rozdzielczość i nie
 * przechodził drugi raz przez kompresję.
 */

const ENDPOINT = '/__paula/cutout-photo';

/** Kadr wycinka. Te same proporcje, w których obrót jest pokazywany. */
const TARGET_W = 1200;
const TARGET_H = 1600;

/**
 * Ile wysokości kadru zajmuje sylwetka i gdzie ląduje czubek głowy.
 *
 * Liczby wyglądają na zbyt ostrożne, dopóki nie pamięta się, że obrót rysuje
 * klatki powiększone o `OVERSCAN` (`FitPhotoSweep`) — inaczej klatka wjeżdżająca
 * z boku odsłoniłaby na moment tło. To powiększenie zjada po 3,5% z każdej
 * krawędzi, więc sylwetka od 10% do 90% wysokości pliku pokazuje się z
 * marginesem 7% u góry i 7% u dołu. Przy 0,86 i 0,06 głowa dotykała krawędzi i
 * kadr czytał się jak przycięty, a nie jak studyjny.
 */
const FILL = 0.80;
const HEAD_TOP = 0.10;

/**
 * O ile pojedyncza klatka może odstawać skalą od reszty.
 *
 * Bez tego ograniczenia klatka, na której nie widać stóp, miałaby zmierzoną
 * sylwetkę krótszą, niż jest naprawdę — i zostałaby powiększona, żeby „dorosła"
 * do pozostałych. Wyszłaby z tego osoba, która w połowie obrotu puchnie.
 */
const SCALE_TOLERANCE = 0.15;

/** Prostokąt, w którym mieści się sylwetka, w pikselach zdjęcia. */
export interface SubjectBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export class ScanFailed extends Error {
  constructor(readonly kind: 'no-person' | 'not-configured' | 'failed') {
    super(`scan failed: ${kind}`);
    this.name = 'ScanFailed';
  }
}

/**
 * Skale dla kolejnych klatek.
 *
 * Punktem odniesienia jest **mediana** wysokości sylwetki, nie każda klatka z
 * osobna: jedna klatka z uciętymi stopami nie ma wtedy prawa pociągnąć za sobą
 * całego fitu. Każda klatka dostaje własną skalę, ale nie dalej niż
 * `SCALE_TOLERANCE` od tej wspólnej — czyli różnicę „stanęła pół kroku bliżej"
 * wyrównujemy, a „nie widać jej nóg" zostawiamy w spokoju.
 */
export function alignScales(subjectHeights: number[], targetHeight = FILL * TARGET_H): number[] {
  const usable = subjectHeights.filter(h => h > 0);
  if (usable.length === 0) return subjectHeights.map(() => 1);
  const sorted = [...usable].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const common = targetHeight / median;
  const low = common * (1 - SCALE_TOLERANCE);
  const high = common * (1 + SCALE_TOLERANCE);
  return subjectHeights.map(height => {
    if (height <= 0) return common;
    return Math.min(high, Math.max(low, targetHeight / height));
  });
}

/**
 * Gdzie postawić przeskalowane zdjęcie, żeby sylwetka trafiła na swoje miejsce.
 *
 * W poziomie środkiem sylwetki, bo mogła stanąć z lewej albo z prawej. W pionie
 * **czubkiem głowy**, a nie środkiem: głowa jest w kadrze praktycznie zawsze,
 * a stopy bywają ucięte — anker na środku przesuwałby wtedy twarz w górę i w
 * dół przy każdym kroku obrotu.
 */
export function placeSubject(box: SubjectBox, scale: number): { dx: number; dy: number } {
  const centreX = (box.x0 + box.x1) / 2;
  return {
    dx: TARGET_W / 2 - centreX * scale,
    dy: HEAD_TOP * TARGET_H - box.y0 * scale,
  };
}

function decode(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new ScanFailed('failed')); };
    image.src = url;
  });
}

/** Najmniejszy prostokąt obejmujący nieprzezroczyste piksele, albo `null`. */
function alphaBox(ctx: CanvasRenderingContext2D, width: number, height: number): SubjectBox | null {
  const { data } = ctx.getImageData(0, 0, width, height);
  // Co drugi piksel: przy 1200 × 1600 to nadal ćwierć miliona próbek, a ramka
  // sylwetki nie potrzebuje dokładności do piksela.
  const step = 2;
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y += step) {
    const row = y * width * 4;
    for (let x = 0; x < width; x += step) {
      // Próg, a nie zero: model daje miękką krawędź, a ledwie widoczny piksel
      // nie powinien rozciągać ramki na pół kadru.
      if (data[row + x * 4 + 3] <= 24) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

interface Cut {
  canvas: HTMLCanvasElement;
  box: SubjectBox;
}

async function requestMask(photo: Blob): Promise<Blob> {
  const image = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ScanFailed('failed'));
    reader.readAsDataURL(photo);
  });

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image }),
    });
  } catch {
    throw new ScanFailed('failed');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { code?: string } | null;
    const kind = body?.code === 'no-person' || body?.code === 'not-configured' ? body.code : 'failed';
    throw new ScanFailed(kind);
  }
  return response.blob();
}

async function cutOne(photo: Blob): Promise<Cut> {
  const mask = await requestMask(photo);
  const [image, masked] = await Promise.all([decode(photo), decode(mask)]);

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ScanFailed('failed');

  ctx.drawImage(image, 0, 0);
  // Maska przychodzi w rozdzielczości źródła, ale rozciągnięcie jej na wszelki
  // wypadek nic nie kosztuje, a chroni przed cichym przesunięciem o piksele.
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(masked, 0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-over';

  const box = alphaBox(ctx, canvas.width, canvas.height);
  // Maska bez ani jednego nieprzezroczystego piksela to to samo, co brak osoby
  // — i lepiej powiedzieć to tym samym zdaniem, niż oddać pusty kadr.
  if (!box) throw new ScanFailed('no-person');
  return { canvas, box };
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // WebP, bo wycinek musi mieć przezroczystość, a PNG z sylwetki 1200 × 1600
    // waży kilkakrotnie więcej. Przeglądarka, która nie umie WebP, sama odda
    // PNG — blob niesie swój typ, więc pokaże się tak samo.
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new ScanFailed('failed'))),
      'image/webp',
      0.92,
    );
  });
}

/**
 * Skanuje cały fit naraz i oddaje wycinki w tej samej kolejności.
 *
 * Po kolei, nie równolegle: każda klatka to osobne, płatne wywołanie modelu, a
 * postęp ma się dać pokazać zdaniem, które coś znaczy. Wyrównanie i tak
 * potrzebuje wszystkich ramek, zanim ustawi którąkolwiek.
 */
export async function scanFit(
  photos: Blob[],
  onProgress?: (done: number, total: number) => void,
): Promise<Blob[]> {
  const cuts: Cut[] = [];
  for (const photo of photos) {
    cuts.push(await cutOne(photo));
    onProgress?.(cuts.length, photos.length);
  }

  const scales = alignScales(cuts.map(cut => cut.box.y1 - cut.box.y0));
  return Promise.all(cuts.map(({ canvas, box }, index) => {
    const scale = scales[index];
    const { dx, dy } = placeSubject(box, scale);
    const framed = document.createElement('canvas');
    framed.width = TARGET_W;
    framed.height = TARGET_H;
    const ctx = framed.getContext('2d');
    if (!ctx) throw new ScanFailed('failed');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, dx, dy, canvas.width * scale, canvas.height * scale);
    return toBlob(framed);
  }));
}
