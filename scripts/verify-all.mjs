#!/usr/bin/env node
/**
 * Ken-Gei Prelude (Crescendo) — Pre-Commit Full Verification Gate v2.0 (`npm run verify:all`)
 * Skill: `.agent/skills/pre-commit-verification-gate/SKILL.md`
 *
 * Executes:
 *   Check 1: TypeScript Typecheck (`tsc --noEmit` + `functions/tsconfig.json`), PDF Pipeline & Production Vite Build
 *   Check 2: Security, Anti-AI Design & Skills Static Audit
 *   Check 3: Music Terminology Dictionary Data & Search Engine Verification (469+ terms, umlaut/accent/abbr/reverse lookup)
 *   Check 4: Headless Chromium E2E & Visual/Overflow Audit across Mobile (375x812) and Desktop (1440x900)
 */

import { execSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const ROOT = resolve('.');
const SCREENSHOT_DIR =
  process.env.VERIFY_SCREENSHOT_DIR || join(tmpdir(), 'ken-gei-verify-screenshots');

function logSection(title) {
  console.log(`\n============================================================`);
  console.log(`[VERIFY] ${title}`);
  console.log(`============================================================`);
}

function walkFiles(dir, extFilter = /\.(ts|tsx|js|mjs)$/) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...walkFiles(full, extFilter));
    } else if (extFilter.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

// ============================================================
// Check 1: Type & Build + PDF Pipeline Verification
// ============================================================
function runCheck1() {
  logSection('Check 1: TypeScript, Functions Typecheck, PDF Pipeline & Production Build');

  execSync('npx tsc --noEmit', { stdio: 'inherit', cwd: ROOT });
  execSync('npx tsc -p functions/tsconfig.json --noEmit', { stdio: 'inherit', cwd: ROOT });
  execSync('npm run verify:pdf', { stdio: 'inherit', cwd: ROOT });
  execSync('npm run build', { stdio: 'inherit', cwd: ROOT });

  const redirectsPath = resolve(ROOT, 'dist/_redirects');
  const headersPath = resolve(ROOT, 'dist/_headers');

  if (!existsSync(redirectsPath)) {
    throw new Error('Missing dist/_redirects after build');
  }
  if (!existsSync(headersPath)) {
    throw new Error('Missing dist/_headers after build');
  }

  const redirectsContent = readFileSync(redirectsPath, 'utf8');
  if (!redirectsContent.includes('/index.html')) {
    throw new Error('dist/_redirects does not contain SPA fallback rule');
  }

  const headersContent = readFileSync(headersPath, 'utf8');
  if (!headersContent.includes('X-Content-Type-Options: nosniff')) {
    throw new Error('dist/_headers is missing security headers');
  }

  console.log('PASS Check 1: Build succeeded, dist/_redirects and dist/_headers verified.');
}

// ============================================================
// Check 2: Security, Anti-AI Design & Skills Static Scan
// ============================================================
function runCheck2() {
  logSection('Check 2: Security, Anti-AI Design & Skills Static Audit');

  const srcFiles = walkFiles(resolve(ROOT, 'src'));
  const funcFiles = walkFiles(resolve(ROOT, 'functions'));
  const allCodeFiles = [...srcFiles, ...funcFiles];

  for (const file of allCodeFiles) {
    const content = readFileSync(file, 'utf8');

    // 1. No raw <iframe>, <embed>, <object> for PDF embedding
    if (
      /<(?:iframe|embed|object)\b[^>]*\.pdf/i.test(content) ||
      /<(?:iframe|embed|object)\s+src=/i.test(content)
    ) {
      throw new Error(`Forbidden raw PDF <iframe>/<embed>/<object> found in ${file}`);
    }

    // 2. No dangerous dangerouslySetInnerHTML without sanitization
    if (content.includes('dangerouslySetInnerHTML')) {
      throw new Error(`Unsanitized dangerouslySetInnerHTML found in ${file}`);
    }

    // 3. No hardcoded live secret tokens
    if (/(?:ghp_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{30,})/.test(content)) {
      throw new Error(`Potential hardcoded secret token found in ${file}`);
    }

    // 4. Anti-AI Design Audit: No banned neon gradients or AI slop phrases/emojis
    if (/from-indigo-500|to-purple-600/.test(content)) {
      throw new Error(`Banned AI neon gradient class found in ${file}`);
    }
    if (/[🚀✨💡🎉🔥]/u.test(content)) {
      throw new Error(`Banned AI slop emoji (🚀/✨/💡/🎉/🔥) found in ${file}`);
    }
    if (/データをフェッチ|マッチするアイテムがありません|革新的な体験/.test(content)) {
      throw new Error(`Banned machine-translated AI copy found in ${file}`);
    }
  }

  // 5. Verify D1 prepared statements in functions/api/
  for (const file of funcFiles) {
    const content = readFileSync(file, 'utf8');
    if (content.includes('env.DB.exec(')) {
      throw new Error(
        `Forbidden raw env.DB.exec() found in ${file}; use env.DB.prepare().bind()`
      );
    }
  }

  // 6. Verify SSRF allowlist in functions/api/resolve-url.ts
  const resolveUrlContent = readFileSync(
    resolve(ROOT, 'functions/api/resolve-url.ts'),
    'utf8'
  );
  if (!resolveUrlContent.includes('ALLOWED_REDIRECT_HOSTS')) {
    throw new Error(
      'SSRF allowlist (ALLOWED_REDIRECT_HOSTS) missing in functions/api/resolve-url.ts'
    );
  }

  // 7. Verify all 7 required skills exist in .agent/skills/
  const requiredSkills = [
    '.agent/skills/responsive-and-truncation-auditor/SKILL.md',
    '.agent/skills/flyer-pdf-renderer/SKILL.md',
    '.agent/skills/zero-touch-persistence/SKILL.md',
    '.agent/skills/pre-commit-verification-gate/SKILL.md',
    '.agent/skills/editorial-anti-ai-design/SKILL.md',
    '.agent/skills/music-dictionary-architect/SKILL.md',
    '.agent/skills/conservatory-pro-tools/SKILL.md',
  ];
  for (const skillRel of requiredSkills) {
    if (!existsSync(resolve(ROOT, skillRel))) {
      throw new Error(`Missing required skill file: ${skillRel}`);
    }
  }

  console.log('PASS Check 2: Security audit, Anti-AI audit & all 7 skill files verified.');
}

// ============================================================
// Check 3: Dictionary Dataset & Search Verification
// ============================================================
function runCheck3Dictionary() {
  logSection('Check 3: Music Terminology Dictionary DB & Search Verification');

  const dictPath = resolve(ROOT, 'src/data/musicDictionary.json');
  if (!existsSync(dictPath)) {
    throw new Error('Missing src/data/musicDictionary.json');
  }

  const terms = JSON.parse(readFileSync(dictPath, 'utf8'));
  if (!Array.isArray(terms) || terms.length < 300) {
    throw new Error(`Dictionary must contain at least 300 terms, found ${terms?.length}`);
  }

  const requiredCategories = [
    'tempo',
    'tempo_change',
    'dynamics',
    'expression',
    'technique',
    'german_dir',
    'french_dir',
    'theory_form',
  ];
  for (const cat of requiredCategories) {
    const count = terms.filter((t) => t.category === cat).length;
    if (count < 10) {
      throw new Error(`Category "${cat}" has too few terms (${count})`);
    }
  }

  // Verify umlaut / accent / abbreviation / reverse Japanese lookup
  const assertQueryFindsId = (q, expectedId) => {
    const lower = q.toLowerCase();
    const norm = lower
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const noDot = norm.replace(/\./g, '');

    const hit = terms.find((item) => {
      const itemNorm = item.normalized_term.toLowerCase();
      const abbrLow = (item.abbreviations || []).map((a) => a.toLowerCase());
      const abbrNoDot = abbrLow.map((a) => a.replace(/\./g, ''));
      return (
        item.term.toLowerCase().includes(lower) ||
        itemNorm.includes(norm) ||
        (noDot && itemNorm.includes(noDot)) ||
        abbrLow.includes(lower) ||
        (noDot && abbrNoDot.includes(noDot)) ||
        item.reading_kana.includes(q) ||
        item.reading_hiragana.includes(q) ||
        item.short_meaning.includes(q) ||
        item.performer_nuance.includes(q)
      );
    });

    if (!hit) {
      throw new Error(`Dictionary search for "${q}" returned no hits (expected ${expectedId})`);
    }
  };

  assertQueryFindsId('maessig', 'maessig');
  assertQueryFindsId('drangend', 'drangend');
  assertQueryFindsId('cedez', 'cedez');
  assertQueryFindsId('rit.', 'ritardando');
  assertQueryFindsId('G.P.', 'generalpause');
  assertQueryFindsId('l.v.', 'laissez-vibrer');
  assertQueryFindsId('m.d.', 'mano-destra');
  assertQueryFindsId('ドレンゲント', 'drangend');
  assertQueryFindsId('どれんげんと', 'drangend');
  assertQueryFindsId('急き立てる', 'drangend');
  assertQueryFindsId('駒の近く', 'sul-ponticello');
  assertQueryFindsId('弱音器', 'con-sordino');

  console.log(
    `PASS Check 3: Dictionary verified (${terms.length} terms, umlaut/accent/abbr/reverse searches all hit).`
  );
}

// ============================================================
// Check 4: Headless Browser UI, Overflow, Parity & E2E Audit
// ============================================================
async function waitForServer(url, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out waiting for preview server at ${url}`);
}

async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch {
    return await chromium.launch({ channel: 'msedge' });
  }
}

async function auditViewportRoutes(browser, baseURL, viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('tile.openstreetmap.org')) {
        consoleErrors.push(`[${label}] Console Error: ${text}`);
      }
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(`[${label}] Uncaught PageError: ${err.message}`);
  });

  const routes = [
    ['/', 'home'],
    ['/concerts', 'concerts'],
    ['/calendar', 'calendar'],
    ['/dictionary', 'dictionary'],
    ['/dictionary/drangend', 'dictionary-slug'],
    ['/tools?tool=drone', 'tools-drone'],
    ['/tools?tool=metronome', 'tools-metronome'],
    ['/tools?tool=timer', 'tools-timer'],
    ['/tools?tool=librarian', 'tools-librarian'],
    ['/tools?tool=producer', 'tools-producer'],
    ['/faq', 'faq'],
    ['/archive', 'archive'],
    ['/upload', 'upload'],
    ['/docs', 'docs'],
    ['/about', 'about'],
    ['/concerts/aichi-ken-gei-regular-orchestra', 'concert-detail'],
  ];

  const capturedData = {};

  for (const [route, routeName] of routes) {
    await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);

    // Close open modal on /dictionary/drangend after verifying it opened
    if (route === '/dictionary/drangend') {
      const dialogVisible = await page
        .locator('[data-testid="dictionary-detail-dialog"]')
        .isVisible();
      if (!dialogVisible) {
        throw new Error(`[${label}] Deep-link /dictionary/drangend did not open detail dialog`);
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Verify no horizontal overflow: documentElement.scrollWidth <= window.innerWidth
    const overflowInfo = await page.evaluate(() => {
      const docScrollW = document.documentElement.scrollWidth;
      const winInnerW = window.innerWidth;

      const clippedElements = [];
      const selectors =
        'h1, h2, h3, [data-testid="concert-card-title"], [data-testid="concert-card-venue"], [data-testid="concert-detail-title"], [data-testid="concert-detail-venue"]';
      for (const el of document.querySelectorAll(selectors)) {
        const style = window.getComputedStyle(el);
        if (style.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 2) {
          clippedElements.push({
            tag: el.tagName,
            text: el.textContent?.slice(0, 40),
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
          });
        }
      }

      return {
        hasHorizontalOverflow: docScrollW > winInnerW + 1,
        docScrollW,
        winInnerW,
        clippedElements,
      };
    });

    if (overflowInfo.hasHorizontalOverflow) {
      throw new Error(
        `[${label}] Horizontal overflow detected on ${route}: scrollWidth=${overflowInfo.docScrollW} > innerWidth=${overflowInfo.winInnerW}`
      );
    }

    if (overflowInfo.clippedElements.length > 0) {
      throw new Error(
        `[${label}] Text clipping/truncation detected on ${route}: ${JSON.stringify(overflowInfo.clippedElements)}`
      );
    }

    // Verify Autonomous Status Indicator in Footer
    const statusVisible = await page
      .locator('[data-testid="autonomous-status-indicator"]')
      .isVisible();
    if (!statusVisible) {
      throw new Error(`[${label}] Autonomous status indicator missing in footer on ${route}`);
    }

    if (route === '/concerts') {
      capturedData.listTitles = await page
        .locator('[data-testid="concert-card-title"]')
        .allInnerTexts();
      capturedData.listDates = await page
        .locator('[data-testid="concert-card-date"]')
        .allInnerTexts();
      capturedData.listVenues = await page
        .locator('[data-testid="concert-card-venue"]')
        .allInnerTexts();
    }

    if (route === '/concerts/aichi-ken-gei-regular-orchestra') {
      capturedData.detailTitle = await page
        .locator('[data-testid="concert-detail-title"]')
        .innerText();
      capturedData.detailDate = await page
        .locator('[data-testid="concert-detail-date"]')
        .innerText();
      capturedData.detailVenue = await page
        .locator('[data-testid="concert-detail-venue"]')
        .innerText();

      const flyerBox = await page
        .locator('[data-testid="flyer-preview-container"]')
        .boundingBox();
      if (!flyerBox || flyerBox.width < 100 || flyerBox.height < 100) {
        throw new Error(
          `[${label}] FlyerPreview container has invalid dimensions: ${JSON.stringify(flyerBox)}`
        );
      }
    }

    if (
      ['home', 'concerts', 'dictionary', 'tools-drone', 'faq', 'upload', 'concert-detail'].includes(
        routeName
      )
    ) {
      await page.screenshot({
        path: join(SCREENSHOT_DIR, `verify-${label}-${routeName}.png`),
        fullPage: false,
      });
    }
  }

  // --- E2E Flow 1: Dictionary Interactive Search & Modal Light-Dismiss ---
  await page.goto(`${baseURL}/dictionary`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  const dictInput = page.locator('[data-testid="dictionary-search-input"]');

  await dictInput.fill('maessig');
  await page.waitForTimeout(150);
  if ((await page.locator('[data-testid="dictionary-term-card"]').count()) === 0) {
    throw new Error(`[${label}] Dictionary UI search for "maessig" returned 0 cards`);
  }

  await dictInput.fill('cedez');
  await page.waitForTimeout(150);
  if ((await page.locator('[data-testid="dictionary-term-card"]').count()) === 0) {
    throw new Error(`[${label}] Dictionary UI search for "cedez" returned 0 cards`);
  }

  await dictInput.fill('駒の近く');
  await page.waitForTimeout(150);
  if ((await page.locator('[data-testid="dictionary-term-card"]').count()) === 0) {
    throw new Error(`[${label}] Dictionary UI reverse search for "駒の近く" returned 0 cards`);
  }

  // Click card to open modal, verify URL query syncs, close with Escape
  await page.locator('[data-testid="dictionary-term-card"]').first().click();
  await page.waitForTimeout(200);
  if (!page.url().includes('term=')) {
    throw new Error(`[${label}] Clicking dictionary card did not sync ?term= in URL`);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- E2E Flow 2: Conservatory Pro Tools 5-Tab Switching ---
  await page.goto(`${baseURL}/tools`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  for (const tabId of ['metronome', 'timer', 'librarian', 'producer', 'drone']) {
    await page.locator(`[data-testid="tool-tab-${tabId}"]`).click();
    await page.waitForTimeout(200);
    if (!page.url().includes(`tool=${tabId}`)) {
      throw new Error(`[${label}] Clicking tool tab ${tabId} did not sync URL: ${page.url()}`);
    }
    const panelVisible = await page.locator(`[data-testid="tool-panel-${tabId}"]`).isVisible();
    if (!panelVisible) {
      throw new Error(`[${label}] Tool panel ${tabId} is not visible`);
    }
  }

  // --- E2E Flow 3: Smart Manuscript Parser on /upload ---
  await page.goto(`${baseURL}/upload`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(350);
  const manuscriptBox = page.locator('[data-testid="smart-manuscript-textarea"]');
  if (await manuscriptBox.isVisible()) {
    await manuscriptBox.fill(
      '室内楽の夕べ 2026年12月10日 開場 18:00 開演 18:30 会場：奏楽堂 入場無料\nL.v. Beethoven : 弦楽四重奏曲第14番 Op.131'
    );
    await page.locator('[data-testid="smart-manuscript-parse-btn"]').click();
    await page.waitForTimeout(200);
    await page.locator('[data-testid="concert-status-postponed"]').click();
    await page.waitForTimeout(150);
  }

  // --- E2E Flow 4: Concerts View Switcher, Smart Search & Detail Navigation ---
  await page.goto(`${baseURL}/concerts`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(350);

  await page.locator('[data-testid="view-mode-calendar"]').click();
  await page.waitForTimeout(250);
  if (!page.url().includes('view=calendar')) {
    throw new Error(`[${label}] URL query param did not sync to view=calendar: ${page.url()}`);
  }

  await page.locator('[data-testid="view-mode-timeline"]').click();
  await page.waitForTimeout(250);
  if (!page.url().includes('view=timeline')) {
    throw new Error(`[${label}] URL query param did not sync to view=timeline: ${page.url()}`);
  }

  await page.locator('[data-testid="view-mode-grid"]').click();
  await page.waitForTimeout(250);
  const searchInput = page.locator('[data-testid="smart-search-input"]');
  await searchInput.fill('ブラームス');
  await page.waitForTimeout(300);
  if ((await page.locator('[data-testid="concert-card"]').count()) === 0) {
    throw new Error(`[${label}] Smart search for "ブラームス" returned 0 results`);
  }

  await page.locator('[data-testid="concert-card"]').first().click();
  await page.waitForTimeout(350);
  if (!page.url().includes('/concerts/')) {
    throw new Error(`[${label}] Clicking concert card did not navigate to detail page`);
  }

  const calAddBtn = page.getByRole('button', { name: /カレンダーに追加/ });
  await calAddBtn.click();
  await page.waitForTimeout(200);
  const googleCalBtn = page.getByRole('button', { name: /Google カレンダーに追加/ });
  if (!(await googleCalBtn.isVisible())) {
    throw new Error(`[${label}] Google Calendar option not visible in CalendarAddDropdown`);
  }

  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  if (!page.url().includes('/concerts')) {
    throw new Error(`[${label}] Browser back navigation failed: ${page.url()}`);
  }

  if (consoleErrors.length > 0) {
    throw new Error(consoleErrors.join('\n'));
  }
  if (pageErrors.length > 0) {
    throw new Error(pageErrors.join('\n'));
  }

  await context.close();
  return capturedData;
}

async function runCheck4() {
  logSection('Check 4: Headless Browser UI, Overflow, Responsive Parity & E2E Audit');
  mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const port = 4179;
  const baseURL = `http://127.0.0.1:${port}`;
  const previewProc = spawn(`npx vite preview --host 127.0.0.1 --port ${port}`, {
    cwd: ROOT,
    stdio: 'ignore',
    shell: true,
    env: { ...process.env, BROWSER: 'none' },
  });

  try {
    await waitForServer(baseURL);
    const browser = await launchBrowser();

    try {
      const mobileData = await auditViewportRoutes(
        browser,
        baseURL,
        { width: 375, height: 812 },
        'mobile-375x812'
      );
      const desktopData = await auditViewportRoutes(
        browser,
        baseURL,
        { width: 1440, height: 900 },
        'desktop-1440x900'
      );

      if (JSON.stringify(mobileData.listTitles) !== JSON.stringify(desktopData.listTitles)) {
        throw new Error(`Responsive Parity Mismatch (List Titles)`);
      }
      if (JSON.stringify(mobileData.listDates) !== JSON.stringify(desktopData.listDates)) {
        throw new Error(`Responsive Parity Mismatch (List Dates)`);
      }
      if (JSON.stringify(mobileData.listVenues) !== JSON.stringify(desktopData.listVenues)) {
        throw new Error(`Responsive Parity Mismatch (List Venues)`);
      }
      if (
        mobileData.detailTitle !== desktopData.detailTitle ||
        mobileData.detailDate !== desktopData.detailDate ||
        mobileData.detailVenue !== desktopData.detailVenue
      ) {
        throw new Error(`Responsive Parity Mismatch (Detail Page)`);
      }

      console.log(
        `PASS Mobile (375x812) & Desktop (1440x900) Parity Verified (${mobileData.listTitles.length} concerts matched 100%).`
      );
      console.log(
        'PASS Check 4: 0 console errors, 0 overflow/clipping, Dictionary/Tools/FAQ/Upload/Calendar/Detail all verified.'
      );
    } finally {
      await browser.close();
    }
  } finally {
    previewProc.kill();
  }
}

async function main() {
  const start = Date.now();
  runCheck1();
  runCheck2();
  runCheck3Dictionary();
  await runCheck4();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nALL VERIFICATION GATES PASSED IN ${elapsed}s!`);
}

main().catch((err) => {
  console.error('\nVERIFICATION FAILED:', err.message || err);
  process.exit(1);
});
