// Cloudflare Pages Functions — University Site Scraping
// Route: POST /api/cron/scrape (admin-only or cron-triggered)
// Spec: Chapter 8 — 大学公式サイト解析

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

async function generateFingerprint(date: string, venue: string, title: string): Promise<string> {
  const input = `${date}|${normalize(venue)}|${normalize(title).slice(0, 10)}`;
  return sha256(input);
}

// ============================================================
// Auto-classify category from title keywords
// ============================================================
function classifyCategory(title: string): string {
  const t = title.normalize('NFKC');
  if (/定期演奏会/.test(t)) return 'teiki';
  if (/卒業演奏会|卒業/.test(t)) return 'sotsugyou';
  if (/学位審査|学位/.test(t)) return 'gakui';
  if (/修了演奏会/.test(t)) return 'sotsugyou';
  if (/オペラ|opera/i.test(t)) return 'opera';
  if (/オーケストラ|管弦楽団|orchestra/i.test(t)) return 'orchestra';
  if (/ウインドオーケストラ|吹奏楽|ウィンド/i.test(t)) return 'wind';
  if (/リサイタル|recital/i.test(t)) return 'recital';
  if (/室内楽|チェンバー|chamber/i.test(t)) return 'chamber';
  if (/アンサンブル|ensemble/i.test(t)) return 'ensemble';
  if (/弦楽合奏|弦楽/.test(t)) return 'chamber';
  if (/声楽|vocal/i.test(t)) return 'vocal';
  if (/ピアノ|piano/i.test(t)) return 'piano';
  if (/作曲作品演奏会|作曲/.test(t)) return 'ensemble';
  if (/ドクトラル|博士/.test(t)) return 'recital';
  return 'daigaku';
}

// ============================================================
// HTML Parser for 愛知県立芸術大学 event page
// Target: https://www.aichi-fam-u.ac.jp/event/music/
// Actual structure (verified 2026-03):
//   <a href="/event/002226.html" class="eventList_item event">
//     <div class="event_imgArea"><img src="..." /></div>
//     <p class="event_date">2026年6月21日（日）</p>
//     <p class="event_title">...</p>
//     <p class="event_info">会場名やサブ情報</p>
//   </a>
// ============================================================

function parseEventList(html: string, baseUrl: string): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];

  // Match <a href="/event/NNNN.html" class="eventList_item event">...</a>
  const entryPattern = /<a\s+href="(\/event\/\d+\.html)"\s+class="eventList_item event">([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = entryPattern.exec(html)) !== null) {
    const eventPath = match[1];
    const block = match[2];

    const detailUrl = new URL(eventPath, baseUrl).href;

    // <p class="event_date">2026年6月21日（日）</p>
    const dateMatch = block.match(/<p\s+class="event_date">([^<]*)<\/p>/);
    if (!dateMatch) continue;
    const dateRaw = dateMatch[1].trim();
    const dateParsed = dateRaw.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!dateParsed) continue;
    const date = `${dateParsed[1]}-${dateParsed[2].padStart(2, '0')}-${dateParsed[3].padStart(2, '0')}`;

    // <p class="event_title">...</p>
    const titleMatch = block.match(/<p\s+class="event_title">([^<]*)<\/p>/);
    const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '';
    if (!title) continue;

    // <p class="event_info">会場名やサブ情報</p>
    const infoMatch = block.match(/<p\s+class="event_info">([^<]*)<\/p>/);
    const venue = infoMatch ? infoMatch[1].trim() : '愛知県立芸術大学';

    // <img src="/event/item/..." />
    const imgMatch = block.match(/<img\s+src="([^"]+)"/);
    const imageUrl = imgMatch ? new URL(imgMatch[1], baseUrl).href : undefined;

    // Dedup
    if (events.some((e) => e.date === date && e.title === title)) continue;

    events.push({
      title,
      date,
      timeStart: '14:00', // default, detail page will override
      venue,
      detailUrl,
      description: '',
      sourceUrl: baseUrl,
      imageUrl: imageUrl,
      category: classifyCategory(title),
    });
  }

  return events;
}

async function parseDetailPage(html: string): Promise<Partial<ScrapedEvent>> {
  const extra: Partial<ScrapedEvent> = {};

  // Real structure: <div class="detail"><h2>日時</h2><p>...</p><h2>場所</h2><p>...</p>...</div>
  const detailMatch = html.match(/<div class="detail">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/);
  const detailHtml = detailMatch ? detailMatch[1] : html;

  // Extract sections by <h2> headings
  const sections: Record<string, string> = {};
  const sectionPattern = /<h2>([^<]+)<\/h2>([\s\S]*?)(?=<h2>|<\/div>\s*<\/div>|$)/gi;
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
  const timeSection = sections['日時'] || '';
  const startMatch = timeSection.match(/(\d{1,2})[：:](\d{2})\s*開演/);
  if (startMatch) {
    extra.timeStart = `${startMatch[1].padStart(2, '0')}:${startMatch[2]}`;
  }

  // Parse venue from 場所 section
  if (sections['場所']) {
    extra.venue = sections['場所'].split(/[（(]/)[0].trim();
  }

  // Build description from 概要 section + other details
  const descParts: string[] = [];
  if (sections['概要']) descParts.push(sections['概要']);

  // Extract performers from <h4>出演</h4> sub-sections
  const performerMatch = detailHtml.match(/<h4>出演<\/h4>([\s\S]*?)(?=<h[2-4]>|$)/);
  if (performerMatch) {
    const performers = performerMatch[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (performers) descParts.push('【出演】\n' + performers);
  }

  // Extract program
  const programMatch = detailHtml.match(/<h4>プログラム<\/h4>([\s\S]*?)(?=<h[2-4]>|$)/);
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
    const pricing = parsePricingFromText(pricingSection);
    if (pricing.length > 0) {
      extra.pricingJson = JSON.stringify(pricing);
    }
  }

  // Extract PDF flyer URL
  const pdfMatch = html.match(/href="([^"]*\.pdf)"/);
  if (pdfMatch) {
    (extra as Record<string, unknown>).pdfUrl = pdfMatch[1];
  }

  return extra;
}

// Parse pricing text into structured pricing items
function parsePricingFromText(text: string): Array<{ label: string; amount: number; note?: string }> {
  const t = text.normalize('NFKC').trim();
  if (!t || /無料|入場無料|入場料無料|free/i.test(t)) {
    return [{ label: '入場料', amount: 0 }];
  }
  const items: Array<{ label: string; amount: number; note?: string }> = [];
  // Try to match patterns like "一般 1,000円", "学生 500円", "大人1000円 子供500円"
  const linePattern = /([\p{L}\p{N}・（）\(\)]+?)\s*[：:]?\s*(\d[\d,]*)\s*円/gu;
  let m;
  while ((m = linePattern.exec(t)) !== null) {
    const label = m[1].trim();
    const amount = parseInt(m[2].replace(/,/g, ''), 10);
    items.push({ label, amount });
  }
  if (items.length > 0) return items;
  // Fallback: single price
  const singleMatch = t.match(/(\d[\d,]*)\s*円/);
  if (singleMatch) {
    return [{ label: '入場料', amount: parseInt(singleMatch[1].replace(/,/g, ''), 10) }];
  }
  return [{ label: '入場料', amount: 0 }];
}

// Main scraping logic
async function runScrape(env: Env, options?: { allPages?: boolean; fromYear?: number; startPage?: number }): Promise<{ found: number; added: number; errors: string[] }> {
  const BASE_URL = 'https://www.aichi-fam-u.ac.jp/event/music/';
  const errors: string[] = [];
  let found = 0;
  let added = 0;

  // Build list of URLs to scrape
  const urls: string[] = [];
  if (options?.allPages) {
    const start = options.startPage || 1;
    if (start === 1) urls.push(BASE_URL);
    for (let i = Math.max(2, start); i <= 16; i++) {
      urls.push(`${BASE_URL}index_${i}.html`);
    }
  } else {
    urls.push(BASE_URL);
  }

  // In bulk mode, skip detail page fetches and image downloads to stay under subrequest limit
  const skipDetails = options?.allPages === true;
  const skipImages = options?.allPages === true;

  for (const TARGET_URL of urls) {
  try {
    // 1. Fetch university event page
    const res = await fetch(TARGET_URL, {
      headers: {
        'User-Agent': 'Crescendo-Bot/1.0 (concert aggregator)',
        'Accept': 'text/html',
      },
    });

    if (!res.ok) {
      errors.push(`HTTP ${res.status} from ${TARGET_URL}`);
      continue;
    }

    const html = await res.text();

    // 2. Parse events
    const events = parseEventList(html, TARGET_URL);
    found += events.length;

    if (events.length === 0 && urls.length === 1) {
      // No events found on single-page scrape — could mean site structure changed
      errors.push('パース結果が0件です。サイト構造が変更された可能性があります。');

      // Check how many consecutive zero-result days
      const recentLogs = await env.DB.prepare(
        `SELECT details FROM maintenance_log
         WHERE task = 'scrape' AND result = 'success'
         ORDER BY executed_at DESC LIMIT 3`
      ).all<{ details: string }>();

      const consecutiveZero = recentLogs.results?.filter(
        (r) => r.details.includes('0 events found')
      ).length || 0;

      if (consecutiveZero >= 2) {
        // 3 consecutive failures (including this one) → record alert
        errors.push('3日連続で取得0件です。パーサーの修正が必要です。');
      }
    }

    // 3. Process each event
    for (const ev of events) {
      try {
        // Fetch detail page if available (skip in bulk mode to conserve subrequests)
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
              Object.assign(ev, details);
            }
          } catch {
            // Detail page fetch failed — continue with what we have
          }
        }

        // Generate fingerprint for dedup
        const fingerprint = await generateFingerprint(ev.date, ev.venue, ev.title);

        // Check if already exists
        const existing = await env.DB.prepare(
          'SELECT id FROM concerts WHERE fingerprint = ?'
        ).bind(fingerprint).first();

        if (existing) continue; // Already scraped

        // Generate slug
        const slug = generateSlug(ev.date, ev.title);
        const id = generateId(12);

        // Download and store flyer image if available (skip in bulk mode)
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

          // Also download PDF flyer if found on detail page
          const pdfUrl = (ev as Record<string, unknown>).pdfUrl as string | undefined;
          if (pdfUrl && ev.detailUrl) {
            try {
              const fullPdfUrl = new URL(pdfUrl, ev.detailUrl).href;
              const pdfRes = await fetch(fullPdfUrl, {
                headers: { 'User-Agent': 'Crescendo-Bot/1.0', 'Accept': 'application/pdf' },
              });
              if (pdfRes.ok) {
                const pdfBuffer = await pdfRes.arrayBuffer();
                const timestamp = Date.now();
                const pdfKey = `flyers/${slug}/${timestamp}.pdf`;
                await env.KV.put(pdfKey, pdfBuffer, { metadata: { contentType: 'application/pdf' } });
                flyerR2Keys.push(pdfKey);
              }
            } catch { /* PDF download failed */ }
          }
        }

        // Determine pricing JSON
        const pricingJson = ev.pricingJson || JSON.stringify([{ label: '入場料', amount: 0 }]);

        // Use auto-classified category
        const category = ev.category || 'daigaku';

        // Insert as published (auto-scraped events are public)
        await env.DB.prepare(
          `INSERT INTO concerts (
            id, slug, fingerprint, title, date, time_start,
            venue_json, category, description, source, source_url,
            pricing_json, flyer_r2_keys, flyer_thumbnail_key,
            is_published, edit_password_hash, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'auto_scrape', ?, ?, ?, ?, 1, 'auto_generated', 'scraper')`
        ).bind(
          id, slug, fingerprint,
          ev.title, ev.date, ev.timeStart,
          JSON.stringify({ name: ev.venue }),
          category,
          ev.description || '',
          ev.detailUrl || ev.sourceUrl,
          pricingJson,
          JSON.stringify(flyerR2Keys),
          flyerThumbnailKey
        ).run();

        added++;

        // Auto-register venue if not exists
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
  } // end for urls loop

  return { found, added, errors };
}

// HTTP endpoint handler (admin-triggered or cron-triggered)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Auth check: require admin token or cron secret
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
    // Check for allPages parameter (for historical bulk import)
    let allPages = false;
    let startPage = 1;
    try {
      const body = await request.clone().json() as Record<string, unknown>;
      if (body.allPages) allPages = true;
      if (typeof body.startPage === 'number') startPage = body.startPage;
    } catch { /* no body or not JSON */ }

    const url = new URL(request.url);
    if (url.searchParams.get('allPages') === 'true') allPages = true;
    if (url.searchParams.get('startPage')) startPage = parseInt(url.searchParams.get('startPage')!) || 1;

    const result = await runScrape(env, { allPages, startPage });

    const details = `${result.found} events found, ${result.added} new added` +
      (result.errors.length > 0 ? `. Errors: ${result.errors.join('; ')}` : '');

    // Log to maintenance_log
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

// Also export the scraping function for use by the cron worker
export { runScrape };
