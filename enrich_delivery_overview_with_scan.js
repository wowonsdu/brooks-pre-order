const fs = require('fs');

const INPUT_CSV = '/home/grzeg/brooks-pre-order/Grzesiek Eman_F26_PL_size run_delivery overview_64920.xlsx - F26_PL_Delivery Overview.csv';
const SCAN_JSON = '/home/grzeg/brooks-pre-order/wszystkie_buty_scan.json';
const OUTPUT_CSV = '/home/grzeg/brooks-pre-order/Grzesiek Eman_F26_PL_size run_delivery overview_64920.xlsx - F26_PL_Delivery Overview.enriched.csv';

const DEMO_IMAGE_POOL = [
  'https://picsum.photos/seed/brooks-demo-1/1200/1200',
  'https://picsum.photos/seed/brooks-demo-2/1200/1200',
  'https://picsum.photos/seed/brooks-demo-3/1200/1200',
  'https://picsum.photos/seed/brooks-demo-4/1200/1200',
  'https://picsum.photos/seed/brooks-demo-5/1200/1200',
  'https://picsum.photos/seed/brooks-demo-6/1200/1200',
  'https://picsum.photos/seed/brooks-demo-7/1200/1200',
  'https://picsum.photos/seed/brooks-demo-8/1200/1200',
];

function parseCsvLine(line) {
  const cols = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i += 1;
        continue;
      }
      quoted = !quoted;
      continue;
    }
    if (ch === ',' && !quoted) {
      cols.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  cols.push(cur);
  return cols;
}

function toCsvLine(values) {
  return values
    .map((value) => {
      const v = value === undefined || value === null ? '' : String(value);
      if (/[",\n\r]/.test(v)) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    })
    .join(',');
}

function hashSeedFromText(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandom(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return ((x >>> 0) % 2147483648) / 2147483648;
  };
}

function pick(arr, rand) {
  return arr[Math.floor(rand() * arr.length)] || arr[0];
}

function pickMany(arr, count, rand) {
  const out = [];
  const pool = [...arr];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const idx = Math.floor(rand() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
    if (pool.length === 0 && out.length < count) {
      for (const v of arr) pool.push(v);
    }
  }
  return out;
}

function splitItem(item) {
  const dot = item.lastIndexOf('.');
  if (dot === -1) {
    return { base: item, size: null };
  }
  const base = item.slice(0, dot);
  const size = item.slice(dot + 1);
  return { base, size };
}

function extractModelColorFromName(name = '') {
  const raw = String(name).toLowerCase();
  const withOn = raw.split(' na ')[0];
  const tokens = withOn.replace(/\s+/g, ' ').trim().split(' ');
  const stop = ['buty', 'damskie', 'meskie', 'do', 'biegania', 'startowe', 'startowy', 'neutralne', 'męskie', 'meskie'];
  const filtered = tokens.filter((t) => !stop.includes(t));
  return {
    model: filtered.slice(0, 5).join(' '),
    color: tokens.length > 0 ? tokens[tokens.length - 1] : '',
  };
}

function makeRandomizedDemo(row, products, rand) {
  const baseProduct = pick(products, rand);
  const sizes = pickMany(['35', '35.5', '36', '36.5', '37', '37.5', '38', '38.5', '39', '40', '40.5', '41', '42', '42.5', '43', '44', '44.5', '45'], 4, rand);
  const images = pickMany(DEMO_IMAGE_POOL, 4, rand);
  const gallery = [...images].reverse();
  const seed = hashSeedFromText(String(row.ITEM_NUMBER || ''));
  const localRand = seededRandom(seed);
  const randomPrice = Math.floor(59 + localRand() * 700);
  const colorPool = ['czarne', 'szare', 'granatowe', 'białe', 'bordowe', 'nawod', 'fioletowe', 'różowe', 'kremowe'];
  const modelInfo = extractModelColorFromName(baseProduct.name || '');
  const color = pick(colorPool, localRand);
  const model = baseProduct.name ? baseProduct.name.replace(/-?\\s+(na|w|dla)\\s+.+$/i, '') : `${modelInfo.model} demo`;
  const width = pick(['Narrow', 'Regular', 'Wide'], localRand);
  return {
    matchType: 'unmatched_randomized_demo',
    linkedSku: `${modelInfo.model.replace(/[^A-Z0-9]+/gi, '').slice(0, 10).toUpperCase() || 'BROOKS'}-${Math.floor(localRand() * 900 + 100)}`,
    linkedEan: `0${String(Math.floor(localRand() * 999999999999) + 100000000000).padStart(13, '0').slice(0, 13)}`,
    linkedName: `${model || 'Buty demo'} ${color}`,
    linkedUrl: 'https://brooks-running.pl/demo/demo-product',
    price: randomPrice,
    sizes,
    imageUrls: images,
    galleryUrls: gallery,
    color,
    model,
    width,
  };
}

function enrich() {
  const scan = JSON.parse(fs.readFileSync(SCAN_JSON, 'utf8'));
  const products = scan.products || [];
  const matchRows = Array.isArray(scan.csv_match_rows) ? scan.csv_match_rows : [];
  const matchByItem = new Map();
  for (const row of matchRows) {
    if (!row || !row.ITEM_NUMBER) continue;
    matchByItem.set(String(row.ITEM_NUMBER), row);
    const base = splitItem(String(row.ITEM_NUMBER)).base;
    matchByItem.set(`base:${base}`, row);
  }

  const csvTxt = fs.readFileSync(INPUT_CSV, 'utf8').replace(/^\uFEFF/, '');
  const lines = csvTxt.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = parseCsvLine(lines[0]);
  const idxItem = header.indexOf('ITEM_NUMBER');
  const idxName = header.indexOf('NAME');
  const idxEan = header.indexOf('EAN_NUMBER');
  if (idxItem === -1) throw new Error('Brak kolumny ITEM_NUMBER');

  const addedColumns = [
    'real_product',
    'scan_match_type',
    'scan_item_base',
    'scan_linked_sku',
    'scan_linked_ean',
    'scan_linked_name',
    'scan_linked_url',
    'scan_price_pln',
    'scan_sizes',
    'scan_image_urls',
    'scan_gallery_urls',
    'scan_model',
    'scan_color',
    'scan_width',
    'scan_note',
  ];
  const outHeader = [...header, ...addedColumns];
  const out = [];
  out.push(toCsvLine(outHeader));

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    while (cols.length < header.length) cols.push('');
    const row = {};
    header.forEach((h, idx) => {
      row[h] = cols[idx] ?? '';
    });

    const item = String(row.ITEM_NUMBER || '').trim();
    const match = matchByItem.get(item);
    const parsedItem = splitItem(item);
    const baseMatch = parsedItem.base ? matchByItem.get(`base:${parsedItem.base}`) : null;
    const best = match && match.matched ? match : null;
    const real = !!best && best.matched === true;

    if (real) {
      const linkedName = best.linked_name || best.NAME || best['linked_name'] || row.NAME;
      const modelInfo = extractModelColorFromName(linkedName || '');
      const model = linkedName || row.NAME || '';
      const color = pick(model.split(' '), () => 0.5) || modelInfo.color;
      out.push(
        toCsvLine([
          ...cols.slice(0, header.length),
          'true',
          best.match_type || 'item_number_base',
          parsedItem.base,
          best.linked_sku || '',
          best.linked_ean || '',
          linkedName || '',
          best.linked_url || '',
          (() => {
            const p = products.find((x) => x.url === best.linked_url) || {};
            return p.price != null ? p.price : '';
          })(),
          JSON.stringify((() => {
            const p = products.find((x) => x.url === best.linked_url);
            return p ? p.sizes || [] : [];
          })()),
          JSON.stringify((() => {
            const p = products.find((x) => x.url === best.linked_url);
            return p ? p.image_urls || [] : [];
          })()),
          JSON.stringify((() => {
            const p = products.find((x) => x.url === best.linked_url);
            return p ? p.gallery_urls || [] : [];
          })()),
          model,
          color,
          'Real',
          'from_crawled_scan',
        ])
      );
    } else {
      const itemSeed = hashSeedFromText(`${item}-${i}`);
      const rand = seededRandom(itemSeed);
      const synthetic = makeRandomizedDemo(row, products, rand);
      const baseRow = baseMatch || null;
      out.push(
        toCsvLine([
          ...cols.slice(0, header.length),
          'false',
          synthetic.matchType,
          parsedItem.base || '',
          synthetic.linkedSku,
          baseRow && baseRow.linked_ean ? baseRow.linked_ean : synthetic.linkedEan,
          synthetic.linkedName,
          synthetic.linkedUrl,
          synthetic.price,
          JSON.stringify(synthetic.sizes),
          JSON.stringify(synthetic.imageUrls),
          JSON.stringify(synthetic.galleryUrls),
          synthetic.model,
          synthetic.color,
          synthetic.width,
          'synthetic_randomized_demo',
        ])
      );
    }
  }

  fs.writeFileSync(OUTPUT_CSV, out.join('\n'), 'utf8');
  return {
    input: INPUT_CSV,
    output: OUTPUT_CSV,
    rows: lines.length - 1,
    matched: matchRows.filter((r) => r && r.matched).length,
    unmatched: lines.length - 1 - matchRows.filter((r) => r && r.matched).length,
    columnsAdded: addedColumns.length,
  };
}

const result = enrich();
console.log(JSON.stringify(result, null, 2));
