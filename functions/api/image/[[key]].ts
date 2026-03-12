// Cloudflare Pages Functions — KV Image Serving
// Route: GET /api/image/[[key]]

interface Env {
  KV: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const keyParts = (params.key as string[]) || [];
  const key = keyParts.join('/');

  if (!key) {
    return new Response('Not found', { status: 404 });
  }

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
  headers.set('Cache-Control', 'public, max-age=604800');
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(result.value, { headers });
};
