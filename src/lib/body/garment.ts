import * as THREE from 'three';

/**
 * Bielizna zrobiona z samej sylwetki.
 *
 * Anny nie ma ubrań, a naga siatka anatomiczna nie jest czymś, co da się komuś
 * pokazać — ani tym, po co ktoś przychodzi do aplikacji z ubraniami. Zamiast
 * doklejać obcą geometrię, która pasowałaby tylko do jednego ciała, bierzemy
 * trójkąty tej samej siatki i odsuwamy je o kilka milimetrów wzdłuż normalnych.
 * Przylega idealnie do każdej sylwetki, bo jest tą sylwetką.
 *
 * Pierwsze podejście przycinało to płaszczyznami i **obcięło razem z tułowiem
 * ręce**, bo płaszczyzna jest pozioma, a ręce przechodzą przez tę samą
 * wysokość. Dlatego wybór idzie po trójkątach, z osobnym odróżnieniem tułowia
 * od rąk: na danej wysokości wierzchołki układają się w trzy skupiska — lewa
 * ręka, tułów, prawa ręka — rozdzielone przerwą. Bierzemy to ze środka.
 *
 * Drugie podejście liczyło ten zakres **raz na cały pas** i wchodziło na
 * ramiona: przy barkach ręce zlewają się z tułowiem, więc najwyższy plasterek
 * nie ma przerwy i rozciągał zakres na całą resztę. Trzecie liczyło zakres
 * osobno dla każdego plasterka i **rozsypało pas w dziury** — trójkąt stojący
 * okrakiem na dwóch plasterkach o różnych zakresach wypadał w całości.
 *
 * Stoi na czwartym: zakresy liczone są dla każdego plasterka, ale do wyboru
 * trójkątów idzie ich **mediana**. Jedna wartość na cały pas, więc nie ma
 * czego rozdzielać, a pojedynczy plasterek przy barkach czy przy dłoni jej nie
 * przesuwa.
 *
 * Wysokości są ułamkami wzrostu i biorą się z tego, co mierzy `clad-body`:
 * biust wypada około 74% wzrostu, biodra około 48%, krok około 47%.
 */
export const GARMENT_OFFSET_M = 0.006;
const GARMENT_COLOR = 0x2f2b28;
/** Przerwa między ręką a tułowiem w postawie z opuszczonymi rękami. */
const LIMB_GAP_M = 0.025;
export const BANDS: { from: number; to: number }[] = [
  { from: 0.700, to: 0.775 }, // góra — pas na wysokości biustu, pod barkami
  { from: 0.430, to: 0.575 }, // dół — od kroku po talię
];

/** Która oś siatki jest pionem. Warsztat eksportuje Z do góry, three liczy Y. */
function upAxis(geometry: THREE.BufferGeometry): 'y' | 'z' {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  return box.max.z - box.min.z > box.max.y - box.min.y ? 'z' : 'y';
}

/**
 * Zakres w poprzek ciała zajmowany przez tułów na danej wysokości.
 *
 * Sortuje współrzędne w poprzek i szuka przerw szerszych niż `LIMB_GAP_M`.
 * Skupisko zawierające oś ciała to tułów; to po bokach to ręce. Gdy rąk nie ma
 * przy tej wysokości albo dotykają ciała, wychodzi jedno skupisko i bierzemy je
 * w całości — czyli w najgorszym razie zachowujemy się jak poprzednia wersja.
 */
export function torsoSpan(across: number[]): { min: number; max: number } {
  const sorted = [...across].sort((a, b) => a - b);
  let min = sorted[0];
  let max = sorted[sorted.length - 1];
  let lower = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] <= LIMB_GAP_M) continue;
    const upper = sorted[i - 1];
    if (lower <= 0 && upper >= 0) { min = lower; max = upper; break; }
    lower = sorted[i];
  }
  return { min, max };
}

/** Trójkąty siatki leżące w danym pasie tułowia, odsunięte na zewnątrz. */
export function garmentFrom(source: THREE.Mesh, band: { from: number; to: number }): THREE.Mesh | null {
  const geometry = source.geometry;
  // trimesh eksportuje GLB bez normalnych, a bez nich nie ma wzdłuż czego
  // odsunąć powierzchni — ani poprawnie cieniować samej skóry.
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const index = geometry.index;
  const up = upAxis(geometry);
  const box = geometry.boundingBox!;
  const low = up === 'z' ? box.min.z : box.min.y;
  const span = (up === 'z' ? box.max.z : box.max.y) - low;
  const fromUp = low + band.from * span;
  const toUp = low + band.to * span;

  const height = (i: number) => (up === 'z' ? position.getZ(i) : position.getY(i));

  // Pas dzielimy na plasterki i w każdym osobno odróżniamy tułów od rąk.
  // Dwadzieścia cztery na kilkanaście centymetrów to około pół centymetra na
  // plasterek — mniej niż grubość samego materiału.
  const SLICES = 24;
  const thickness = (toUp - fromUp) / SLICES;
  const sliceOf = (h: number) =>
    Math.min(SLICES - 1, Math.max(0, Math.floor((h - fromUp) / thickness)));

  const byslice: number[][] = Array.from({ length: SLICES }, () => []);
  for (let i = 0; i < position.count; i++) {
    const h = height(i);
    if (h < fromUp || h > toUp) continue;
    byslice[sliceOf(h)].push(position.getX(i));
  }
  const spans = byslice.filter(xs => xs.length > 0).map(torsoSpan);
  if (spans.length === 0) return null;
  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };
  const min = median(spans.map(span => span.min));
  const max = median(spans.map(span => span.max));

  const keep = (i: number) => {
    const h = height(i);
    if (h < fromUp || h > toUp) return false;
    const x = position.getX(i);
    return x >= min && x <= max;
  };

  const faces = index ? index.count / 3 : position.count / 3;
  const at = (f: number, corner: number) => (index ? index.getX(f * 3 + corner) : f * 3 + corner);
  const vertices: number[] = [];
  const normals: number[] = [];
  for (let f = 0; f < faces; f++) {
    const corners = [at(f, 0), at(f, 1), at(f, 2)];
    if (!corners.every(keep)) continue;
    for (const c of corners) {
      vertices.push(
        position.getX(c) + normal.getX(c) * GARMENT_OFFSET_M,
        position.getY(c) + normal.getY(c) * GARMENT_OFFSET_M,
        position.getZ(c) + normal.getZ(c) * GARMENT_OFFSET_M,
      );
      normals.push(normal.getX(c), normal.getY(c), normal.getZ(c));
    }
  }
  if (vertices.length === 0) return null;

  const cloth = new THREE.BufferGeometry();
  cloth.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  cloth.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return new THREE.Mesh(
    cloth,
    new THREE.MeshStandardMaterial({
      color: GARMENT_COLOR,
      roughness: 0.7,
      metalness: 0,
      // Wycinek ma otwarte brzegi, więc oglądany od środka pokazywałby dziurę.
      side: THREE.DoubleSide,
    }),
  );
}
