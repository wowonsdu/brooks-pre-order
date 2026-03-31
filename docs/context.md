# Kontekst Projektu: Brooks Preorder

## Stan działania
Repozytorium buduje demonstracyjny system preorderów B2B dla obuwia.
Projekt ma dwa flowy:
- `Customer` (kupujący B2B): przegląd katalogu, koszyk, składanie preorderu, śledzenie statusu.
- `Admin`: obsługa preorderów, konsolidacja, dodanie awizacji dostawy, alokacja towaru, zarządzanie priorytetami klientów.

## Routing i główne trasy
- `"/"` → `HomePage` (przekierowanie do loginu / dashboardu po zalogowaniu),
- `"/login"` → `LoginPage`,
- `"/catalog"` → `CatalogPage`,
- `"/cart"` → `CartPage`,
- `"/my-orders"` → `MyOrdersPage`,
- `"/admin"` → `AdminDashboard`,
- `"/admin/preorders"` → `PreordersListPage`,
- `"/admin/consolidation"` → `ConsolidationPage`,
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
  - `id`, `email`, `name`, `role` (`admin` | `b2b_customer`), `companyName`, `priority`.
- `Preorder`:
  - `id`, `orderNumber`, `customerId`, `items`, `status` (`pending`, `partially_allocated`, `allocated`, `partially_delivered`, `completed`, `cancelled`), daty, uwagi.
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
  - konsolidacja zamówień po wariantach (produkty, kolory, rozmiary),
  - tworzenie/zapis awizacji dostaw,
  - alokacja towaru do preorderów wg priorytetu i ręczna korekta,
  - ustawianie priorytetów klientów.

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
