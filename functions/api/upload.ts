// Cloudflare Pages Functions — Flyer Upload
// Route: POST /api/upload

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ADMIN_PASSWORD: string;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

async function isAdmin(request: Request, env: Env): Promise<boolean> {
  const token = request.headers.get('X-Admin-Token');
  if (!token || !env.ADMIN_PASSWORD) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(env.ADMIN_PASSWORD), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode('ken-gei-admin-session'));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return token === expected;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const admin = await isAdmin(request, env);

    // Parse form data first (needed for batch_password check)
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const thumbnail = formData.get('thumbnail') as File | null;
    const concertSlug = formData.get('concert_slug') as string | null;

    // Rate limit: max 10 uploads per hour per IP (skip for admin or batch upload)
    const batchPassword = formData.get('batch_password') as string | null;
    const isBatch = batchPassword === 'auto_scrape_2026';
    if (!admin && !isBatch) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const rl = await env.DB.prepare(
        'SELECT attempts, last_attempt FROM rate_limits WHERE ip = ? AND endpoint = ?'
      ).bind(ip, 'upload').first<{ attempts: number; last_attempt: string }>();
      if (rl) {
        const lastAttempt = new Date(rl.last_attempt + 'Z');
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (lastAttempt > oneHourAgo && rl.attempts >= 10) {
          return jsonResponse({ ok: false, error: 'アップロード回数の上限に達しました。しばらく待ってから再試行してください。' }, 429);
        }
        if (lastAttempt < oneHourAgo) {
          await env.DB.prepare('DELETE FROM rate_limits WHERE ip = ? AND endpoint = ?').bind(ip, 'upload').run();
        }
      }
      await env.DB.prepare(`
        INSERT INTO rate_limits (ip, endpoint, attempts, last_attempt)
        VALUES (?, 'upload', 1, datetime('now'))
        ON CONFLICT(ip, endpoint) DO UPDATE SET attempts = attempts + 1, last_attempt = datetime('now')
      `).bind(ip).run();
    }

    if (!file) {
      return jsonResponse({ ok: false, error: 'ファイルが見つかりません' }, 400);
    }

    // Validate type
    const allowedTypes = ['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return jsonResponse({ ok: false, error: '対応していないファイル形式です。JPEG、PNG、WebP、PDFをアップロードしてください' }, 400);
    }

    // Validate size (10MB for PDF, 5MB for images)
    const maxSize = file.type === 'application/pdf' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return jsonResponse({ ok: false, error: `ファイルサイズが${maxSize / 1024 / 1024}MBを超えています` }, 400);
    }

    const timestamp = Date.now();
    const slug = concertSlug || 'unattached';
    const ext = file.type === 'application/pdf' ? 'pdf' : 'webp';
    const key = `flyers/${slug}/${timestamp}.${ext}`;
    const thumbnailKey = `flyers/${slug}/${timestamp}_thumb.webp`;

    await env.KV.put(key, await file.arrayBuffer(), {
      metadata: { contentType: file.type },
    });

    if (thumbnail) {
      await env.KV.put(thumbnailKey, await thumbnail.arrayBuffer(), {
        metadata: { contentType: thumbnail.type || 'image/webp' },
      });
    }

    // Update concert record if slug provided
    if (concertSlug) {
      const row = await env.DB.prepare(
        'SELECT flyer_r2_keys, flyer_thumbnail_key FROM concerts WHERE slug = ?'
      ).bind(concertSlug).first<{ flyer_r2_keys: string; flyer_thumbnail_key: string }>();

      if (row) {
        const existingKeys = JSON.parse(row.flyer_r2_keys || '[]') as string[];
        if (!existingKeys.includes(key)) {
          existingKeys.push(key);
        }
        const thumbToUse = row.flyer_thumbnail_key || thumbnailKey;
        await env.DB.prepare(
          "UPDATE concerts SET flyer_r2_keys = ?, flyer_thumbnail_key = ?, updated_at = datetime('now') WHERE slug = ?"
        ).bind(JSON.stringify(existingKeys), thumbToUse, concertSlug).run();
      }
    }

    return jsonResponse({
      ok: true,
      data: { key, thumbnail_key: thumbnailKey },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Upload failed';
    return jsonResponse({ ok: false, error: msg }, 500);
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Token',
    },
  });
};
