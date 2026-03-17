import { execFileSync } from 'node:child_process';

const DB_NAME = process.env.CF_D1_DATABASE || 'ken-gei-prelude-db';
const BASE_URL = 'https://www.aichi-fam-u.ac.jp/event/music/';

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    stdio: options.stdio || 'pipe',
    encoding: options.encoding || 'utf8',
    env: process.env,
  });
}

function wrangler(args) {
  return run('npx', ['wrangler', ...args]);
}

function d1Query(sql) {
  const raw = wrangler(['d1', 'execute', DB_NAME, '--remote', '--json', '--command', sql]);
  return JSON.parse(raw)[0]?.results || [];
}

function d1Exec(sql) {
  wrangler(['d1', 'execute', DB_NAME, '--remote', '--command', sql]);
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function normalizeTitle(value) {
  return value.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
}

function parseAllEventBlocks(html, baseUrl) {
  const map = new Map();
  const blockPattern = /<a\s+href="(\/event\/\d+\.html)"\s+class="eventList_item event">([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = blockPattern.exec(html)) !== null) {
    const detailPath = match[1];
    const block = match[2];
    const titleMatch = block.match(/<p\s+class="event_title">([^<]*)<\/p>/);
    const imgMatch = block.match(/<img\s+src="([^"]+)"/);
    if (!titleMatch || !imgMatch) continue;

    const title = titleMatch[1].trim().replace(/\s+/g, ' ');
    const key = normalizeTitle(title);
    const imageUrl = new URL(imgMatch[1], baseUrl).href;
    const detailUrl = new URL(detailPath, baseUrl).href;
    map.set(key, { title, imageUrl, detailUrl });
  }
  return map;
}

async function kvPutFromBuffer(key, buffer, contentType) {
  const tempPath = `/tmp/${key.split('/').pop()}`;
  await import('node:fs/promises').then(fs => fs.writeFile(tempPath, buffer));
  wrangler([
    'kv', 'key', 'put', key,
    '--binding', 'KV',
    '--path', tempPath,
    '--metadata', JSON.stringify({ contentType }),
  ]);
}

async function fetchUrl(url, accept) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Crescendo-Bot/1.0',
      Accept: accept,
    },
  });
  if (!res.ok) return null;
  return res;
}

async function main() {
  const rows = d1Query(
    `SELECT slug, title, source_url FROM concerts
     WHERE source = 'auto_scrape' AND is_deleted = 0
     AND (flyer_thumbnail_key IS NULL OR flyer_thumbnail_key = '' OR flyer_r2_keys IS NULL OR flyer_r2_keys = '[]')
     ORDER BY date DESC`
  );

  if (!rows.length) {
    console.log('No missing flyers');
    return;
  }

  const titleMap = new Map();
  const detailMap = new Map();
  for (let i = 1; i <= 20; i++) {
    const pageUrl = i === 1 ? BASE_URL : `${BASE_URL}index_${i}.html`;
    const res = await fetchUrl(pageUrl, 'text/html');
    if (!res) continue;
    const html = await res.text();
    const blocks = parseAllEventBlocks(html, pageUrl);
    for (const [key, value] of blocks) {
      titleMap.set(key, value);
      detailMap.set(value.detailUrl, value);
    }
  }

  let updated = 0;
  let scanned = 0;
  for (const row of rows) {
    scanned++;
    const normalizedTitle = normalizeTitle(row.title);
    let match = row.source_url ? detailMap.get(row.source_url) : undefined;
    if (!match) {
      match = titleMap.get(normalizedTitle);
    }
    if (!match) {
      const prefix = normalizedTitle.slice(0, 24);
      for (const [key, value] of titleMap) {
        if (key.startsWith(prefix)) {
          match = value;
          break;
        }
      }
    }
    if (!match) continue;

    const timestamp = Date.now();
    const flyerKeys = [];
    let thumbKey = '';

    const imgRes = await fetchUrl(match.imageUrl, 'image/*');
    if (imgRes) {
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      const ext = match.imageUrl.match(/\.(webp|png|jpg|jpeg|gif)$/i)?.[1]?.toLowerCase() || 'jpg';
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      const imgKey = `flyers/${row.slug}/${timestamp}.${ext}`;
      thumbKey = `flyers/${row.slug}/${timestamp}_thumb.${ext}`;
      await kvPutFromBuffer(imgKey, imgBuffer, contentType);
      await kvPutFromBuffer(thumbKey, imgBuffer, contentType);
      flyerKeys.push(imgKey);
    }

    const detailRes = await fetchUrl(match.detailUrl, 'text/html');
    if (detailRes) {
      const detailHtml = await detailRes.text();
      const pdfMatches = [...detailHtml.matchAll(/href="([^"]*\.pdf)"/g)];
      const seen = new Set();
      for (let pi = 0; pi < pdfMatches.length; pi++) {
        const fullUrl = new URL(pdfMatches[pi][1], match.detailUrl).href;
        if (seen.has(fullUrl) || fullUrl.includes('apple-touch-icon')) continue;
        seen.add(fullUrl);
        const pdfRes = await fetchUrl(fullUrl, 'application/pdf');
        if (!pdfRes) continue;
        const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
        const pdfKey = `flyers/${row.slug}/${Date.now()}_p${pi + 1}.pdf`;
        await kvPutFromBuffer(pdfKey, pdfBuffer, 'application/pdf');
        flyerKeys.push(pdfKey);
      }
    }

    if (flyerKeys.length > 0) {
      d1Exec(
        `UPDATE concerts SET flyer_r2_keys = ${sqlString(JSON.stringify(flyerKeys))}, flyer_thumbnail_key = ${sqlString(thumbKey || flyerKeys[0] || '')}, updated_at = datetime('now') WHERE slug = ${sqlString(row.slug)}`
      );
      updated++;
    }

    if (scanned % 20 === 0) {
      console.log(`progress ${scanned}/${rows.length} updated=${updated}`);
    }
  }

  console.log(`DONE scanned=${rows.length} updated=${updated}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});