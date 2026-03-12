// Cloudflare Pages Functions — Inquiries (Admin)
// Route: GET /api/inquiries, PUT /api/inquiries/:id

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD: string;
  CONTACT_ENCRYPTION_KEY: string;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function isAdmin(request: Request, env: Env): boolean {
  const token = request.headers.get('X-Admin-Token');
  return !!token && token === env.ADMIN_PASSWORD;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

async function decrypt(encryptedHex: string, keyHex: string): Promise<string> {
  try {
    const keyData = hexToBytes(keyHex.slice(0, 64));
    const key = await crypto.subtle.importKey('raw', keyData, 'AES-GCM', false, ['decrypt']);
    const combined = hexToBytes(encryptedHex);
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(plaintext);
  } catch {
    return '[復号エラー]';
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Token',
      },
    });
  }

  if (!isAdmin(request, env)) {
    return jsonResponse({ ok: false, error: '管理者権限が必要です' }, 403);
  }

  const url = new URL(request.url);
  const pathParts = url.pathname.replace('/api/inquiries', '').split('/').filter(Boolean);

  // GET /api/inquiries
  if (request.method === 'GET' && pathParts.length === 0) {
    const results = await env.DB.prepare(
      'SELECT * FROM inquiries ORDER BY created_at DESC'
    ).all();

    const inquiries = await Promise.all(
      (results.results || []).map(async (row) => ({
        ...row,
        name: await decrypt(row.name_encrypted as string, env.CONTACT_ENCRYPTION_KEY),
        email: await decrypt(row.email_encrypted as string, env.CONTACT_ENCRYPTION_KEY),
      }))
    );

    return jsonResponse({ ok: true, data: inquiries });
  }

  // PUT /api/inquiries/:id
  if (request.method === 'PUT' && pathParts.length === 1) {
    const id = parseInt(pathParts[0]);
    const body = await request.json() as { status?: string; admin_note?: string };

    const sets: string[] = [];
    const vals: (string | number)[] = [];

    if (body.status) {
      sets.push('status = ?');
      vals.push(body.status);
    }
    if (body.admin_note !== undefined) {
      sets.push('admin_note = ?');
      vals.push(body.admin_note);
    }

    if (sets.length > 0) {
      vals.push(id);
      await env.DB.prepare(
        `UPDATE inquiries SET ${sets.join(', ')} WHERE id = ?`
      ).bind(...vals).run();
    }

    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: 'Not Found' }, 404);
};
