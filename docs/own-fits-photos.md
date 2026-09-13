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
przewija między kątami. Z 5 MB robi się 300–500 KB, czyli fit z czterema
zdjęciami waży mniej niż dwa megabajty. To także przyspieszy pierwszy upload w
dniu, w którym wejdzie Supabase Storage.

HEIC odbija się **osobnym komunikatem**, nie ogólną awarią — tym samym wzorcem,
co przy pomiarze. To domyślny format iPhone'a, więc jest to najczęstszy
sposób, w jaki to nie zadziała.

## Czas życia i kasowanie

- **Zdjęcie wyjęte z fitu** ginie natychmiast, razem z zapisem fitu.
- **Skasowany fit** zabiera swoje zdjęcia ze sobą (`deleteOutfit` woła
  `photos.remove` dla każdego). Żadnych osieroconych bajtów.
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
