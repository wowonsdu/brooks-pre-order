# Data dir

- `catalog_seed.json` — starter danych demo.
- `catalog_full_with_demo.json` — pełny payload z importu `CSV + scan` (wersja dotychczasowa).
- `catalog_full_with_demo_from_enriched.json` — payload z pliku `.enriched.csv` (z polami `scan_*` i `real_product`).
- `Grzesiek Eman_F26_PL_size run_delivery overview_64920.xlsx - F26_PL_Delivery Overview.csv` — surowy input CSV.
- `Grzesiek Eman_F26_PL_size run_delivery overview_64920.xlsx - F26_PL_Delivery Overview.csv.bak` — kopia zapasowa CSV.
- `Grzesiek Eman_F26_PL_size run_delivery overview_64920.xlsx - F26_PL_Delivery Overview.enriched.csv` — CSV po złożeniu skanu.
- `order-data.csv` — lokalny fixture CSV.
- `buty_do_biegania_scan.json` — skan produktów z kategorii.
- `wszystkie_buty_scan.json` — pełny skan wszystkich butów.

Pipeline lokalny:
1) input CSV (`*.csv`),
2) skan (`*_scan.json`),
3) enrich (`*.enriched.csv`) + export JSON.

