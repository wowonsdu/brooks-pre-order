# Kontekst Projektu: Brooks Preorder

## Stan działania
Repozytorium buduje demonstracyjny system preorderów B2B dla obuwia.
Projekt ma dwa flowy:
- `Customer` (kupujący B2B): przegląd katalogu, koszyk, składanie preorderu, śledzenie statusu.
- `Admin`: obsługa preorderów, konsolidacja, dodanie awizacji dostawy, alokacja towaru, zarządzanie priorytetami klientów.
- Rozdzielenie ekranów: `/admin/preorders` (lista preorderów) oraz `/admin/order-history` (widok zamówień powstałych z konsolidacji).

## Routing i główne trasy
- `"/"` → `HomePage` (przekierowanie do loginu / dashboardu po zalogowaniu),
- `"/login"` → `LoginPage`,
- `"/catalog"` → `CatalogPage`,
- `"/cart"` → `CartPage`,
- `"/my-orders"` → `MyOrdersPage`,
- `"/admin"` → `AdminDashboard`,
- `"/admin/preorders"` → `PreordersListPage` (Preordery - zamówienia klientów),
- `"/admin/consolidation"` → `ConsolidationPage`,
- `"/admin/order-history"` → `OrdersHistoryPage` (widok zamówień wygenerowanych z konsolidacji),
- `"/admin/deliveries"` → `DeliveriesPage`,
- `"/admin/allocation/:deliveryId"` → `AllocationPage`,
- `"/admin/customers"` → `CustomersManagementPage`,
- `"/admin/order-configurator"` → `OrderConfigurator`.

## Kluczowe encje
- `Product`:
  - `id`, `name`, `brand`, `model`, `category`, `imageUrl`, `basePrice`, `variants`, `season`, `expectedDeliveryDate`.
- `ProductVariant`:
  - `id`, `sku`, `size`, `color`, `availableStock`.
- `User`:
  - `id`, `email`, `name`, `role` (`admin` | `b2b_customer`), `companyName`, `priority`, `debtAmountPln`, `debtSince`, `allowOrders`.
- `Preorder`:
  - `id`, `orderNumber`, `customerId`, `items`, `status` (`pending`, `partially_allocated`, `allocated`, `partially_delivered`, `completed`, `cancelled`), daty, uwagi.
  - `customerPriority`, `priority`, `allocationOrder` (domyślnie klienta, potem edytowane na poziomie preorderu), `seasonWindow`, `deliveryMonth`, `debtDecision`, `debtDecisionAt`, `debtDecisionBy`.
- `Delivery`:
  - `id`, `deliveryNumber`, `supplier`, `brand`, `status` (`announced`, `in_allocation`, `allocated`, `received`), `items`, numery faktury, daty.
- `ConsolidatedOrder`:
  - `id`, `supplier`, `brand`, `status`, `items`, `createdAt`, optional `sentAt`, `expectedDeliveryDate`.

## Model pracy demo
- Brak bazy danych i backendu produkcyjnego.
- Stan runtime jest pamiętany w pamięci i `localStorage` (`cart`, `currentUser`).
- Dane wejściowe są mapowane do JSON:
  - `Grzesiek ... F26_PL_Delivery Overview.csv` (surowy arkusz),
  - `...scan.json` (wynik crawlingu strony),
  - `catalog_full_with_demo.json` (po wzbogaceniu o kolumny scan),
  - `src/app/lib/mock-data.ts` (runtime demo set).

## Co to robi dziś aplikacja
- klient B2B:
  - przegląda sezonowy katalog,
  - wybiera wariant (kolor + rozmiar) i ilość,
  - dodaje do koszyka i składa preorder (mockowe API),
  - widzi statusy preorderów.
- admin:
  - podgląd metryk i list preorderów,
  - review preorderów klientów zalegających na dashboardzie przed dopuszczeniem ich do konsolidacji,
  - konsolidacja zamówień po wariantach (produkty, kolory, rozmiary),
  - historia zamówień wygenerowanych z konsolidacji,
  - tworzenie/zapis awizacji dostaw,
  - import i dopasowanie pliku awizacji CSV do zamówień + prefill alokacji,
  - alokacja towaru do preorderów wg priorytetu i ręczna korekta,
  - ustawianie priorytetów klientów,
  - konfigurator zamówień korzysta ze stabilnych selektorów store, żeby nie wywoływać pętli renderów.
- Konfiguracja priorytetów:
  - Klient ma domyślny `customerPriority`.
  - Każdy preorder może mieć własny `priority` (edytowalny).
  - Lista preorderów ma dodatkowy `allocationOrder` z ręczną zmianą kolejności przez uchwyt.
  - Realna kolejność realizacji preorderów jest ustawiana w obrębie `deliveryMonth`; pozycja na liście w danym miesiącu nadpisuje domyślną kolejność klienta dla tego preorderu.
  - Widok preorderów jest domyślnie sortowany po `deliveryMonth`, a miesiąc dostawy jest pierwszą kolumną tabeli.
  - Widok preorderów ma też szybki filtr po `deliveryMonth`, opcjonalne grupowanie rekordów per miesiąc i sortowanie tylko po jednej kolumnie naraz.
  - Kolumna `Kolejność` nie jest renderowana w tabeli; kolejność pozostaje logiką wewnętrzną dla realizacji i alokacji.
  - Widok preorderów pokazuje jednocześnie domyślny `customerPriority` firmy oraz osobny priorytet/kolejność preorderu sterowaną przez `allocationOrder`.
  - Dropdown w kolumnie `Priorytet` i drag/drop na liście preorderów zapisują teraz ten sam porządek `allocationOrder` w obrębie miesiąca, więc ręczna zmiana numeru i przeciąganie działają spójnie.
  - Reindeksacja `allocationOrder` jest wykonywana per miesiąc według bieżącej kolejności rekordów, żeby drop nie był cofany przez ponowne sortowanie po starych wartościach.
  - Klient zalegający dostaje badge `Zalega` na liście preorderów, a rozwinięcie preorderu pokazuje kwotę zaległości, czas trwania, `allowOrders` i status review.
  - Dashboard administratora jest pierwszym etapem dopuszczenia preorderu klienta zalegającego do procesu zamówienia; decyzja działa per preorder z dodatkową akcją zbiorczą dla całej firmy.
  - Konsolidacja, konfigurator zamówień i alokacja pomijają preordery klientów zalegających, które nie zostały dopuszczone do procesu (`debtDecision !== 'approved'`).
- Sezony:
  - Wiosenny: listopad–marzec (`10,11,0,1,2`)
  - Zimowy: maj–wrzesień (`4,5,6,7,8`)

## Stan projektu (na dziś)
- prototyp działający front-endowo,
- kompletna ścieżka B2B + admin w komponencie UI,
- część procesu integracyjnego oparta o skryptowe wzbogacenie CSV i JSON (dane z crawlingu),
- niezaimplementowane jeszcze:
  - integracje z ERP/systemami magazynowymi,
  - trwała baza i API,
  - produkcyjne powiadomienia/nadzór audytowy.

## Reguły operacyjne (AGENTS-derived)
- nowy kod tylko po uzupełnieniu kontraktów,
- każda zmiana danych wejściowych -> aktualizacja `docs/contracts.md` i `state-log.md`,
- wszystkie nowe moduły muszą trzymać się rozdziału ról i logiki demo-first.
