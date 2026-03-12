// Cloudflare Pages Functions — Short URL Resolver
// Route: POST /api/resolve-url
// Resolves maps.app.goo.gl short URLs to full Google Maps URLs

interface Env {
  DB: D1Database;
}

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

    // Only allow Google Maps short URLs
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return jsonResponse({ ok: false, error: 'Invalid URL' }, 400);
    }

    const allowedHosts = ['maps.app.goo.gl', 'goo.gl', 'g.co'];
    if (!allowedHosts.includes(parsed.hostname)) {
      return jsonResponse({ ok: false, error: 'Only Google Maps short URLs are supported' }, 400);
    }

    // Follow the redirect chain (max 5 hops)
    let currentUrl = url;
    for (let i = 0; i < 5; i++) {
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
        // Return whatever we have
        break;
      }

      currentUrl = location;

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
