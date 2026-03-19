// Cloudflare Pages Functions — Admin Settings API
// Route: /api/admin/settings

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

const SETTINGS_KEY = 'settings:site';

interface SiteSettings {
  location_restriction_enabled: boolean;
  location_restriction_radius_km: number;
  location_restriction_lat: number;
  location_restriction_lng: number;
}

const DEFAULT_SETTINGS: SiteSettings = {
  location_restriction_enabled: false,
  location_restriction_radius_km: 5,
  // 愛知県立芸術大学 (Aichi Prefectural University of the Arts)
  // 愛知県長久手市岩作三ケ峯1-114
  location_restriction_lat: 35.1789,
  location_restriction_lng: 137.0506,
};

async function getSettings(kv: KVNamespace): Promise<SiteSettings> {
  const raw = await kv.get(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Token',
      },
    });
  }

  if (!(await isAdmin(request, env))) {
    return jsonResponse({ ok: false, error: '認証が必要です' }, 401);
  }

  if (method === 'GET') {
    const settings = await getSettings(env.KV);
    return jsonResponse({ ok: true, data: settings });
  }

  if (method === 'PUT') {
    const body = await request.json() as Partial<SiteSettings>;
    const current = await getSettings(env.KV);
    const updated: SiteSettings = {
      ...current,
      ...(body.location_restriction_enabled !== undefined && {
        location_restriction_enabled: Boolean(body.location_restriction_enabled),
      }),
      ...(body.location_restriction_radius_km !== undefined && {
        location_restriction_radius_km: Number(body.location_restriction_radius_km),
      }),
      ...(body.location_restriction_lat !== undefined && {
        location_restriction_lat: Number(body.location_restriction_lat),
      }),
      ...(body.location_restriction_lng !== undefined && {
        location_restriction_lng: Number(body.location_restriction_lng),
      }),
    };
    await env.KV.put(SETTINGS_KEY, JSON.stringify(updated));
    return jsonResponse({ ok: true, data: updated });
  }

  return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
};
