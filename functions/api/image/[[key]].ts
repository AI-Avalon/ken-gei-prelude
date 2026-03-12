// Cloudflare Pages Functions — R2 Image Serving
// Route: GET /api/image/[[key]]

interface Env {
  R2: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const keyParts = (params.key as string[]) || [];
  const key = keyParts.join('/');

  if (!key) {
    return new Response('Not found', { status: 404 });
  }

  const object = await env.R2.get(key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'image/webp');
  headers.set('Cache-Control', 'public, max-age=604800');
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(object.body, { headers });
};
