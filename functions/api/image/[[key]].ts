// Cloudflare Pages Functions — KV Image Serving with Cache API
// Route: GET /api/image/[[key]]
// Optimization: Use Cloudflare Cache API to minimize KV reads

interface Env {
  KV: KVNamespace;
}

async function handleImage(context: Parameters<PagesFunction<Env>>[0], includeBody: boolean): Promise<Response> {
  const { env, params, request } = context;
  const keyParts = (params.key as string[]) || [];
  const key = keyParts.join('/');

  if (!key) {
    return new Response('Not found', { status: 404 });
  }

  // Check edge cache first to avoid KV reads
  const cacheKey = new Request(request.url, request);
  const cache = caches.default;
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    if (includeBody) return cachedResponse;
    return new Response(null, {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers: cachedResponse.headers,
    });
  }

  // Cache miss — read from KV
  const result = await env.KV.getWithMetadata<{ contentType?: string }>(key, 'arrayBuffer');
  if (!result.value) {
    return new Response('Not found', { status: 404 });
  }

  // Determine content type from metadata, filename extension, or default
  let contentType = result.metadata?.contentType || '';
  if (!contentType) {
    if (key.endsWith('.png')) contentType = 'image/png';
    else if (key.endsWith('.jpg') || key.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (key.endsWith('.gif')) contentType = 'image/gif';
    else if (key.endsWith('.pdf')) contentType = 'application/pdf';
    else contentType = 'image/webp';
  }

  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Cache-Control', 'public, max-age=2592000'); // 30 days
  headers.set('Access-Control-Allow-Origin', '*');

  const response = new Response(includeBody ? result.value : null, { headers });

  // Store in edge cache for future requests
  if (includeBody) {
    context.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
}

export const onRequestGet: PagesFunction<Env> = (context) => handleImage(context, true);
export const onRequestHead: PagesFunction<Env> = (context) => handleImage(context, false);
