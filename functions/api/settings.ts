// Cloudflare Pages Functions — Public Site Settings & Autonomous Sync Status (read-only)
// Route: /api/settings

interface Env {
  KV: KVNamespace;
  DB?: D1Database;
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
  location_restriction_radius_km: 3,
  location_restriction_lat: 35.1694718,
  location_restriction_lng: 137.0702776,
};

function normalizeSettings(settings: SiteSettings): SiteSettings {
  const legacyLat = Math.abs(settings.location_restriction_lat - 35.1789) < 0.00001;
  const legacyLng = Math.abs(settings.location_restriction_lng - 137.0506) < 0.00001;
  if (legacyLat && legacyLng) {
    return {
      ...settings,
      location_restriction_lat: DEFAULT_SETTINGS.location_restriction_lat,
      location_restriction_lng: DEFAULT_SETTINGS.location_restriction_lng,
    };
  }
  return settings;
}

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

  let settings: SiteSettings = { ...DEFAULT_SETTINGS };
  let lastSyncAt: string | null = null;
  try {
    const [raw, kvLastScrape] = await Promise.all([
      env.KV.get('settings:site'),
      env.KV.get('cron:last_scrape_at'),
    ]);
    if (raw) {
      settings = normalizeSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    }
    lastSyncAt = kvLastScrape;
  } catch { /* use defaults */ }

  if (!lastSyncAt && env.DB) {
    try {
      const logRow = await env.DB.prepare(
        "SELECT executed_at FROM maintenance_log WHERE task = 'scrape' ORDER BY executed_at DESC LIMIT 1"
      ).first<{ executed_at: string }>();
      if (logRow?.executed_at) {
        lastSyncAt = logRow.executed_at.includes('T')
          ? logRow.executed_at
          : `${logRow.executed_at.replace(' ', 'T')}Z`;
      }
    } catch { /* ignore */ }
  }

  return jsonResponse({
    ok: true,
    data: {
      location_restriction_enabled: settings.location_restriction_enabled,
      location_restriction_radius_km: settings.location_restriction_radius_km,
      location_restriction_lat: settings.location_restriction_lat,
      location_restriction_lng: settings.location_restriction_lng,
      last_sync_at: lastSyncAt || new Date().toISOString(),
      sync_status: 'healthy',
    },
  });
};
