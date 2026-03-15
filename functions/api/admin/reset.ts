// Cloudflare Pages Functions — Admin Database Reset
// Route: POST /api/admin/reset
//
// Strategy: DB tables are deleted instantly via batch().
// KV orphaned keys are NOT deleted here (too slow for Workers 30s limit).
// They become unreachable since no DB record references them.

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
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Token',
    },
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!(await isAdmin(request, env))) {
    return jsonResponse({ ok: false, error: '管理者権限が必要です' }, 403);
  }

  const deleted: string[] = [];

  // Delete all DB tables in a single batch (instant)
  await env.DB.batch([
    env.DB.prepare('DELETE FROM concerts'),
    env.DB.prepare('DELETE FROM analytics'),
    env.DB.prepare('DELETE FROM slug_redirects'),
    env.DB.prepare('DELETE FROM maintenance_log'),
  ]);
  deleted.push('concerts', 'analytics', 'slug_redirects', 'maintenance_log');

  // Log the reset
  await env.DB.prepare(
    "INSERT INTO maintenance_log (task, result, details) VALUES ('admin_reset', 'success', ?)"
  ).bind(`Cleared: ${deleted.join(', ')}. KV orphaned keys will be overwritten on next scrape.`).run();

  return jsonResponse({
    ok: true,
    data: { deleted, kvDeleted: 0 },
  });
};
