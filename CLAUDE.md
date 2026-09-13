# Paula

Paula to konsumencka aplikacja webowa dla kobiet na rynku polskim: dobiera
ubrania do proporcji ciała, a nie do rozmiaru na metce.

## Filary produktu

**Fit Score liczy się z proporcji, nie z rozmiaru.** Wejściem są obwody
(biust, talia, biodra, opcjonalnie górne biodra) albo sylwetka wybrana ręcznie,
a nie „M" czy „38". Wynik to **ryzyko niedopasowania w konkretnym punkcie
ciała** — nigdy ocena wyglądu. Silnik jest czysty i przetestowany:
`src/lib/fit/`.

**Pętla „czy pasowało?" jest zbiorem danych, nie ankietą.** Odpowiedzi po
zakupie (`src/lib/fitFeedback.ts`) to materiał, na którym powstanie Fit Score
v2. Traktować je jak dane produktowe o najwyższej wartości, nie jak dodatek.

**Paula jest reaktywna.** Nie pokazuje niczego, dopóki użytkowniczka nie
poprosi. Żadnych powiadomień z własnej inicjatywy, żadnego dosypywania
rekomendacji, żadnego „a może jeszcze to". Ekran wyszukiwania startuje pusty i
to jest zamierzone.

## Język — zasady twarde

Nigdy: „wyszczupla", „ukrywa", „maskuje", „unikaj", „problematyczne partie",
„co Ci pasuje do figury", cokolwiek o wadze, BMI, diecie i zdrowiu.

Zawsze: arytmetyka i opis kroju. „Biodra masz o 12 cm szersze od talii, więc
prosta spódnica prawdopodobnie będzie ciągnąć w biodrze." Nazwy sylwetek
(klepsydra, gruszka, łyżka, prostokąt, odwrócony trójkąt) to **etykiety
proporcji**, nie komplementy i nie diagnozy.

To nie jest kwestia tonu. Modele, na których produkt stanie, są na licencji
OpenRAIL-M, której Attachment A zabrania wykorzystywania podatności grupy ze
względu na cechy fizyczne (pkt 8) i porad medycznych (pkt 10). Oceniający
język łamie licencję, nie tylko styl.

## Architektura

**Ekrany rozmawiają z danymi wyłącznie przez interfejsy z
`src/lib/backend/types.ts`.** Dotyczy to także wygenerowanego klienta
Supabase: importuje go jedynie `src/lib/backend/supabase.ts`, i to jest test
(`src/lib/backend/importBoundary.test.ts`), a nie ustalenie. Nowa funkcja nie dodaje ani jednego
bezpośredniego odwołania do `localStorage`, ani do Supabase. Dziś działa
adapter lokalny (`src/lib/backend/local.ts`), jutro ten sam kontrakt obsłuży
Supabase — i to jest jedyny powód, dla którego ta zamiana będzie tania.

Mapa gniazd, czyli co dokładnie trzeba podpiąć i gdzie:
**[`docs/integration-points.md`](docs/integration-points.md)**. Nie kopiować
jej tutaj — jest jedno źródło prawdy i to ono. Szkic schematu:
`docs/supabase-schema.draft.sql`. W kodzie: `grep -rn "PLUG(" src`.

Wyjątki od reguły są trzy i wszystkie są świadome:

- `paula-lang` w `localStorage` — język, czytany zanim istnieje jakikolwiek
  kontekst. **Odczyt i zapis są w try/catch**: przeglądarka z zablokowanymi
  danymi witryny rzuca na samym dostępie do `localStorage`, a to dzieje się w
  inicjalizatorze stanu przy pierwszym renderze.
- `paula.chat` w `sessionStorage` — wątek jednej wizyty, celowo nietrwały.
- `paula.feedSeed` w `sessionStorage` — ziarno tasowania kanału, żeby kolejność
  nie skakała przy każdym powrocie na listę.

Każdy z nich ma coś wspólnego: nie są danymi użytkowniczki, tylko stanem
jednej przeglądarki. Wszystko, co jest jej danymi, idzie przez kontrakt.

## Komendy

```bash
npm run dev                                # serwer deweloperski
npx vitest run                             # testy jednostkowe
npx tsc --noEmit -p tsconfig.app.json      # typy
npm run lint                               # eslint
npx playwright test                        # testy e2e (sam podnosi serwer)
```

Po każdej zmianie: `tsc` i `vitest` muszą przechodzić.

## Praca z Lovable

**Lovable commituje do `main`.** Zawsze `git pull` przed rozpoczęciem pracy —
inaczej commit powstaje na nieaktualnej bazie i push się odbija.

**Pracujemy prosto na `main`** (decyzja Antonia z 2026-09-13, [P10]). Powód jest
jeden i twardy: Lovable podciąga zmiany wyłącznie z `main`, więc praca na
branchu oznacza, że Gabriela nie widzi w podglądzie niczego, co powstało. Bramą
jakości są testy przed commitem, nie branch. Wcześniejsza reguła „przy większych
zmianach pracować na branchu" opisywała praktykę, której w tym projekcie nigdy
nie było — została usunięta zamiast być dalej ignorowana.

## Pulapki, ktore juz raz kosztowaly

- **Leniwe trasy i bramy.** Komponent bramy, ktory renderuje `null`, a potem
  przelacza sie na leniwie ladowane dziecko, wywoluje wyjatek Reacta
  „component suspended while responding to synchronous input" — a error
  boundary podmienia wtedy cala aplikacje na ekran awarii. Kazda taka brama
  potrzebuje `Suspense` bezposrednio pod soba (`RequireAuth`, `AppShell`).
- **Wejscie na zimno to inna sciezka niz nawigacja.** Test, ktory dociera na
  ekran, klikajac z innego ekranu, nie sprawdza zakladki ani odswiezenia.
- **`new QueryClient()` w tescie nie ma `MutationCache`**, w ktorej siedzi
  uniewaznianie zapytan. Uzywac `createQueryClient()`.
- **`query.data ?? []` tworzy nowa tablice przy kazdym renderze** i psuje
  tozsamosc callbackow nad nia. Wspolna stala `EMPTY` na poziomie modulu.
- **Stan poczatkowy `useState` nie zaktualizuje sie, gdy zapytanie sie
  rozwiaze.** Tak formularz „czy pasowalo?" otwieral sie pusty i kasowal
  wczesniejsze odpowiedzi przy zapisie.
- **Polska odmiana.** Tablice slow kluczowych dopasowujemy po rdzeniach.
- **`localStorage` rzuca**, a nie zwraca `null`, gdy przegladarka ma
  zablokowane dane witryny. Kazdy odczyt w `try/catch`.
- **Reguła zapisana w dokumencie nie obowiązuje.** Trzy rzeczy naprawione w
  sesji 4 były już opisane — zakaz przekreślonych cen (Omnibus), zakaz
  angielskiej prozy w `src/data/`, granica importu klienta Supabase — i
  wszystkie trzy i tak weszły do kodu. Regułę, która ma obowiązywać, piszemy
  jako test: `priceDisplay.test.tsx`, `i18n/coverage.test.ts`,
  `backend/importBoundary.test.ts`, `i18n/language-doctrine.test.ts`.
- **Liczba pokazana jako procent z kolorowym paskiem czyta się jak pomiar.**
  `qualityScore` (88, 65, 82…) był wymyślony per produkt i wyglądał
  wiarygodniej niż Fit Score, który jest liczony naprawdę. Jeśli liczby nie da
  się wyprowadzić regułą, którą można wypisać obok niej — nie pokazujemy jej.

## Zasady zmian

- Jeden commit = jedna naprawa. Wiadomość po polsku, w trybie rozkazującym.
- Każda zmiana logiki dostaje test w vitest. Bez testu nie ma commita.
- `src/components/ui/**` to shadcn — nie ruszamy bez wyraźnej prośby.
- Żadnych nowych zależności bez pytania.
- Nie refaktoryzujemy przy okazji. Widzisz coś obok — dopisz do listy.
- Pytaj przed: zmianą schematu bazy, usuwaniem kodu i plików, wyjściem poza
  zakres zadania, wszystkim, co dotyka danych wrażliwych.

## Czego nie robimy

- **Nie robimy z aplikacji zależnej od Lovable Cloud.** Cloud jest włączony od
  2026-09-10 na projekcie właścicielki produktu (ona właścicielem, Antonio
  administratorem), więc reguła „nie włączamy Supabase" przestała opisywać
  rzeczywistość. Zastąpiła ją węższa: **domyślnym backendem zostaje `local`**,
  a `src/integrations/supabase/client.ts` importuje wyłącznie
  `src/lib/backend/supabase.ts` (pilnuje `importBoundary.test.ts`). Do `.env`
  nie wchodzi nic poza kluczem publicznym. Serwer MCP stoi na `auth: none`,
  więc żadne jego narzędzie nie dotyka danych użytkowniczki. Sprawdzone
  2026-09-13: żadne z trzech narzędzi (`classify_body_shape`,
  `search_products`, `score_product_fit`) nie importuje z
  `src/lib/backend/**` — biorą pomiary jako parametry wywołania i czytają
  wyłącznie wspólny katalog mockowy i czysty silnik dopasowania, więc
  `auth: none` nie wystawia niczyjego profilu. `mcpBoundary.test.ts` pilnuje,
  żeby to zostało prawdą.
- **Zapis zdjęcia sylwetki jest świadomy albo nie ma go wcale.** Od 2026-09-13
  budujemy pomiar ze zdjęcia, więc reguła „nie zapisujemy zdjęć" przestała
  opisywać rzeczywistość. Zastąpiła ją węższa: każda ścieżka, którą przechodzi
  obraz, ma zaprojektowane miejsce zapisu, czas życia i sposób skasowania —
  nigdy przypadkowy efekt uboczny (log body requestu, cache z inputem, Sentry z
  załącznikiem). Zdjęcia wgrywają wyłącznie Antonio i Gabriela, testując na
  sobie, dopóki produkt nie jest skończony i przejrzany prawnie.
- Nie dodajemy funkcji, które udają, że działają. Jeśli czegoś nie umiemy
  policzyć, mówimy to wprost w interfejsie — patrz nota „demo" przy opiniach i
  przy cenie odniesienia dla dupes.
