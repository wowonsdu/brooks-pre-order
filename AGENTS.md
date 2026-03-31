## AGENTS — Projekt: Brookes Preorder (lokalna wersja demonstracyjna)

Ten plik jest źródłem zasad pracy dla tego repozytorium. Każda zmiana implementacyjna lub kontekstowa musi wynikać z tych reguł.

### 1) Po imporcie plików z Figma: pełny kontekst przed kodem
Po każdym wrzuceniu plików z Figma (export / pliki `.fig` / JSON) zawsze:
- opisujemy cel biznesowy funkcji i flow,
- mapujemy routing i ścieżki ekranów,
- rozpisujemy model danych i relacje,
- wypisujemy reguły statusowe, priorytety, walidacje,
- tworzymy mapping UI action → efekt.

To jest obowiązkowe dla tego projektu i zapisujemy w:
- `docs/context.md`,
- `docs/contracts.md` (gdy zmieniają się definicje danych),
- `state-log.md` (co zostało zrobione).

Jeśli pliki Figma nadal nie są dostarczone, bazujemy na `README.md`, `INSTRUKCJA.md`, `SYSTEM_OVERVIEW.md` i aktualnym kodzie w `src/app`, ale nadal przechodzimy przez punkt 1.

### 2) Planowanie z agentami: kontrakty najpierw, implementacja potem
Przy każdej większej zmianie zawsze najpierw wykonuje `Lead-contract`:
- definiuje i zatwierdza `docs/contracts.md`,
- ustala eventy, typy TS, JSON payloady i warstwy odpowiedzialności,
- określa nazwy statusów (`pending`, `allocated`, `received` itd.) oraz schemat filtrów.

Dopiero po zatwierdzeniu kontraktów następuje podział pracy:
- `Frontend-build` — komponenty i UI,
- `Data-demo` — kontrakty danych, seedy, mapy importów,
- `Logic-state` — logika agregacji/konsolidacji/ alokacji,
- `QA-flow` — scenariusze E2E i regresja.

Każda implementacja poza `Lead-contract` używa tylko zatwierdzonych kontraktów.

### 3) Kontekst techniczny projektu (ciągły)
Zapisujemy:
- stack i wersje (React 18, TypeScript, React Router 7, Vite, Tailwind CSS v4, shadcn/ui),
- architekturę folderową (`src/app`, `src/app/components`, `src/app/lib`, `src/app/components/ui`),
- sposób uruchomienia (`npm run dev`, `npm run build`),
- decyzje techniczne (np. brak API/bazy w prototypie),
- co zostało zrobione, co działa i co jest „todo”.

Każda zmiana funkcjonalna:
- aktualizuje `docs/context.md`,
- wpisuje wpis zmian do `state-log.md`,
- notuje aktualizację danych jeżeli wchodzą nowe źródła JSON/CSV.

### 4) Domyślny tryb: prototyp bez warstwy trwałej
W tym repo pracujemy wyłącznie jako prototyp:
- bez projektowanej bazy danych,
- bez produkcyjnych backendowych endpointów,
- dane wejściowe i wynikowe traktujemy jako lokalne JSON-y (plikowe źródło danych),
- stan runtime i operacje robocze trzymane lokalnie w JSON / `localStorage` (gdzie to już użyte),
- import/eksport plików i czyste kontrakty JSON jako źródło dzielenia danych między etapami.

- zasada nadrzędna: **wszystkie zmiany danych traktujemy jako pliki JSON (lokalne payloady), które symulują interfejsy API na potrzeby prototypu**.

Aktualnie:
- `src/app/lib/mock-data.ts` i `src/app/lib/generate-mock-data.ts` to runtime mocki,
- `catalog_full_with_demo.json` to pełny dataset importu CSV ze sklejanym `scan`,
- `data/catalog_seed.json` to seed/prototyp bazowy.

### 5) Role i role projektowe
- `Product-owner`: zatwierdza priorytety biznesowe i model przepływu preorderów.
- `Lead-contract`: właściciel kontraktów.
- `Frontend-build`: implementacja widoków.
- `Data-demo`: spójność danych i mapowanie wejść (CSV/JSON/scraper).
- `QA-flow`: testy i zgodność flowów.

### 6) Style guide (wersja robocza)
- UI bazuje na wzorcach `shadcn/ui` i tokenach z `src/styles/theme.css`.
- statusy kolorystyczne i semantyczne:
  - `blue` = w trakcie,
  - `green` = potwierdzone/zakonczone,
  - `orange` = oczekujące/uwaga,
  - `red` = błąd/anulowane/ryzyko.
- responsywność: mobile-first, nagłówki i listy czytelne, kontrast zgodny z domyślną paletą.
- priorytet na semantykę: jasne etykiety pól, czytelne przyciski, czytelne stany pustych list i błędów.

### 7) Kontekst biznesowy tego projektu (fakty z kodu)
Architektura flow:
- Użytkownik: `/login` → `/catalog` → `/cart` → `/my-orders`.
- Admin: `/admin` oraz moduły `preorders`, `consolidation`, `deliveries`, `allocation`, `customers`, `order-configurator`.
- Dane preorderowe i statusy są budowane lokalnie i wykorzystywane w `AdminDashboard`, `PreordersListPage`, `ConsolidationPage`, `AllocationPage`, `MyOrdersPage`.
- Auth jest tokenless/sessionless (mock): `src/app/lib/auth-context.tsx` + `mockUsers` z `mock-data.ts`.
- Koszyk i sesja użytkownika używają `localStorage`.

### 8) Zmiany przy danych wejściowych
Jeśli dostarczasz nowy zestaw plików:
- `Grzesiek ... Delivery Overview.csv`,
- `..._scan.json` (np. `wszystkie_buty_scan.json`, `buty_do_biegania_scan.json`),
- wyniki skryptów:
  - `enrich_delivery_overview_with_scan.js`,
  - `export_csv_to_demo_json.js`,
  
to przed implementacją:
1. aktualizujemy `data/` i/lub `catalog_full_with_demo.json`,
2. synchronizujemy `docs/contracts.md` (polami `scan_*`, statusami, dopasowaniami),
3. dopiero potem ruszamy zmiany UI.
