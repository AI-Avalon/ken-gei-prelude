// Cloudflare Pages Functions — Admin Auth + Stats + Maintenance
// Route: /api/admin/auth (POST), /api/admin/stats (GET), /api/admin/maintenance (GET)

interface Env {
  DB: D1Database;
  R2: R2Bucket;
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

  // GET /api/admin/stats
  if (request.method === 'GET' && path.endsWith('/stats')) {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0, 7) + '-01';

    const [total, upcoming, past, totalViews, monthViews, unpublished, recentInquiries] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) as c FROM concerts WHERE is_deleted = 0').first<{ c: number }>(),
      env.DB.prepare('SELECT COUNT(*) as c FROM concerts WHERE date >= ? AND is_deleted = 0 AND is_published = 1').bind(today).first<{ c: number }>(),
      env.DB.prepare('SELECT COUNT(*) as c FROM concerts WHERE date < ? AND is_deleted = 0 AND is_published = 1').bind(today).first<{ c: number }>(),
      env.DB.prepare('SELECT COALESCE(SUM(views), 0) as c FROM concerts WHERE is_deleted = 0').first<{ c: number }>(),
      env.DB.prepare('SELECT COUNT(*) as c FROM analytics WHERE viewed_at >= ?').bind(monthStart).first<{ c: number }>(),
      env.DB.prepare('SELECT COUNT(*) as c FROM concerts WHERE is_published = 0 AND is_deleted = 0').first<{ c: number }>(),
      env.DB.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status = 'unread'").first<{ c: number }>(),
    ]);

    // Category distribution
    const catResults = await env.DB.prepare(
      'SELECT category, COUNT(*) as c FROM concerts WHERE is_deleted = 0 GROUP BY category'
    ).all();
    const byCategory: Record<string, number> = {};
    for (const r of catResults.results || []) {
      byCategory[r.category as string] = r.c as number;
    }

    // Top 10 by views
    const topResults = await env.DB.prepare(
      'SELECT slug, title, views FROM concerts WHERE is_deleted = 0 ORDER BY views DESC LIMIT 10'
    ).all();

    // Daily views (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dailyResults = await env.DB.prepare(
      "SELECT DATE(viewed_at) as date, COUNT(*) as count FROM analytics WHERE viewed_at >= ? GROUP BY DATE(viewed_at) ORDER BY date"
    ).bind(thirtyDaysAgo).all();

    return jsonResponse({
      ok: true,
      data: {
        total: total?.c || 0,
        upcoming: upcoming?.c || 0,
        past: past?.c || 0,
        totalViews: totalViews?.c || 0,
        monthViews: monthViews?.c || 0,
        unpublished: unpublished?.c || 0,
        recentInquiries: recentInquiries?.c || 0,
        byCategory,
        topConcerts: topResults.results || [],
        dailyViews: dailyResults.results || [],
      },
    });
  }

  // GET /api/admin/maintenance
  if (request.method === 'GET' && path.endsWith('/maintenance')) {
    const results = await env.DB.prepare(
      'SELECT * FROM maintenance_log ORDER BY executed_at DESC LIMIT 100'
    ).all();
    return jsonResponse({ ok: true, data: results.results || [] });
  }

  return jsonResponse({ ok: false, error: 'Not Found' }, 404);
};
