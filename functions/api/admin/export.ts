// Cloudflare Pages Functions — Admin Data Export
// Route: GET /api/admin/export

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD: string;
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
    return new Response(JSON.stringify({ ok: false, error: '認証が必要です' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Export all tables
    const concerts = await env.DB.prepare('SELECT * FROM concerts ORDER BY date DESC').all();
    const analytics = await env.DB.prepare('SELECT * FROM analytics ORDER BY viewed_at DESC LIMIT 10000').all();
    const inquiries = await env.DB.prepare('SELECT id, subject, message, status, admin_note, concert_id, created_at FROM inquiries ORDER BY created_at DESC').all();
    const logs = await env.DB.prepare('SELECT * FROM maintenance_log ORDER BY executed_at DESC LIMIT 500').all();

    const exportData = {
      exported_at: new Date().toISOString(),
      concerts: concerts.results || [],
      analytics: analytics.results || [],
      inquiries: inquiries.results || [],
      maintenance_log: logs.results || [],
    };

    const json = JSON.stringify(exportData, null, 2);
    const timestamp = new Date().toISOString().slice(0, 10);

    return new Response(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="crescendo-export-${timestamp}.json"`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
