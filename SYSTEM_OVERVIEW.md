# System Zarządzania Preorderami B2B

## Przegląd systemu

System do zarządzania preorderami B2B dla branży obuwniczej, obsługujący pełen cykl zamówień sezonowych - od złożenia preorderu przez klienta, przez konsolidację zamówień do dostawców, aż po alokację dostarczonego towaru.

## Główne problemy biznesowe

1. **Preordery na towar, którego fizycznie nie ma** - klienci B2B zamawiają sezonowy towar nawet pół roku wcześniej
2. **Konsolidacja zamówień** - zbieranie zapotrzebowania od wielu klientów i łączenie w zamówienia do dostawców
3. **Alokacja częściowych dostaw** - gdy towar przyjeżdża w mniejszej ilości niż zamówiono, trzeba go sprawiedliwie przydzielić
4. **Priorytety klientów** - niektórzy klienci mają pierwszeństwo w dostępie do towaru
5. **Częściowe realizacje** - jedno zamówienie klienta może być realizowane w kilku transzach

## Architektura systemu

### Role użytkowników

1. **Administrator** - zarządza całym procesem
   - Konsolidacja zamówień
   - Zarządzanie dostawami
   - Alokacja towaru
   - Zarządzanie priorytetami klientów

2. **Klient B2B** - składa zamówienia
   - Przeglądanie katalogu produktów
   - Składanie preorderów
   - Śledzenie statusu zamówień

### Główne moduły

#### 1. Portal B2B dla klientów
- **Katalog produktów** (`/catalog`)
  - Produkty sezonowe z wariantami (model, rozmiar, kolor)
  - Filtrowanie po marce
  - Informacje o oczekiwanej dacie dostawy
  - Dodawanie do koszyka

- **Koszyk** (`/cart`)
  - Zarządzanie pozycjami
  - Dodawanie uwag do zamówienia
  - Składanie preorderu

- **Moje zamówienia** (`/my-orders`)
  - Historia preorderów
  - Status realizacji (oczekuje, alokowane, dostarczone)
  - Postęp realizacji w %

#### 2. Panel administratora

- **Dashboard** (`/admin`)
  - Statystyki preorderów
  - Oczekujące dostawy
  - Szybkie akcje

- **Lista preorderów** (`/admin/preorders`)
  - Wszystkie zamówienia klientów
  - Filtrowanie po statusie
  - Szczegóły pozycji
  - Eksport do CSV

- **Konsolidacja** (`/admin/consolidation`)
  - Agregacja zapotrzebowania per marka/dostawca
  - Generowanie zamówień do dostawców
  - Eksport w formacie Excel/CSV
  - Historia wysłanych zamówień

- **Dostawy** (`/admin/deliveries`)
  - Dodawanie awizacji dostaw
  - Lista oczekujących dostaw
  - Uruchamianie procesu alokacji

- **Alokacja** (`/admin/allocation/:deliveryId`)
  - **KLUCZOWY MODUŁ**
  - Automatyczna alokacja wg priorytetów
  - Ręczna korekta przydziału
  - Zmiana kolejności klientów
  - Wizualizacja % pokrycia zamówień
  - Zatwierdzanie i przekazanie do ERP

- **Zarządzanie klientami** (`/admin/customers`)
  - Przypisywanie priorytetów (1-5)
  - Zmiana kolejności obsługi
  - Opis znaczenia priorytetów

## Przepływ procesu biznesowego

### Faza 1: Zbieranie preorderów
1. Klient B2B loguje się do portalu
2. Przegląda katalog produktów sezonowych (np. Spring 2026)
3. Dodaje warianty do koszyka (wybiera kolor, rozmiar, ilość)
4. Składa preorder - zapisuje się jako "pending"

### Faza 2: Konsolidacja
1. Administrator przechodzi do modułu konsolidacji
2. Wybiera markę/dostawcę (np. Brooks)
3. System agreguje wszystkie preordery dla tej marki
4. Pokazuje skonsolidowane zapotrzebowanie per wariant
5. Administrator eksportuje plik i wysyła do dostawcy
6. Zamówienie oznaczane jako "wysłane"

### Faza 3: Awizacja dostawy
1. Dostawca informuje o nadchodzącej dostawie (faktura + Excel)
2. Administrator dodaje awizację w systemie
3. Wprowadza:
   - Numer dostawy
   - Numer faktury
   - Listę pozycji i ilości (w rzeczywistości import z pliku)
   - Oczekiwaną datę

### Faza 4: Alokacja (najważniejsza!)
1. Administrator otwiera awizację i klika "Rozpocznij alokację"
2. System automatycznie proponuje alokację:
   - Sortuje klientów wg priorytetu (1 = najwyższy)
   - Przydziela towar od klientów priorytetowych
   - Pokazuje % pokrycia każdego zamówienia
3. Operator może:
   - Ręcznie zmienić ilości
   - Przesunąć klientów w kolejności (przyciski ↑↓)
   - Zdecydować czy przy 90% pokrycia realizować czy czekać
4. Po zatwierdzeniu:
   - Aktualizują się statusy preorderów
   - Generują się zamówienia do Shopera/Firmao
   - Magazyn dostaje listę do kompletacji

### Faza 5: Częściowe realizacje
1. Jeśli dostawa częściowa - preorder ma status "partially_allocated"
2. Gdy przyjedzie kolejna transza - proces alokacji powtarza się
3. System pamięta co już zostało przydzielone
4. Preorder zamyka się gdy wszystko zostanie dostarczone

## Dane testowe

### Konta użytkowników
- **Admin**: admin@sportshop.pl
- **Klient 1 (Priorytet 1)**: kontakt@sportklub.pl - Sport Klub Warszawa
- **Klient 2 (Priorytet 2)**: zamowienia@runningstore.pl - Running Store Kraków
- **Klient 3 (Priorytet 3)**: biuro@fitness.pl - Fitness Plus Gdańsk

### Produkty
- Brooks Ghost 16 (4 warianty)
- Brooks Adrenaline GTS 23 (3 warianty)
- Brooks Glycerin 21 (3 warianty)
- Brooks Cascadia 17 (2 warianty)

### Scenariusz testowy
1. Zaloguj się jako klient B2B
2. Dodaj produkty do koszyka
3. Złóż preorder
4. Zaloguj się jako admin
5. Zobacz preorder w liście
6. Skonsoliduj zamówienia
7. Dodaj awizację dostawy
8. Przejdź do alokacji i przetestuj:
   - Automatyczną alokację
   - Ręczną zmianę ilości
   - Zmianę kolejności klientów
9. Zatwierdź alokację

## Technologie

- **React** + **TypeScript**
- **React Router** - nawigacja
- **Tailwind CSS** - stylowanie
- **shadcn/ui** - komponenty UI
- **Lucide React** - ikony
- **Sonner** - notyfikacje toast

## Persystencja danych

Obecnie system używa:
- **localStorage** dla koszyka i stanu logowania
- **mock data** dla produktów, preorderów, dostaw

W wersji produkcyjnej należy podłączyć:
- Backend API lub Supabase
- Integracje z BaseLinker, Firmao, Shoper
- Prawdziwy import plików Excel od dostawców

## Kluczowe funkcjonalności

✅ Role użytkowników (Admin / B2B Customer)
✅ Katalog produktów z wariantami
✅ Koszyk i składanie preorderów
✅ Konsolidacja zamówień per marka
✅ Awizacje dostaw
✅ **Alokacja z priorytetami**
✅ Ręczna korekta alokacji
✅ Zmiana kolejności klientów
✅ Wizualizacja % pokrycia
✅ Częściowe realizacje
✅ Eksport do CSV
✅ Responsywny design
✅ Notyfikacje użytkownika

## Rozszerzenia do rozważenia

- Import plików Excel (awizacje, katalog)
- Integracja z ERP (Firmao, Shoper, BaseLinker)
- Historia zmian alokacji (audit log)
- Powiadomienia email dla klientów
- Raporty i analytics
- Obsługa wielu magazynów
- Rezerwacje na przyszłe dostawy
- API dla dostawców
