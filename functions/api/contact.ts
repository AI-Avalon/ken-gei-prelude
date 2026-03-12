// Cloudflare Pages Functions — Contact Form
// Route: POST /api/contact

interface Env {
  DB: D1Database;
  CONTACT_ENCRYPTION_KEY: string;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

async function encrypt(text: string, keyHex: string): Promise<string> {
  const keyData = hexToBytes(keyHex.slice(0, 64));
  const key = await crypto.subtle.importKey('raw', keyData, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return bytesToHex(combined);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const body = await request.json() as {
    name: string;
    email: string;
    subject: string;
    message: string;
    concert_id?: string;
    honeypot?: string;
  };

  // Honeypot check
  if (body.honeypot) {
    return jsonResponse({ ok: true }); // Silently ignore spam
  }

  // Rate limit
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rl = await env.DB.prepare(
    'SELECT attempts, last_attempt FROM rate_limits WHERE ip = ? AND endpoint = ?'
  ).bind(ip, 'contact').first<{ attempts: number; last_attempt: string }>();

  if (rl) {
    const lastAttempt = new Date(rl.last_attempt + 'Z');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (lastAttempt > oneHourAgo && rl.attempts >= 5) {
      return jsonResponse({ ok: false, error: '送信回数の上限に達しました。1時間後に再試行してください。' }, 429);
    }
    if (lastAttempt < oneHourAgo) {
      await env.DB.prepare('DELETE FROM rate_limits WHERE ip = ? AND endpoint = ?').bind(ip, 'contact').run();
    }
  }

  // Validation
  if (!body.name || body.name.length < 1 || body.name.length > 50) {
    return jsonResponse({ ok: false, error: 'お名前は1〜50文字で入力してください' }, 400);
  }
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return jsonResponse({ ok: false, error: '有効なメールアドレスを入力してください' }, 400);
  }
  if (!body.subject) {
    return jsonResponse({ ok: false, error: '件名を選択してください' }, 400);
  }
  if (!body.message || body.message.length < 10 || body.message.length > 2000) {
    return jsonResponse({ ok: false, error: 'メッセージは10〜2000文字で入力してください' }, 400);
  }

  // Encrypt name and email
  const nameEncrypted = await encrypt(body.name, env.CONTACT_ENCRYPTION_KEY);
  const emailEncrypted = await encrypt(body.email, env.CONTACT_ENCRYPTION_KEY);

  await env.DB.prepare(`
    INSERT INTO inquiries (name_encrypted, email_encrypted, subject, message, concert_id, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    nameEncrypted,
    emailEncrypted,
    body.subject,
    body.message,
    body.concert_id || ''
  ).run();

  // Track rate limit
  await env.DB.prepare(`
    INSERT INTO rate_limits (ip, endpoint, attempts, last_attempt)
    VALUES (?, 'contact', 1, datetime('now'))
    ON CONFLICT(ip, endpoint) DO UPDATE SET
      attempts = attempts + 1, last_attempt = datetime('now')
  `).bind(ip).run();

  return jsonResponse({ ok: true });
};
