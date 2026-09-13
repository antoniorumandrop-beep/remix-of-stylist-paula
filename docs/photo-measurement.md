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

### Sprostowanie do dwóch akapitów wyżej (2026-09-13, tego samego wieczoru)

**Na żadnym z ośmiu zdjęć nie było stóp.** Wyszło to po eksperymencie, z rozmowy
z osobą, która je robiła — sześć z kamerki laptopa (kadr poziomy 720×480) i dwa
z telefonu, wszystkie ucięte gdzieś poniżej kolan.

To unieważnia wniosek z testu obcinania. Porównywałem zdjęcie ucięte z **innym
zdjęciem uciętym**, więc wszystkie trzy warianty zgadywały tę samą brakującą
część ciała i musiały dać ten sam wynik. Nie wiemy, czy model ignoruje obraz —
wiemy tylko, że nie odróżnia dwóch stopni tego samego braku.

I daje to prostsze wytłumaczenie błędu wzrostu niż „ciąży ku średniej
populacyjnej": **model nie widział, gdzie kończą się nogi.** −8,9 cm to mniej
więcej tyle, ile brakowało w kadrze. Jeśli tak jest, to na zdjęciu całej
sylwetki wzrost powinien się poprawić — a to jest test za dwa centy, nie
przebudowa.

Co z tego zostaje w mocy:

- **obwody są dobre nawet ze zdjęcia bez stóp** — talia −0,1 cm, biodra −1,1 cm.
  To był pomiar na uciętym kadrze i mimo to trafił;
- **sylwetka klasyfikuje się poprawnie** — osiem na osiem;
- **przód i bok mylą się w różnych miejscach** — to wynika z geometrii, nie z
  kadru, więc kadrowanie tego nie tłumaczy.

Czego **nie** wiemy i co trzeba zmierzyć, zanim cokolwiek z tego wejdzie do
planu: ile wynosi błąd wzrostu na zdjęciu z widocznymi stopami, i czy model
odpowiada na kształt ciała, czy na wyuczoną przeciętną. Pierwsze rozstrzyga
jedno zdjęcie. Drugie — drugie ciało.

### Zdjęcie całej sylwetki — hipoteza o stopach sprawdzona i odrzucona

Dwa zdjęcia z widocznymi stopami, ta sama osoba, ta sama taśma.

| | taśma | bez stóp (5 zdjęć od przodu) | **ze stopami (2 zdjęcia)** |
|---|---|---|---|
| wzrost | 179 | 170,1 (−8,9) | **171,9 (−7,1)** |
| klatka | 103,5 | 107,2 (+3,7) | **106,0 (+2,5)** |
| talia | 93,0 | 92,9 (−0,1) | **92,3 (−0,7)** |
| biodra | 110,0 | 108,9 (−1,1) | **109,2 (−0,8)** |

**Pokazanie stóp poprawiło wzrost o 1,8 cm, a nie o 9.** Hipoteza „model nie
widział, gdzie kończą się nogi" tłumaczy jedną piątą błędu i nie jest jego
przyczyną. Zaniżanie wzrostu jest własnością modelu, nie kadru — powtórzone na
dziesięciu zdjęciach, czterech kadrach i dwóch aparatach.

Decyzja o braniu wzrostu od człowieka stoi więc na zmierzonym fakcie, nie na
domyśle, i nie ma sensu do niej wracać przy lepszym zdjęciu.

**Obwody poprawiły się nieznacznie i wszystkie w dobrą stronę** — klatka
najbardziej, z +3,7 na +2,5. Talia i biodra mieszczą się w progu 1–2 cm, który
Antonio postawił jako wymaganie; klatka jeszcze nie, ale ze zdjęcia z boku
wychodziła +0,8, więc ścieżka do tego progu jest widoczna i nie wymaga innego
modelu.

**Czego to nadal nie rozstrzyga.** Wszystkie dziesięć zdjęć to jedno ciało.
Pytanie, czy model odpowiada na kształt, czy recytuje przeciętną, wymaga drugiego
ciała i jest jedynym otwartym pytaniem tej ścieżki.

## Drugie ciało — test rozstrzygający (2026-09-13, wieczorem)

Druga osoba, kobieta, 161 cm, zmierzona taśmą tego samego wieczoru. Ciało
wyraźnie inne od pierwszego: talia 65 wobec 93, wzrost 161 wobec 179.

| | taśma A | model A | błąd | taśma M | model M | błąd |
|---|---|---|---|---|---|---|
| biust | 103,5 | 106,0 | +2,5 | 82,5 | 93,1 | **+10,6** |
| talia | 93,0 | 92,3 | −0,7 | 65,0 | 75,6 | **+10,6** |
| biodra | 110,0 | 109,2 | −0,8 | 95,0 | 105,8 | **+10,8** |
| wzrost | 179 | 171,9 | −7,1 | 161 | 166,2 | +5,2 |

### Jako przymiar w centymetrach: to nie działa

**Celność na pierwszym ciele była przypadkiem.** Antonio siedzi blisko środka
rozkładu, na którym model się uczył, więc trafiał. Druga osoba leży od tego
środka daleko i model mylił się o **10,6 cm na wszystkich trzech obwodach**.
To pięciokrotność progu 1–2 cm, który postawiliśmy jako wymaganie.

Model **odpowiada** na ciało — liczby drugiej osoby są wyraźnie niższe, więc nie
recytuje jednej średniej. Ale odpowiada za słabo. Z prawdziwej rozpiętości
między tymi dwoma ciałami zostaje w modelu:

| wymiar | rozpiętość prawdziwa | w modelu | zostało |
|---|---|---|---|
| biust | 21,0 | 12,9 | 61% |
| talia | 28,0 | 16,7 | 60% |
| wzrost | 18,0 | 5,7 | 32% |
| biodra | 15,0 | 3,4 | **23%** |

Przy biodrach model widzi 3,4 cm różnicy tam, gdzie jest 15. Odkręcenie tego
mnożnikiem wymagałoby 4,4× — a rozrzut samego modelu między dwoma zdjęciami tej
samej osoby to około 1,5 cm, więc po takim wzmocnieniu zostałoby 6,6 cm szumu.
Poprawka wzmocniłaby szum bardziej niż sygnał.

**I dwa punkty to za mało, żeby wybrać poprawkę.** Do tych danych pasuje
równie dobrze ściśnięcie liniowe i stałe przesunięcie zależne od osoby, a każde
z nich każe zrobić co innego. Trzecie ciało je rozdziela.

### Jako klasyfikator sylwetki: to działa, i to bardzo dobrze

Popatrzeć na błędy drugiej osoby jeszcze raz: **+10,6, +10,6, +10,8.** Prawie
identyczne. Model myli się co do *rozmiaru* ciała, ale niemal wcale co do
*proporcji* — a FFIT nie czyta obwodów, tylko różnice między nimi:

| | biodra − talia | biust − biodra |
|---|---|---|
| MP, taśma | 30,0 | −12,5 |
| MP, zdjęcie | **30,2** | **−12,7** |
| Antonio, taśma | 17,0 | −6,5 |
| Antonio, zdjęcie | **16,9** | −3,2 |

Klasyfikacja zgadza się na obu ciałach. Zdjęcie drugiej osoby daje
`bottom-hourglass (merged)`, a jej taśma **z ukrytym górnym biodrem daje
dokładnie to samo** — różnica wobec pełnego pomiaru (`spoon`) bierze się
wyłącznie z górnego biodra, którego zdjęcie nie dostarcza i o którym FFIT z
góry mówi, że bez niego łączy te dwie sylwetki.

### Co z tego wynika dla produktu

Ścieżka zdjęciowa przestaje być „zmierz się" i staje się **„znajdź swoją
sylwetkę"**. To nie jest pocieszenie po nieudanym pomiarze — to jest dokładnie
to, czego Fit Score używa, i to, co `CLAUDE.md` nazywa jedyną obroną przed
skomodytyzowaniem przymierzania przez Google.

Konsekwencja w kodzie jest natychmiastowa: **ekran zdjęcia nie może dalej
wpisywać centymetrów do pól pomiarów**, bo wpisuje liczby, o których wiemy, że
potrafią być o 10 cm obok. Reguła projektu mówi to wprost — liczby, której nie
da się wyprowadzić regułą wypisaną obok niej, nie pokazujemy.

### Do zamknięcia

- **Kadr.** Zdjęcia pierwszej osoby były bez stóp, drugiej bez pełnej głowy.
  Ścisnięcia rzędu 3–4× to nie tłumaczy, ale zanim uznamy liczby za ostateczne,
  przydaje się po jednym czystym zdjęciu na osobę.
- **Trzecie ciało.** Rozdziela dwie hipotezy o naturze błędu i pozwala
  *sprawdzić* zachowanie różnic, zamiast dopasowywać poprawkę do dwóch punktów.
