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
| Katalog | mocki + import w localStorage `paula.catalog.imported` | `CatalogRepository` | tabele `products` (raw) + `product_fit_attributes` (enriched) |
| Import od marki | ekran `/admin/import` (CSV/JSON → `parseBrandFeed`) | `src/lib/catalog/feed.ts`, `src/pages/ImportProducts.tsx` | ten sam ekran, zapis do `products`, polityka RLS „tylko admin" |
| Import z linku produktowego | ekran `/admin/import`, pobranie przez middleware dev-serwera (`vite-plugins/fetch-product.ts`) | parser `src/lib/catalog/link.ts` (czysty, bez sieci), pobranie `src/lib/catalog/linkFetch.ts` | edge function `/fetch-product` — te same trzy reguły: sprawdzenie `robots.txt`, własny User-Agent, jedna strona na żądanie |
| Wzbogacanie atrybutów | reguły (`src/lib/catalog/enrich.ts`) | `EnrichmentProvider` w `src/lib/ai/enrichment.ts`, env `VITE_AI_ENDPOINT` | edge function `/enrich` z modelem wizyjnym |
| Rozmowa z Paulą | reguły słów kluczowych (`src/lib/ai/stylist.ts`, `localStylist`) | `StylistProvider`, env `VITE_AI_ENDPOINT` | edge function `/stylist` z modelem językowym |
| Zdjęcia produktów | URL z feedu marki (`imageUrl`), mocki bez zdjęć | `src/components/ProductImage.tsx` | bez zmian; ewentualnie bucket na kopie |
| Link do sklepu | `product.url` z feedu, otwierany po kliknięciu | `src/pages/ProductDetail.tsx` | link afiliacyjny w tym samym polu |

Schemat bazy do tego wszystkiego: `docs/supabase-schema.draft.sql`.
Szablon feedu dla marki: `docs/brand-feed-template.csv`.

## Import z linku — co dokładnie trzeba przenieść

Jedyna część, która nie działa poza dev-serwerem, to **pobranie HTML**.
Przeglądarka nie pobierze strony cudzego sklepu (CORS blokuje żądanie, zanim
wyjdzie), więc robi to coś, co nie jest przeglądarką. Dziś: middleware
`vite-plugins/fetch-product.ts` (`apply: 'serve'`, czyli **nie trafia do
builda produkcyjnego**). Docelowo: edge function.

Do przeniesienia jest wyłącznie ten jeden endpoint. Ma przyjąć `?url=` i
oddać `{ html, finalUrl, truncated }`. Cała reszta — parser, walidacja
zdjęcia, konwersja na `RawProduct`, ekran — zostaje bez zmiany. Po stronie
klienta zmienia się jedna stała `DEV_ENDPOINT` w `src/lib/catalog/linkFetch.ts`.

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
- Alerty cenowe — `src/pages/Alerts.tsx` na sztywno. Wymaga `price_history`
  (tabela jest w szkicu schematu).
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
