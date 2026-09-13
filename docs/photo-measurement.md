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

## Co zmierzyliśmy — 2026-09-13, jedno ciało, osiem zdjęć

Pierwszy pomiar na żywym człowieku, przy taśmie krawieckiej jako odniesieniu.
Osiem zdjęć jednej osoby: sześć z kamerki (720×480), dwa z telefonu (2316×3088),
w tym bok, plecy i ręce nad głową.

| wymiar | taśma | średnia ze zdjęć od przodu | błąd | rozrzut między zdjęciami |
|---|---|---|---|---|
| talia | 93,0 | 92,9 | **−0,1 cm** | 3,1 cm |
| biodra | 110,0 | 108,9 | **−1,1 cm** | 1,5 cm |
| klatka | 103,5 | 107,2 | +3,7 cm | 2,9 cm |
| wzrost | 179 | 170,1 | **−8,9 cm** | 0,6 cm |

Cztery wnioski, każdy zmieniający coś w kodzie albo w planie.

**1. Obwody są lepsze, niż zakładał research.** `bodytech-*` przewidywał 5–8 cm
błędu przy rekonstrukcji z jednego zdjęcia. Talia wyszła o 0,1 cm, biodra o 1,1.
To jest dokładność, przy której Fit Score liczony ze zdjęcia ma sens.

**2. Wzrost jest nie do użycia — i model był go najpewniejszy.** Rozrzut 0,6 cm
przy błędzie 8,9 cm to precyzja bez trafności: model powtarzalnie wskazuje złe
miejsce. Powód jest strukturalny, nie naprawialny lepszym zdjęciem — jedno
ujęcie nie zawiera odniesienia skali, więc model zgaduje wzrost z proporcji
ciała i ciąży ku średniej populacyjnej. **Dlatego wzrostu ze zdjęcia nie
bierzemy w ogóle.** Podaje go użytkowniczka; to jedyna liczba, którą człowiek
zna bez taśmy. Pilnuje tego test w `Onboarding.test.tsx`.

**3. Przeskalowanie siatki do prawdziwego wzrostu psuje wszystko.** Sprawdzone,
bo to pierwsza rzecz, która przychodzi do głowy: mnożnik 1,054 wyprowadza talię
na +4,4 cm, a klatkę na +9,0 cm. Czyli błąd wzrostu **nie jest** błędem skali —
model widzi krępsze ciało o właściwych obwodach, a nie to samo ciało zmniejszone.

**4. Rozdzielczość nie jest dźwignią.** Dwadzieścia razy więcej pikseli
(0,35 → 7,2 Mpix) nie przesunęło wyniku w żadną stronę — zdjęcia z telefonu
wpadły w środek chmury tych z kamerki. Błąd siedzi w geometrii, nie w ostrości:
z jednego ujęcia widać szerokość, a głębokość trzeba wywnioskować. Dźwignią jest
drugie ujęcie z boku (Krok 4), nie lepszy aparat.

**Poza ma znaczenie i trzeba ją narzucić.** Bok i plecy zaniżają *każdy* wymiar
naraz — to przechył, nie szum, więc uśrednianie póz go nie usunie. Zdjęcia od
przodu zwężają rozrzut talii z 8,2 cm do 3,1 cm.

### Czego ten pomiar NIE dowodzi

Jedno ciało to nie walidacja. Ta osoba ma obwody blisko średniej populacyjnej, a
model ciąży ku średniej — więc część tej celności może być zbiegiem
okoliczności, tym samym, który zaniżył wzrost o 9 cm. **Drugi pomiar musi być na
ciele daleko od środka rozkładu**, inaczej nie odróżnimy działającego narzędzia
od modelu, który trafnie zgaduje przeciętną.

### Bramka na kadrowanie: sprawdzona i odrzucona

Pomysł był taki: skoro znamy prawdziwy wzrost, to duża rozbieżność z wzrostem
odczytanym przez model powinna zdradzać zepsute zdjęcie — ucięte stopy, zły
kadr. Sprawdzone eksperymentem zamiast założone (2026-09-13):

| zdjęcie | wzrost z modelu | klatka | talia | biodra |
|---|---|---|---|---|
| całe | 169,8 | 106,7 | 92,4 | 108,5 |
| obcięte 20% od dołu (bez stóp) | 169,5 | 109,0 | 94,6 | 108,2 |
| obcięte 45% od dołu (pół ciała) | 168,0 | 108,7 | 92,6 | 105,1 |

**Kadrowanie jest niewykrywalne tą drogą.** Model dorysowuje brakującą część
ciała i podaje praktycznie ten sam wzrost — po obcięciu **połowy sylwetki**
różnica wyniosła 1,8 cm, mniej niż rozrzut między dwoma poprawnymi zdjęciami.
Bramka na wzroście nie łapałaby niczego, a dawałaby złudzenie kontroli.

**Ale ten sam wynik odsłania coś poważniejszego.** Obcięcie 45% ciała ruszyło
talię o 0,2 cm. Jeśli usunięcie połowy danych wejściowych nie zmienia
odpowiedzi, to znaczy, że odpowiedź w dużej mierze **nie pochodzi z tego
zdjęcia** — model opiera się na tym, czego nauczył się o przeciętnym ciele.

To zmienia rangę drugiego pomiaru. Nie jest już „kolejnym punktem danych", tylko
**testem rozstrzygającym, czy ta funkcja istnieje**: jeśli ciało o wyraźnie
innych proporcjach dostanie liczby podobne do pierwszego, mierzymy średnią
populacyjną, a nie człowieka — i całą ścieżkę zdjęciową trzeba wtedy wyrzucić
albo przebudować. Jeśli liczby pójdą za taśmą, mamy narzędzie.
