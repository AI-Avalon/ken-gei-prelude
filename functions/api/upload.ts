// Cloudflare Pages Functions — Flyer Upload
// Route: POST /api/upload

interface Env {
  DB: D1Database;
  R2: R2Bucket;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    // Rate limit: max 10 uploads per hour per IP
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const thumbnail = formData.get('thumbnail') as File | null;
    const concertSlug = formData.get('concert_slug') as string | null;

    if (!file) {
      return jsonResponse({ ok: false, error: 'ファイルが見つかりません' }, 400);
    }

    // Validate type
    const allowedTypes = ['image/webp', 'image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return jsonResponse({ ok: false, error: '対応していないファイル形式です。JPEG、PNG、WebPをアップロードしてください' }, 400);
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return jsonResponse({ ok: false, error: 'ファイルサイズが5MBを超えています' }, 400);
    }

    const timestamp = Date.now();
    const slug = concertSlug || 'unattached';
    const key = `flyers/${slug}/${timestamp}.webp`;
    const thumbnailKey = `flyers/${slug}/${timestamp}_thumb.webp`;

    // Upload main image
    await env.R2.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: 'image/webp' },
    });

    // Upload thumbnail if provided
    if (thumbnail) {
      await env.R2.put(thumbnailKey, await thumbnail.arrayBuffer(), {
        httpMetadata: { contentType: 'image/webp' },
      });
    }

    // Update concert record if slug provided
    if (concertSlug) {
      const row = await env.DB.prepare(
        'SELECT flyer_r2_keys FROM concerts WHERE slug = ?'
      ).bind(concertSlug).first<{ flyer_r2_keys: string }>();

      if (row) {
        const existingKeys = JSON.parse(row.flyer_r2_keys || '[]') as string[];
        existingKeys.push(key);
        await env.DB.prepare(
          "UPDATE concerts SET flyer_r2_keys = ?, flyer_thumbnail_key = ?, updated_at = datetime('now') WHERE slug = ?"
        ).bind(JSON.stringify(existingKeys), thumbnailKey, concertSlug).run();
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
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
