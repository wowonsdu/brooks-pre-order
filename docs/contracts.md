# Kontrakty Danych i Zachowań

## 1) Źródła danych (wejścia)
### 1.1 CSV preorderów
- `Grzesiek Eman_F26_PL_size run_delivery overview_64920.xlsx - F26_PL_Delivery Overview.csv`
- `catalog_full_with_demo.json` – output wzbogacony o pola `scan_*`.
- `order-data.csv` w `src/imports/pasted_text/` to lokalny fixture do testów/analiz.

### 1.2 Scan produktów
- `wszystkie_buty_scan.json` i `buty_do_biegania_scan.json` zawierają mapę SKU, EAN, obrazki, rozmiary, linki i nazwę.
- Crawler i parser (`tmp_crawl_all_shoes.js`) jest źródłem surowych pól:
  - `url`, `name`, `sku`, `ean`, `price`, `sizes`, `color`, `image_urls`, `gallery_urls`.

### 1.3 Logika generatorów
- `src/app/lib/generate-mock-data.ts` -> źródło runtime mocków produktowych/preorderów.
- `src/app/lib/mock-data.ts` -> publiczne typy i wyeksportowane mocki runtime.

## 2) Kontrakty domenowe
### 2.1 Typ `Product`
```ts
{
  id: string
  name: string
  brand: string
  model: string
  category: string
  imageUrl: string
  basePrice: number
  variants: ProductVariant[]
  season: string
  expectedDeliveryDate?: string
}
```
### 2.2 Typ `ProductVariant`
```ts
{
  id: string
  sku: string
  size: string
  color: string
  availableStock: number
}
```

### 2.3 Typ `Preorder`
```ts
{
  id: string
  orderNumber: string
  customerId: string
  customerName: string
  companyName: string
  priority: number
  items: PreorderItem[]
  status: 'pending' | 'partially_allocated' | 'allocated' | 'partially_delivered' | 'completed' | 'cancelled'
  createdAt: string
  notes?: string
}
```
`PreorderItem`:
```ts
{
  id?: string
  variantId: string
  productId: string
  quantity: number
  quantityAllocated: number
  quantityDelivered: number
}
```

### 2.4 Typ `ConsolidatedOrder` i `Delivery`
```ts
{
  id: string
  supplier: string
  brand: string
  status: 'draft' | 'sent' | 'confirmed' | 'delivered'
  items: { variantId: string; productId: string; quantity: number; }[]
  createdAt: string
  sentAt?: string
  expectedDeliveryDate?: string
}
```
```ts
{
  id: string
  deliveryNumber: string
  supplier: string
  brand: string
  status: 'announced' | 'in_allocation' | 'allocated' | 'received'
  items: {
    variantId: string
    productId: string
    quantityAnnounced: number
    quantityAllocated?: number
  }[]
  invoiceNumber?: string
  expectedDate?: string
  receivedDate?: string
  createdAt: string
  consolidatedOrderId?: string
}
```

### 2.5 Typ `User`
```ts
{
  id: string
  email: string
  name: string
  role: 'admin' | 'b2b_customer'
  companyName?: string
  priority?: number
}
```

## 3) Kontrakty pól skanu (CSV/JSON wzbogacenie)
W `catalog_full_with_demo.json`/CSV oczekujemy pol:
- `real_product: boolean`
- `scan_match_type: string`
- `scan_item_base: string`
- `scan_linked_sku: string`
- `scan_linked_ean: string`
- `scan_linked_name: string`
- `scan_linked_url: string`
- `scan_price_pln: number`
- `scan_sizes: string[]` (JSON string in CSV source)
- `scan_image_urls: string[]`
- `scan_gallery_urls: string[]`
- `scan_model: string`
- `scan_color: string`
- `scan_width: string`
- `scan_note: string`

Reguła: `real_product=true` oznacza udane dopasowanie do crawlowego produktu; `false` oznacza rekord demo fallback.

## 4) Kontrakty UI i zachowania
- `CatalogPage`: filtruje po nazwie i marce, dodaje `variantId` + `quantity` do koszyka w `localStorage`.
- `CartPage`: edycja ilości, usuwanie, podsumowanie i akcja `submit preorder`.
- `MyOrdersPage`: odczyt preorderów bieżącego użytkownika (`mockPreorders` po `customerId`).
- `ConsolidationPage`: agreguje tylko preordery `pending` wg `product.brand`.
- `AllocationPage`: alokuje do preorderów wg `priority`; aktualizacja ilości nie może przekroczyć `quantityAnnounced`.
- `CustomersManagementPage`: edytuje priorytety 1..5.

## 5) Statusy i przejścia
### 5.1 Status Preorder
- `pending` → `partially_allocated` → `allocated` → `partially_delivered` → `completed` / `cancelled`.
- Preorder bez zmian po stronie backu w prototypie jest UI-only state.

### 5.2 Status Delivery
- `announced` → `in_allocation` → `allocated` → `received`.
- Przejścia wykonywane lokalnie, bez automatycznej integracji z ERP.

## 6) Zmiany kontraktowe
- Każde rozszerzenie kontraktów musi być odnotowane w `docs/contracts.md` i `state-log.md`.
- Każdy breaking change wymaga migracji danych wejściowych (CSV/JSON) i aktualizacji generowania demo payloadu.
