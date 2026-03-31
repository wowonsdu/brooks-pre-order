const fs = require('fs');
const https = require('https');
const { URL } = require('url');

const BASE = 'https://brooks-running.pl';
const START_URL = `${BASE}/`;
const OUTPUT_PATH = '/home/grzeg/brooks-pre-order/wszystkie_buty_scan.json';
const CSV_PATH = '/home/grzeg/brooks-pre-order/Grzesiek Eman_F26_PL_size run_delivery overview_64920.xlsx - F26_PL_Delivery Overview.csv';
const HEADERS = {
  'user-agent': 'Mozilla/5.0 (compatible; Mozilla/5.0; +https://openai.com/bot)',
  'accept-language': 'pl-PL,pl;q=0.9,en;q=0.8',
};

function request(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: HEADERS }, (res) => {
        let data = '';
        if (res.statusCode >= 400) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject)
      .setTimeout(30000, () => reject(new Error(`Timeout ${url}`)));
  });
}

function uniq(arr) {
  return [...new Set(arr)];
}

function normText(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normCode(value) {
  return (value || '').replace(/[^A-Za-z0-9.]/g, '').toUpperCase();
}

function parseLinks(html) {
  const re = /href="([^"]+)"/g;
  const links = [];
  let match;
  while ((match = re.exec(html)) !== null) {
    const href = match[1];
    if (!href || href.startsWith('javascript:')) continue;
    if (href.startsWith('http')) {
      if (!href.includes('brooks-running.pl')) continue;
      links.push(new URL(href).pathname);
      continue;
    }
    if (href.startsWith('/')) links.push(href);
  }
  return uniq(links);
}

function parseNextPage(html, currentUrl) {
  const nextPattern =
    /<a[^>]+rel="next"[^>]+href="([^"]+)"/i;
  const hrefMatch = html.match(nextPattern);
  if (hrefMatch && hrefMatch[1]) return new URL(hrefMatch[1], BASE).href;

  const pageMatch = currentUrl.match(/([?&])page=(\d+)/i);
  if (pageMatch) {
    const n = Number(pageMatch[2]) + 1;
    const sep = currentUrl.includes('?') ? '&' : '?';
    return `${currentUrl}${sep}page=${n}`;
  }

  const alt = html.match(/<a[^>]+class="[^"]*next[^"]*"[^>]+href="([^"]+)"/i);
  if (alt && alt[1]) return new URL(alt[1], BASE).href;
  return null;
}

function parseProductName(html) {
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1) return h1[1].trim();
  const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
  if (ogTitle) return ogTitle[1].trim();
  return null;
}

function extractJsonLdProduct(html) {
  const scripts = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) || [];
  for (const script of scripts) {
    const block = script.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    if (!block || !block[1]) continue;
    try {
      const parsed = JSON.parse(block[1]);
      const product = Array.isArray(parsed) ? parsed.find((x) => x && x['@type'] === 'Product') : parsed;
      if (product && product['@type'] === 'Product') {
        const offers = product.offers ? (Array.isArray(product.offers) ? product.offers[0] : product.offers) : null;
        return {
          sku: product.sku || null,
          ean: product.gtin || product.ean || null,
          name: product.name || null,
          price: offers?.price ? Number(String(offers.price).replace(',', '.')) : null,
        };
      }
    } catch {
      continue;
    }
  }
  return {};
}

function extractSku(html) {
  const htmlMatch = html.match(/data-product-code="sku">([^<]+)<\/span>/i);
  if (htmlMatch) return htmlMatch[1].trim();
  const jsMatch = html.match(/["']sku["']\s*:\s*["']([^"']+)["']/i);
  if (jsMatch) return jsMatch[1].trim();
  return null;
}

function extractEan(html) {
  const ld = extractJsonLdProduct(html);
  if (ld.ean) return ld.ean;
  const js = html.match(/["'](?:gtin|ean)["']\s*:\s*["']([^"']+)["']/i);
  if (js) return js[1].trim();
  return null;
}

function extractPrice(html) {
  const ld = extractJsonLdProduct(html);
  if (ld.price) return ld.price;
  const m = html.match(/"price"\s*:\s*["']?(\d+[.,]?\d*)["']?/i);
  return m ? Number(m[1].replace(',', '.')) : null;
}

function extractSizes(html) {
  const block = html.match(/<product-variants[\s\S]*?<\/product-variants>/i);
  if (!block) return [];
  const re = /data-user-value="([^"]+)"/g;
  const sizes = [];
  let m;
  while ((m = re.exec(block[0])) !== null) {
    const v = m[1].replace(',', '.');
    if (v && !sizes.includes(v)) sizes.push(v);
  }
  return sizes;
}

function extractImageSet(html) {
  const all = [];
  const re = /<img[^>]+(?:srcset|data-srcset)="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const best = m[1].split(',')[0].trim().split(/\s+/)[0];
    if (!best) continue;
    if (best.startsWith('//')) all.push(`https:${best}`);
    else if (best.startsWith('/')) all.push(`https://brooks-running.pl${best}`);
    else all.push(best);
  }
  const reSrc = /<img[^>]+\s+(?:src|data-src)="([^"]+)"/g;
  let s;
  while ((s = reSrc.exec(html)) !== null) {
    const src = s[1];
    if (!src) continue;
    if (src.startsWith('//')) all.push(`https:${src}`);
    else if (src.startsWith('/')) all.push(`https://brooks-running.pl${src}`);
    else all.push(src);
  }
  const reGallery = /product-gallery-image-[0-9-]+"[^>]*href="([^"]+)"/g;
  let g;
  while ((g = reGallery.exec(html)) !== null) {
    const href = g[1];
    if (!href) continue;
    if (href.startsWith('/')) all.push(`https://brooks-running.pl${href}`);
    else if (href.startsWith('//')) all.push(`https:${href}`);
    else all.push(href);
  }
  const reGallery2 = /product-image="([^"]+)"/g;
  while ((g = reGallery2.exec(html)) !== null) {
    const href = g[1];
    if (!href) continue;
    if (href.startsWith('/')) all.push(`https://brooks-running.pl${href}`);
    else if (href.startsWith('//')) all.push(`https:${href}`);
    else all.push(href);
  }
  const reOg = /property=\"og:image\"[^>]+content=\"([^\"]+)\"/g;
  while ((g = reOg.exec(html)) !== null) {
    const href = g[1];
    if (!href) continue;
    if (href.startsWith('/')) all.push(`https://brooks-running.pl${href}`);
    else if (href.startsWith('//')) all.push(`https:${href}`);
    else all.push(href);
  }
  const jsonBlocks = html.match(/<script[^>]*type=\"application\/ld\\+json\"[^>]*>([\s\S]*?)<\/script>/g) || [];
  for (const block of jsonBlocks) {
    const match = block.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    if (!match) continue;
    const jsonText = match[1];
    try {
      const parsed = JSON.parse(jsonText);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const candidateImages = [];
      for (const item of list) {
        const img = item.image;
        if (typeof img === 'string') candidateImages.push(img);
        else if (Array.isArray(img)) candidateImages.push(...img);
      }
      for (const href of candidateImages) {
        if (!href) continue;
        if (href.startsWith('/')) all.push(`https://brooks-running.pl${href}`);
        else if (href.startsWith('//')) all.push(`https:${href}`);
        else all.push(href);
      }
    } catch {
      continue;
    }
  }
  return uniq(all);
}

function crawlProductLinks() {
  const start = new Set(['/buty-do-biegania/']);
  return request(START_URL).then((html) => {
    const homepageLinks = parseLinks(html);
    for (const l of homepageLinks) {
      if (!l.startsWith('/buty-')) continue;
      if (l.includes('sprzedaz') || l.includes('cart') || l.includes('account')) continue;
      start.add(l.endsWith('/') ? l : `${l}/`);
    }
    return uniq([...start]);
  });
}

async function crawlCategoryLinks(seeds) {
  const queue = [...seeds];
  const seenCats = new Set();
  const productLinks = new Set();

  while (queue.length) {
    const cat = queue.shift();
    if (seenCats.has(cat)) continue;
    seenCats.add(cat);

    let pageUrl = cat.startsWith('http') ? cat : `${BASE}${cat}`;
    while (pageUrl) {
      const html = await request(pageUrl);
      const links = parseLinks(html);
      for (const href of links) {
        if (href.startsWith('/product/')) {
          productLinks.add(`${BASE}${href}`);
          continue;
        }
        if (!href.startsWith('/buty-')) continue;
        if (!href.includes('/product/') && !seenCats.has(href)) {
          queue.push(href);
        }
      }

      const next = parseNextPage(html, pageUrl);
      if (!next || next === pageUrl) break;
      const sameCategory = next.includes('/buty-');
      if (!sameCategory) break;
      if (!next.startsWith(BASE)) {
        if (next.startsWith('/')) pageUrl = `${BASE}${next}`;
        else break;
      } else {
        pageUrl = next;
      }
      if (seenCats.size > 5000) break;
    }
  }
  return { categoryCount: seenCats.size, productLinks: [...productLinks] };
}

function parseCsv(path) {
  const txt = fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const lines = txt.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(',').map((x) => x.trim());
  const idx = {
    item: headers.indexOf('ITEM_NUMBER'),
    name: headers.indexOf('NAME'),
    ean: headers.indexOf('EAN_NUMBER'),
  };
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = [];
    let cur = '';
    let quoted = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
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

    const item = idx.item >= 0 ? (cols[idx.item] || '').trim() : '';
    if (!item) continue;
    out.push({
      ITEM_NUMBER: item,
      NAME: idx.name >= 0 ? (cols[idx.name] || '').trim() : '',
      EAN_NUMBER: idx.ean >= 0 ? (cols[idx.ean] || '').trim() : '',
      name_norm: normText(idx.name >= 0 ? (cols[idx.name] || '').trim() : ''),
    });
  }
  return out;
}

function matchCatalog(products, csvRows) {
  const bySku = new Map();
  const byBaseSku = new Map();
  const byEan = new Map();
  const byName = new Map();

  for (const p of products) {
    const sku = normCode(p.sku || '');
    if (!sku) continue;
    bySku.set(sku, p);
    const base = sku.split('.')[0];
    if (!byBaseSku.has(base)) byBaseSku.set(base, []);
    byBaseSku.get(base).push(p);
  }

  for (const p of products) {
    const ean = normCode(p.ean || '');
    if (!ean) continue;
    if (!byEan.has(ean)) byEan.set(ean, []);
    byEan.get(ean).push(p);
  }

  for (const p of products) {
    const n = normText(p.name);
    if (!n) continue;
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n).push(p);
  }

  const mapped = [];
  let matchExact = 0;
  let matchBase = 0;
  let matchEan = 0;
  let matchName = 0;

  for (const row of csvRows) {
    const itemRaw = row.ITEM_NUMBER;
    const item = normCode(itemRaw);
    const ean = normCode(row.EAN_NUMBER);
    const base = item.includes('.') ? item.split('.')[0] : item;
    let match = null;
    let matchType = null;

    if (bySku.has(item)) {
      match = bySku.get(item);
      matchType = 'item_number_exact';
      matchExact += 1;
    } else if (ean && byEan.has(ean)) {
      const candidates = byEan.get(ean);
      match = candidates[0];
      matchType = 'ean_match';
      matchEan += 1;
    } else if (byBaseSku.has(base)) {
      match = byBaseSku.get(base)[0];
      matchType = 'item_number_base';
      matchBase += 1;
    } else {
      const candidates = byName.get(row.name_norm);
      if (candidates && candidates.length === 1) {
        match = candidates[0];
        matchType = 'name_single';
        matchName += 1;
      }
    }

    mapped.push({
      ITEM_NUMBER: row.ITEM_NUMBER,
      NAME: row.NAME,
      EAN_NUMBER: row.EAN_NUMBER,
      matched: !!match,
      match_type: matchType,
      linked_url: match ? match.url : null,
      linked_sku: match ? match.sku : null,
      linked_ean: match ? match.ean : null,
      linked_name: match ? match.name : null,
    });
  }

  return {
    matched_exact: matchExact,
    matched_ean: matchEan,
    matched_base: matchBase,
    matched_name: matchName,
    matched_any: mapped.filter((r) => r.matched).length,
    rows: mapped,
  };
}

async function main() {
  const catSeeds = await crawlProductLinks();
  const crawled = await crawlCategoryLinks(catSeeds);
  const productUrls = crawled.productLinks.sort();

  const products = [];
  for (const url of productUrls) {
    const html = await request(url);
    const productData = extractJsonLdProduct(html);
    const sku = extractSku(html) || productData.sku || null;
    const ean = extractEan(html) || productData.ean || null;
    const name = parseProductName(html) || productData.name || null;
    const sizes = extractSizes(html);
    const images = extractImageSet(html);
    const price = extractPrice(html);

    products.push({
      url,
      slug: url.split('/').filter(Boolean).pop(),
      name,
      sku,
      ean,
      price,
      sizes,
      image_urls: images,
      gallery_urls: images,
    });
  }

  const uniqProducts = uniq(products.map((p) => p.url)).map((url) => products.find((p) => p.url === url));
  const csvRows = parseCsv(CSV_PATH);
  const match = matchCatalog(uniqProducts, csvRows);

  const out = {
    source: BASE,
    collected_at: new Date().toISOString(),
    categories_crawled: crawled.categoryCount,
    seed_categories: catSeeds.length,
    products_count: uniqProducts.length,
    csv_rows: csvRows.length,
    matched_exact: match.matched_exact,
    matched_ean: match.matched_ean,
    matched_base: match.matched_base,
    matched_name: match.matched_name,
    matched_any: match.matched_any,
    products: uniqProducts,
    csv_match_rows: match.rows,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(
    {
      output: OUTPUT_PATH,
      categories_crawled: out.categories_crawled,
      seed_categories: out.seed_categories,
      products_count: out.products_count,
      csv_rows: out.csv_rows,
      matched_any: out.matched_any,
      matched_exact: out.matched_exact,
      matched_ean: out.matched_ean,
      matched_base: out.matched_base,
      matched_name: out.matched_name,
    },
    null,
    2
  ));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
