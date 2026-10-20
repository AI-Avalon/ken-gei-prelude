// Cloudflare Pages Functions — Musical Terms Dictionary API (D1 + Edge Cache)
// Route: /api/dictionary/[[path]]

interface Env {
  DB: D1Database;
  KV: KVNamespace;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Method Not Allowed' }),
      { status: 405, headers: CORS_HEADERS }
    );
  }

  const url = new URL(request.url);
  const pathSegments = Array.isArray(params.path)
    ? params.path
    : params.path
      ? [String(params.path)]
      : [];
  const slug = pathSegments[0]?.trim() || '';
  const category = url.searchParams.get('category')?.trim() || '';
  const query = url.searchParams.get('q')?.trim().toLowerCase() || '';

  try {
    if (slug) {
      const row = await env.DB.prepare(
        'SELECT * FROM musical_terms WHERE id = ? LIMIT 1'
      )
        .bind(slug)
        .first();

      if (!row) {
        return new Response(
          JSON.stringify({ ok: false, error: '指定された楽語が見つかりませんでした。' }),
          { status: 404, headers: CORS_HEADERS }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, data: row }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    let rows;
    if (category && query) {
      const likePattern = `%${query}%`;
      rows = await env.DB.prepare(
        'SELECT * FROM musical_terms WHERE category = ? AND (normalized_term LIKE ? OR reading_kana LIKE ? OR reading_hiragana LIKE ? OR short_meaning LIKE ?) ORDER BY term ASC LIMIT 500'
      )
        .bind(category, likePattern, likePattern, likePattern, likePattern)
        .all();
    } else if (category) {
      rows = await env.DB.prepare(
        'SELECT * FROM musical_terms WHERE category = ? ORDER BY term ASC LIMIT 500'
      )
        .bind(category)
        .all();
    } else if (query) {
      const likePattern = `%${query}%`;
      rows = await env.DB.prepare(
        'SELECT * FROM musical_terms WHERE normalized_term LIKE ? OR reading_kana LIKE ? OR reading_hiragana LIKE ? OR short_meaning LIKE ? ORDER BY term ASC LIMIT 500'
      )
        .bind(likePattern, likePattern, likePattern, likePattern)
        .all();
    } else {
      rows = await env.DB.prepare(
        'SELECT * FROM musical_terms ORDER BY term ASC LIMIT 600'
      ).all();
    }

    return new Response(
      JSON.stringify({ ok: true, data: rows.results || [] }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch {
    // Graceful fallback when D1 table has not yet been seeded in local preview
    return new Response(
      JSON.stringify({ ok: true, data: [], source: 'client-bundle-fallback' }),
      { status: 200, headers: CORS_HEADERS }
    );
  }
};
