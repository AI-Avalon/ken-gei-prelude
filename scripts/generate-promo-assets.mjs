import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import QRCode from 'qrcode';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';

const require = createRequire(import.meta.url);
const pdfPoppler = require('pdf-poppler');

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SITE_URL = 'https://ken-gei-prelude.pages.dev';
const SITE_TITLE = 'Crescendo';
const SITE_SUBTITLE = '愛知県立芸術大学 演奏会情報ポータル';
const POSTER_PATH = process.env.CELLIBERTA_POSTER || 'd:/ダウンロード/チェロ_ポスター最終.pdf';
const CELLIBERTA_URL = process.env.CELLIBERTA_URL || `${SITE_URL}/concerts/20270220-ensemble-celliberta-U34Dyl`;

const outCrescendo = join(ROOT, 'public/promo/crescendo');
const outExample = join(ROOT, 'public/promo/examples/celliberta-20th');

const colors = {
  navy: '#12172a',
  navy2: '#20203a',
  gold: '#c4ab6e',
  gold2: '#b08a45',
  stone: '#f7f3eb',
  ink: '#2b2520',
  muted: '#7a7167',
  red: '#b02a1e',
  sky: '#d8f7fb',
  white: '#ffffff',
};

function nodePdfAssetPath(path) {
  return `${resolve(path).replace(/\\/g, '/')}/`;
}

function registerJapaneseFonts() {
  [
    ['C:/Windows/Fonts/NotoSansJP-VF.ttf', 'Noto Sans JP'],
    ['C:/Windows/Fonts/NotoSerifJP-VF.ttf', 'Noto Serif JP'],
    ['C:/Windows/Fonts/meiryo.ttc', 'Meiryo'],
    ['C:/Windows/Fonts/YuGothR.ttc', 'Yu Gothic'],
  ].forEach(([fontPath, family]) => {
    if (existsSync(fontPath) && !GlobalFonts.has(family)) {
      GlobalFonts.registerFromPath(fontPath, family);
    }
  });
}

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textBlock(lines, { x, y, size, color = colors.ink, weight = 600, lineHeight = 1.25, anchor = 'start', family = 'Noto Sans JP, Yu Gothic, sans-serif' }) {
  return lines.map((line, i) => (
    `<text x="${x}" y="${y + i * size * lineHeight}" text-anchor="${anchor}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(line)}</text>`
  )).join('\n');
}

function roundedRect(x, y, w, h, r, fill, stroke = 'none', sw = 0) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

async function ensureDirs() {
  await mkdir(outCrescendo, { recursive: true });
  await mkdir(outExample, { recursive: true });
}

async function qrBuffer(text, width = 420, margin = 1) {
  return QRCode.toBuffer(text, {
    type: 'png',
    width,
    margin,
    color: { dark: colors.navy, light: colors.white },
    errorCorrectionLevel: 'H',
  });
}

async function renderSvg(file, width, height, svg, format = 'png') {
  const image = sharp(Buffer.from(svg), { density: 180 });
  const out = format === 'jpg' ? image.jpeg({ quality: 92 }) : image.png({ compressionLevel: 9 });
  await out.toFile(file);
  console.log(`created ${file}`);
}

function baseSvg(width, height, body, bg = colors.stone) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="navyGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${colors.navy}"/>
      <stop offset="1" stop-color="${colors.navy2}"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${colors.gold}"/>
      <stop offset="1" stop-color="${colors.gold2}"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="20" flood-color="#000000" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="${bg}"/>
  ${body}
</svg>`;
}

function brandMark(x, y, scale = 1) {
  return `
    <g transform="translate(${x} ${y}) scale(${scale})">
      <circle cx="34" cy="34" r="34" fill="${colors.navy}"/>
      <path d="M17 26c14 5 26 10 38 8-12 4-24 10-38 16" fill="none" stroke="${colors.gold}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M19 35c15 1 26 1 42 0" fill="none" stroke="#f1df9b" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
      <circle cx="51" cy="46" r="5.5" fill="${colors.gold}"/>
      <path d="M55 45V17" stroke="${colors.gold}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M55 18c7-1 11 3 10 9-3-4-6-5-10-5" fill="${colors.gold}"/>
    </g>`;
}

function featurePills(items, x, y, size = 34, gap = 18) {
  let cursor = x;
  return items.map((item) => {
    const estimatedTextWidth = [...item].reduce((sum, char) => {
      return sum + (/^[\x00-\x7F]$/.test(char) ? size * 0.62 : size * 1.02);
    }, 0);
    const width = estimatedTextWidth + 54;
    const svg = `${roundedRect(cursor, y, width, size * 1.8, size * 0.9, 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.22)', 2)}
      <text x="${cursor + 27}" y="${y + size * 1.18}" font-family="Noto Sans JP, Yu Gothic, sans-serif" font-size="${size}" font-weight="700" fill="${colors.white}">${esc(item)}</text>`;
    cursor += width + gap;
    return svg;
  }).join('\n');
}

async function makeSquare() {
  const width = 1080;
  const height = 1080;
  const qr = await qrBuffer(SITE_URL, 250);
  const qrData = `data:image/png;base64,${qr.toString('base64')}`;
  const svg = baseSvg(width, height, `
    <rect width="${width}" height="${height}" fill="url(#navyGrad)"/>
    <circle cx="950" cy="80" r="260" fill="${colors.gold}" opacity="0.08"/>
    <circle cx="80" cy="980" r="300" fill="${colors.gold}" opacity="0.07"/>
    ${brandMark(86, 78, 1.05)}
    ${textBlock([SITE_TITLE], { x: 185, y: 124, size: 58, color: colors.gold, weight: 700, family: 'Cormorant Garamond, Georgia, serif' })}
    ${textBlock([SITE_SUBTITLE], { x: 187, y: 168, size: 24, color: '#d8d0c2', weight: 500 })}
    ${roundedRect(102, 292, 640, 520, 46, 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.20)', 2)}
    ${textBlock(['その演奏会、', '今日から見つかる。'], { x: 88, y: 380, size: 78, color: colors.white, weight: 850, lineHeight: 1.15 })}
    ${textBlock(['チラシを入れて、URLを届けるだけ。'], { x: 92, y: 605, size: 32, color: '#ede7d8', weight: 600 })}
    ${featurePills(['登録無料', 'チラシ表示', 'QR共有', '予定表へ'], 90, 705, 28)}
    ${roundedRect(770, 704, 238, 238, 32, colors.white)}
    <image href="${qrData}" x="799" y="733" width="180" height="180"/>
    ${textBlock(['登録する'], { x: 889, y: 982, size: 28, color: colors.gold, weight: 800, anchor: 'middle' })}
    ${textBlock(['ken-gei-prelude.pages.dev'], { x: 90, y: 995, size: 28, color: '#d8d0c2', weight: 600 })}
  `, colors.navy);
  await renderSvg(join(outCrescendo, 'instagram-square.png'), width, height, svg);
}

async function makeStory() {
  const width = 1080;
  const height = 1920;
  const qr = await qrBuffer(SITE_URL, 320);
  const qrData = `data:image/png;base64,${qr.toString('base64')}`;
  const svg = baseSvg(width, height, `
    <rect width="${width}" height="${height}" fill="url(#navyGrad)"/>
    <path d="M0 1280 C260 1160 470 1430 760 1290 C930 1210 1010 1040 1080 960 L1080 1920 L0 1920 Z" fill="${colors.gold}" opacity="0.16"/>
    ${brandMark(88, 90, 1.15)}
    ${textBlock([SITE_TITLE], { x: 196, y: 142, size: 62, color: colors.gold, weight: 700, family: 'Cormorant Garamond, Georgia, serif' })}
    ${textBlock(['載せた瞬間、', '届きはじめる。'], { x: 88, y: 410, size: 98, color: colors.white, weight: 850, lineHeight: 1.14 })}
    ${textBlock(['チラシ、QR、SNS、予定表まで。', '演奏会ページを無料で作れます。'], { x: 92, y: 720, size: 38, color: '#efe8d8', weight: 600, lineHeight: 1.55 })}
    ${roundedRect(90, 930, 900, 310, 46, 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.20)', 2)}
    ${textBlock(['ポスターができたら', 'Crescendoに登録。'], { x: 148, y: 1040, size: 54, color: colors.white, weight: 850, lineHeight: 1.3 })}
    ${roundedRect(340, 1450, 400, 400, 42, colors.white)}
    <image href="${qrData}" x="382" y="1492" width="316" height="316"/>
    ${textBlock(['無料で使える演奏会ポータル'], { x: 540, y: 1380, size: 39, color: colors.gold, weight: 800, anchor: 'middle' })}
    ${textBlock(['ken-gei-prelude.pages.dev'], { x: 540, y: 1860, size: 31, color: '#efe8d8', weight: 600, anchor: 'middle' })}
  `, colors.navy);
  await renderSvg(join(outCrescendo, 'instagram-story.png'), width, height, svg);
}

async function makeWideCards() {
  const cards = [
    {
      file: 'x-card.png',
      width: 1600,
      height: 900,
      title: ['演奏会ページを', 'すぐ作れる。'],
      body: ['チラシを入れて、URLとQRでそのまま告知。', '登録無料、スマホで完結。'],
    },
    {
      file: 'ogp.png',
      width: 1200,
      height: 630,
      title: ['Crescendo'],
      body: ['愛知県立芸術大学 演奏会情報ポータル', '登録した演奏会を、見つけてもらえる場所へ。'],
    },
    {
      file: 'line-share.png',
      width: 1200,
      height: 1200,
      title: ['この演奏会、', '見に来てほしい。'],
      body: ['登録無料 / QR対応 / 予定表に追加', 'チラシごと、きれいに届けられます。'],
    },
  ];

  for (const card of cards) {
    const qr = await qrBuffer(SITE_URL, card.height > 900 ? 260 : 220);
    const qrData = `data:image/png;base64,${qr.toString('base64')}`;
    const titleSize = card.height > 900 ? 78 : card.width > 1300 ? 70 : 64;
    const bodySize = card.height > 900 ? 34 : 30;
    const qrSize = card.height > 900 ? 220 : 176;
    const svg = baseSvg(card.width, card.height, `
      <rect width="${card.width}" height="${card.height}" fill="url(#navyGrad)"/>
      <circle cx="${card.width - 100}" cy="80" r="${card.width * 0.22}" fill="${colors.gold}" opacity="0.10"/>
      ${brandMark(74, 62, 0.9)}
      ${textBlock([SITE_TITLE], { x: 154, y: 105, size: 44, color: colors.gold, weight: 700, family: 'Cormorant Garamond, Georgia, serif' })}
      ${textBlock(card.title, { x: 84, y: card.height > 900 ? 335 : 300, size: titleSize, color: colors.white, weight: 850, lineHeight: 1.18 })}
      ${textBlock(card.body, { x: 88, y: card.height > 900 ? 575 : 470, size: bodySize, color: '#efe8d8', weight: 550, lineHeight: 1.55 })}
      ${featurePills(['探す', '登録する', '共有する', 'カレンダー同期'], 88, card.height - 160, 27)}
      ${roundedRect(card.width - qrSize - 82, card.height - qrSize - 72, qrSize, qrSize, 26, colors.white)}
      <image href="${qrData}" x="${card.width - qrSize - 54}" y="${card.height - qrSize - 44}" width="${qrSize - 56}" height="${qrSize - 56}"/>
    `, colors.navy);
    await renderSvg(join(outCrescendo, card.file), card.width, card.height, svg);
  }
}

async function makeGuideImages() {
  const guideCards = [
    ['1', '基本情報', ['日付と会場だけでも始められる']],
    ['2', 'チラシ', ['PDFもスマホ内で画像化']],
    ['3', '共有', ['URLとQRですぐ告知']],
    ['4', '予定表', ['カテゴリ別に受け取れる']],
  ];
  const flow = guideCards.map(([n, title, bodyLines], i) => {
    const x = 95 + (i % 2) * 720;
    const y = 260 + Math.floor(i / 2) * 370;
    return `
      ${roundedRect(x, y, 630, 270, 34, colors.white, '#e8dfce', 2)}
      <circle cx="${x + 72}" cy="${y + 78}" r="42" fill="url(#goldGrad)"/>
      <text x="${x + 72}" y="${y + 93}" text-anchor="middle" font-family="Georgia, serif" font-size="46" font-weight="800" fill="${colors.white}">${n}</text>
      ${textBlock([title], { x: x + 140, y: y + 78, size: 42, color: colors.ink, weight: 800 })}
      ${textBlock(bodyLines, { x: x + 140, y: y + 138, size: 27, color: colors.muted, weight: 550, lineHeight: 1.45 })}
    `;
  }).join('\n');

  const registration = baseSvg(1600, 1200, `
    ${brandMark(90, 70, 0.9)}
    ${textBlock(['登録は、ポスターからはじまる。'], { x: 172, y: 116, size: 54, color: colors.ink, weight: 850 })}
    ${textBlock(['演奏会ページ、共有リンク、カレンダー導線まで一気に整います。'], { x: 95, y: 205, size: 31, color: colors.muted, weight: 550 })}
    ${flow}
    ${textBlock(['無料。アカウント不要。あとから編集できます。'], { x: 800, y: 1088, size: 34, color: colors.ink, weight: 800, anchor: 'middle' })}
  `);
  await renderSvg(join(outCrescendo, 'registration-flow.png'), 1600, 1200, registration);

  const calendar = baseSvg(1600, 1200, `
    <rect x="0" y="0" width="1600" height="1200" fill="${colors.stone}"/>
    ${brandMark(90, 70, 0.9)}
    ${textBlock(['ほしい予定だけ、受け取る。'], { x: 172, y: 116, size: 54, color: colors.ink, weight: 850 })}
    ${textBlock(['全演奏会でも、自主企画だけでも。カレンダー同期を選べます。'], { x: 95, y: 205, size: 31, color: colors.muted, weight: 550 })}
    ${roundedRect(110, 310, 1380, 270, 42, colors.navy)}
    ${textBlock(['この予定だけ追加'], { x: 185, y: 410, size: 50, color: colors.gold, weight: 800 })}
    ${textBlock(['気になる公演を、自分の予定表へ。'], { x: 185, y: 482, size: 35, color: colors.white, weight: 600 })}
    ${roundedRect(110, 650, 1380, 270, 42, colors.white, '#e8dfce', 2)}
    ${textBlock(['カテゴリ別に同期'], { x: 185, y: 750, size: 50, color: colors.ink, weight: 800 })}
    ${textBlock(['自主企画、大学主催、専攻定期などを選べます。'], { x: 185, y: 822, size: 35, color: colors.muted, weight: 600 })}
    ${textBlock(['詳細ページの「カレンダーに追加」から設定できます。'], { x: 800, y: 1055, size: 34, color: colors.ink, weight: 750, anchor: 'middle' })}
  `);
  await renderSvg(join(outCrescendo, 'calendar-flow.png'), 1600, 1200, calendar);
}

async function makeQrGuide() {
  const width = 1080;
  const height = 1350;
  const qr = await qrBuffer(SITE_URL, 460);
  const qrData = `data:image/png;base64,${qr.toString('base64')}`;
  const svg = baseSvg(width, height, `
    <rect width="${width}" height="${height}" fill="${colors.stone}"/>
    ${brandMark(90, 86, 1)}
    ${textBlock([SITE_TITLE], { x: 180, y: 135, size: 56, color: colors.ink, weight: 800, family: 'Cormorant Garamond, Georgia, serif' })}
    ${textBlock(['演奏会を探す・載せる・広める'], { x: 540, y: 330, size: 58, color: colors.ink, weight: 850, anchor: 'middle' })}
    ${textBlock(['スマホで読み取って、使い方ページへ。'], { x: 540, y: 420, size: 33, color: colors.muted, weight: 600, anchor: 'middle' })}
    ${roundedRect(264, 520, 552, 552, 52, colors.white, '#e8dfce', 3)}
    <image href="${qrData}" x="310" y="566" width="460" height="460"/>
    ${textBlock(['無料で使える演奏会ポータル'], { x: 540, y: 1165, size: 34, color: colors.gold2, weight: 800, anchor: 'middle' })}
    ${textBlock(['ken-gei-prelude.pages.dev'], { x: 540, y: 1230, size: 32, color: colors.ink, weight: 700, anchor: 'middle' })}
  `);
  await renderSvg(join(outCrescendo, 'qr-guide.png'), width, height, svg);
}

async function makeA4() {
  const width = 2480;
  const height = 3508;
  const qr = await qrBuffer(SITE_URL, 500);
  const qrData = `data:image/png;base64,${qr.toString('base64')}`;
  const svg = baseSvg(width, height, `
    <rect width="${width}" height="${height}" fill="${colors.stone}"/>
    <rect x="0" y="0" width="${width}" height="940" fill="url(#navyGrad)"/>
    ${brandMark(180, 150, 1.7)}
    ${textBlock([SITE_TITLE], { x: 330, y: 235, size: 96, color: colors.gold, weight: 800, family: 'Cormorant Garamond, Georgia, serif' })}
    ${textBlock([SITE_SUBTITLE], { x: 335, y: 310, size: 42, color: '#efe8d8', weight: 600 })}
    ${textBlock(['演奏会を、', 'もっと見つけやすく。'], { x: 180, y: 540, size: 122, color: colors.white, weight: 850, lineHeight: 1.18 })}
    ${textBlock(['掲載・閲覧・共有・カレンダー同期を、ひとつのサイトで。'], { x: 180, y: 820, size: 46, color: '#efe8d8', weight: 600 })}
    ${[
      ['探す', '一覧・検索・カレンダーで、今後の演奏会をすぐ確認できます。'],
      ['登録する', 'アカウント不要。基本情報とチラシだけでも掲載できます。'],
      ['共有する', 'URL、QRコード、LINE、X、Instagram用文面で告知できます。'],
      ['カレンダーに入れる', 'Google / Apple / Outlook などに予定を追加できます。'],
      ['チラシを見せる', 'PDFや画像を高品質に表示し、スマホでも読みやすく届けます。'],
    ].map(([title, body], i) => {
      const y = 1150 + i * 320;
      return `${roundedRect(180, y, 1420, 220, 34, colors.white, '#e8dfce', 2)}
      ${textBlock([title], { x: 250, y: y + 82, size: 58, color: colors.ink, weight: 850 })}
      ${textBlock([body], { x: 250, y: y + 154, size: 36, color: colors.muted, weight: 600 })}`;
    }).join('\n')}
    ${roundedRect(1710, 1220, 560, 700, 48, colors.white, '#e8dfce', 2)}
    <image href="${qrData}" x="1770" y="1280" width="440" height="440"/>
    ${textBlock(['スマホで開く'], { x: 1990, y: 1810, size: 42, color: colors.gold2, weight: 800, anchor: 'middle' })}
    ${roundedRect(1710, 2090, 560, 520, 48, colors.navy)}
    ${textBlock(['登録例', '20th演奏会も', '掲載できます'], { x: 1990, y: 2220, size: 56, color: colors.white, weight: 850, anchor: 'middle', lineHeight: 1.35 })}
    ${textBlock(['詳しい手順は /docs へ'], { x: 1240, y: 3160, size: 44, color: colors.ink, weight: 800, anchor: 'middle' })}
    ${textBlock(['ken-gei-prelude.pages.dev'], { x: 1240, y: 3245, size: 42, color: colors.muted, weight: 600, anchor: 'middle' })}
  `);
  await renderSvg(join(outCrescendo, 'a4-guide.jpg'), width, height, svg, 'jpg');
}

async function getPosterPageCount(data) {
  const pdf = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    cMapUrl: nodePdfAssetPath('node_modules/pdfjs-dist/cmaps'),
    cMapPacked: true,
    standardFontDataUrl: nodePdfAssetPath('node_modules/pdfjs-dist/standard_fonts'),
    disableFontFace: false,
    useSystemFonts: true,
  }).promise;
  return pdf.numPages;
}

async function renderPosterPagesWithPoppler(pageCount) {
  const prefix = 'poster-poppler';
  await pdfPoppler.convert(POSTER_PATH, {
    format: 'png',
    out_dir: outExample,
    out_prefix: prefix,
    page: null,
    scale: 3600,
  });

  const outputs = [];
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const tempPath = join(outExample, `${prefix}-${pageNum}.png`);
    if (!existsSync(tempPath)) {
      throw new Error(`Poppler output missing: ${tempPath}`);
    }

    const fullPath = join(outExample, `poster-page-${pageNum}.png`);
    const webpPath = join(outExample, `poster-page-${pageNum}.webp`);
    await sharp(tempPath).png({ compressionLevel: 9 }).toFile(fullPath);
    await sharp(tempPath).webp({ quality: 94 }).toFile(webpPath);
    await rm(tempPath, { force: true });
    outputs.push(fullPath);
    console.log(`created ${fullPath}`);
    console.log(`created ${webpPath}`);
  }
  return outputs;
}

async function renderPosterPagesWithPdfJs(data, pageCount) {
  registerJapaneseFonts();
  const pdf = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    cMapUrl: nodePdfAssetPath('node_modules/pdfjs-dist/cmaps'),
    cMapPacked: true,
    standardFontDataUrl: nodePdfAssetPath('node_modules/pdfjs-dist/standard_fonts'),
    disableFontFace: false,
    useSystemFonts: true,
  }).promise;

  const outputs = [];
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 3.2 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = colors.white;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const png = await canvas.encode('png');
    const fullPath = join(outExample, `poster-page-${pageNum}.png`);
    const webpPath = join(outExample, `poster-page-${pageNum}.webp`);
    await writeFile(fullPath, png);
    await sharp(png).webp({ quality: 94 }).toFile(webpPath);
    outputs.push(fullPath);
    console.log(`created ${fullPath}`);
    console.log(`created ${webpPath}`);
  }
  return outputs;
}

async function renderPosterPages() {
  if (!existsSync(POSTER_PATH)) {
    console.warn(`poster not found: ${POSTER_PATH}`);
    return [];
  }
  const data = new Uint8Array(await readFile(POSTER_PATH));
  const pageCount = await getPosterPageCount(data);

  try {
    return await renderPosterPagesWithPoppler(pageCount);
  } catch (error) {
    console.warn(`Poppler PDF render failed; falling back to pdf.js: ${error.message}`);
    return renderPosterPagesWithPdfJs(data, pageCount);
  }
}

async function makeCellibertaExample() {
  const posterPages = await renderPosterPages();
  const qr = await qrBuffer(CELLIBERTA_URL, 260);
  const qrData = `data:image/png;base64,${qr.toString('base64')}`;
  const posterImage = posterPages[0] && existsSync(posterPages[0])
    ? `data:image/png;base64,${(await sharp(posterPages[0]).resize({ width: 900, height: 1200, fit: 'inside' }).png().toBuffer()).toString('base64')}`
    : '';
  const width = 1200;
  const height = 1500;
  const svg = baseSvg(width, height, `
    <rect width="${width}" height="${height}" fill="${colors.sky}"/>
    <rect x="0" y="0" width="${width}" height="210" fill="${colors.red}"/>
    ${textBlock(['掲載例'], { x: 90, y: 132, size: 58, color: colors.white, weight: 850 })}
    ${textBlock(['Crescendoで演奏会ページを作ると、チラシ・共有・カレンダー連携まで使えます。'], { x: 90, y: 195, size: 27, color: '#fff2ed', weight: 600 })}
    ${posterImage ? `<image href="${posterImage}" x="72" y="280" width="480" height="680" preserveAspectRatio="xMidYMid meet"/>` : ''}
    ${roundedRect(620, 300, 500, 560, 36, colors.white, '#d9b1a7', 2)}
    ${textBlock(['Ensemble Celliberta', '20th Anniversary', 'Concert'], { x: 660, y: 390, size: 38, color: colors.red, weight: 850, lineHeight: 1.25, family: 'Cormorant Garamond, Georgia, serif' })}
    ${textBlock(['2027.2.20', 'OPEN 17:30 / START 18:00', '入場料 ¥1,000'], { x: 660, y: 575, size: 33, color: colors.ink, weight: 700, lineHeight: 1.55 })}
    ${textBlock(['※ポスターから確実に読めた', '基本情報のみ掲載例にしています。'], { x: 660, y: 755, size: 23, color: colors.muted, weight: 550, lineHeight: 1.45 })}
    ${roundedRect(755, 965, 290, 290, 30, colors.white)}
    <image href="${qrData}" x="786" y="996" width="228" height="228"/>
    ${textBlock(['実例ページを見る'], { x: 900, y: 1310, size: 32, color: colors.red, weight: 850, anchor: 'middle' })}
    ${textBlock(['Crescendo 宣伝用サンプル'], { x: 600, y: 1440, size: 28, color: colors.ink, weight: 700, anchor: 'middle' })}
  `, colors.sky);
  await renderSvg(join(outExample, 'celliberta-example-card.png'), width, height, svg);
}

async function main() {
  await ensureDirs();
  await makeSquare();
  await makeStory();
  await makeWideCards();
  await makeGuideImages();
  await makeQrGuide();
  await makeA4();
  await makeCellibertaExample();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
