/**
 * Wymiary ciała przyjmowane z pomiaru ze zdjęcia.
 *
 * Ten plik jest w całości czysty i to jest celowe: jedyną rzeczą, która
 * decyduje, co z odpowiedzi modelu wchodzi do aplikacji, ma być funkcja, którą
 * da się przetestować bez sieci.
 *
 * **Biała lista, nie czarna.** Ścieżka MHR zwraca dziś wyłącznie geometrię
 * ubraniową — masy, BMI ani tkanki tłuszczowej w tej odpowiedzi nie ma. Filtr i
 * tak wypisuje pola po nazwie, bo reguła oparta na tym, że dostawca czegoś nie
 * przysłał, przestaje obowiązywać w dniu, w którym dostawca zmieni zdanie.
 * Zakaz jest twardy: język tego produktu nie dotyka wagi i zdrowia, a licencja
 * modeli, na których produkt stanie (OpenRAIL-M, Attachment A pkt 10), zakazuje
 * porad medycznych.
 */

/** Jedyne pola, które wolno przepisać z odpowiedzi modelu. Kolejność = kolejność w UI. */
export const CLOTHING_FIELDS = [
  'heightCm',
  'bust',
  'waist',
  'hips',
  'stomach',
  'thigh',
  'upperArm',
  'inseam',
  'shoulderWidth',
  'sleeveLength',
  'knee',
  'calf',
  'wrist',
  'crotchLength',
  'frontRise',
  'backRise',
  'shirtLength',
] as const;

export type ClothingField = (typeof CLOTHING_FIELDS)[number];

/** Wymiary ubraniowe w centymetrach. Wszystkie opcjonalne — model bywa niepewny. */
export type ClothingMeasurements = Partial<Record<ClothingField, number>>;

/**
 * Nazwy pól tak, jak przychodzą z `clad_body.measure.mhr` (snake_case, sufiks
 * `_cm`). Mapa jest jawna, żeby zmiana nazwy po tamtej stronie wywaliła test, a
 * nie po cichu przemilczała wymiar.
 */
const FROM_CLAD: Record<string, ClothingField> = {
  height_cm: 'heightCm',
  bust_cm: 'bust',
  waist_cm: 'waist',
  hip_cm: 'hips',
  stomach_cm: 'stomach',
  thigh_cm: 'thigh',
  upperarm_cm: 'upperArm',
  inseam_cm: 'inseam',
  shoulder_width_cm: 'shoulderWidth',
  sleeve_length_cm: 'sleeveLength',
  knee_cm: 'knee',
  calf_cm: 'calf',
  wrist_cm: 'wrist',
  crotch_length_cm: 'crotchLength',
  front_rise_cm: 'frontRise',
  back_rise_cm: 'backRise',
  shirt_length_cm: 'shirtLength',
};

/**
 * Obwód poniżej tej wartości albo powyżej niej to nie jest ciało dorosłej
 * osoby, tylko zdjęcie, na którym model znalazł coś innego — kanapę, dwie
 * osoby, odbicie w lustrze. Lepiej nie pokazać wymiaru niż pokazać wymyślony.
 */
const PLAUSIBLE_CM = { min: 5, max: 250 };

function plausible(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= PLAUSIBLE_CM.min
    && value <= PLAUSIBLE_CM.max;
}

/**
 * Przepisuje z odpowiedzi modelu wyłącznie wymiary ubraniowe.
 *
 * Wszystko spoza białej listy przepada bez śladu — łącznie z `mass_kg`, `bmi` i
 * `body_fat_pct`, gdyby kiedykolwiek się tam pojawiły.
 */
export function pickClothingMeasurements(raw: unknown): ClothingMeasurements {
  if (!raw || typeof raw !== 'object') return {};
  const out: ClothingMeasurements = {};
  for (const [key, field] of Object.entries(FROM_CLAD)) {
    const value = (raw as Record<string, unknown>)[key];
    if (plausible(value)) out[field] = Math.round(value * 10) / 10;
  }
  return out;
}

/**
 * Czy z tego pomiaru da się w ogóle policzyć Fit Score.
 *
 * FFIT potrzebuje trzech obwodów. Bez któregoś z nich mamy ciekawostkę, a nie
 * profil — i tak to trzeba nazwać w interfejsie, zamiast zapisywać połowę.
 */
export function hasCoreMeasurements(m: ClothingMeasurements): m is ClothingMeasurements &
  Record<'bust' | 'waist' | 'hips', number> {
  return typeof m.bust === 'number' && typeof m.waist === 'number' && typeof m.hips === 'number';
}

/**
 * Kotwiczenie pomiaru ze zdjęcia jedną liczbą z taśmy.
 *
 * Zmierzone na dwóch ciałach 2026-09-13: model myli się co do **rozmiaru**
 * ciała, ale nie co do **proporcji**. Na osobie oddalonej od środka rozkładu
 * wyszło +10,6 cm na biuście, +10,6 na talii i +10,8 na biodrach — trzy prawie
 * identyczne błędy. Skoro przesunięcie jest wspólne, wystarczy je zmierzyć na
 * jednym obwodzie i odjąć od pozostałych.
 *
 * Wynik po zakotwiczeniu na talii: biust 0,0 cm błędu i biodra +0,2 cm na
 * ciele kobiety, biodra −0,1 cm na drugim. Pełny wywód i zastrzeżenia:
 * `docs/photo-measurement.md`.
 *
 * Kotwicą jest **talia**, bo to jedyny obwód, który człowiek znajduje na sobie
 * bez pomyłki — biust i biodra to właśnie te, których nie da się porządnie
 * zmierzyć samemu i po które sięgamy do zdjęcia.
 */
export function anchorToWaist(
  fromPhoto: ClothingMeasurements,
  waistFromTape: number,
): ClothingMeasurements {
  if (typeof fromPhoto.waist !== 'number') return fromPhoto;
  const offset = waistFromTape - fromPhoto.waist;
  const shifted: ClothingMeasurements = {};
  for (const field of CLOTHING_FIELDS) {
    const value = fromPhoto[field];
    if (typeof value !== 'number') continue;
    // Wzrostu nie ruszamy: przesunięcie jest wspólne dla **obwodów**, a wzrost
    // nie jest obwodem i model myli się w nim inaczej (i tak go nie czytamy).
    shifted[field] = field === 'heightCm' ? value : Math.round((value + offset) * 10) / 10;
  }
  shifted.waist = waistFromTape;
  return shifted;
}
