// Cloudflare Pages Functions — Short URL Resolver
// Route: POST /api/resolve-url
// Resolves maps.app.goo.gl short URLs to full Google Maps URLs with strict SSRF protection

interface Env {
  DB: D1Database;
}

const ALLOWED_REDIRECT_HOSTS = new Set([
  'maps.app.goo.gl',
  'goo.gl',
  'g.co',
  'www.google.com',
  'www.google.co.jp',
  'google.com',
  'google.co.jp',
  'maps.google.com',
  'maps.google.co.jp',
]);

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request } = context;

  try {
    const body = await request.json() as { url?: string };
    const url = body.url?.trim();

    if (!url) {
      return jsonResponse({ ok: false, error: 'URL is required' }, 400);
    }

    // Only allow Google Maps short URLs (HTTPS only)
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return jsonResponse({ ok: false, error: 'Invalid URL' }, 400);
    }

    const allowedInitialHosts = ['maps.app.goo.gl', 'goo.gl', 'g.co'];
    if (parsed.protocol !== 'https:' || !allowedInitialHosts.includes(parsed.hostname)) {
      return jsonResponse({ ok: false, error: 'Only HTTPS Google Maps short URLs are supported' }, 400);
    }

    // Follow the redirect chain (max 5 hops) with SSRF allowlist on every hop
    let currentUrl = url;
    for (let i = 0; i < 5; i++) {
      const hopParsed = new URL(currentUrl);
      if (hopParsed.protocol !== 'https:' || !ALLOWED_REDIRECT_HOSTS.has(hopParsed.hostname)) {
        break;
      }

      const resp = await fetch(currentUrl, { redirect: 'manual' });
      const location = resp.headers.get('Location');

      if (!location) {
        // No more redirects — read HTML for meta refresh or og:url
        const html = await resp.text();
        const metaMatch = html.match(/content="0;url=([^"]+)"/i)
          || html.match(/property="og:url"\s+content="([^"]+)"/i)
          || html.match(/href="(https:\/\/www\.google\.[^"]*maps[^"]*)"/i);
        if (metaMatch) {
          currentUrl = metaMatch[1];
          break;
        }
        break;
      }

      currentUrl = new URL(location, currentUrl).href;

      // If we've reached a full Google Maps URL, stop
      if (currentUrl.includes('google.com/maps') || currentUrl.includes('google.co.jp/maps')) {
        break;
      }
    }

    return jsonResponse({ ok: true, data: { resolvedUrl: currentUrl } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to resolve URL';
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
