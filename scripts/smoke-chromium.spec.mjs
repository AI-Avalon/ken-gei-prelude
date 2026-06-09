import { test, expect, chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseURL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:4173';
const smokeLabel = process.env.SMOKE_LABEL || (process.env.SMOKE_BASE_URL ? 'prod' : 'local');
const screenshotDir = resolve('docs/qa-screenshots');
const shouldStartPreview = !process.env.SMOKE_BASE_URL;
let previewProcess;

test.setTimeout(120_000);

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // keep waiting
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
  if (!shouldStartPreview) return;
  previewProcess = spawn(
    'npm run preview -- --host 127.0.0.1 --port 4173',
    { cwd: resolve('.'), stdio: 'ignore', shell: true, env: { ...process.env, BROWSER: 'none' } }
  );
  await waitForServer(baseURL);
});

test.afterAll(async () => {
  if (previewProcess) {
    previewProcess.kill();
  }
});

async function launchChromium() {
  try {
    return await chromium.launch({ channel: 'msedge' });
  } catch {
    return chromium.launch();
  }
}

async function checkPage(browser, route, name, viewport) {
  const page = await browser.newPage({ viewport });
  const url = `${baseURL}${route}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
  await page.waitForTimeout(800);
  const text = (await page.locator('body').innerText()).trim();
  expect(text.length, `${route} should render visible text`).toBeGreaterThan(10);
  await page.screenshot({
    path: resolve(screenshotDir, `2026-06-10-${smokeLabel}-${name}-${viewport.width}x${viewport.height}.png`),
    fullPage: true,
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
  const reloadedText = (await page.locator('body').innerText()).trim();
  expect(reloadedText.length, `${route} should render after reload`).toBeGreaterThan(10);
  await page.close();
}

test('core pages render and reload in Chromium', async () => {
  const browser = await launchChromium();
  const desktop = { width: 1366, height: 900 };
  const mobile = { width: 390, height: 844 };
  const routes = [
    ['/', 'home'],
    ['/concerts', 'concerts'],
    ['/calendar', 'calendar'],
    ['/archive', 'archive'],
    ['/upload', 'upload'],
    ['/docs', 'docs'],
    ['/docs/api', 'api-docs'],
    ['/about', 'about'],
    ['/student-tools', 'student-tools'],
    ['/missing-page-for-smoke', 'not-found'],
  ];

  for (const [route, name] of routes) {
    await checkPage(browser, route, name, desktop);
    await checkPage(browser, route, name, mobile);
  }

  await browser.close();
});
