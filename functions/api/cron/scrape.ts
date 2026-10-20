// Cloudflare Pages Functions — University Site Scraping (Self-Healing Engine)
// Route: POST /api/cron/scrape (admin-only or cron-triggered)
// Spec: Chapter 8 — 大学公式サイト解析 + Zero-Touch Persistence

import { classifyCategory, parsePricingFromText } from './shared';

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ADMIN_PASSWORD: string;
  CRON_SECRET: string;
}

interface ScrapedEvent {
  title: string;
  date: string;       // "YYYY-MM-DD"
  timeStart: string;  // "HH:MM"
  timeOpen?: string;  // "HH:MM"
  venue: string;
  detailUrl?: string;
  description?: string;
  sourceUrl: string;
  imageUrl?: string;   // Flyer image URL from listing page
  category?: string;   // Auto-classified category
  pricingJson?: string; // Pricing data as JSON string
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// nanoid replacement for Workers (no npm in Workers context)
function generateId(len = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function normalize(str: string): string {
  return str
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);
}

function generateSlug(date: string, title: string): string {
  const dateStr = date.replace(/-/g, '');
  let titleSlug = slugify(title);
  if (!titleSlug) titleSlug = 'daigaku';
  const suffix = generateId(6).toLowerCase();
  return `${dateStr}-${titleSlug}-${suffix}`.slice(0, 60);
}

async function generateFingerprint(date: string, _venue: string, title: string): Promise<string> {
  // venueは不安定（listing/detail/cleanVenueName変更で変わる）のため、date+titleのみ使用
  const input = `${date}|${normalize(title).slice(0, 20)}`;
  return sha256(input);
}

// ============================================================
// Self-Healing Date Parser & Schema Validator
// ============================================================
export function parseFlexibleDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.normalize('NFKC').trim();

  // 1. YYYY年M月D日
  const jpMatch = s.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (jpMatch) {
    return `${jpMatch[1]}-${jpMatch[2].padStart(2, '0')}-${jpMatch[3].padStart(2, '0')}`;
  }

  // 2. 令和N年M月D日
  const reiwaMatch = s.match(/令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (reiwaMatch) {
    const year = 2018 + parseInt(reiwaMatch[1], 10);
    return `${year}-${reiwaMatch[2].padStart(2, '0')}-${reiwaMatch[3].padStart(2, '0')}`;
  }

  // 3. YYYY/MM/DD or YYYY.MM.DD or YYYY-MM-DD
  const isoLike = s.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (isoLike) {
    return `${isoLike[1]}-${isoLike[2].padStart(2, '0')}-${isoLike[3].padStart(2, '0')}`;
  }

  return null;
}

export function validateScrapedEvent(ev: Partial<ScrapedEvent>): ev is ScrapedEvent {
  if (!ev.title || typeof ev.title !== 'string' || ev.title.trim().length < 2 || ev.title.length > 300) {
    return false;
  }
  if (!ev.date || !/^\d{4}-\d{2}-\d{2}$/.test(ev.date)) {
    return false;
  }
  if (!ev.timeStart || !/^\d{2}:\d{2}$/.test(ev.timeStart)) {
    return false;
  }
  if (!ev.venue || typeof ev.venue !== 'string' || ev.venue.trim().length < 1) {
    return false;
  }
  return true;
}

// ============================================================
// 会場名から金額・入場料情報を除去するクリーン関数
// ============================================================
function cleanVenueName(raw: string): string {
  if (!raw) return '愛知県立芸術大学';
  let v = raw.normalize('NFKC').trim();

  // 括弧内に金額・入場料が含まれている場合は括弧ごと除去
  v = v.replace(/[（(【][^）)】]*(?:円|入場料|無料|チケット|料金|予約)[^）)】]*[）)】]/g, '');

  // 料金・時間・電話番号などの非会場情報を除去
  v = v
    .replace(/(?:入場料|料金|チケット|全席[自指][由定]|予約|前売|当日券)[^\n]*/g, '')
    .replace(/\d+[\d,]*\s*円[^\n]*/g, '')
    .replace(/無料[^\n]*/g, '')
    .replace(/\s*TEL[:：]?\s*[\d-]+/g, '')
    .replace(/\s*(?:開場|開演)\s*\d{1,2}[:：]\d{2}[^\n]*/g, '')
    .trim();

  // 改行・句点で分割（中点は会場名に含まれることがあるため維持）
  v = v.split(/[。\n]/)[0].trim();

  return v || '愛知県立芸術大学';
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// HTML Parser for 愛知県立芸術大学 event page (Self-Healing Multi-Selector)
// Target: https://www.aichi-fam-u.ac.jp/event/music/
// ============================================================
function parseEventList(html: string, baseUrl: string): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];

  // Match any <a ... href=".../event/NNNN.html" ...>...</a> regardless of attribute order or class changes
  const entryPattern = /<a\s+[^>]*href="([^"]*\/event\/\d+\.html)"[^>]*>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = entryPattern.exec(html)) !== null) {
    const eventPath = match[1];
    const block = match[2];

    const detailUrl = new URL(eventPath, baseUrl).href;

    // Multi-selector date extraction:
    // 1. class="...event_date..." or class="...date..."
    // 2. <time> tag
    // 3. Fallback: any text inside block matching date pattern
    const dateTagMatch =
      block.match(/<(?:p|span|div|time)[^>]*class="[^"]*(?:event_date|date)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|span|div|time)>/i) ||
      block.match(/<time[^>]*>([\s\S]*?)<\/time>/i);
    const dateCandidate = dateTagMatch ? stripTags(dateTagMatch[1]) : stripTags(block);
    const date = parseFlexibleDate(dateCandidate);
    if (!date) continue;

    // Multi-selector title extraction:
    // 1. class="...event_title..." or class="...title..."
    // 2. <h3> / <h4> / <h2> inside card
    const titleTagMatch =
      block.match(/<(?:p|h[2-5]|span|div)[^>]*class="[^"]*(?:event_title|title)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|h[2-5]|span|div)>/i) ||
      block.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
    const title = titleTagMatch ? stripTags(titleTagMatch[1]) : '';
    if (!title) continue;

    // Multi-selector venue/info extraction:
    const infoTagMatch = block.match(/<(?:p|span|div)[^>]*class="[^"]*(?:event_info|info|venue|place)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|span|div)>/i);
    const rawInfo = infoTagMatch ? stripTags(infoTagMatch[1]) : '';
    const venue = cleanVenueName(rawInfo);

    // Extract pricing from event_info text before cleaning
    let pricingJson: string | undefined;
    if (rawInfo) {
      const infoNormalized = rawInfo.normalize('NFKC').trim();
      const pricing = parsePricingFromText(infoNormalized, []);
      if (pricing.length > 0) {
        pricingJson = JSON.stringify(pricing);
      }
    }

    // <img src="..." />
    const imgMatch = block.match(/<img\s+[^>]*src="([^"]+)"/i);
    const imageUrl = imgMatch ? new URL(imgMatch[1], baseUrl).href : undefined;

    // Dedup
    if (events.some((e) => e.date === date && e.title === title)) continue;

    const candidate: Partial<ScrapedEvent> = {
      title,
      date,
      timeStart: '14:00', // default, detail page will override
      venue,
      detailUrl,
      description: '',
      sourceUrl: baseUrl,
      imageUrl,
      category: classifyCategory(title),
      pricingJson,
    };

    if (validateScrapedEvent(candidate)) {
      events.push(candidate);
    }
  }

  return events;
}

async function parseDetailPage(html: string): Promise<Partial<ScrapedEvent>> {
  const extra: Partial<ScrapedEvent> = {};

  // Real structure: <div class="detail"><h2>日時</h2><p>...</p><h2>場所</h2><p>...</p>...</div>
  const detailMatch = html.match(/<div\s+class="[^"]*detail[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i);
  const detailHtml = detailMatch ? detailMatch[1] : html;

  // Extract sections by <h2> or <h3> or <dt> headings
  const sections: Record<string, string> = {};
  const sectionPattern = /<(?:h2|h3|dt)[^>]*>([^<]+)<\/(?:h2|h3|dt)>([\s\S]*?)(?=<(?:h2|h3|dt)|<\/div>\s*<\/div>|$)/gi;
  let sMatch;
  while ((sMatch = sectionPattern.exec(detailHtml)) !== null) {
    const heading = sMatch[1].trim();
    const body = sMatch[2]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    sections[heading] = body;
  }

  // Parse time from 日時 section: "2026年6月21日（日）15:00開演（14:30開場）"
  const timeSection = sections['日時'] || sections['開催日時'] || '';
  const startMatch = timeSection.match(/(\d{1,2})[：:](\d{2})\s*開演/) || timeSection.match(/開演\s*(\d{1,2})[：:](\d{2})/);
  if (startMatch) {
    extra.timeStart = `${startMatch[1].padStart(2, '0')}:${startMatch[2]}`;
  }
  const openMatch = timeSection.match(/(\d{1,2})[：:](\d{2})\s*開場/) || timeSection.match(/開場\s*(\d{1,2})[：:](\d{2})/);
  if (openMatch) {
    extra.timeOpen = `${openMatch[1].padStart(2, '0')}:${openMatch[2]}`;
  }

  // Parse venue from 場所 / 会場 section（cleanVenueNameで金額情報を除去）
  const venueSection = sections['場所'] || sections['会場'] || '';
  if (venueSection) {
    const cleaned = cleanVenueName(venueSection);
    if (cleaned) extra.venue = cleaned;
  }

  // Build description from 概要 section + other details
  const descParts: string[] = [];
  if (sections['概要']) descParts.push(sections['概要']);

  // Extract performers from <h4>出演</h4> sub-sections
  const performerMatch = detailHtml.match(/<h[3-5][^>]*>出演[^<]*<\/h[3-5]>([\s\S]*?)(?=<h[2-5]>|$)/i);
  if (performerMatch) {
    const performers = performerMatch[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (performers) descParts.push('【出演】\n' + performers);
  }

  // Extract program
  const programMatch = detailHtml.match(/<h[3-5][^>]*>(?:プログラム|曲目)[^<]*<\/h[3-5]>([\s\S]*?)(?=<h[2-5]>|$)/i);
  if (programMatch) {
    const program = programMatch[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (program) descParts.push('【プログラム】\n' + program);
  }

  if (descParts.length > 0) {
    extra.description = descParts.join('\n\n').slice(0, 2000);
  }

  // Parse pricing from 入場料 / 料金 / チケット section
  const pricingSection = sections['入場料'] || sections['料金'] || sections['チケット'] || '';
  if (pricingSection) {
    const pricing = parsePricingFromText(pricingSection, [{ label: '入場料', amount: 0 }]);
    if (pricing.length > 0) {
      extra.pricingJson = JSON.stringify(pricing);
    }
  }

  // Extract all PDF flyer URLs (front + back pages)
  const pdfMatches = [...html.matchAll(/href="([^"]*\.pdf)"/gi)];
  const seenPdfs = new Set<string>();
  const pdfUrls: string[] = [];
  for (const pm of pdfMatches) {
    if (!seenPdfs.has(pm[1]) && !pm[1].includes('apple-touch-icon')) {
      seenPdfs.add(pm[1]);
      pdfUrls.push(pm[1]);
    }
  }
  if (pdfUrls.length > 0) {
    (extra as Record<string, unknown>).pdfUrl = pdfUrls[0];
    (extra as Record<string, unknown>).pdfUrls = pdfUrls;
  }

  // Extract additional images from detail page
  const imgMatches = [...html.matchAll(/src="(\/event\/item\/[^"]*\.(?:jpg|jpeg|png|gif|webp))"/gi)];
  if (imgMatches.length > 0) {
    (extra as Record<string, unknown>).detailImagePaths = imgMatches.map(m => m[1]);
  }

  return extra;
}

// Main scraping logic
// mode: 'cron' = page 1 only (daily auto), 'manual' = pages 1-3, 'full' = all 30 pages (rebuild)
async function runScrape(env: Env, options?: { mode?: 'cron' | 'manual' | 'full'; startPage?: number }): Promise<{ found: number; added: number; errors: string[] }> {
  const BASE_URL = 'https://www.aichi-fam-u.ac.jp/event/music/';
  const errors: string[] = [];
  let found = 0;
  let added = 0;
  const mode = options?.mode || 'cron';

  // Record last scrape attempt timestamp in KV for Piggyback Cron & Status Indicator
  try {
    await env.KV.put('cron:last_scrape_at', new Date().toISOString());
  } catch { /* ignore KV write error */ }

  // Build list of URLs to scrape based on mode
  const urls: string[] = [];
  const start = options?.startPage || 1;
  if (mode === 'full') {
    if (start === 1) urls.push(BASE_URL);
    for (let i = Math.max(2, start); i <= 20; i++) {
      urls.push(`${BASE_URL}index_${i}.html`);
    }
  } else if (mode === 'manual') {
    urls.push(BASE_URL);
    urls.push(`${BASE_URL}index_2.html`);
    urls.push(`${BASE_URL}index_3.html`);
  } else {
    urls.push(BASE_URL);
  }

  const skipDetails = mode === 'full';
  const skipImages = mode === 'full';

  for (const TARGET_URL of urls) {
    try {
      const res = await fetch(TARGET_URL, {
        headers: {
          'User-Agent': 'Crescendo-Bot/1.0 (concert aggregator)',
          'Accept': 'text/html',
        },
      });

      if (!res.ok) {
        if (res.status === 404) break;
        errors.push(`HTTP ${res.status} from ${TARGET_URL}`);
        continue;
      }

      const html = await res.text();
      const events = parseEventList(html, TARGET_URL);
      found += events.length;

      if (events.length === 0 && urls.length === 1) {
        errors.push('パース結果が0件です。サイト構造が変更された可能性があります。');

        const recentLogs = await env.DB.prepare(
          `SELECT details FROM maintenance_log
           WHERE task = 'scrape' AND result = 'success'
           ORDER BY executed_at DESC LIMIT 3`
        ).all<{ details: string }>();

        const consecutiveZero = recentLogs.results?.filter(
          (r) => r.details.includes('0 events found')
        ).length || 0;

        if (consecutiveZero >= 2) {
          errors.push('3日連続で取得0件です。パーサーの修正が必要です。');
        }
      }

      for (const ev of events) {
        try {
          if (ev.detailUrl && !skipDetails) {
            try {
              const detailRes = await fetch(ev.detailUrl, {
                headers: {
                  'User-Agent': 'Crescendo-Bot/1.0',
                  'Accept': 'text/html',
                },
              });
              if (detailRes.ok) {
                const detailHtml = await detailRes.text();
                const details = await parseDetailPage(detailHtml);
                // Upsert protection: only override with non-empty values
                if (details.timeStart) ev.timeStart = details.timeStart;
                if (details.timeOpen) ev.timeOpen = details.timeOpen;
                if (details.venue && details.venue.trim().length > 0) ev.venue = details.venue;
                if (details.description && details.description.trim().length > 0) ev.description = details.description;
                if (details.pricingJson) ev.pricingJson = details.pricingJson;
                if ((details as Record<string, unknown>).pdfUrl) {
                  (ev as unknown as Record<string, unknown>).pdfUrl = (details as Record<string, unknown>).pdfUrl;
                }
                if ((details as Record<string, unknown>).pdfUrls) {
                  (ev as unknown as Record<string, unknown>).pdfUrls = (details as Record<string, unknown>).pdfUrls;
                }
                if ((details as Record<string, unknown>).detailImagePaths) {
                  (ev as unknown as Record<string, unknown>).detailImagePaths = (details as Record<string, unknown>).detailImagePaths;
                }
              }
            } catch {
              // Detail page fetch failed — continue with what we have
            }
          }

          // Validate event schema before writing to D1
          if (!validateScrapedEvent(ev)) {
            continue;
          }

          const fingerprint = await generateFingerprint(ev.date, ev.venue, ev.title);

          // Check if already exists (Upsert protection: never overwrite valid records with empty data)
          const existing = await env.DB.prepare(
            'SELECT id, pricing_json, time_open, description FROM concerts WHERE fingerprint = ? AND is_deleted = 0'
          ).bind(fingerprint).first<{ id: string; pricing_json: string; time_open: string; description: string }>();

          if (existing) {
            const updates: string[] = [];
            const updateVals: string[] = [];

            if (ev.pricingJson && existing.pricing_json === '[{"label":"入場料","amount":0}]') {
              updates.push('pricing_json = ?');
              updateVals.push(ev.pricingJson);
            }
            if (ev.timeOpen && !existing.time_open) {
              updates.push('time_open = ?');
              updateVals.push(ev.timeOpen);
            }
            if (ev.description && !existing.description) {
              updates.push('description = ?');
              updateVals.push(ev.description);
            }

            if (updates.length > 0) {
              updates.push("updated_at = datetime('now')");
              updateVals.push(existing.id);
              await env.DB.prepare(
                `UPDATE concerts SET ${updates.join(', ')} WHERE id = ?`
              ).bind(...updateVals).run();
            }
            continue;
          }

          const slug = generateSlug(ev.date, ev.title);
          const id = generateId(12);

          let flyerR2Keys: string[] = [];
          let flyerThumbnailKey = '';
          if (ev.imageUrl && !skipImages) {
            try {
              const imgRes = await fetch(ev.imageUrl, {
                headers: { 'User-Agent': 'Crescendo-Bot/1.0', 'Accept': 'image/*' },
              });
              if (imgRes.ok) {
                const imgBuffer = await imgRes.arrayBuffer();
                const ext = ev.imageUrl.match(/\.(webp|png|jpg|jpeg|gif)$/i)?.[1]?.toLowerCase() || 'jpg';
                const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
                const timestamp = Date.now();
                const imgKey = `flyers/${slug}/${timestamp}.${ext}`;
                const thumbKey = `flyers/${slug}/${timestamp}_thumb.${ext}`;
                await env.KV.put(imgKey, imgBuffer, { metadata: { contentType } });
                await env.KV.put(thumbKey, imgBuffer, { metadata: { contentType } });
                flyerR2Keys = [imgKey];
                flyerThumbnailKey = thumbKey;
              }
            } catch { /* image download failed */ }
          }

          if (!skipImages) {
            const pdfUrls = (ev as unknown as Record<string, unknown>).pdfUrls as string[] | undefined;
            if (pdfUrls && pdfUrls.length > 0 && ev.detailUrl) {
              for (let pi = 0; pi < pdfUrls.length; pi++) {
                try {
                  const fullPdfUrl = new URL(pdfUrls[pi], ev.detailUrl).href;
                  const pdfRes = await fetch(fullPdfUrl, {
                    headers: { 'User-Agent': 'Crescendo-Bot/1.0', 'Accept': 'application/pdf' },
                  });
                  if (pdfRes.ok) {
                    const pdfBuffer = await pdfRes.arrayBuffer();
                    const pdfTimestamp = Date.now();
                    const pdfKey = `flyers/${slug}/${pdfTimestamp}_p${pi + 1}.pdf`;
                    await env.KV.put(pdfKey, pdfBuffer, { metadata: { contentType: 'application/pdf' } });
                    flyerR2Keys.push(pdfKey);
                  }
                } catch { /* PDF download failed */ }
              }
            }
          }

          const pricingJson = ev.pricingJson || JSON.stringify([{ label: '入場料', amount: 0 }]);
          const category = ev.category || 'daigaku';

          await env.DB.prepare(
            `INSERT INTO concerts (
              id, slug, fingerprint, title, date, time_open, time_start,
              venue_json, category, description, source, source_url,
              pricing_json, flyer_r2_keys, flyer_thumbnail_key,
              is_published, edit_password_hash, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'auto_scrape', ?, ?, ?, ?, 1, 'auto_generated', 'scraper')`
          ).bind(
            id, slug, fingerprint,
            ev.title, ev.date, ev.timeOpen || '', ev.timeStart,
            JSON.stringify({ name: ev.venue }),
            category,
            ev.description || '',
            ev.detailUrl || ev.sourceUrl,
            pricingJson,
            JSON.stringify(flyerR2Keys),
            flyerThumbnailKey
          ).run();

          added++;

          try {
            await env.DB.prepare(
              `INSERT OR IGNORE INTO venues (id, name, data_json) VALUES (?, ?, ?)`
            ).bind(generateId(8), ev.venue, JSON.stringify({ name: ev.venue })).run();
          } catch { /* ignore */ }
        } catch (evErr: unknown) {
          const msg = evErr instanceof Error ? evErr.message : String(evErr);
          errors.push(`Event "${ev.title}": ${msg}`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Page ${TARGET_URL}: ${msg}`);
    }
  }

  return { found, added, errors };
}

// HTTP endpoint handler (admin-triggered or cron-triggered)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const token = request.headers.get('X-Admin-Token');
  const cronSecret = request.headers.get('X-Cron-Secret');

  let isAuthed = false;
  if (token && env.ADMIN_PASSWORD) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(env.ADMIN_PASSWORD), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode('ken-gei-admin-session'));
    const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    isAuthed = token === expected;
  }
  const isCron = cronSecret && env.CRON_SECRET && cronSecret === env.CRON_SECRET;

  if (!isAuthed && !isCron) {
    return jsonResponse({ ok: false, error: '認証が必要です' }, 401);
  }

  try {
    let mode: 'cron' | 'manual' | 'full' = 'cron';
    let startPage = 1;
    try {
      const body = await request.clone().json() as Record<string, unknown>;
      if (body.mode === 'manual' || body.mode === 'full') mode = body.mode;
      if (body.allPages) mode = 'full';
      if (typeof body.startPage === 'number') startPage = body.startPage;
    } catch { /* no body or not JSON */ }

    const url = new URL(request.url);
    if (url.searchParams.get('mode') === 'manual') mode = 'manual';
    if (url.searchParams.get('mode') === 'full') mode = 'full';
    if (url.searchParams.get('allPages') === 'true') mode = 'full';
    if (url.searchParams.get('startPage')) startPage = parseInt(url.searchParams.get('startPage')!) || 1;

    const result = await runScrape(env, { mode, startPage });

    const details = `${result.found} events found, ${result.added} new added` +
      (result.errors.length > 0 ? `. Errors: ${result.errors.join('; ')}` : '');

    await env.DB.prepare(
      "INSERT INTO maintenance_log (task, result, details) VALUES ('scrape', 'success', ?)"
    ).bind(details).run();

    return jsonResponse({
      ok: true,
      data: {
        found: result.found,
        added: result.added,
        errors: result.errors,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    await env.DB.prepare(
      "INSERT INTO maintenance_log (task, result, details) VALUES ('scrape', 'error', ?)"
    ).bind(msg).run();

    return jsonResponse({ ok: false, error: msg }, 500);
  }
};

export { runScrape };
