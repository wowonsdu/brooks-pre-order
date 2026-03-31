# State Log

- 2026-03-31: wprowadzono wersję AGENTS ukierunkowaną na projekt Brooks Preorder jako prototyp front-endowy bez bazy i bez backendu.
- 2026-03-31: przeniesiono dokumentację kontekstu i kontraktów do `docs/context.md` i `docs/contracts.md` pod realny kod projektu (`src/app`, `mock-data`, `mock preorders`, `consolidation`, `allocation`).
- 2026-03-31: zsynchronizowano reguły projektu dotyczące:
  - importu i wzbogacania CSV (`catalog_full_with_demo.json`, `Grzesiek ... csv`, `wszystkie_buty_scan.json`),
  - flagi `real_product` i fallbacku demo,
  - przechowywania stanu lokalnie (`localStorage`) i działania bez trwałego backendu.
- 2026-03-31: potwierdzono listę tras i domen biznesowe w `AGENTS.md`:
  - Customer: `/catalog`, `/cart`, `/my-orders`.
  - Admin: `/admin`, `/admin/preorders`, `/admin/consolidation`, `/admin/deliveries`, `/admin/allocation/:deliveryId`, `/admin/customers`, `/admin/order-configurator`.
- 2026-03-31: przeniesiono gotowe artefakty danych do `data/`:
  - skany: `buty_do_biegania_scan.json`, `wszystkie_buty_scan.json`,
  - catalogi: `catalog_full_with_demo.json`, `catalog_full_with_demo_from_enriched.json`,
  - CSV: raw `.csv`, `.bak`, `order-data.csv`, `.enriched.csv`.
- 2026-03-31: potwierdzono model prototypowy "JSON-first" jako źródło danych:
  - brak API produkcyjnego i bazy,
  - lokalne JSON jako kontrakty danych (w zamienniku warstwy API),
  - sesja/koszyk dodatkowo w `localStorage`.
