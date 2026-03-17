import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import crypto from 'node:crypto';

const DB_NAME = process.env.CF_D1_DATABASE || 'ken-gei-prelude-db';
const SITE_URL = process.env.SITE_URL || 'https://ken-gei-prelude.pages.dev';
const THUMB_MAX = Number.parseInt(process.env.FLYER_THUMB_MAX || '560', 10);
const GS_DPI = Number.parseInt(process.env.FLYER_RENDER_DPI || '300', 10);

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const force = args.has('--force');
const sampleOnly = args.has('--sample-only');
const slugArg = process.argv.find((arg) => arg.startsWith('--slug='));
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const targetSlug = slugArg ? slugArg.slice('--slug='.length) : '';
const limit = limitArg ? Number.parseInt(limitArg.slice('--limit='.length), 10) : 0;

const CONVERTED_PAGE_PATTERN = /_g([a-z0-9-]+)_o(\d+)_p(\d+)_t(\d+)\.webp$/i;
const THUMBNAIL_PATTERN = /_thumb\.(webp|png|jpe?g|gif)$/i;

function run(command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, {
    cwd: process.cwd(),
    stdio: options.stdio || 'pipe',
    encoding: options.encoding || 'utf8',
    env: process.env,
  });
}

function hasCommand(command) {
  try {
    run('which', [command]);
    return true;
  } catch {
    return false;
  }
}

function wrangler(argsList, options = {}) {
  return run('npx', ['wrangler', ...argsList], options);
}

function d1Query(sql) {
  const raw = wrangler(['d1', 'execute', DB_NAME, '--remote', '--json', '--command', sql]);
  const parsed = JSON.parse(raw);
  return parsed[0]?.results || [];
}

function d1Execute(sql) {
  wrangler(['d1', 'execute', DB_NAME, '--remote', '--command', sql], { stdio: 'pipe' });
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function isPdfFlyerKey(key) {
  return key.toLowerCase().endsWith('.pdf');
}

function isThumbnailKey(key) {
  return THUMBNAIL_PATTERN.test(key);
}

function parseFlyerKey(key, originalIndex) {
  const match = (key.split('/').pop() || key).match(CONVERTED_PAGE_PATTERN);
  if (match) {
    return {
      key,
      kind: 'converted-page',
      originalIndex,
      groupId: match[1],
      sortIndex: Number.parseInt(match[2], 10),
      pageIndex: Number.parseInt(match[3], 10),
      pageTotal: Number.parseInt(match[4], 10),
    };
  }
  if (isPdfFlyerKey(key)) {
    return { key, kind: 'pdf', originalIndex, groupId: '', sortIndex: Number.MAX_SAFE_INTEGER, pageIndex: Number.MAX_SAFE_INTEGER, pageTotal: 0 };
  }
  if (/\.(webp|png|jpe?g|gif)$/i.test(key)) {
    return { key, kind: 'image', originalIndex, groupId: '', sortIndex: Number.MAX_SAFE_INTEGER, pageIndex: Number.MAX_SAFE_INTEGER, pageTotal: 0 };
  }
  return { key, kind: 'other', originalIndex, groupId: '', sortIndex: Number.MAX_SAFE_INTEGER, pageIndex: Number.MAX_SAFE_INTEGER, pageTotal: 0 };
}

function normalizeFlyerKeys(keys, thumbnailKey) {
  const deduped = [...new Set(keys.filter((key) => key && !isThumbnailKey(key)))];
  const parsed = deduped.map((key, originalIndex) => parseFlyerKey(key, originalIndex)).sort((left, right) => {
    const order = { 'converted-page': 0, image: 1, pdf: 2, other: 3 };
    if (order[left.kind] !== order[right.kind]) return order[left.kind] - order[right.kind];
    if (left.kind === 'converted-page' && right.kind === 'converted-page') {
      if (left.sortIndex !== right.sortIndex) return left.sortIndex - right.sortIndex;
      if (left.pageIndex !== right.pageIndex) return left.pageIndex - right.pageIndex;
    }
    return left.originalIndex - right.originalIndex;
  });

  const firstRenderable = parsed.find((entry) => entry.kind !== 'pdf')?.key || '';
  const derivedThumb = firstRenderable ? firstRenderable.replace(/\.(webp|png|jpe?g|gif)$/i, '_thumb.webp') : '';
  return {
    keys: parsed.map((entry) => entry.key),
    thumbnailKey: thumbnailKey || derivedThumb,
  };
}

function buildFlyerStorageKey(slug, timestamp, groupId, sortIndex, pageIndex, pageTotal) {
  return `flyers/${slug}/${timestamp}_g${groupId}_o${String(sortIndex + 1).padStart(3, '0')}_p${String(pageIndex + 1).padStart(3, '0')}_t${String(pageTotal).padStart(3, '0')}.webp`;
}

function buildFlyerThumbnailStorageKey(slug, timestamp, groupId, sortIndex, pageIndex, pageTotal) {
  return `flyers/${slug}/${timestamp}_g${groupId}_o${String(sortIndex + 1).padStart(3, '0')}_p${String(pageIndex + 1).padStart(3, '0')}_t${String(pageTotal).padStart(3, '0')}_thumb.webp`;
}

function renderPdfToPng(pdfPath, outputDir) {
  run('gs', [
    '-dSAFER',
    '-dBATCH',
    '-dNOPAUSE',
    '-sDEVICE=png16m',
    `-r${GS_DPI}`,
    '-dTextAlphaBits=4',
    '-dGraphicsAlphaBits=4',
    `-sOutputFile=${join(outputDir, 'page-%03d.png')}`,
    pdfPath,
  ]);
  return readdirSync(outputDir)
    .filter((name) => /^page-\d+\.png$/i.test(name))
    .sort()
    .map((name) => join(outputDir, name));
}

function encodeWebp(inputPath, outputPath, maxSize = 0) {
  if (hasCommand('cwebp')) {
    const argsList = ['-quiet', '-q', maxSize > 0 ? '90' : '94'];
    if (maxSize > 0) {
      argsList.push('-resize', String(maxSize), '0');
    }
    argsList.push(inputPath, '-o', outputPath);
    run('cwebp', argsList);
    return;
  }

  if (!hasCommand('sips')) {
    throw new Error('cwebp または sips が必要です');
  }

  const argsList = [];
  if (maxSize > 0) {
    argsList.push('-Z', String(maxSize));
  }
  argsList.push(inputPath, '--setProperty', 'format', 'webp', '--out', outputPath);
  run('sips', argsList);
}

async function downloadFile(url, filePath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`download failed: ${response.status} ${url}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(filePath, bytes);
}

async function kvPutFile(key, filePath, contentType) {
  if (dryRun) return;
  wrangler([
    'kv', 'key', 'put', key,
    '--binding', 'KV',
    '--path', filePath,
    '--metadata', JSON.stringify({ contentType }),
  ]);
}

function hasStructuredConvertedPages(keys) {
  return keys.some((key) => CONVERTED_PAGE_PATTERN.test(key.split('/').pop() || key));
}

async function processRecord(record) {
  const existingKeys = JSON.parse(record.flyer_r2_keys || '[]');
  const pdfKeys = existingKeys.filter((key) => isPdfFlyerKey(key));
  if (pdfKeys.length === 0) return { slug: record.slug, converted: 0, skipped: 'pdfなし' };
  if (!force && hasStructuredConvertedPages(existingKeys)) {
    return { slug: record.slug, converted: 0, skipped: '変換済み' };
  }

  const workDir = mkdtempSync(join(tmpdir(), `flyer-${record.slug}-`));
  const createdKeys = [];
  let thumbnailKey = '';

  try {
    for (const [pdfOrder, pdfKey] of pdfKeys.entries()) {
      const groupId = crypto.randomUUID().replace(/-/g, '').slice(0, 12).toLowerCase();
      const pdfPath = join(workDir, `${pdfOrder + 1}.pdf`);
      const pngDir = join(workDir, `pdf-${pdfOrder + 1}`);
      await mkdir(pngDir, { recursive: true });
      await downloadFile(`${SITE_URL}/api/image/${pdfKey}`, pdfPath);

      const pngPages = renderPdfToPng(pdfPath, pngDir);
      for (const [pageIndex, pngPath] of pngPages.entries()) {
        const timestamp = Date.now() + pdfOrder * 100 + pageIndex;
        const webpPath = join(pngDir, `${basename(pngPath, '.png')}.webp`);
        const thumbPath = join(pngDir, `${basename(pngPath, '.png')}-thumb.webp`);
        encodeWebp(pngPath, webpPath);
        encodeWebp(pngPath, thumbPath, THUMB_MAX);

        const sortIndex = pdfOrder;
        const fileKey = buildFlyerStorageKey(record.slug, timestamp, groupId, sortIndex, pageIndex, pngPages.length);
        const thumbKey = buildFlyerThumbnailStorageKey(record.slug, timestamp, groupId, sortIndex, pageIndex, pngPages.length);
        await kvPutFile(fileKey, webpPath, 'image/webp');
        await kvPutFile(thumbKey, thumbPath, 'image/webp');
        createdKeys.push(fileKey);
        if (!thumbnailKey) {
          thumbnailKey = thumbKey;
        }
      }
    }

    if (createdKeys.length === 0) {
      return { slug: record.slug, converted: 0, skipped: 'ページ変換なし' };
    }

    const normalized = normalizeFlyerKeys([...existingKeys, ...createdKeys], thumbnailKey || record.flyer_thumbnail_key || '');
    if (!dryRun) {
      d1Execute(
        `UPDATE concerts SET flyer_r2_keys = ${sqlString(JSON.stringify(normalized.keys))}, flyer_thumbnail_key = ${sqlString(normalized.thumbnailKey)}, updated_at = datetime('now') WHERE slug = ${sqlString(record.slug)}`
      );
    }
    return { slug: record.slug, converted: createdKeys.length, thumbnailKey: normalized.thumbnailKey };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

async function main() {
  const conditions = [`flyer_r2_keys LIKE '%.pdf%'`];
  if (targetSlug) conditions.push(`slug = ${sqlString(targetSlug)}`);
  const sql = [
    'SELECT slug, title, flyer_r2_keys, flyer_thumbnail_key FROM concerts',
    `WHERE ${conditions.join(' AND ')}`,
    'ORDER BY updated_at DESC',
    limit > 0 ? `LIMIT ${limit}` : '',
  ].filter(Boolean).join(' ');

  const records = d1Query(sql);
  const targets = sampleOnly ? records.slice(0, 3) : records;
  let processed = 0;
  let convertedPages = 0;

  for (const record of targets) {
    const result = await processRecord(record);
    if (result.skipped) {
      console.log(`SKIP ${result.slug}: ${result.skipped}`);
      continue;
    }
    processed += 1;
    convertedPages += result.converted;
    console.log(`OK ${result.slug}: ${result.converted}ページ converted, thumb=${result.thumbnailKey}`);
  }

  console.log(`DONE records=${processed} pages=${convertedPages} dryRun=${dryRun}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});