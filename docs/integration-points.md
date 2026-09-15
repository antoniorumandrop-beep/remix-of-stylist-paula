# Paula — punkty podpięcia

Stan na 2026-09-08. Aplikacja działa w całości bez backendu: dane użytkowniczki
w localStorage, katalog z mocków plus import od marek, Paula na regułach.
Wszystko, co trzeba kiedyś podpiąć, ma **jedno miejsce** i jest opisane tutaj.

Szybkie sprawdzenie, gdzie są gniazda:

```bash
grep -rn "PLUG(" src
```

## Zasada

Ekrany nie wiedzą, skąd są dane. Rozmawiają wyłącznie przez interfejsy z
`src/lib/backend/types.ts` (`Backend`: `auth`, `profile`, `prefs`, `wardrobe`,
`feedback`, `saved`, `catalog`). Dziś jedyna implementacja to `local.ts`.
Podpięcie bazy = napisanie `supabase.ts` według tych samych interfejsów i
przestawienie jednej zmiennej środowiskowej. Ekrany zostają jak są.

Reaktywność: TanStack Query. Odczyt to `useQuery`, zapis to `useMutation`,
a po każdej udanej mutacji odświeżają się wszystkie zapytania
(`src/lib/backend/queryClient.ts`). Działa tak samo dla localStorage i bazy.

## Mapa gniazd

| Co | Dziś | Gniazdo | Docelowo |
|---|---|---|---|
| Wybór backendu | `local` | `src/lib/backend/index.ts`, env `VITE_BACKEND` | `supabase` |
| Logowanie (e-mail, Google) | sesja-atrapa w localStorage, każdy e-mail wchodzi | `AuthProvider` w `types.ts`; UI w `src/pages/Login.tsx`; bramka `src/components/RequireAuth.tsx` | Supabase Auth: magic link + Google OAuth |
| Profil ciała | localStorage `paula.bodyProfile` | `ProfileRepository` | tabela `body_profiles` |
| Imię, gust, budżet, marki, inspiracje | localStorage `paula.prefs` | `PrefsRepository` | tabela `user_prefs` |
| Szafa, „czy kupiłaś?", stylizacje | localStorage | `WardrobeRepository` | `wardrobe_items`, `pending_purchases`, `outfits` |
| Pętla „czy pasowało?" | localStorage `paula.fitFeedback` | `FitFeedbackRepository` | tabela `fit_feedback` — **to jest zbiór danych, o który chodzi** |
| Zapisane (serduszko) | localStorage `paula.saved` | `SavedRepository` | tabela `saved_products` |
| Kolekcje | localStorage `paula.collections` | `CollectionsRepository` | tabele `collections` + `collection_products` (RLS join idzie przez rodzica) |
| Własne rzeczy z linku | localStorage `paula.catalog.user`, ekran `/app/add` | `CatalogRepository.addUserProduct` | tabela `user_products` (per użytkowniczka, RLS) — **nie** wspólne `products` |
| Katalog | mocki + import w localStorage `paula.catalog.imported` | `CatalogRepository` | tabele `products` (raw) + `product_fit_attributes` (enriched) |
| Import od marki | ekran `/admin/import` (CSV/JSON → `parseBrandFeed`) | `src/lib/catalog/feed.ts`, `src/pages/ImportProducts.tsx` | ten sam ekran, zapis do `products`, polityka RLS „tylko admin" |
| Import z linku produktowego | **zapięte** — w dev middleware (`vite-plugins/fetch-product.ts`), w produkcji edge function (`supabase/functions/fetch-product`) | parser `src/lib/catalog/link.ts` (czysty, bez sieci), wybór adresu `productFetchEndpoint()` w `src/lib/catalog/linkFetch.ts` | bez zmian — te same trzy reguły po obu stronach |
| Wzbogacanie atrybutów | reguły (`src/lib/catalog/enrich.ts`) | `EnrichmentProvider` w `src/lib/ai/enrichment.ts`, env `VITE_AI_ENDPOINT` | edge function `/enrich` z modelem wizyjnym |
| Rozmowa z Paulą | reguły słów kluczowych (`src/lib/ai/stylist.ts`, `localStylist`) | `StylistProvider`, env `VITE_AI_ENDPOINT` | edge function `/stylist` z modelem językowym |
| Zdjęcia produktów | URL z feedu marki (`imageUrl`), mocki bez zdjęć | `src/components/ProductImage.tsx` | bez zmian; ewentualnie bucket na kopie |
| Link do sklepu | `product.url` z feedu, otwierany po kliknięciu | `src/pages/ProductDetail.tsx` | link afiliacyjny w tym samym polu |

Schemat bazy do tego wszystkiego: `docs/supabase-schema.draft.sql`.
Szablon feedu dla marki: `docs/brand-feed-template.csv`.

## Import z linku — przeniesione 2026-09-15

**Pobranie HTML** to jedyna część, która nie mogła żyć w przeglądarce: CORS
blokuje żądanie na cudzy origin, zanim ono wyjdzie. Robi to więc coś, co
przeglądarką nie jest, i są tego dwie implementacje tej samej rzeczy:

- w dev — middleware `vite-plugins/fetch-product.ts` (`apply: 'serve'`, czyli
  **nie trafia do builda produkcyjnego**);
- w produkcji — edge function `supabase/functions/fetch-product`.

Obie przyjmują `?url=` i oddają `{ html, finalUrl, truncated }`, obie
sprawdzają `robots.txt`, wysyłają własny User-Agent i pobierają jedną stronę
bez chodzenia po linkach. Parser, walidacja zdjęcia, konwersja na `RawProduct`
i ekran zostały bez zmiany — o to chodziło w tym podziale.

Adres wybiera `productFetchEndpoint()` w `src/lib/catalog/linkFetch.ts`: w dev
middleware, w produkcji `VITE_FETCH_PRODUCT_ENDPOINT`, a gdy tej zmiennej nie
ma — `null` i ekran mówi to wprost zamiast obwiniać sklep. Pilnują tego
`linkFetchEndpoint.test.ts` i `src/pages/deadControls.test.tsx`.

**Funkcja jest napisana, ale NIE jest wdrożona (stan 2026-09-15.)** Na projekcie
`jandgkqczktqlzhqkjqp` nie stoi żadna edge function — `mcp` też nie — a brama
odpowiada `404 NOT_FOUND`. Push na `main` przenosi kod funkcji do repo, ale jej
nie wdraża. Dlatego adres bierze się z jawnej zmiennej, a nie z
`VITE_SUPABASE_URL`: inaczej ekran pokazałby działający formularz nad funkcją,
której nie ma. Po wdrożeniu wystarczy ustawić zmienną — kod klienta i funkcji
jest gotowy i pokryty testami.

Trzy rzeczy, które odróżniają edge function od middleware'u i o których trzeba
pamiętać przy zmianach:

- **`robots.ts` istnieje w dwóch kopiach.** Bundler Supabase pakuje to, co leży
  pod `supabase/functions/`, a na tej maszynie nie ma czym tego sprawdzić (brak
  deno i CLI Supabase), więc zamiast stawiać na niesprawdzone zachowanie kopia
  leży w `supabase/functions/_shared/robots.ts`. Rozjazd łapie
  `src/lib/catalog/robotsCopy.test.ts` — zmieniasz jeden plik, zmieniasz oba.
- **Ochrona przed adresem prywatnym jest słabsza niż w dev.** Middleware
  rozwiązywał nazwę przez `node:dns`; funkcja próbuje `Deno.resolveDns`, a gdy
  go nie ma, zostaje sprawdzenie samej nazwy — co nie zatrzyma nazwy
  wskazującej na adres prywatny dopiero w DNS-ie.
- **`verify_jwt = false`** (`supabase/config.toml`), bo aplikacja chodzi na
  `VITE_BACKEND=local` i nie ma sesji, którą można by to podpisać. Bramką
  zostaje klucz publikowalny wymagany przez bramę Supabase. Funkcja nie czyta
  ani nie zapisuje żadnych danych — pobiera publiczną stronę i oddaje jej HTML.

Edge function musi robić dokładnie to samo, co middleware, bo każde z tych
zachowań ma powód:

1. **Sprawdza `robots.txt` przed pobraniem strony.** Zalando wpuszcza
   `User-agent: *` na karty produktów, a nazwane boty AI (`ClaudeBot`,
   `GPTBot`, …) wyrzuca z całej domeny. Sprawdzone na żywym pliku: ścieżki
   `/cart/*` i `/myaccount/*` nasz pobieracz odrzuca sam, karty produktów
   przechodzą.
2. **Przedstawia się własną nazwą** (`PaulaBot/0.1`), nie udaje Chrome'a.
   Test 30/30 z `research/bodytech-09` używał UA Chrome, bo mierzył
   *dostępność danych* — to była metoda pomiaru, nie sposób zachowania.
3. **Pobiera jedną stronę na wyraźne żądanie użytkowniczki.** Bez chodzenia
   po linkach. To jest różnica między pobraniem a crawlingiem i to na niej
   stoi cała ta ścieżka.
4. **Odmawia adresów prywatnych.** Middleware rozwiązuje DNS i odrzuca
   127.x, 10.x, 192.168.x, 172.16–31.x, 169.254.x i odpowiedniki IPv6 —
   inaczej proxy stojące na `host: "::"` byłoby otwartą furtką do sieci
   lokalnej maszyny. Edge function ma ten sam problem, tylko w chmurze.
5. **Zgłasza obcięcie odpowiedzi.** Strona Sinsay ma 4,5 MB i trzyma JSON-LD
   na bajcie ~4,44 mln, czyli **na samym końcu dokumentu**. Limit 3 MB uciął
   ją po cichu i parser zszedł na słabsze Open Graph, oddając gorszą nazwę
   produktu bez śladu błędu. Limit jest teraz 12 MB, a `truncated: true`
   dopisuje ostrzeżenie widoczne na ekranie.

## Podłączenie Supabase — krok po kroku

1. W Lovable włączyć Cloud (baza) na projekcie Gabrieli. Lovable wygeneruje
   `src/integrations/supabase/client.ts` oraz zmienne `VITE_SUPABASE_URL` i
   `VITE_SUPABASE_PUBLISHABLE_KEY`.
2. Migracja: wziąć `docs/supabase-schema.draft.sql`, przejrzeć, uruchomić jako
   migrację. RLS jest w pliku — nie pomijać.
3. Napisać `src/lib/backend/supabase.ts`. Wzorzec zachowania to `local.ts`,
   metoda po metodzie. Mapowanie na tabele jest w komentarzu na górze
   `supabase.ts`.
4. Przestawić `makeBackend` w `src/lib/backend/backend.test.ts` na adapter
   Supabase (projekt testowy) i uruchomić `npx vitest run src/lib/backend`.
   Wszystkie testy kontraktu muszą przejść.
5. `VITE_BACKEND=supabase` w env. Koniec — ekrany nie wymagają zmian.
6. Opcjonalnie: przy pierwszym logowaniu skopiować dane z localStorage do bazy
   (profil, szafa, feedback, zapisane). Jedna funkcja, wywołana raz z
   `BackendProvider`. Nie jest to potrzebne, dopóki testujemy na sobie.

Uwaga do logowania: w adapterze lokalnym `signInWithEmail` zwraca sesję od
razu. Z magic linkiem zwróci `null`, a sesja przyjdzie przez `onAuthChange` —
`Login.tsx` już to obsługuje (przekierowanie tylko gdy sesja jest).

## Podłączenie AI — krok po kroku

1. Dwie edge functions (Supabase Edge Functions albo cokolwiek z HTTPS):
   - `POST /stylist` — wejście: `{ text, history, pills, profile, lang,
     catalogIds }`, wyjście: `{ reply, chips?, productIds?, pills }`.
     Kontrakt w `src/lib/ai/stylist.ts`.
   - `POST /enrich` — wejście: `{ product: RawProduct, rules: FitAttributes }`,
     wyjście: `{ fit: FitAttributes, enrichedBy }`. Kontrakt w
     `src/lib/ai/enrichment.ts`. Słowniki zamknięte w `src/lib/fit/attributes.ts`
     — odpowiedź modelu musi się w nich mieścić, a każdy atrybut ma
     `confidence` i może być „nie widać".
2. Klucz API tylko po stronie funkcji. Do przeglądarki nigdy.
3. `VITE_AI_ENDPOINT=https://.../functions/v1` w env. Oba providery
   przełączają się same (`src/lib/ai/index.ts`).
4. Prompt systemowy Pauli (reaktywna, opisowa, bez „wyszczupla" i „unikaj")
   i prompt do wzbogacania (zakaz wnioskowania o wieku, wadze, ciąży, zdrowiu)
   to artefakty compliance — wersjonowane razem z funkcjami.

## Co nadal jest atrapą (poza gniazdami powyżej)

- Recenzje i „kupiły kobiety o podobnej sylwetce" — `src/data/mockData.ts`
  (`productReviews`, `getSimilarBodiesBought`). Wymaga tabeli recenzji i
  dopasowania po sylwetce z `body_profiles`.
- Alerty cenowe — strona mówi wprost, że śledzenie nie działa, i pokazuje
  zapisane rzeczy z jedną, dzisiejszą ceną. Do uruchomienia potrzeba dwóch
  rzeczy naraz: **źródła, które odświeża ceny** (feed marki albo sieć
  afiliacyjna, nie katalog mockowy) i **tabeli `price_history`** zbieranej od
  pierwszego dnia — bo bez 30 dni historii nie wolno pokazać ani przekreślonej
  ceny, ani plakietki promocji (dyrektywa Omnibus). Tabela jest w szkicu
  schematu; pilnuje tego `src/pages/priceDisplay.test.tsx`.
- `sampleCollections` w `src/data/mockData.ts` — zostaje w pliku jako przykład
  kształtu danych, ale **nic go już nie renderuje**. Kolekcje są prawdziwe.
- Wyszukiwanie po zdjęciu („znajdź to samo / tańsze") — `SearchPage.tsx`
  sortuje katalog po dopasowaniu, nie patrzy na zdjęcie. To zadanie dla
  `/stylist` z wejściem obrazowym.
- Skan ciała i awatar — osobny tor (patrz `CLAUDE.md`, filary produktu).
  Onboarding ma dziś ścieżkę ręczną (pomiary) i wybór sylwetki z listy.

## Jak sprawdzić, że nic się nie rozjechało

```bash
npx vitest run
npx tsc --noEmit -p tsconfig.app.json
```

Dev: `npm run dev`. Import produktów: `/admin/import` (po zalogowaniu).
