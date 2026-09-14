# Zdjęcia własnych fitów — gdzie ląduje plik

Ten dokument jest odpowiednikiem [`photo-measurement.md`](photo-measurement.md)
dla drugiej ścieżki, którą w Pauli przechodzi obraz. Reguła z `CLAUDE.md` jest
ta sama — „zapis zdjęcia jest świadomy albo nie ma go wcale" — ale **wynik jest
przeciwny i to jest zamierzone**.

Przy pomiarze zdjęcie jest **wejściem**: model liczy z niego siatkę, a plik nie
dotyka dysku po naszej stronie ani razu. Tutaj zdjęcie **jest treścią** — fit bez
zdjęcia to lista zakupowa. Więc plik musi zostać, a „świadomy" znaczy: nazwane
miejsce, znany czas życia, jeden przycisk, który kasuje.

## Ścieżka pliku, sekunda po sekundzie

| gdzie | co się dzieje | czy zostaje |
|---|---|---|
| `<input type="file" multiple>` | wybiera zdjęcia z galerii albo robi je aparatem | oryginał zostaje u niej na dysku, my dostajemy `File` |
| canvas w pamięci karty | skalowanie do 1600 px po dłuższym boku, JPEG 0.85 | nie — przeżywa tylko wynik, ~300–500 KB |
| IndexedDB `paula.photos`, store `photos` | blob pod wygenerowanym kluczem `p-<czas>-<losowe>` | **zostaje**, aż ona skasuje zdjęcie albo cały fit |
| `Outfit.photoIds` w `localStorage` | **same klucze**, nigdy bajty | zostaje |
| `blob:` URL w karcie | podglądem na ekranie, odwoływany przy odmontowaniu | znika razem z widokiem |
| sieć | **nic nie wychodzi** | nie ma żądania, nie ma dostawcy, nie ma nagłówka do ustawienia |

**Zdjęcie fitu nie opuszcza przeglądarki.** Nie ma tu fal.ai, nie ma middleware
dev-serwera, nie ma modelu, który cokolwiek z niego czyta. To album, nie pomiar
— dlatego art. 50 ust. 3 AI Act nie ma tu zastosowania, w przeciwieństwie do
ścieżki pomiarowej. Nie ma też nic do dopisania do `.gitignore`: plik nigdy nie
istnieje w systemie plików.

## Dlaczego IndexedDB, a nie localStorage

To nie jest kwestia gustu, tylko arytmetyki. Zdjęcie z telefonu ma 3–6 MB,
`data:` URI dokłada jedną trzecią, a cały origin ma do dyspozycji około 5 MB —
dzielone z profilem ciała, szafą, kolekcjami i zaimportowanym katalogiem.
Trzeci fit rzuciłby wyjątkiem **przy zapisie**, czyli w najgorszym możliwym
momencie: po tym, jak ona wybrała zdjęcia i nacisnęła „Zapisz".

IndexedDB trzyma bloby natywnie, bez base64, bez praktycznego limitu i kasuje po
kluczu. Kosztuje asynchroniczne API, ale każda metoda kontraktu i tak jest
`async` — dokładnie z tego powodu.

Bez biblioteki. `idb` byłoby zależnością za dwanaście linijek kodu, a cała
używana powierzchnia to `open`, `put`, `get`, `delete`.

## Skalowanie jest częścią zapisu, nie optymalizacją

1600 px po dłuższym boku wystarcza na pełnoekranowy podgląd na telefonie z
ekranem retina, a `blob:` URL z pliku 400 KB dekoduje się natychmiast, gdy ona
przewija między kątami. Z 3 MB robi się ~200 KB, czyli fit z ośmioma zdjęciami
waży mniej niż dwa megabajty. To także przyspieszy pierwszy upload w dniu, w
którym wejdzie Supabase Storage.

Sprawdzone 2026-09-14 na zdjęciu prosto z iPhone'a: zapisane 1200 × 1600, czyli
**przeglądarka sama zastosowała znacznik obrotu z EXIF-u**, zanim obraz trafił
na canvas. Gdyby go zignorowała, wyszłoby 1600 × 1200 i fit leżałby na boku.

Górna granica to **osiem zdjęć**, nie cztery. Nie chodzi o miejsce, tylko o to,
że cztery klatki na 120° to 40° na krok — oko czyta to jako podmianę zdjęcia,
a nie jako obrót.

## HEIC nie dojeżdża do dekodera i nie powinien

Pola wyboru pliku proszą wprost o `image/jpeg,image/png,image/webp`, bez HEIC-a.
To nie jest kosmetyka: iPhone, który widzi listę bez HEIC-a, **sam oddaje JPEG**,
a na komputerze pliki, których i tak nie umiemy odczytać, wyszarzają się w oknie
wyboru zamiast odbijać się komunikatem po fakcie.

Komunikat o HEIC zostaje mimo to, bo `accept` jest podpowiedzią, nie zaporą:
plik da się przeciągnąć albo wybrać w przeglądarce, która ten atrybut zignoruje.
Odbija się wtedy **osobnym komunikatem**, nie ogólną awarią — tym samym wzorcem,
co przy pomiarze.

## Skan: druga sylwetka obok oryginału

„Zrób z tego skan" wycina pokój i zostawia samą sylwetkę. Powód jest jeden i nie
jest estetyczny: **przy cięciu między klatkami skacze tło**, bo telefon stał
odrobinę gdzie indziej — i to ono psuje złudzenie obrotu. Bez tła zmienia się
już tylko ciało i ubranie.

- **Świadomy krok, nie efekt uboczny wgrania.** Zdjęcie wyjeżdża z telefonu
  dopiero wtedy, gdy ona naciśnie przycisk, a zdanie o tym stoi pod przyciskiem
  i widać je bez przewijania. Płacimy też tylko za te fity, które mają być
  pokazane.
- **Oryginał zostaje.** `Outfit.cutouts` to mapa `id zdjęcia → id wycinka`, więc
  zły wycinek da się cofnąć („Usuń skan"), a gdy zmienimy model na lepszy, stare
  fity przeliczą się z tego, co już mamy. Wycinki **nie są polem `OutfitDraft`**
  — gdyby jechały ze szkicem, edytor zapisujący zmianę nazwy kasowałby skan bez
  niczyjego zauważenia.
- **Model oddaje maskę, nie gotowy wycinek.** Sklejenie robi przeglądarka, więc
  wycinek zachowuje rozdzielczość i nie przechodzi drugi raz przez kompresję.
  Zapisujemy WebP, bo wycinek musi mieć przezroczystość, a PNG tej samej
  sylwetki waży kilka razy więcej.
- **Wycięcie tła to dopiero połowa. Druga to wyrównanie.** Wycinek nie jest
  zdjęciem z przezroczystym tłem — jest sylwetką wstawioną w kadr 1200 × 1600
  wspólny dla całego fitu: środkiem w poziomie, czubkiem głowy na 10% wysokości,
  wysokość ujednolicona względem **mediany** pozostałych klatek i ograniczona do
  ±15% od niej. Mediana i ograniczenie są po to, żeby klatka z uciętymi stopami
  nie spuchła i nie pociągnęła za sobą reszty. Bez wyrównania sylwetka skacze
  między klatkami dokładnie tak, jak przed skanem.
- **Skan pokazujemy dopiero, gdy KAŻDE zdjęcie ma wycinek.** Pół fitu bez tła i
  pół z pokojem wygląda jak awaria; zdjęcie dołożone później trzeba przeskanować
  razem z resztą, bo wyrównanie liczy się ze wszystkich klatek naraz.

Model: `fal-ai/sam-3/image`, ta sama rodzina i licencja co pomiar. **BiRefNet
odpadł na trzecim sprawdzianie licencji** — wagi oznaczone MIT, ale wytrenowane
na DIS5K, który zakazuje komercji także po przetworzeniu. Wywód w `CLAUDE.md`.
Reguły prywatności: `vite-plugins/cutout-photo.ts`, pilnuje ich
`src/lib/cutoutPlugin.test.ts`.

## Czas życia i kasowanie

- **Zdjęcie wyjęte z fitu** ginie natychmiast, razem z zapisem fitu.
- **Skasowany fit** zabiera swoje zdjęcia ze sobą (`deleteOutfit` woła
  `photos.remove` dla każdego). Żadnych osieroconych bajtów.
- **Zdjęcie wyjęte z fitu zabiera swój wycinek**, a „Usuń skan" kasuje wszystkie
  — wycinek bez oryginału jest niewidzialny, bo pokazuje się go zawsze na
  miejscu zdjęcia, z którego powstał.
- **Kasowanie jest best-effort i to jest świadome**: jeśli blob już nie istnieje
  albo przeglądarka odmawia dostępu do magazynu, fit i tak musi zniknąć z
  ekranu. Zostawienie go, bo nie udało się sprzątnąć, byłoby gorsze — a
  osierocony blob jest niewidoczny i skończony.

## Przeglądarka, która nie umie przechowywać zdjęć

Odczyt `indexedDB` **sam rzuca** w przeglądarce z zablokowanymi danymi witryny —
ta sama pułapka, na której ten projekt przejechał się już z `localStorage`.
Dlatego `photos.available()` jest w `try/catch`, jest synchroniczne (ekran musi
zdecydować, czy w ogóle pokazać wybór plików, zanim go wyrenderuje), a ekran
mówi wprost, że w tej przeglądarce fit zapisze się bez zdjęć. Nie udaje, że
picker działa.

## Gdy wejdzie Supabase

Mapowanie jest w komentarzu `supabase.ts`: prywatny bucket `fit-photos`, jeden
folder na użytkowniczkę (`<auth.uid()>/<id zdjęcia>`), a `Outfit.photoIds`
przechowuje nazwy obiektów. Ekrany nie dowiadują się, co to bucket.

Jedna rzecz musi się wtedy zmienić i dlatego **nie jest napisana na sztywno**:
napis pod wyborem plików mówi „Zdjęcia zostają na Twoim urządzeniu" tylko
dlatego, że czyta `backend.name`. Z serwerem za plecami to przestanie być
prawdą, a napis, który jest funkcją backendu, nie ma jak skłamać.

## Kto dziś wgrywa

Tak jak przy pomiarze: **wyłącznie Antonio i Gabriela, testując na sobie**,
dopóki produkt nie jest skończony i przejrzany prawnie. Ta ścieżka jest jednak
łagodniejsza — obraz nie wychodzi z przeglądarki i żaden model go nie czyta,
więc nie ma tu dostawcy, u którego trzeba by cokolwiek kasować.

## Co pilnuje, żeby to zostało prawdą

`e2e/fits.spec.ts` w prawdziwym Chromium: zapisany fit ma zdjęcie po
odświeżeniu, skasowany fit nie zostawia bloba, a odjęcie zdjęcia usuwa je od
razu. W vitest tego nie ma i nie będzie — jsdom nie implementuje ani
IndexedDB, ani canvasu, a atrapa bazy potrafi przejść w chwili, w której
prawdziwe API pada.
