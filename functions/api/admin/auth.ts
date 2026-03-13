// Cloudflare Pages Functions — Admin Auth + Stats + Maintenance
// Route: /api/admin/auth (POST), /api/admin/stats (GET), /api/admin/maintenance (GET)

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ADMIN_PASSWORD: string;
  CONTACT_ENCRYPTION_KEY: string;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

async function generateToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode('ken-gei-admin-session'));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function isAdmin(request: Request, env: Env): Promise<boolean> {
  const token = request.headers.get('X-Admin-Token');
  if (!token || !env.ADMIN_PASSWORD) return false;
  const expected = await generateToken(env.ADMIN_PASSWORD);
  return token === expected;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Token',
      },
    });
  }

  // POST /api/admin/auth
  if (request.method === 'POST' && path.endsWith('/auth')) {
    const body = await request.json() as { password: string };
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Rate limit check
    const rl = await env.DB.prepare(
      'SELECT attempts, last_attempt FROM rate_limits WHERE ip = ? AND endpoint = ?'
    ).bind(ip, 'admin_auth').first<{ attempts: number; last_attempt: string }>();

    if (rl) {
      const lastAttempt = new Date(rl.last_attempt + 'Z');
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (lastAttempt > fifteenMinAgo && rl.attempts >= 5) {
        return jsonResponse({ ok: false, error: 'ログイン試行回数の上限に達しました。15分後に再試行してください。' }, 429);
      }
      if (lastAttempt < fifteenMinAgo) {
        await env.DB.prepare('DELETE FROM rate_limits WHERE ip = ? AND endpoint = ?').bind(ip, 'admin_auth').run();
      }
    }

    if (!body.password || body.password !== env.ADMIN_PASSWORD) {
      await env.DB.prepare(`
        INSERT INTO rate_limits (ip, endpoint, attempts, last_attempt)
        VALUES (?, 'admin_auth', 1, datetime('now'))
        ON CONFLICT(ip, endpoint) DO UPDATE SET
          attempts = attempts + 1, last_attempt = datetime('now')
      `).bind(ip).run();
      return jsonResponse({ ok: false, error: 'パスワードが違います' }, 401);
    }

    // Clear rate limit on success
    await env.DB.prepare('DELETE FROM rate_limits WHERE ip = ? AND endpoint = ?').bind(ip, 'admin_auth').run();
    const token = await generateToken(env.ADMIN_PASSWORD);
    return jsonResponse({ ok: true, data: { token } });
  }

  // All routes below require admin
  if (!(await isAdmin(request, env))) {
    return jsonResponse({ ok: false, error: '管理者権限が必要です' }, 403);
  }

  // NOTE: /api/admin/stats  → functions/api/admin/stats.ts
  //       /api/admin/maintenance → functions/api/admin/maintenance.ts
  // Cloudflare Pages Functions の仕様上、このファイル (auth.ts) は
  // /api/admin/auth にのみルーティングされるため、stats/maintenance は
  // 専用ファイルで処理する。

  return jsonResponse({ ok: false, error: 'Not Found' }, 404);
};
