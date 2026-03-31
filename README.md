# System Zarządzania Preorderami B2B

Kompleksowy system do zarządzania preorderami B2B w branży obuwniczej, obsługujący pełen cykl od złożenia zamówienia sezonowego przez klienta, przez konsolidację do dostawców, aż po inteligentną alokację dostarczonego towaru z uwzględnieniem priorytetów klientów.

## 🎯 Główne Funkcjonalności

### Dla Klientów B2B
- ✅ Katalog produktów sezonowych z wariantami (model, rozmiar, kolor)
- ✅ Składanie preorderów na towar, którego jeszcze nie ma na stanie
- ✅ Śledzenie statusu zamówień w czasie rzeczywistym
- ✅ Wizualizacja postępu realizacji (% alokacji i dostawy)

### Dla Administratorów
- ✅ **Konsolidacja zamówień** - agregacja zapotrzebowania per marka/dostawca
- ✅ **Awizacje dostaw** - rejestracja nadchodzących dostaw
- ✅ **Inteligentna alokacja** - automatyczne i ręczne przydzielanie towaru
- ✅ **Zarządzanie priorytetami** - kontrola kolejności obsługi klientów
- ✅ **Obsługa częściowych dostaw** - wieloetapowa realizacja zamówień
- ✅ Dashboard z kluczowymi metrykami
- ✅ Eksport danych do CSV

## 🚀 Szybki Start

### Konta Testowe

**Administrator:**
- Email: `admin@sportshop.pl`
- Dostęp do pełnego panelu zarządzania

**Klienci B2B:**
- `kontakt@sportklub.pl` - Sport Klub Warszawa (Priorytet 1)
- `zamowienia@runningstore.pl` - Running Store Kraków (Priorytet 2)
- `biuro@fitness.pl` - Fitness Plus Gdańsk (Priorytet 3)

### Przykładowy Scenariusz Testowy

1. **Zaloguj się jako klient B2B**
   - Wybierz konto "Sport Klub"
   - Przejdź do katalogu
   - Dodaj produkty do koszyka (np. Brooks Ghost 16, różne rozmiary)
   - Złóż preorder

2. **Zaloguj się jako administrator**
   - Zobacz nowy preorder w liście
   - Przejdź do konsolidacji
   - Wybierz markę "Brooks"
   - Zobacz zagregowane zapotrzebowanie
   - Utwórz zamówienie konsolidacyjne

3. **Dodaj awizację dostawy**
   - Przejdź do "Dostawy"
   - Dodaj nową awizację (np. 80 par zamiast 90 - częściowa dostawa)
   - Kliknij "Rozpocznij Alokację"

4. **Przetestuj alokację** (KLUCZOWE!)
   - Zobacz automatyczną alokację wg priorytetów
   - Zmień ręcznie ilości
   - Przesuń klientów w kolejności (↑↓)
   - Zobacz wizualizację % pokrycia
   - Zatwierdź alokację

## 📋 Struktura Systemu

```
src/app/
├── App.tsx                          # Główny komponent
├── routes.tsx                       # Konfiguracja routingu
├── lib/
│   ├── auth-context.tsx            # Kontekst autentykacji
│   └── mock-data.ts                # Dane testowe
└── components/
    ├── LoginPage.tsx               # Strona logowania
    ├── HomePage.tsx                # Przekierowanie do właściwej strony
    ├── RootLayout.tsx              # Layout z nawigacją
    ├── customer/                   # Moduły dla klientów B2B
    │   ├── CatalogPage.tsx         # Katalog produktów
    │   ├── CartPage.tsx            # Koszyk
    │   └── MyOrdersPage.tsx        # Moje zamówienia
    └── admin/                      # Moduły dla administratora
        ├── AdminDashboard.tsx      # Dashboard główny
        ├── PreordersListPage.tsx   # Lista wszystkich preorderów
        ├── ConsolidationPage.tsx   # Konsolidacja zamówień
        ├── DeliveriesPage.tsx      # Zarządzanie dostawami
        ├── AllocationPage.tsx      # ⭐ Alokacja towaru (CORE)
        └── CustomersManagementPage.tsx  # Zarządzanie priorytetami
```

## 🔑 Kluczowe Koncepcje

### Preorder
Zamówienie na towar, którego jeszcze fizycznie nie ma. Klient zamawia sezonowy produkt 3-6 miesięcy przed jego dostępnością.

### Konsolidacja
Agregacja wszystkich preorderów dla danej marki/dostawcy w jedno zbiorowe zamówienie.

### Awizacja
Informacja o nadchodzącej dostawie od dostawcy (na podstawie faktury i Excela z pozycjami).

### Alokacja
**Najważniejszy proces!** Przydzielanie dostarczonego towaru do oczekujących preorderów. System:
- Automatycznie sortuje według priorytetów
- Pozwala na ręczną korektę
- Obsługuje częściowe dostawy
- Wizualizuje % pokrycia każdego zamówienia

### Priorytety (1-5)
Określają kolejność przydziału towaru:
- **1** - Najwyższy (pierwszy dostaje towar)
- **2** - Wysoki
- **3** - Średni
- **4** - Niski
- **5** - Najniższy (ostatni w kolejności)

## 🎨 Technologie

- **React 18** + **TypeScript**
- **React Router 7** - nawigacja SPA
- **Tailwind CSS v4** - stylowanie
- **shadcn/ui** - komponenty UI
- **Lucide React** - ikony
- **Sonner** - notyfikacje toast
- **Vite** - build tool

## 📊 Proces Biznesowy

```
KLIENT B2B                    ADMINISTRATOR                  DOSTAWCA
    │                              │                             │
    ├─ Przegląda katalog          │                             │
    ├─ Składa preorder            │                             │
    │                              │                             │
    │                         ├─ Widzi preordery               │
    │                         ├─ Konsoliduje zamówienia        │
    │                         ├─ Eksportuje do CSV             │
    │                         ├─ Wysyła do dostawcy ──────────>│
    │                              │                             │
    │                              │                      Przygotowuje towar
    │                              │                             │
    │                              │<──────── Wysyła awizację ──┤
    │                              │         (faktura + Excel)   │
    │                         ├─ Dodaje awizację               │
    │                         ├─ Uruchamia alokację            │
    │                         ├─ Automatyczna alokacja wg P    │
    │                         ├─ Ręczna korekta (opcja)        │
    │                         ├─ Zatwierdza                    │
    │                         ├─ Generuje zamówienia do ERP    │
    │                              │                             │
    ├─ Otrzymuje powiadomienie     │                             │
    ├─ Widzi status "alokowane"    │                             │
    │                              │                             │
    │                         ├─ Przekazuje do magazynu        │
    │                              │                             │
    │<────────────────────────── Wysyłka towaru                 │
    │                              │                             │
    ├─ Status: "dostarczone"       │                             │
```

## 🔧 Rozszerzenia Produkcyjne

System obecnie działa na mock data. Do wdrożenia produkcyjnego potrzebne:

### Backend / Baza Danych
- [ ] Supabase lub własny backend
- [ ] Persystencja zamówień, produktów, klientów
- [ ] API endpoints

### Integracje
- [ ] BaseLinker - katalog produktów
- [ ] Firmao - CRM i dokumenty
- [ ] Shoper - generowanie zamówień
- [ ] Email - notyfikacje dla klientów

### Import/Export
- [ ] Import pozycji dostaw z Excel
- [ ] Import katalogów od dostawców
- [ ] Eksport w formatach dostawców (każdy ma swój)
- [ ] Generowanie formatek dla magazynu

### Dodatkowe Funkcje
- [ ] Historia zmian (audit log)
- [ ] Powiadomienia email/SMS
- [ ] Raporty i analytics
- [ ] Obsługa wielu magazynów
- [ ] Rezerwacje na przyszłe dostawy
- [ ] API dla dostawców
- [ ] Obsługa zwrotów
- [ ] Faktury proforma

## 📖 Dokumentacja

- **[SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md)** - Szczegółowy przegląd systemu i architektury
- **[INSTRUKCJA.md](./INSTRUKCJA.md)** - Instrukcja użytkowania krok po kroku

## 💡 Najważniejsze Funkcje

### Inteligentna Alokacja
System automatycznie:
- Sortuje klientów według priorytetów
- Przydziela dostępny towar
- Pokazuje % pokrycia każdego zamówienia
- Pozwala na ręczną korektę przed finalizacją

### Obsługa Częściowych Dostaw
Gdy dostawa jest mniejsza niż zamówiono:
- System alokuje wg priorytetów
- Pozostałe zamówienia czekają na kolejną transzę
- Każda transza jest niezależnie alokowana
- Preorder zamyka się gdy wszystko zostanie dostarczone

### Zmiana Kolejności Klientów
Administrator może:
- Przesuwać klientów w górę/dół (↑↓)
- Ręcznie zmieniać ilości alokacji
- Decydować czy przy 90% pokrycia wysyłać czy czekać

## 🎯 Biznesowa Wartość

### Problem bez systemu:
- ❌ Ręczne arkusze Excel
- ❌ Trudność w śledzeniu preorderów
- ❌ Chaos przy częściowych dostawach
- ❌ Niejasne priorytety klientów
- ❌ Błędy w alokacji towaru

### Rozwiązanie:
- ✅ Centralne repozytorium preorderów
- ✅ Automatyczna konsolidacja
- ✅ Inteligentna alokacja z priorytetami
- ✅ Transparentny proces dla wszystkich
- ✅ Historia i audytowalność

## 📞 Wsparcie

System jest prototypem demonstracyjnym. Do użytku produkcyjnego wymagane są dodatkowe integracje i zabezpieczenia.

---

**Stworzone dla branży B2B obuwniczej** 🥾👟🏃‍♂️

Skala: ~2000 SKU, ~40k par/pół roku, 80-90% biznesu B2B
