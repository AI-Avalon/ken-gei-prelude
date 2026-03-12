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
//   リストページを「全ブロック」解析し、タイトルマッチで正しい画像を特定
//   さらに詳細ページからPDFフライヤーも取得
// ============================================================

// Parse all event blocks from a listing page into a map
function parseAllEventBlocks(html: string, baseUrl: string): Map<string, { imageUrl: string; detailUrl: string }> {
  const map = new Map<string, { imageUrl: string; detailUrl: string }>();
  const blockPattern = /<a\s+href="(\/event\/\d+\.html)"\s+class="eventList_item event">([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = blockPattern.exec(html)) !== null) {
    const detailPath = m[1];
    const block = m[2];
    const titleMatch = block.match(/<p\s+class="event_title">([^<]*)<\/p>/);
    const imgMatch = block.match(/<img\s+src="([^"]+)"/);
    if (titleMatch && imgMatch) {
      const title = titleMatch[1].trim().replace(/\s+/g, ' ');
      const imageUrl = new URL(imgMatch[1], baseUrl).href;
      const detailUrl = new URL(detailPath, baseUrl).href;
      map.set(title, { imageUrl, detailUrl });
    }
  }
  return map;
}

async function fetchMissingImages(env: Env): Promise<TaskResult> {
  try {
    const rows = await env.DB.prepare(
      `SELECT slug, title, date, source_url FROM concerts 
       WHERE source = 'auto_scrape' AND is_deleted = 0 
       AND (flyer_thumbnail_key IS NULL OR flyer_thumbnail_key = '')
       ORDER BY date DESC LIMIT 6`
    ).all<{ slug: string; title: string; date: string; source_url: string }>();

    if (!rows.results?.length) {
      return { task: 'fetch_images', success: true, details: '画像取得が必要なイベントはありません' };
    }

    let fetched = 0;
    const BASE_URL = 'https://www.aichi-fam-u.ac.jp/event/music/';

    // Fetch listing pages and build title→{imageUrl, detailUrl} map
    const titleMap = new Map<string, { imageUrl: string; detailUrl: string }>();
    const pageUrls = new Set<string>();
    for (const row of rows.results) {
      const src = row.source_url || BASE_URL;
      // If source_url is a detail page, we can use it directly
      if (src.match(/\/event\/\d+\.html$/)) {
        pageUrls.add(src);
      } else {
        pageUrls.add(src);
      }
    }

    // If all sources are the base listing URL, also fetch additional pages
    // to find events that were scraped from paginated results
    if (pageUrls.size === 1 && pageUrls.has(BASE_URL)) {
      // Fetch pages 1-16 to find all events (1 subrequest each)
      // But limit to 3 pages per run to conserve subrequests
      // Use date-based heuristic: older events are on later pages
      const oldestDate = rows.results[rows.results.length - 1]?.date || '';
      const yearMonth = oldestDate.slice(0, 7);
      // Start from page 1 and add a few more
      for (let i = 2; i <= 4; i++) {
        pageUrls.add(`${BASE_URL}index_${i}.html`);
      }
    }

    for (const pageUrl of pageUrls) {
      try {
        const res = await fetch(pageUrl, {
          headers: { 'User-Agent': 'Crescendo-Bot/1.0', 'Accept': 'text/html' },
        });
        if (!res.ok) continue;
        const html = await res.text();
        const blocks = parseAllEventBlocks(html, pageUrl);
        for (const [title, data] of blocks) {
          titleMap.set(title, data);
        }
      } catch { /* skip page errors */ }
    }

    for (const row of rows.results) {
      try {
        // Match by exact title or first-30-chars prefix
        let match = titleMap.get(row.title);
        if (!match) {
          const prefix = row.title.slice(0, 30);
          for (const [title, data] of titleMap) {
            if (title.startsWith(prefix)) {
              match = data;
              break;
            }
          }
        }
        if (!match) continue;

        // Fetch the detail page to get both the JPG and PDF
        let pdfUrl: string | undefined;
        try {
          const detailRes = await fetch(match.detailUrl, {
            headers: { 'User-Agent': 'Crescendo-Bot/1.0', 'Accept': 'text/html' },
          });
          if (detailRes.ok) {
            const detailHtml = await detailRes.text();
            const pdfMatch = detailHtml.match(/href="([^"]*\.pdf)"/);
            if (pdfMatch) {
              pdfUrl = new URL(pdfMatch[1], match.detailUrl).href;
            }
          }
        } catch { /* detail page fetch failed */ }

        const flyerKeys: string[] = [];
        const timestamp = Date.now();

        // Download the listing page image (JPG thumbnail)
        const imgRes = await fetch(match.imageUrl, {
          headers: { 'User-Agent': 'Crescendo-Bot/1.0', 'Accept': 'image/*' },
        });
        let thumbKey = '';
        if (imgRes.ok) {
          const imgBuffer = await imgRes.arrayBuffer();
          const ext = match.imageUrl.match(/\.(webp|png|jpg|jpeg|gif)$/i)?.[1]?.toLowerCase() || 'jpg';
          const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
          const imgKey = `flyers/${row.slug}/${timestamp}.${ext}`;
          thumbKey = `flyers/${row.slug}/${timestamp}_thumb.${ext}`;
          await env.KV.put(imgKey, imgBuffer, { metadata: { contentType } });
          await env.KV.put(thumbKey, imgBuffer, { metadata: { contentType } });
          flyerKeys.push(imgKey);
        }

        // Download PDF flyer if found
        if (pdfUrl) {
          try {
            const pdfRes = await fetch(pdfUrl, {
              headers: { 'User-Agent': 'Crescendo-Bot/1.0', 'Accept': 'application/pdf' },
            });
            if (pdfRes.ok) {
              const pdfBuffer = await pdfRes.arrayBuffer();
              const pdfKey = `flyers/${row.slug}/${timestamp}.pdf`;
              await env.KV.put(pdfKey, pdfBuffer, { metadata: { contentType: 'application/pdf' } });
              flyerKeys.push(pdfKey);
            }
          } catch { /* PDF download failed */ }
        }

        if (flyerKeys.length > 0) {
          await env.DB.prepare(
            `UPDATE concerts SET flyer_r2_keys = ?, flyer_thumbnail_key = ?, updated_at = datetime('now') WHERE slug = ?`
          ).bind(JSON.stringify(flyerKeys), thumbKey || flyerKeys[0], row.slug).run();
          fetched++;
        }
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

// ============================================================
// Task 7: 誤った画像データをクリアして再取得可能にする
// ============================================================
async function clearWrongImages(env: Env): Promise<TaskResult> {
  try {
    // Get all auto_scrape events that have flyer images
    const rows = await env.DB.prepare(
      `SELECT slug, flyer_r2_keys, flyer_thumbnail_key FROM concerts 
       WHERE source = 'auto_scrape' AND is_deleted = 0 
       AND flyer_thumbnail_key IS NOT NULL AND flyer_thumbnail_key != ''`
    ).all<{ slug: string; flyer_r2_keys: string; flyer_thumbnail_key: string }>();

    let cleared = 0;
    for (const row of rows.results || []) {
      // Delete KV entries
      try {
        const keys: string[] = JSON.parse(row.flyer_r2_keys || '[]');
        for (const key of keys) {
          await env.KV.delete(key);
        }
        if (row.flyer_thumbnail_key) {
          await env.KV.delete(row.flyer_thumbnail_key);
        }
      } catch { /* ignore KV delete errors */ }

      // Clear DB fields
      await env.DB.prepare(
        `UPDATE concerts SET flyer_r2_keys = '[]', flyer_thumbnail_key = '', updated_at = datetime('now') WHERE slug = ?`
      ).bind(row.slug).run();
      cleared++;
    }

    const details = `${cleared} 件の誤った画像データをクリアしました`;
    await env.DB.prepare(
      "INSERT INTO maintenance_log (task, result, details) VALUES ('clear_images', 'success', ?)"
    ).bind(details).run();
    return { task: 'clear_images', success: true, details };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { task: 'clear_images', success: false, details: msg };
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
        case 'clear_images':
          results = [await clearWrongImages(env)];
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
