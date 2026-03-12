// Crescendo — Cron Worker
// Standalone Worker for Cloudflare Cron Triggers
// Deploy separately: npx wrangler deploy workers/cron.ts --name ken-gei-prelude-cron -c workers/wrangler.toml
//
// Cron Schedule (Chapter 13):
//   0 21 * * *     JST 06:00 — 大学サイトスクレイピング
//   0 18 1 * *     JST 03:00 — 月次メンテナンス（ログ削除・物理削除・レート制限クリア）
//   0 19 1 * *     JST 04:00 — バックアップ（将来実装）

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  CRON_SECRET: string;
  SITE_URL: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const cron = event.cron;

    switch (cron) {
      // 毎朝6:00 JST — スクレイピング
      case '0 21 * * *':
        ctx.waitUntil(runScrapeViaApi(env));
        break;

      // 毎月1日 3:00 JST — メンテナンス
      case '0 18 1 * *':
        ctx.waitUntil(runMaintenanceViaApi(env));
        break;

      // 毎月1日 4:00 JST — バックアップ（将来実装）
      case '0 19 1 * *':
        ctx.waitUntil(logTask(env, 'backup', 'skipped', 'バックアップは将来実装予定'));
        break;

      default:
        ctx.waitUntil(logTask(env, 'unknown_cron', 'error', `Unknown cron: ${cron}`));
    }
  },
};

// Call the scrape API endpoint
async function runScrapeViaApi(env: Env): Promise<void> {
  try {
    const siteUrl = env.SITE_URL || 'https://ken-gei-prelude.pages.dev';
    const res = await fetch(`${siteUrl}/api/cron/scrape`, {
      method: 'POST',
      headers: {
        'X-Cron-Secret': env.CRON_SECRET,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      await logTask(env, 'cron_scrape', 'error', `API error: ${res.status} ${text}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await logTask(env, 'cron_scrape', 'error', msg);
  }
}

// Call the maintenance API endpoint
async function runMaintenanceViaApi(env: Env): Promise<void> {
  try {
    const siteUrl = env.SITE_URL || 'https://ken-gei-prelude.pages.dev';
    const res = await fetch(`${siteUrl}/api/cron/maintenance`, {
      method: 'POST',
      headers: {
        'X-Cron-Secret': env.CRON_SECRET,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      await logTask(env, 'cron_maintenance', 'error', `API error: ${res.status} ${text}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await logTask(env, 'cron_maintenance', 'error', msg);
  }
}

async function logTask(env: Env, task: string, result: string, details: string): Promise<void> {
  try {
    await env.DB.prepare(
      "INSERT INTO maintenance_log (task, result, details) VALUES (?, ?, ?)"
    ).bind(task, result, details).run();
  } catch {
    // If DB logging fails, nothing we can do
  }
}
