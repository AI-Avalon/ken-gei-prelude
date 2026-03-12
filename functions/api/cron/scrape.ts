// Cloudflare Pages Functions — University Site Scraping
// Route: POST /api/cron/scrape (admin-only or cron-triggered)
// Spec: Chapter 8 — 大学公式サイト解析

interface Env {
  DB: D1Database;
  R2: R2Bucket;
  KV: KVNamespace;
  ADMIN_PASSWORD: string;
}

interface ScrapedEvent {
  title: string;
  date: string;       // "YYYY-MM-DD"
  timeStart: string;  // "HH:MM"
  venue: string;
  detailUrl?: string;
  description?: string;
  sourceUrl: string;
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
// HTML Parser for 愛知県立芸術大学 event page
// Target: https://www.aichi-fam-u.ac.jp/event/music/
// ============================================================

function parseEventList(html: string, baseUrl: string): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];

  // The university event page typically lists events as links with dates
  // Pattern: Look for event entries with dates and titles

  // Strategy 1: Look for <a> tags with event paths and associated date text
  // The site uses WordPress-like structure with event posts

  // Match event entries: links with /event/ or /music/ paths that contain event details
  const entryPattern = /<a[^>]+href=["']([^"']*\/event\/[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const datePattern = /(\d{4})[年./](\d{1,2})[月./](\d{1,2})[日]?/;
  const timePattern = /(\d{1,2})[：:](\d{2})\s*(?:開演|start)/i;

  // Try to extract event blocks — look for common WordPress/CMS patterns
  // Pattern: article or list item containing event info
  const blockPatterns = [
    // Pattern 1: <article> blocks
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    // Pattern 2: <li> with event class
    /<li[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
    // Pattern 3: <div> with event-related classes
    /<div[^>]*class="[^"]*(?:event|post|entry)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*(?:event|post|entry)|$)/gi,
    // Pattern 4: General link-based extraction (fallback)
    /<a[^>]+href=["']([^"']+)['""][^>]*>([^<]+)<\/a>/gi,
  ];

  for (const pattern of blockPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const block = match[0];

      // Extract link
      const linkMatch = block.match(/<a[^>]+href=["']([^"']+)["']/);
      const detailUrl = linkMatch ? new URL(linkMatch[1], baseUrl).href : undefined;

      // Extract title — use link text or heading text
      const titleMatch = block.match(
        /<(?:h[1-6]|a)[^>]*>([^<]+)<\/(?:h[1-6]|a)>/
      );
      const title = titleMatch
        ? titleMatch[1].trim().replace(/\s+/g, ' ')
        : '';

      // Extract date
      const dateMatch = block.match(datePattern);
      if (!dateMatch || !title) continue;

      const year = dateMatch[1];
      const month = dateMatch[2].padStart(2, '0');
      const day = dateMatch[3].padStart(2, '0');
      const date = `${year}-${month}-${day}`;

      // Extract time
      const timeMatch = block.match(timePattern);
      const timeStart = timeMatch
        ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`
        : '14:00'; // Default

      // Extract venue — look for common venue keywords
      const venuePattern = /(?:会場|場所)[：:\s]*([^\n<]+)/;
      const venueMatch = block.match(venuePattern);
      const venue = venueMatch
        ? venueMatch[1].trim()
        : '愛知県立芸術大学';

      // Avoid duplicates within this scrape
      const isDup = events.some(
        (e) => e.date === date && e.title === title
      );
      if (isDup) continue;

      events.push({
        title,
        date,
        timeStart,
        venue,
        detailUrl,
        sourceUrl: baseUrl,
      });
    }

    // If we found events, stop trying other patterns
    if (events.length > 0) break;
  }

  return events;
}

async function parseDetailPage(html: string): Promise<Partial<ScrapedEvent>> {
  const extra: Partial<ScrapedEvent> = {};

  // Extract description from article body or main content
  const contentMatch = html.match(
    /<div[^>]*class="[^"]*(?:entry-content|post-content|article-body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i
  );
  if (contentMatch) {
    // Strip HTML tags, keep text
    extra.description = contentMatch[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, 2000);
  }

  // Try to extract more precise venue info
  const venueMatch = html.match(/(?:会場|場所)[：:\s]*([^\n<]+)/);
  if (venueMatch) {
    extra.venue = venueMatch[1].trim();
  }

  // Try to extract more precise time
  const timeMatch = html.match(/(\d{1,2})[：:](\d{2})\s*(?:開演|start)/i);
  if (timeMatch) {
    extra.timeStart = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  }

  return extra;
}

// Main scraping logic
async function runScrape(env: Env): Promise<{ found: number; added: number; errors: string[] }> {
  const TARGET_URL = 'https://www.aichi-fam-u.ac.jp/event/music/';
  const errors: string[] = [];
  let found = 0;
  let added = 0;

  try {
    // 1. Fetch university event page
    const res = await fetch(TARGET_URL, {
      headers: {
        'User-Agent': 'Ken-Gei-Prelude-Bot/1.0 (concert aggregator)',
        'Accept': 'text/html',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${TARGET_URL}`);
    }

    const html = await res.text();

    // 2. Parse events
    const events = parseEventList(html, TARGET_URL);
    found = events.length;

    if (events.length === 0) {
      // No events found — could mean site structure changed
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
        // Fetch detail page if available
        if (ev.detailUrl) {
          try {
            const detailRes = await fetch(ev.detailUrl, {
              headers: {
                'User-Agent': 'Ken-Gei-Prelude-Bot/1.0',
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

        // Insert as unpublished draft
        await env.DB.prepare(
          `INSERT INTO concerts (
            id, slug, fingerprint, title, date, time_start,
            venue_json, category, description, source, source_url,
            is_published, edit_password_hash, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'auto_scrape', ?, 0, 'auto_generated', 'scraper')`
        ).bind(
          id, slug, fingerprint,
          ev.title, ev.date, ev.timeStart,
          JSON.stringify({ name: ev.venue }),
          'daigaku', // Category for university events
          ev.description || '',
          ev.sourceUrl
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
    errors.push(msg);
    throw err; // Re-throw for outer handler
  }

  return { found, added, errors };
}

// HTTP endpoint handler (admin-triggered or cron-triggered)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Auth check: require admin token or cron secret
  const token = request.headers.get('X-Admin-Token');
  const cronSecret = request.headers.get('X-Cron-Secret');

  const isAdmin = token && env.ADMIN_PASSWORD && token === env.ADMIN_PASSWORD;
  const isCron = cronSecret && env.ADMIN_PASSWORD && cronSecret === env.ADMIN_PASSWORD;

  if (!isAdmin && !isCron) {
    return jsonResponse({ ok: false, error: '認証が必要です' }, 401);
  }

  try {
    const result = await runScrape(env);

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
