# Instrukcja Użytkowania - System Preorderów B2B

## Jak zacząć?

Po uruchomieniu aplikacji zobaczysz ekran logowania z gotowymi kontami testowymi.

## Dla Klienta B2B

### 1. Logowanie
Kliknij jeden z przycisków z kontami testowymi, np.:
- **Klient B2B - Sport Klub** (kontakt@sportklub.pl)

### 2. Przeglądanie Katalogu
Po zalogowaniu zobaczysz katalog produktów sezonowych.

**Możesz:**
- Szukać produktów po nazwie
- Filtrować po marce
- Zobacz szczegóły każdego produktu (cena, oczekiwana dostawa)

### 3. Dodawanie do Koszyka
Dla każdego produktu:
1. Wybierz wariant (kolor i rozmiar)
2. Wprowadź ilość sztuk
3. Kliknij "Dodaj do koszyka"

### 4. Składanie Preorderu
1. Kliknij przycisk "Koszyk" w prawym górnym rogu
2. Sprawdź pozycje i ilości
3. Możesz dodać uwagi do zamówienia
4. Kliknij "Złóż preorder"
5. System potwierdzi numer zamówienia

### 5. Śledzenie Zamówień
Przejdź do "Moje Zamówienia" aby zobaczyć:
- Wszystkie złożone preordery
- Status realizacji
- Postęp w % (ile zostało alokowane i dostarczone)
- Szczegóły pozycji

## Dla Administratora

### 1. Logowanie
Kliknij przycisk:
- **Administrator** (admin@sportshop.pl)

### 2. Dashboard
Widok główny pokazuje:
- Liczbę aktywnych preorderów
- Sumę zamówionych sztuk
- Oczekujące dostawy
- Wysłane zamówienia do dostawców

**Szybkie akcje** na dole pozwalają przejść do kluczowych funkcji.

### 3. Lista Preorderów
**Menu: Preordery**

Tutaj widzisz wszystkie zamówienia klientów:
- Możesz filtrować po statusie
- Szukać po numerze, firmie lub kliencie
- Rozwinąć szczegóły pozycji
- Eksportować do CSV

**Statusy preorderów:**
- **Oczekuje** - złożony, czeka na towar
- **Częściowo alokowane** - część towaru przydzielona
- **Alokowane** - cały towar przydzielony, czeka na wysyłkę
- **Częściowo dostarczone** - część wysłana do klienta
- **Zakończone** - w pełni zrealizowane

### 4. Konsolidacja Zamówień
**Menu: Konsolidacja**

**Cel:** Zebrać wszystkie preordery i stworzyć jedno zamówienie do dostawcy.

**Jak to zrobić:**
1. Wybierz markę (np. Brooks)
2. System pokaże zsumowane zapotrzebowanie dla wszystkich wariantów
3. Sprawdź ilości
4. Kliknij "Eksportuj" aby pobrać CSV/Excel
5. Wyślij plik do dostawcy
6. Kliknij "Utwórz Zamówienie" aby zapisać w historii
7. Oznacz jako "wysłane"

**Zakładka Historia** pokazuje wszystkie utworzone zamówienia.

### 5. Zarządzanie Dostawami
**Menu: Dostawy**

**Cel:** Zarejestrować nadchodzącą dostawę od dostawcy.

**Jak dodać awizację:**
1. Kliknij "Dodaj Awizację"
2. Wybierz dostawcę
3. Wprowadź:
   - Numer dostawy
   - Numer faktury
   - Oczekiwaną datę
4. (W produkcji: zaimportuj plik Excel z pozycjami)
5. Zapisz

Po dodaniu awizacji możesz:
- **Rozpocznij Alokację** - przejście do najważniejszego kroku

### 6. Alokacja Towaru (KLUCZOWE!)
**Menu: Dostawy → Rozpocznij Alokację**

**Cel:** Przydzielić dostarcony towar do oczekujących preorderów.

#### Automatyczna Alokacja
System automatycznie:
- Sortuje klientów według priorytetu (1 = najwyższy)
- Przydziela towar od najbardziej priorytetowych
- Pokazuje % pokrycia każdego zamówienia

#### Ręczna Korekta
Dla każdego wariantu widzisz tabelę z klientami.

**Możesz:**
1. **Zmienić ilość alokacji** - wpisz nową wartość w polu
2. **Przesunąć klienta w kolejności** - przyciski ↑↓
3. **Ustawić 100%** - przycisk po prawej stronie
4. **Kontrolować pozostałość** - system pokazuje ile towaru jeszcze zostało

**Wskaźniki:**
- ✅ Zielona ikona = 100% pokrycia
- ⚠️ Pomarańczowa ikona = częściowe pokrycie
- Liczby pokazują: zamówione / alokowane / pozostaje

#### Podejmowanie Decyzji
**Pytania do rozważenia:**
- Czy przy 90% pokrycia wysyłać już klientowi?
- Czy poczekać na kolejną transzę?
- Który klient może poczekać?

**Opcje:**
- **Zapisz roboczą** - zapisuje zmiany bez finalizacji
- **Zatwierdź i przekaż** - kończy alokację, tworzy zamówienia do ERP

### 7. Zarządzanie Klientami
**Menu: Klienci**

**Cel:** Ustawić priorytety obsługi klientów.

**Priorytety:**
- **1** (czerwony) - Najwyższy - pierwszy dostaje towar
- **2** (pomarańczowy) - Wysoki
- **3** (żółty) - Średni
- **4** (zielony) - Niski
- **5** (niebieski) - Najniższy - ostatni w kolejności

**Jak zmienić:**
1. Wybierz nowy priorytet z listy rozwijanej
2. Lub użyj przycisków ↑↓ aby przesunąć w górę/dół
3. Kliknij "Zapisz zmiany"

**Podsumowanie na dole** pokazuje ile klientów ma każdy priorytet.

## Typowy Przepływ Pracy

### Scenariusz: Nowy sezon Spring 2026

**Listopad 2025:**
1. Klienci B2B logują się i składają preordery
2. System zbiera zamówienia

**Grudzień 2025:**
3. Administrator otwiera moduł Konsolidacji
4. Wybiera markę Brooks
5. Widzi że klienci zamówili łącznie:
   - Ghost 16, Black, 42: 90 par
   - Ghost 16, Black, 43: 30 par
   - itd.
6. Eksportuje i wysyła zamówienie do Brooks Europe

**Maj 2026:**
7. Brooks informuje o dostawie (faktura + Excel)
8. Administrator dodaje awizację:
   - Dostarczone: 80 par (zamiast 90) - dostawa częściowa!
9. Przechodzi do Alokacji

**Alokacja:**
10. System proponuje:
    - Klient 1 (P1): 50 par (z 50 zamówionych) ✅ 100%
    - Klient 2 (P2): 30 par (z 40 zamówionych) ⚠️ 75%
    - Klient 3 (P3): 0 par (z 20 zamówionych) - brak towaru
11. Administrator decyduje:
    - Wysłać 75% do Klienta 2?
    - Czy poczekać na kolejną dostawę?
12. Zatwierdza alokację
13. System tworzy zamówienia do wysyłki

**Czerwiec 2026:**
14. Przyjeżdża pozostałe 10 par (DHL)
15. Administrator dodaje drugą awizację
16. Alokuje pozostałe 10 par do Klienta 2
17. Teraz wszyscy mają po 100%

## Wskazówki

### Dla Klientów B2B
✅ Składaj zamówienia wcześnie - w systemie preorderów liczy się kolejność
✅ Sprawdzaj status w "Moje Zamówienia"
✅ Dodawaj uwagi do zamówień jeśli masz specjalne wymagania

### Dla Administratorów
✅ Regularnie konsoliduj zamówienia
✅ Jasno komunikuj priorytety klientom
✅ W module Alokacji zawsze sprawdź % pokrycia przed zatwierdzeniem
✅ Używaj eksportu CSV do raportów
✅ Pamiętaj że możesz ręcznie korygować automatyczną alokację

## Pomoc

### Ikony w systemie
- 📦 Package - produkty, paczki
- 📋 ClipboardList - zamówienia, listy
- 🚚 Truck - dostawy
- 📄 FileText - dokumenty
- 👥 Users - klienci
- ⚙️ Settings - ustawienia
- ⬆️⬇️ Arrows - zmiana kolejności/priorytetu
- ✅ CheckCircle - zakończone/potwierdzone
- ⚠️ AlertTriangle - uwaga/częściowe

### Kolory statusów
- 🔵 Niebieski - w trakcie/alokowane
- 🟢 Zielony - zakończone pomyślnie
- 🟡 Żółty - oczekujące
- 🟠 Pomarańczowy - częściowe/wymaga uwagi
- 🔴 Czerwony - anulowane/błąd

## FAQ

**P: Co się dzieje gdy towar się nie zmieści dla wszystkich?**
O: System priorytetuje według ustawionego priorytetu klienta. Można ręcznie skorygować.

**P: Czy mogę zmienić alokację po zatwierdzeniu?**
O: W obecnej wersji nie. W produkcji można dodać funkcję cofania.

**P: Jak obsługiwać zwroty?**
O: To należy dodać jako przyszłą funkcjonalność.

**P: Czy system wysyła automatyczne emaile?**
O: Nie w wersji demo. W produkcji można dodać notyfikacje.

**P: Co z integracją z BaseLinker/Firmao?**
O: To mock system. W produkcji należy podłączyć API tych systemów.
