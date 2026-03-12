// Cloudflare Pages Functions — Concerts CRUD API
// Route: /api/concerts/[[path]]

import { nanoid } from 'nanoid';

interface Env {
  DB: D1Database;
  R2: R2Bucket;
  KV: KVNamespace;
  ADMIN_PASSWORD: string;
  CONTACT_ENCRYPTION_KEY: string;
}

interface ConcertRow {
  [key: string]: unknown;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function isAdmin(request: Request, env: Env): boolean {
  const token = request.headers.get('X-Admin-Token');
  if (!token || !env.ADMIN_PASSWORD) return false;
  return token === env.ADMIN_PASSWORD;
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function normalize(text: string): string {
  return text.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
}

async function generateFingerprint(date: string, venue: string, title: string): Promise<string> {
  const input = `${date}|${normalize(venue)}|${normalize(title).slice(0, 10)}`;
  return sha256(input);
}

function generateSlug(date: string, title: string, category?: string): string {
  const dateStr = date.replace(/-/g, '');
  let titlePart = title
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20)
    .replace(/-$/, '');

  if (!titlePart) {
    const map: Record<string, string> = {
      teiki: 'teiki-ensoukai', sotsugyou: 'sotsugyou-ensoukai',
      recital: 'recital', chamber: 'shitsunai-gaku', orchestra: 'orchestra',
      ensemble: 'ensemble', opera: 'opera', other: 'concert',
    };
    titlePart = (category && map[category]) || 'concert';
  }

  const suffix = nanoid(6);
  return `${dateStr}-${titlePart}-${suffix}`.slice(0, 60);
}

function safeParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try { return JSON.parse(json); }
  catch { return fallback; }
}

function parseConcertRow(row: ConcertRow) {
  return {
    ...row,
    venue: safeParse(row.venue_json as string, { name: '' }),
    departments: safeParse(row.departments_json as string, []),
    instruments: safeParse(row.instruments_json as string, []),
    tags: safeParse(row.tags_json as string, []),
    pricing: safeParse(row.pricing_json as string, []),
    program: safeParse(row.program_json as string, []),
    performers: safeParse(row.performers_json as string, []),
    supervisors: safeParse(row.supervisors_json as string, []),
    guest_artists: safeParse(row.guest_artists_json as string, []),
    flyer_r2_keys: safeParse(row.flyer_r2_keys as string, []),
  };
}

// Rate limiter check
async function checkRateLimit(db: D1Database, ip: string, endpoint: string, maxAttempts = 5): Promise<boolean> {
  const row = await db.prepare(
    'SELECT attempts, last_attempt FROM rate_limits WHERE ip = ? AND endpoint = ?'
  ).bind(ip, endpoint).first<{ attempts: number; last_attempt: string }>();

  if (!row) return true; // no record = allowed

  const lastAttempt = new Date(row.last_attempt + 'Z');
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

  if (lastAttempt < fifteenMinAgo) {
    // Reset after 15 min
    await db.prepare('DELETE FROM rate_limits WHERE ip = ? AND endpoint = ?').bind(ip, endpoint).run();
    return true;
  }

  return row.attempts < maxAttempts;
}

async function incrementRateLimit(db: D1Database, ip: string, endpoint: string) {
  await db.prepare(`
    INSERT INTO rate_limits (ip, endpoint, attempts, last_attempt)
    VALUES (?, ?, 1, datetime('now'))
    ON CONFLICT(ip, endpoint) DO UPDATE SET
      attempts = attempts + 1,
      last_attempt = datetime('now')
  `).bind(ip, endpoint).run();
}

async function clearRateLimit(db: D1Database, ip: string, endpoint: string) {
  await db.prepare('DELETE FROM rate_limits WHERE ip = ? AND endpoint = ?').bind(ip, endpoint).run();
}

// ──────────── GET /api/concerts ────────────
async function handleList(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const category = url.searchParams.get('category') || '';
  const sort = url.searchParams.get('sort') || 'date_desc';
  const search = url.searchParams.get('search') || '';
  const dateFrom = url.searchParams.get('dateFrom') || '';
  const dateTo = url.searchParams.get('dateTo') || '';
  const includeUnpublished = url.searchParams.get('includeUnpublished') === '1' && isAdmin(request, env);
  const includeDeleted = url.searchParams.get('includeDeleted') === '1' && isAdmin(request, env);

  let where = 'WHERE 1=1';
  const params: (string | number)[] = [];

  if (!includeDeleted) {
    where += ' AND is_deleted = 0';
  }
  if (!includeUnpublished) {
    where += ' AND is_published = 1';
  }
  if (category) {
    where += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    where += ' AND (title LIKE ? OR subtitle LIKE ? OR description LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (dateFrom) {
    where += ' AND date >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    where += ' AND date <= ?';
    params.push(dateTo);
  }

  let orderBy: string;
  switch (sort) {
    case 'date_asc': orderBy = 'ORDER BY date ASC, time_start ASC'; break;
    case 'views': orderBy = 'ORDER BY views DESC'; break;
    case 'title': orderBy = 'ORDER BY title ASC'; break;
    default: orderBy = 'ORDER BY date DESC, time_start DESC';
  }

  const offset = (page - 1) * limit;

  const countResult = await env.DB.prepare(`SELECT COUNT(*) as total FROM concerts ${where}`)
    .bind(...params).first<{ total: number }>();
  const total = countResult?.total || 0;

  const results = await env.DB.prepare(
    `SELECT * FROM concerts ${where} ${orderBy} LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  const concerts = (results.results || []).map((row) => {
    const parsed = parseConcertRow(row as ConcertRow);
    // Don't expose password hash to client
    const { edit_password_hash: _, ...safe } = parsed as Record<string, unknown>;
    return safe;
  });

  return jsonResponse({ ok: true, data: concerts, total });
}

// ──────────── GET /api/concerts/venues ────────────
async function handleVenues(env: Env): Promise<Response> {
  const results = await env.DB.prepare('SELECT * FROM venues ORDER BY name').all();
  return jsonResponse({ ok: true, data: results.results || [] });
}

// ──────────── GET /api/concerts/:slug ────────────
async function handleGet(slug: string, request: Request, env: Env): Promise<Response> {
  const row = await env.DB.prepare(
    'SELECT * FROM concerts WHERE slug = ? AND is_deleted = 0'
  ).bind(slug).first();

  if (!row) return jsonResponse({ ok: false, error: '演奏会が見つかりません' }, 404);

  // Increment view
  await env.DB.prepare('UPDATE concerts SET views = views + 1 WHERE slug = ?').bind(slug).run();
  await env.DB.prepare(
    "INSERT INTO analytics (concert_id, viewed_at, referrer, user_agent) VALUES (?, datetime('now'), ?, ?)"
  ).bind(
    (row as ConcertRow).id as string,
    request.headers.get('Referer') || '',
    (request.headers.get('User-Agent') || '').slice(0, 200)
  ).run();

  const parsed = parseConcertRow(row as ConcertRow);
  const { edit_password_hash: _, ...safe } = parsed as Record<string, unknown>;
  return jsonResponse({ ok: true, data: safe });
}

// ──────────── POST /api/concerts ────────────
async function handleCreate(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;

  const title = String(body.title || '').trim();
  const date = String(body.date || '').trim();
  const time_start = String(body.time_start || '').trim();
  const venueName = String((body.venue as Record<string, unknown>)?.name || body.venue_name || '').trim();
  const editPassword = String(body.edit_password || '').trim();

  if (!title || !date || !time_start || !editPassword) {
    return jsonResponse({ ok: false, error: 'タイトル、日付、開演時刻、編集用パスワードは必須です' }, 400);
  }
  if (editPassword.length < 4) {
    return jsonResponse({ ok: false, error: '編集用パスワードは4文字以上必要です' }, 400);
  }

  const fingerprint = await generateFingerprint(date, venueName, title);

  // Duplicate check
  const existing = await env.DB.prepare(
    'SELECT slug FROM concerts WHERE fingerprint = ? AND is_deleted = 0'
  ).bind(fingerprint).first();
  if (existing) {
    return jsonResponse({ ok: false, error: '同じ演奏会が既に登録されています' }, 409);
  }

  const id = nanoid(12);
  const category = String(body.category || 'other');
  let slug = generateSlug(date, title, category);

  // Slug collision check (max 3 retries)
  for (let i = 0; i < 3; i++) {
    const exists = await env.DB.prepare('SELECT 1 FROM concerts WHERE slug = ?').bind(slug).first();
    if (!exists) break;
    slug = generateSlug(date, title, category);
  }

  const editPasswordHash = await sha256(editPassword);

  const venueJson = JSON.stringify(body.venue || { name: venueName });
  const source = body.mode === 'quick' ? 'quick' : 'manual';

  await env.DB.prepare(`
    INSERT INTO concerts (
      id, slug, fingerprint, title, subtitle, description,
      date, time_open, time_start, time_end,
      venue_json, category, departments_json, instruments_json, tags_json,
      pricing_json, pricing_note, seating, ticket_url, ticket_note,
      program_json, performers_json, supervisors_json, guest_artists_json,
      contact_email, contact_tel, contact_person, contact_url,
      flyer_r2_keys, flyer_thumbnail_key,
      source, source_url, is_published,
      edit_password_hash, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?,
      ?, ?, 1,
      ?, datetime('now'), datetime('now')
    )
  `).bind(
    id, slug, fingerprint,
    title,
    String(body.subtitle || ''),
    String(body.description || ''),
    date,
    String(body.time_open || ''),
    time_start,
    String(body.time_end || ''),
    venueJson,
    category,
    JSON.stringify(body.departments || []),
    JSON.stringify(body.instruments || []),
    JSON.stringify(body.tags || []),
    JSON.stringify(body.pricing || [{ label: '入場料', amount: 0 }]),
    String(body.pricing_note || ''),
    String(body.seating || ''),
    String(body.ticket_url || ''),
    String(body.ticket_note || ''),
    JSON.stringify(body.program || []),
    JSON.stringify(body.performers || []),
    JSON.stringify(body.supervisors || []),
    JSON.stringify(body.guest_artists || []),
    String(body.contact_email || ''),
    String(body.contact_tel || ''),
    String(body.contact_person || ''),
    String(body.contact_url || ''),
    JSON.stringify(body.flyer_r2_keys || []),
    String(body.flyer_thumbnail_key || ''),
    source,
    String(body.source_url || ''),
    editPasswordHash
  ).run();

  // Save venue to master if new
  if (venueName) {
    const existingVenue = await env.DB.prepare('SELECT 1 FROM venues WHERE name = ?').bind(venueName).first();
    if (!existingVenue) {
      await env.DB.prepare(
        'INSERT OR IGNORE INTO venues (id, name, data_json) VALUES (?, ?, ?)'
      ).bind(nanoid(6), venueName, venueJson).run();
    }
  }

  return jsonResponse({ ok: true, data: { slug, id } }, 201);
}

// ──────────── POST /api/concerts/:slug/verify ────────────
async function handleVerify(slug: string, request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const endpoint = `edit:${slug}`;

  const allowed = await checkRateLimit(env.DB, ip, endpoint);
  if (!allowed) {
    return jsonResponse({ ok: false, error: 'パスワードの試行回数が上限に達しました。15分後に再試行してください。' }, 429);
  }

  const body = await request.json() as { password: string };
  const row = await env.DB.prepare(
    'SELECT edit_password_hash FROM concerts WHERE slug = ? AND is_deleted = 0'
  ).bind(slug).first<{ edit_password_hash: string }>();

  if (!row) return jsonResponse({ ok: false, error: '演奏会が見つかりません' }, 404);

  const hash = await sha256(body.password);
  if (hash !== row.edit_password_hash) {
    await incrementRateLimit(env.DB, ip, endpoint);
    return jsonResponse({ ok: false, error: 'パスワードが違います', data: { valid: false } }, 401);
  }

  await clearRateLimit(env.DB, ip, endpoint);
  return jsonResponse({ ok: true, data: { valid: true } });
}

// ──────────── PUT /api/concerts/:slug ────────────
async function handleUpdate(slug: string, request: Request, env: Env): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  const adminMode = isAdmin(request, env);

  if (!adminMode) {
    const editPassword = String(body.edit_password || '');
    if (!editPassword) return jsonResponse({ ok: false, error: 'パスワードが必要です' }, 401);

    const row = await env.DB.prepare(
      'SELECT edit_password_hash FROM concerts WHERE slug = ? AND is_deleted = 0'
    ).bind(slug).first<{ edit_password_hash: string }>();
    if (!row) return jsonResponse({ ok: false, error: '演奏会が見つかりません' }, 404);

    const hash = await sha256(editPassword);
    if (hash !== row.edit_password_hash) {
      return jsonResponse({ ok: false, error: 'パスワードが違います' }, 401);
    }
  }

  const sets: string[] = [];
  const vals: (string | number)[] = [];

  const fields: Record<string, string> = {
    title: 'title', subtitle: 'subtitle', description: 'description',
    date: 'date', time_open: 'time_open', time_start: 'time_start', time_end: 'time_end',
    category: 'category', pricing_note: 'pricing_note', seating: 'seating',
    ticket_url: 'ticket_url', ticket_note: 'ticket_note',
    contact_email: 'contact_email', contact_tel: 'contact_tel',
    contact_person: 'contact_person', contact_url: 'contact_url',
    source_url: 'source_url',
  };

  for (const [key, col] of Object.entries(fields)) {
    if (body[key] !== undefined) {
      sets.push(`${col} = ?`);
      vals.push(String(body[key]));
    }
  }

  const jsonFields: Record<string, string> = {
    venue: 'venue_json', departments: 'departments_json', instruments: 'instruments_json',
    tags: 'tags_json', pricing: 'pricing_json', program: 'program_json',
    performers: 'performers_json', supervisors: 'supervisors_json',
    guest_artists: 'guest_artists_json', flyer_r2_keys: 'flyer_r2_keys',
  };

  for (const [key, col] of Object.entries(jsonFields)) {
    if (body[key] !== undefined) {
      sets.push(`${col} = ?`);
      vals.push(JSON.stringify(body[key]));
    }
  }

  if (body.flyer_thumbnail_key !== undefined) {
    sets.push('flyer_thumbnail_key = ?');
    vals.push(String(body.flyer_thumbnail_key));
  }

  // Admin-only fields
  if (adminMode) {
    if (body.is_published !== undefined) {
      sets.push('is_published = ?');
      vals.push(Number(body.is_published));
    }
    if (body.is_featured !== undefined) {
      sets.push('is_featured = ?');
      vals.push(Number(body.is_featured));
    }
  }

  if (sets.length === 0) {
    return jsonResponse({ ok: false, error: '更新するフィールドがありません' }, 400);
  }

  sets.push("updated_at = datetime('now')");
  vals.push(slug);

  await env.DB.prepare(
    `UPDATE concerts SET ${sets.join(', ')} WHERE slug = ?`
  ).bind(...vals).run();

  return jsonResponse({ ok: true });
}

// ──────────── DELETE /api/concerts/:slug ────────────
async function handleDelete(slug: string, request: Request, env: Env): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  const adminMode = isAdmin(request, env);

  if (!adminMode) {
    const editPassword = String(body.edit_password || '');
    if (!editPassword) return jsonResponse({ ok: false, error: 'パスワードが必要です' }, 401);

    const row = await env.DB.prepare(
      'SELECT edit_password_hash FROM concerts WHERE slug = ? AND is_deleted = 0'
    ).bind(slug).first<{ edit_password_hash: string }>();
    if (!row) return jsonResponse({ ok: false, error: '演奏会が見つかりません' }, 404);

    const hash = await sha256(editPassword);
    if (hash !== row.edit_password_hash) {
      return jsonResponse({ ok: false, error: 'パスワードが違います' }, 401);
    }
  }

  // Logical delete
  await env.DB.prepare(
    "UPDATE concerts SET is_deleted = 1, deleted_at = datetime('now'), updated_at = datetime('now') WHERE slug = ?"
  ).bind(slug).run();

  return jsonResponse({ ok: true });
}

// ──────────── Same-day check ────────────
async function handleSameDayCheck(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  if (!date) return jsonResponse({ ok: true, data: [] });

  const results = await env.DB.prepare(
    'SELECT slug, title FROM concerts WHERE date = ? AND is_deleted = 0 AND is_published = 1'
  ).bind(date).all();

  return jsonResponse({ ok: true, data: results.results || [] });
}

// ──────────── Router ────────────
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Token',
      },
    });
  }

  const pathParts = (params.path as string[] | undefined) || [];
  const pathStr = pathParts.join('/');

  try {
    // GET /api/concerts/venues
    if (method === 'GET' && pathStr === 'venues') {
      return handleVenues(env);
    }

    // GET /api/concerts/same-day?date=...
    if (method === 'GET' && pathStr === 'same-day') {
      return handleSameDayCheck(request, env);
    }

    // POST /api/concerts/:slug/verify
    if (method === 'POST' && pathParts.length === 2 && pathParts[1] === 'verify') {
      return handleVerify(pathParts[0], request, env);
    }

    // GET /api/concerts (list)
    if (method === 'GET' && pathParts.length === 0) {
      return handleList(request, env);
    }

    // GET /api/concerts/:slug
    if (method === 'GET' && pathParts.length === 1) {
      return handleGet(pathParts[0], request, env);
    }

    // POST /api/concerts (create)
    if (method === 'POST' && pathParts.length === 0) {
      return handleCreate(request, env);
    }

    // PUT /api/concerts/:slug
    if (method === 'PUT' && pathParts.length === 1) {
      return handleUpdate(pathParts[0], request, env);
    }

    // DELETE /api/concerts/:slug
    if (method === 'DELETE' && pathParts.length === 1) {
      return handleDelete(pathParts[0], request, env);
    }

    return jsonResponse({ ok: false, error: 'Not Found' }, 404);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return jsonResponse({ ok: false, error: msg }, 500);
  }
};
