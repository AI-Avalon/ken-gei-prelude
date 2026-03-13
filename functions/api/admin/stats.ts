// Cloudflare Pages Functions — Admin Stats
// Route: GET /api/admin/stats

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ADMIN_PASSWORD: string;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
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

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Token',
    },
  });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!(await isAdmin(request, env))) {
    return jsonResponse({ ok: false, error: '管理者権限が必要です' }, 403);
  }

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

  // カテゴリ別分布
  const catResults = await env.DB.prepare(
    'SELECT category, COUNT(*) as c FROM concerts WHERE is_deleted = 0 GROUP BY category'
  ).all();
  const byCategory: Record<string, number> = {};
  for (const r of catResults.results || []) {
    byCategory[r.category as string] = r.c as number;
  }

  // 閲覧数上位10件
  const topResults = await env.DB.prepare(
    'SELECT slug, title, views FROM concerts WHERE is_deleted = 0 ORDER BY views DESC LIMIT 10'
  ).all();

  // 過去30日の日別閲覧数
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
};
