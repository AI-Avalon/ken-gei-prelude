// Cloudflare Pages Functions — Auto-Maintenance Tasks
// Route: POST /api/cron/maintenance (admin-only)
// Spec: Chapter 13 — 自動メンテナンス機構

import { classifyCategory, parsePricingFromText } from './shared';

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
// Task 2: 論理削除から90日超の物理削除
// ============================================================
async function purgeDeletedConcerts(env: Env): Promise<TaskResult> {
  try {
    // Get concerts to be purged (for flyer cleanup)
    const toDelete = await env.DB.prepare(
      "SELECT id, slug, flyer_r2_keys FROM concerts WHERE is_deleted = 1 AND deleted_at < datetime('now', '-90 days')"
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
      "DELETE FROM concerts WHERE is_deleted = 1 AND deleted_at < datetime('now', '-90 days')"
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
      pageUrls.add(src);
    }

    // If all sources are the base listing URL, also fetch additional pages
    // to find events that were scraped from paginated results
    if (pageUrls.size === 1 && pageUrls.has(BASE_URL)) {
      // Fetch pages 1-16 to find all events (1 subrequest each)
      // Fetch more pages to find events on later listing pages
      for (let i = 2; i <= 8; i++) {
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

        // Fetch the detail page to get JPG, all additional images, and PDFs
        const detailImageUrls: string[] = [];
        const pdfUrls: string[] = [];
        try {
          const detailRes = await fetch(match.detailUrl, {
            headers: { 'User-Agent': 'Crescendo-Bot/1.0', 'Accept': 'text/html' },
          });
          if (detailRes.ok) {
            const detailHtml = await detailRes.text();
            // Get ALL PDFs from detail page (front + back)
            const pdfMatches = [...detailHtml.matchAll(/href="([^"]*\.pdf)"/g)];
            const seenPdfs = new Set<string>();
            for (const pm of pdfMatches) {
              const fullUrl = new URL(pm[1], match.detailUrl).href;
              if (!seenPdfs.has(fullUrl) && !fullUrl.includes('apple-touch-icon')) {
                seenPdfs.add(fullUrl);
                pdfUrls.push(fullUrl);
              }
            }
            // Get ALL images from detail page (not just listing thumbnail)
            const imgMatches = [...detailHtml.matchAll(/src="(\/event\/item\/[^"]*\.(jpg|jpeg|png|gif|webp))"/gi)];
            for (const im of imgMatches) {
              const fullUrl = new URL(im[1], match.detailUrl).href;
              detailImageUrls.push(fullUrl);
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

        // Download additional images from detail page (different from listing thumbnail)
        const listingImageHash = match.imageUrl.split('/').pop() || '';
        for (const detailImgUrl of detailImageUrls) {
          const detailImageHash = detailImgUrl.split('/').pop() || '';
          if (detailImageHash !== listingImageHash) {
            try {
              const diRes = await fetch(detailImgUrl, {
                headers: { 'User-Agent': 'Crescendo-Bot/1.0', 'Accept': 'image/*' },
              });
              if (diRes.ok) {
                const diBuffer = await diRes.arrayBuffer();
                const diExt = detailImgUrl.match(/\.(webp|png|jpg|jpeg|gif)$/i)?.[1]?.toLowerCase() || 'jpg';
                const diContentType = diRes.headers.get('content-type') || 'image/jpeg';
                const diKey = `flyers/${row.slug}/${timestamp}_detail_${flyerKeys.length}.${diExt}`;
                await env.KV.put(diKey, diBuffer, { metadata: { contentType: diContentType } });
                flyerKeys.push(diKey);
              }
            } catch { /* skip individual image errors */ }
          }
        }

        // Download ALL PDF flyers (front + back pages)
        for (let pi = 0; pi < pdfUrls.length; pi++) {
          try {
            const pdfRes = await fetch(pdfUrls[pi], {
              headers: { 'User-Agent': 'Crescendo-Bot/1.0', 'Accept': 'application/pdf' },
            });
            if (pdfRes.ok) {
              const pdfBuffer = await pdfRes.arrayBuffer();
              const pdfKey = `flyers/${row.slug}/${timestamp}_p${pi + 1}.pdf`;
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
// Task 7: 入場料の再取得（詳細ページから料金情報を再抽出）
// ============================================================
function parseDetailSections(html: string): Record<string, string> {
  // Try to extract content from <div class="detail"> first
  const detailMatch = html.match(/<div class="detail">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/);
  const detailHtml = detailMatch ? detailMatch[1] : html;

  const sections: Record<string, string> = {};
  const sectionPattern = /<h2>([^<]+)<\/h2>([\s\S]*?)(?=<h2>|<\/div>\s*<\/div>|$)/gi;
  let m;
  while ((m = sectionPattern.exec(detailHtml)) !== null) {
    const heading = m[1].trim();
    const body = m[2]
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
  return sections;
}

async function fixPricing(env: Env): Promise<TaskResult> {
  try {
    // Find events with default pricing (amount=0 only) that might actually have pricing
    const rows = await env.DB.prepare(
      `SELECT slug, title, source_url, pricing_json FROM concerts 
       WHERE source = 'auto_scrape' AND is_deleted = 0 
       AND pricing_json = '[{"label":"入場料","amount":0}]'
       ORDER BY date DESC LIMIT 20`
    ).all<{ slug: string; title: string; source_url: string; pricing_json: string }>();

    if (!rows.results?.length) {
      return { task: 'fix_pricing', success: true, details: '料金更新が必要なイベントはありません' };
    }

    let updated = 0;
    const BASE_URL = 'https://www.aichi-fam-u.ac.jp/event/music/';

    // Build title→detailUrl map from listing pages
    const titleMap = new Map<string, string>();
    const pagesToFetch = [BASE_URL];
    for (let i = 2; i <= 20; i++) {
      pagesToFetch.push(`${BASE_URL}index_${i}.html`);
    }

    for (const pageUrl of pagesToFetch) {
      try {
        const res = await fetch(pageUrl, {
          headers: { 'User-Agent': 'Crescendo-Bot/1.0', 'Accept': 'text/html' },
        });
        if (!res.ok) continue;
        const html = await res.text();
        const blocks = parseAllEventBlocks(html, pageUrl);
        for (const [title, data] of blocks) {
          titleMap.set(title, data.detailUrl);
        }
      } catch { /* skip */ }
    }

    for (const row of rows.results) {
      try {
        // Determine detail URL
        let detailUrl = '';
        if (row.source_url?.match(/\/event\/\d+\.html$/)) {
          detailUrl = row.source_url;
        } else {
          // Look up from listing page
          let match = titleMap.get(row.title);
          if (!match) {
            const prefix = row.title.slice(0, 30);
            for (const [title, url] of titleMap) {
              if (title.startsWith(prefix)) {
                match = url;
                break;
              }
            }
          }
          if (match) detailUrl = match;
        }

        if (!detailUrl) {
          // Mark as verified so it won't be re-queried
          await env.DB.prepare(
            `UPDATE concerts SET pricing_json = '[{"label":"無料","amount":0}]', updated_at = datetime('now') WHERE slug = ?`
          ).bind(row.slug).run();
          continue;
        }

        // Fetch detail page
        const detailRes = await fetch(detailUrl, {
          headers: { 'User-Agent': 'Crescendo-Bot/1.0', 'Accept': 'text/html' },
        });
        if (!detailRes.ok) continue;

        const detailHtml = await detailRes.text();
        const sections = parseDetailSections(detailHtml);

        // Parse pricing
        const pricingSection = sections['入場料'] || sections['料金'] || sections['チケット'] || '';
        if (!pricingSection) {
          // No pricing section found - mark as verified free
          await env.DB.prepare(
            `UPDATE concerts SET pricing_json = '[{"label":"無料","amount":0}]', updated_at = datetime('now') WHERE slug = ?`
          ).bind(row.slug).run();
          continue;
        }

        const pricing = parsePricingFromText(pricingSection);
        if (pricing.length === 0) {
          await env.DB.prepare(
            `UPDATE concerts SET pricing_json = '[{"label":"無料","amount":0}]', updated_at = datetime('now') WHERE slug = ?`
          ).bind(row.slug).run();
          continue;
        }

        const newPricingJson = JSON.stringify(pricing);
        const currentDefault = '[{"label":"入場料","amount":0}]';
        if (newPricingJson === currentDefault) {
          // Confirmed free - update label to distinguish from unverified default
          await env.DB.prepare(
            `UPDATE concerts SET pricing_json = '[{"label":"無料","amount":0}]', updated_at = datetime('now') WHERE slug = ?`
          ).bind(row.slug).run();
          continue;
        }

        // Also extract ticket URL
        let ticketUrl = '';
        const urlMatch = pricingSection.match(/https?:\/\/[^\s）)]+/);
        if (urlMatch) ticketUrl = urlMatch[0];

        // Update pricing
        if (ticketUrl) {
          await env.DB.prepare(
            `UPDATE concerts SET pricing_json = ?, ticket_url = ?, updated_at = datetime('now') WHERE slug = ?`
          ).bind(newPricingJson, ticketUrl, row.slug).run();
        } else {
          await env.DB.prepare(
            `UPDATE concerts SET pricing_json = ?, updated_at = datetime('now') WHERE slug = ?`
          ).bind(newPricingJson, row.slug).run();
        }
        updated++;
      } catch { /* skip individual errors */ }
    }

    const details = `${rows.results.length} 件中 ${updated} 件の料金情報を更新しました`;
    await env.DB.prepare(
      "INSERT INTO maintenance_log (task, result, details) VALUES ('fix_pricing', 'success', ?)"
    ).bind(details).run();
    return { task: 'fix_pricing', success: true, details };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { task: 'fix_pricing', success: false, details: msg };
  }
}

// ============================================================
// Task 8: 誤った画像データをクリアして再取得可能にする
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

// ============================================================
// Task 9: 重複演奏会の検出・統合
// 同じ日付＋同じタイトル（先頭20文字正規化一致）の演奏会を検出し、
// 古い方を論理削除する
// ============================================================
async function deduplicateConcerts(env: Env): Promise<TaskResult> {
  try {
    // Get all non-deleted concerts with their normalized title prefix
    const all = await env.DB.prepare(
      "SELECT id, slug, title, date, venue_json, created_at, views, flyer_r2_keys, flyer_thumbnail_key FROM concerts WHERE is_deleted = 0 ORDER BY date, title"
    ).all<{
      id: string; slug: string; title: string; date: string;
      venue_json: string; created_at: string; views: number;
      flyer_r2_keys: string; flyer_thumbnail_key: string;
    }>();

    if (!all.results || all.results.length === 0) {
      return { task: 'deduplicate', success: true, details: '演奏会なし' };
    }

    // Group by date + normalized title prefix (20 chars)
    const groups = new Map<string, typeof all.results>();
    for (const c of all.results) {
      const normTitle = c.title.normalize('NFKC').replace(/\s+/g, '').toLowerCase().slice(0, 20);
      const key = `${c.date}|${normTitle}`;
      const group = groups.get(key) || [];
      group.push(c);
      groups.set(key, group);
    }

    let merged = 0;
    for (const [, group] of groups) {
      if (group.length <= 1) continue;

      // Keep the one with more views, or more flyer data, or newer
      group.sort((a, b) => {
        // Prefer the one with a thumbnail
        const aHasThumb = a.flyer_thumbnail_key ? 1 : 0;
        const bHasThumb = b.flyer_thumbnail_key ? 1 : 0;
        if (aHasThumb !== bHasThumb) return bHasThumb - aHasThumb;
        // Then prefer more views
        if (a.views !== b.views) return b.views - a.views;
        // Then prefer newer
        return b.created_at.localeCompare(a.created_at);
      });

      // Keep first (best), merge data and soft-delete the rest
      const winner = group[0];
      for (let i = 1; i < group.length; i++) {
        const loser = group[i];

        // Merge views to winner
        if (loser.views > 0) {
          await env.DB.prepare(
            "UPDATE concerts SET views = views + ? WHERE id = ?"
          ).bind(loser.views, winner.id).run();
        }

        // Transfer flyer_r2_keys (merge unique keys)
        const winnerKeys: string[] = JSON.parse(winner.flyer_r2_keys || '[]');
        const loserKeys: string[] = JSON.parse(loser.flyer_r2_keys || '[]');
        const mergedKeys = [...new Set([...winnerKeys, ...loserKeys])];
        if (mergedKeys.length > winnerKeys.length) {
          await env.DB.prepare(
            "UPDATE concerts SET flyer_r2_keys = ? WHERE id = ?"
          ).bind(JSON.stringify(mergedKeys), winner.id).run();
          winner.flyer_r2_keys = JSON.stringify(mergedKeys);
        }

        // Transfer thumbnail if winner lacks one
        if (!winner.flyer_thumbnail_key && loser.flyer_thumbnail_key) {
          await env.DB.prepare(
            "UPDATE concerts SET flyer_thumbnail_key = ? WHERE id = ?"
          ).bind(loser.flyer_thumbnail_key, winner.id).run();
          winner.flyer_thumbnail_key = loser.flyer_thumbnail_key;
        }

        // Record slug redirect
        try {
          await env.DB.prepare(
            "INSERT OR IGNORE INTO slug_redirects (old_slug, new_slug) VALUES (?, ?)"
          ).bind(loser.slug, winner.slug).run();
        } catch { /* table may not exist yet */ }

        // Soft-delete the loser
        await env.DB.prepare(
          "UPDATE concerts SET is_deleted = 1, deleted_at = datetime('now') WHERE id = ?"
        ).bind(loser.id).run();
        merged++;
      }
    }

    return {
      task: 'deduplicate',
      success: true,
      details: `${merged}件の重複を検出・統合`,
    };
  } catch (err: unknown) {
    return { task: 'deduplicate', success: false, details: err instanceof Error ? err.message : String(err) };
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
      results.push(await deduplicateConcerts(env));
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
        case 'fix_pricing':
          results = [await fixPricing(env)];
          break;
        case 'clear_images':
          results = [await clearWrongImages(env)];
          break;
        case 'deduplicate':
          results = [await deduplicateConcerts(env)];
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
