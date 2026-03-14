// Cloudflare Pages Functions — Admin Database Reset
// Route: POST /api/admin/reset

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

  // 1. Delete all concerts
  await env.DB.prepare('DELETE FROM concerts').run();
  deleted.push('concerts');

  // 2. Delete analytics
  await env.DB.prepare('DELETE FROM analytics').run();
  deleted.push('analytics');

  // 3. Delete slug redirects
  await env.DB.prepare('DELETE FROM slug_redirects').run();
  deleted.push('slug_redirects');

  // 4. Delete maintenance logs
  await env.DB.prepare('DELETE FROM maintenance_log').run();
  deleted.push('maintenance_log');

  // 5. Clear KV flyer images (list and delete all keys with 'flyers/' prefix)
  let kvDeleted = 0;
  let cursor: string | undefined;
  do {
    const list = await env.KV.list({ prefix: 'flyers/', cursor, limit: 1000 });
    for (const key of list.keys) {
      await env.KV.delete(key.name);
      kvDeleted++;
    }
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
  deleted.push(`KV flyers (${kvDeleted} keys)`);

  // Log the reset
  await env.DB.prepare(
    "INSERT INTO maintenance_log (task, result, details) VALUES ('admin_reset', 'success', ?)"
  ).bind(`Cleared: ${deleted.join(', ')}`).run();

  return jsonResponse({
    ok: true,
    data: { deleted, kvDeleted },
  });
};
