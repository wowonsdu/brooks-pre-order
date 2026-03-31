const fs = require('fs');

const INPUT_CSV = '/home/grzeg/brooks-pre-order/Grzesiek Eman_F26_PL_size run_delivery overview_64920.xlsx - F26_PL_Delivery Overview.csv';
const OUTPUT_JSON = '/home/grzeg/brooks-pre-order/catalog_full_with_demo.json';

function parseCsvLine(line) {
  const columns = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      columns.push(current);
      current = '';
    } else {
      current += ch;
    }

    i += 1;
  }

  columns.push(current);
  return columns;
}

function parseArrayField(value) {
  if (!value) return [];
  const v = String(value).trim();
  if (!v) return [];
  try {
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  if (v === '[]' || v === 'null') return [];
  return v.split(';').map((x) => x.trim()).filter(Boolean);
}

function toBoolean(value) {
  return String(value).toLowerCase() === 'true';
}

function toNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapRowsToJson(lines) {
  const header = parseCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    if (!lines[i].trim()) continue;
    const values = parseCsvLine(lines[i]);
    const row = {};
    header.forEach((key, idx) => {
      row[key] = values[idx] ?? '';
    });

    const itemBase = row.scan_item_base || row.ITEM_NUMBER.split('.').slice(0, -1).join('.') || row.ITEM_NUMBER;
    const itemSize = row.ITEM_NUMBER.includes('.')
      ? row.ITEM_NUMBER.split('.').pop()
      : '';
    const images = parseArrayField(row.scan_image_urls);
    const gallery = parseArrayField(row.scan_gallery_urls);
    const sizes = parseArrayField(row.scan_sizes);

    rows.push({
      source_row_index: i,
      order_status: row.ORDER_LINE_STATUS,
      order_number: row.ORDER_NUMBER,
      planning_date: row.PLANNING_DATE,
      requested_delivery_date: row.REQUESTED_DELIVERY_DATE,
      departure_date: row.DEPARTURE_DATE,
      customer_number: row.CUSTOMER_NUMBER,
      country: row.COUNTRY,
      customer_order_no: row.CUSTOMERS_ORDER_NO,
      order_line_delivery_method: row.ORDER_LINE_DELIVERY_METHOD,
      order_type_code: row.ORDER_TYPE_CODE,
      item_number: row.ITEM_NUMBER,
      item_name: row.NAME,
      procurement_group_code: row.PROCUREMENT_GROUP_CODE,
      ean_number: row.EAN_NUMBER,
      order_line_number: row.ORDER_LINE_NUMBER,
      warehouse: row.WAREHOUSE,
      ordered_quantity: toNumber(row.ORDERED_QUANTITY),
      net_price: toNumber(row.NET_PRICE),
      price: toNumber(row.PRICE),
      delivery_no: row.DELIVERY_NO,
      real_product: toBoolean(row.real_product),
      scan: {
        match_type: row.scan_match_type || '',
        item_base: itemBase,
        size: itemSize,
        linked_sku: row.scan_linked_sku || '',
        linked_ean: row.scan_linked_ean || '',
        linked_name: row.scan_linked_name || '',
        linked_url: row.scan_linked_url || '',
        price_pln: toNumber(row.scan_price_pln),
        sizes,
        image_urls: images,
        gallery_urls: gallery,
        model: row.scan_model || '',
        color: row.scan_color || '',
        width: row.scan_width || '',
        note: row.scan_note || '',
      },
    });
  }

  return rows;
}

const raw = fs.readFileSync(INPUT_CSV, 'utf8').replace(/^\uFEFF/, '');
const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
const data = mapRowsToJson(lines);

const payload = {
  source: INPUT_CSV,
  generated_at: new Date().toISOString(),
  total_rows: data.length,
  real_count: data.filter((r) => r.real_product).length,
  demo_count: data.filter((r) => !r.real_product).length,
  items: data,
};

fs.writeFileSync(OUTPUT_JSON, JSON.stringify(payload, null, 2), 'utf8');

console.log(JSON.stringify({
  output: OUTPUT_JSON,
  total_rows: payload.total_rows,
  real_count: payload.real_count,
  demo_count: payload.demo_count,
}, null, 2));
