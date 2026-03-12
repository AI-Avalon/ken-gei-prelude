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

// Run all maintenance tasks
async function runMaintenance(env: Env): Promise<TaskResult[]> {
  const results: TaskResult[] = [];

  results.push(await cleanOldAnalytics(env));
  results.push(await purgeDeletedConcerts(env));
  results.push(await cleanRateLimits(env));
  results.push(await cleanOldLogs(env));

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
