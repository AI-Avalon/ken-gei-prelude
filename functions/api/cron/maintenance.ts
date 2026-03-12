// Cloudflare Pages Functions — Auto-Maintenance Tasks
// Route: POST /api/cron/maintenance (admin-only)
// Spec: Chapter 13 — 自動メンテナンス機構

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ADMIN_PASSWORD: string;
  CRON_SECRET: string;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface TaskResult {
  task: string;
  success: boolean;
  details: string;
}

// ============================================================
// Task 1: 古い閲覧ログ削除（6ヶ月超）
// ============================================================
async function cleanOldAnalytics(env: Env): Promise<TaskResult> {
  try {
    const result = await env.DB.prepare(
      "DELETE FROM analytics WHERE viewed_at < datetime('now', '-180 days')"
    ).run();

    const deleted = result.meta?.changes || 0;
    const details = `${deleted} 件の古い閲覧ログを削除しました`;

    await env.DB.prepare(
      "INSERT INTO maintenance_log (task, result, details) VALUES ('clean_analytics', 'success', ?)"
    ).bind(details).run();

    return { task: 'clean_analytics', success: true, details };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await env.DB.prepare(
      "INSERT INTO maintenance_log (task, result, details) VALUES ('clean_analytics', 'error', ?)"
    ).bind(msg).run();
    return { task: 'clean_analytics', success: false, details: msg };
  }
}

// ============================================================
// Task 2: 論理削除から30日超の物理削除
// ============================================================
async function purgeDeletedConcerts(env: Env): Promise<TaskResult> {
  try {
    // Get concerts to be purged (for flyer cleanup)
    const toDelete = await env.DB.prepare(
      "SELECT id, slug, flyer_r2_keys FROM concerts WHERE is_deleted = 1 AND deleted_at < datetime('now', '-30 days')"
    ).all<{ id: string; slug: string; flyer_r2_keys: string }>();

    let kvCleaned = 0;

    // Clean up KV flyer images for each concert
    for (const concert of toDelete.results || []) {
      try {
        const keys: string[] = JSON.parse(concert.flyer_r2_keys || '[]');
        for (const key of keys) {
          try {
            await env.KV.delete(key);
            await env.KV.delete(key.replace('.webp', '_thumb.webp'));
            kvCleaned++;
          } catch { /* ignore individual KV delete errors */ }
        }
      } catch { /* ignore JSON parse errors */ }
    }

    // Physical delete concerts
    const concertResult = await env.DB.prepare(
      "DELETE FROM concerts WHERE is_deleted = 1 AND deleted_at < datetime('now', '-30 days')"
    ).run();
    const deletedConcerts = concertResult.meta?.changes || 0;

    // Clean up orphaned analytics
    const analyticsResult = await env.DB.prepare(
      "DELETE FROM analytics WHERE concert_id NOT IN (SELECT id FROM concerts)"
    ).run();
    const deletedAnalytics = analyticsResult.meta?.changes || 0;

    const details = `${deletedConcerts} 件の演奏会を物理削除、${deletedAnalytics} 件の孤立ログを削除、${kvCleaned} 件の画像ファイルを削除`;

    await env.DB.prepare(
      "INSERT INTO maintenance_log (task, result, details) VALUES ('purge_deleted', 'success', ?)"
    ).bind(details).run();

    return { task: 'purge_deleted', success: true, details };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await env.DB.prepare(
      "INSERT INTO maintenance_log (task, result, details) VALUES ('purge_deleted', 'error', ?)"
    ).bind(msg).run();
    return { task: 'purge_deleted', success: false, details: msg };
  }
}

// ============================================================
// Task 3: レート制限テーブルのクリア
// ============================================================
async function cleanRateLimits(env: Env): Promise<TaskResult> {
  try {
    const result = await env.DB.prepare(
      "DELETE FROM rate_limits WHERE last_attempt < datetime('now', '-1 day')"
    ).run();

    const deleted = result.meta?.changes || 0;
    const details = `${deleted} 件の期限切れレート制限を削除しました`;

    await env.DB.prepare(
      "INSERT INTO maintenance_log (task, result, details) VALUES ('clean_rate_limits', 'success', ?)"
    ).bind(details).run();

    return { task: 'clean_rate_limits', success: true, details };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await env.DB.prepare(
      "INSERT INTO maintenance_log (task, result, details) VALUES ('clean_rate_limits', 'error', ?)"
    ).bind(msg).run();
    return { task: 'clean_rate_limits', success: false, details: msg };
  }
}

// ============================================================
// Task 4: 古いメンテナンスログの整理（1年超）
// ============================================================
async function cleanOldLogs(env: Env): Promise<TaskResult> {
  try {
    const result = await env.DB.prepare(
      "DELETE FROM maintenance_log WHERE executed_at < datetime('now', '-365 days')"
    ).run();

    const deleted = result.meta?.changes || 0;
    const details = `${deleted} 件の古いメンテナンスログを削除しました`;

    return { task: 'clean_old_logs', success: true, details };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { task: 'clean_old_logs', success: false, details: msg };
  }
}

// ============================================================
// Task 5: 自動分類の再実行（auto_scrapeイベントのカテゴリ更新）
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

async function recategorizeConcerts(env: Env): Promise<TaskResult> {
  try {
    const rows = await env.DB.prepare(
      "SELECT slug, title, category FROM concerts WHERE source = 'auto_scrape' AND is_deleted = 0"
    ).all<{ slug: string; title: string; category: string }>();

    let updated = 0;
    for (const row of rows.results || []) {
      const newCat = classifyCategory(row.title);
      if (newCat !== row.category) {
        await env.DB.prepare(
          "UPDATE concerts SET category = ?, updated_at = datetime('now') WHERE slug = ?"
        ).bind(newCat, row.slug).run();
        updated++;
      }
    }

    const details = `${rows.results?.length || 0} 件中 ${updated} 件のカテゴリを更新しました`;
    await env.DB.prepare(
      "INSERT INTO maintenance_log (task, result, details) VALUES ('recategorize', 'success', ?)"
    ).bind(details).run();
    return { task: 'recategorize', success: true, details };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { task: 'recategorize', success: false, details: msg };
  }
}

// ============================================================
// Task 6: スクレイプ済みイベントのチラシ画像取得
//   source_urlからリストページを再取得し、画像URLを特定してKVに保存
// ============================================================
async function fetchMissingImages(env: Env): Promise<TaskResult> {
  try {
    // Get auto_scrape events without flyer images (limit per run to stay under subrequest limit)
    const rows = await env.DB.prepare(
      `SELECT slug, title, date, source_url FROM concerts 
       WHERE source = 'auto_scrape' AND is_deleted = 0 
       AND (flyer_thumbnail_key IS NULL OR flyer_thumbnail_key = '')
       ORDER BY date DESC LIMIT 8`
    ).all<{ slug: string; title: string; date: string; source_url: string }>();

    if (!rows.results?.length) {
      return { task: 'fetch_images', success: true, details: '画像取得が必要なイベントはありません' };
    }

    let fetched = 0;
    const BASE_URL = 'https://www.aichi-fam-u.ac.jp/event/music/';

    // Group events by source page to minimize fetches
    const pageCache = new Map<string, string>();

    for (const row of rows.results) {
      try {
        const pageUrl = row.source_url || BASE_URL;
        let html = pageCache.get(pageUrl);
        if (!html) {
          const res = await fetch(pageUrl, {
            headers: { 'User-Agent': 'Crescendo-Bot/1.0', 'Accept': 'text/html' },
          });
          if (!res.ok) continue;
          html = await res.text();
          pageCache.set(pageUrl, html);
        }

        // Find this event's image in the listing page
        const titleEsc = row.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 30);
        // Look for event blocks containing this title
        const blockPattern = new RegExp(
          `<a\\s+href="[^"]*"\\s+class="eventList_item event">[\\s\\S]*?${titleEsc}[\\s\\S]*?<\\/a>`,
          'i'
        );
        const blockMatch = html.match(blockPattern);
        if (!blockMatch) continue;
        const imgMatch = blockMatch[0].match(/<img\s+src="([^"]+)"/);
        if (!imgMatch) continue;
        const imageUrl = new URL(imgMatch[1], pageUrl).href;

        // Download the image
        const imgRes = await fetch(imageUrl, {
          headers: { 'User-Agent': 'Crescendo-Bot/1.0', 'Accept': 'image/*' },
        });
        if (!imgRes.ok) continue;

        const imgBuffer = await imgRes.arrayBuffer();
        const ext = imageUrl.match(/\.(webp|png|jpg|jpeg|gif)$/i)?.[1]?.toLowerCase() || 'jpg';
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        const timestamp = Date.now();
        const imgKey = `flyers/${row.slug}/${timestamp}.${ext}`;
        const thumbKey = `flyers/${row.slug}/${timestamp}_thumb.${ext}`;

        await env.KV.put(imgKey, imgBuffer, { metadata: { contentType } });
        await env.KV.put(thumbKey, imgBuffer, { metadata: { contentType } });

        // Update concert record
        await env.DB.prepare(
          `UPDATE concerts SET flyer_r2_keys = ?, flyer_thumbnail_key = ?, updated_at = datetime('now') WHERE slug = ?`
        ).bind(JSON.stringify([imgKey]), thumbKey, row.slug).run();

        fetched++;
      } catch { /* skip individual failures */ }
    }

    const details = `${rows.results.length} 件中 ${fetched} 件の画像を取得しました`;
    await env.DB.prepare(
      "INSERT INTO maintenance_log (task, result, details) VALUES ('fetch_images', 'success', ?)"
    ).bind(details).run();
    return { task: 'fetch_images', success: true, details };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { task: 'fetch_images', success: false, details: msg };
  }
}

// Run all maintenance tasks
async function runMaintenance(env: Env): Promise<TaskResult[]> {
  const results: TaskResult[] = [];

  results.push(await cleanOldAnalytics(env));
  results.push(await purgeDeletedConcerts(env));
  results.push(await cleanRateLimits(env));
  results.push(await cleanOldLogs(env));
      results.push(await recategorizeConcerts(env));
      results.push(await fetchMissingImages(env));
  return results;
}

// HTTP endpoint handler
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Auth check
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

  // Check if a specific task is requested
  const url = new URL(request.url);
  const taskName = url.searchParams.get('task');

  try {
    let results: TaskResult[];

    if (taskName) {
      // Run specific task
      switch (taskName) {
        case 'clean_analytics':
          results = [await cleanOldAnalytics(env)];
          break;
        case 'purge_deleted':
          results = [await purgeDeletedConcerts(env)];
          break;
        case 'clean_rate_limits':
          results = [await cleanRateLimits(env)];
          break;
        case 'clean_old_logs':
          results = [await cleanOldLogs(env)];
          break;
        case 'recategorize':
          results = [await recategorizeConcerts(env)];
          break;
        case 'fetch_images':
          results = [await fetchMissingImages(env)];
          break;
        default:
          return jsonResponse({ ok: false, error: `不明なタスク: ${taskName}` }, 400);
      }
    } else {
      // Run all tasks
      results = await runMaintenance(env);
    }

    return jsonResponse({ ok: true, data: results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ ok: false, error: msg }, 500);
  }
};

// Export for cron worker
export { runMaintenance };
