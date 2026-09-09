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
`src/lib/backend/types.ts`.** Nowa funkcja nie dodaje ani jednego
bezpośredniego odwołania do `localStorage`, ani do Supabase. Dziś działa
adapter lokalny (`src/lib/backend/local.ts`), jutro ten sam kontrakt obsłuży
Supabase — i to jest jedyny powód, dla którego ta zamiana będzie tania.

Mapa gniazd, czyli co dokładnie trzeba podpiąć i gdzie:
**[`docs/integration-points.md`](docs/integration-points.md)**. Nie kopiować
jej tutaj — jest jedno źródło prawdy i to ono. Szkic schematu:
`docs/supabase-schema.draft.sql`. W kodzie: `grep -rn "PLUG(" src`.

Wyjątki od reguły są dwa i oba są świadome: `paula-lang` (język, czytany zanim
istnieje jakikolwiek kontekst) i `paula.chat` w `sessionStorage` (wątek jednej
wizyty, celowo nietrwały).

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
inaczej commit powstaje na nieaktualnej bazie i push się odbija. Przy większych
zmianach pracować na branchu i scalać świadomie.

Uwaga na rozjazd, do rozstrzygnięcia z właścicielem repozytorium: dotychczasowy
tryb pracy w tym projekcie to commit i push prosto na `main`, bo Lovable
podciąga zmiany właśnie stamtąd i tylko wtedy widzi je w podglądzie. Reguła
„praca na branchu" i ten tryb wykluczają się przy zmianach, które mają od razu
trafić do Lovable.

## Zasady zmian

- Jeden commit = jedna naprawa. Wiadomość po polsku, w trybie rozkazującym.
- Każda zmiana logiki dostaje test w vitest. Bez testu nie ma commita.
- `src/components/ui/**` to shadcn — nie ruszamy bez wyraźnej prośby.
- Żadnych nowych zależności bez pytania.
- Nie refaktoryzujemy przy okazji. Widzisz coś obok — dopisz do listy.
- Pytaj przed: zmianą schematu bazy, usuwaniem kodu i plików, wyjściem poza
  zakres zadania, wszystkim, co dotyka danych wrażliwych.

## Czego nie robimy

- **Nie włączamy Supabase do końca projektu** — konto należy do właścicielki
  produktu. Wszystko ma być gotowe do podpięcia, nic podpięte.
- **Nie zapisujemy zdjęć sylwetki**, dopóki nie powstanie awatar i nie
  zostanie zamknięta ścieżka RODO.
- Nie dodajemy funkcji, które udają, że działają. Jeśli czegoś nie umiemy
  policzyć, mówimy to wprost w interfejsie — patrz nota „demo" przy opiniach i
  przy cenie odniesienia dla dupes.
