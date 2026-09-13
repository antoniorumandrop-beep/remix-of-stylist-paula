# Pomiar ze zdjęcia — gdzie ląduje zdjęcie

Dokument powstał **przed** pierwszą linijką kodu tej funkcji i taka jest jego
rola: odpowiedzieć, gdzie plik jest w każdej sekundzie swojego życia. Reguła z
`CLAUDE.md` brzmi „zapis zdjęcia jest świadomy albo nie ma go wcale", a
świadomy znaczy: da się wskazać palcem miejsce i czas.

## Ścieżka zdjęcia, sekunda po sekundzie

| gdzie | co się dzieje | czy zostaje |
|---|---|---|
| `<input type="file">` | użytkowniczka wybiera plik | plik zostaje u niej na dysku, my dostajemy `File` |
| pamięć karty | `File` → `data:` URI, żeby wysłać w treści żądania | znika z zamknięciem karty; **nie ma `URL.createObjectURL`**, więc nie ma uchwytu, który przeżyje |
| middleware dev-serwera | przepisuje treść żądania do fal.ai i **nie zapisuje jej nigdzie** | nie ma pliku na dysku, nie ma logu z treścią |
| fal.ai | liczy siatkę ciała z obrazu | **nie zostaje** — patrz niżej |
| `body-lab` (Python) | dostaje **liczby**, nie obraz | obrazu tam nigdy nie było |
| profil użytkowniczki | zapisane wyłącznie wymiary ubraniowe w cm | zostaje, do skasowania jednym przyciskiem |

**Zdjęcie nie dotyka dysku po naszej stronie ani razu.** Nie ma pliku
tymczasowego, nie ma katalogu na uploady, nie ma czego dopisywać do
`.gitignore` — bo nie ma czego ignorować. To jest mocniejsze niż „kasujemy po
godzinie": czego nie zapisano, tego nie trzeba kasować.

## Dlaczego `data:` URI, a nie upload do fal

fal.ai przyjmuje obraz na dwa sposoby: `image_url` wskazujące plik wgrany do
ich CDN-u, albo `data:` URI w treści żądania. Pierwszy sposób **tworzy plik na
ich dysku pod adresem, który żyje własnym życiem**. Drugi przenosi obraz
wyłącznie w treści jednego żądania. Bierzemy drugi, mimo że jest wolniejszy dla
dużych plików.

Do tego dwa nagłówki, obowiązkowe przy każdym wywołaniu:

- **`X-Fal-Store-IO: 0`** — fal domyślnie trzyma treść żądań **30 dni**, żeby
  pokazać historię w panelu. Ten nagłówek to wyłącza. Bez niego zdjęcie
  siedziałoby miesiąc w cudzym panelu.
- **`X-Fal-Object-Lifecycle-Preference`** z krótkim `expiration_duration_seconds`
  — dotyczy plików wyjściowych (siatka GLB). Awatara i tak budujemy u siebie,
  więc ich kopia nie jest nam do niczego potrzebna.

Nagłówki są w kodzie **obok siebie z komentarzem dlaczego**, a nie w konfiguracji,
którą da się przestawić bez czytania. Pilnuje ich test.

## Czego nie czytamy z odpowiedzi

Ścieżka MHR zwraca 17 wymiarów i **wszystkie są geometrią ubraniową** — obwody,
długości, szerokość barków. Masy, BMI ani tkanki tłuszczowej w tej odpowiedzi
nie ma (to była właściwość ścieżki Anny, gdzie `clad_body` liczy 26 pomiarów
razem z `mass_kg`, `bmi`, `body_fat_pct`).

Mimo to filtr po naszej stronie jest **jawną białą listą pól**, nie
przepisaniem całego obiektu. Powód jest ten sam, co przy każdej regule w tym
projekcie: reguła, która polega na tym, że dostawca czegoś nie przysłał,
przestaje obowiązywać w dniu, w którym dostawca zmieni zdanie. Białą listę
pilnuje test.

## Komunikat AI Act — przed wyborem pliku

Art. 50 ust. 3 AI Act wymaga, żeby człowiek wiedział, że staje przed systemem
rozpoznającym cechy z obrazu, **zanim** to nastąpi. W praktyce znaczy to, że
komunikat jest **nad przyciskiem wyboru pliku i widoczny bez przewijania**, a
nie w potwierdzeniu po wgraniu i nie w regulaminie. Pozycja na liście
kontrolnej code review, nie „nice-to-have".

## Kto dziś klika

Do czasu, aż produkt będzie skończony i przejrzany prawnie, zdjęcia wgrywają
**wyłącznie Antonio i Gabriela, testując na sobie**. To nie wstrzymuje budowy —
wstrzymuje wypuszczenie, dokładnie jak reszta checklisty prawnej.

## Ścieżka ręczna zostaje

Taśma krawiecka jest **dokładniejsza** od zdjęcia (błąd 5,7% wobec 5–8 cm MAE
przy rekonstrukcji z jednego zdjęcia) i nie podlega reżimowi AI Act, bo dane
wpisane ręcznie nie są biometryczne. Zdjęcie jest uzupełnieniem dla kogoś, kto
taśmy nie ma pod ręką — nigdy zamiennikiem. Ekran musi to mówić wprost, a nie
sugerować, że nowsze znaczy lepsze.
