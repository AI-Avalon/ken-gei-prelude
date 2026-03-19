// Cloudflare Pages Functions — Public Site Settings (read-only)
// Route: /api/settings

interface Env {
  KV: KVNamespace;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

interface SiteSettings {
  location_restriction_enabled: boolean;
  location_restriction_radius_km: number;
  location_restriction_lat: number;
  location_restriction_lng: number;
}

const DEFAULT_SETTINGS: SiteSettings = {
  location_restriction_enabled: false,
  location_restriction_radius_km: 50,
  location_restriction_lat: 35.1789,
  location_restriction_lng: 137.0506,
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'GET') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  const raw = await env.KV.get('settings:site');
  let settings: SiteSettings = { ...DEFAULT_SETTINGS };
  if (raw) {
    try {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch { /* use defaults */ }
  }

  // Only expose what the public needs (no admin-only fields)
  return jsonResponse({
    ok: true,
    data: {
      location_restriction_enabled: settings.location_restriction_enabled,
      location_restriction_radius_km: settings.location_restriction_radius_km,
      location_restriction_lat: settings.location_restriction_lat,
      location_restriction_lng: settings.location_restriction_lng,
    },
  });
};
