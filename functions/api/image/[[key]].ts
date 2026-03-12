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

  const object = await env.KV.get(key, 'arrayBuffer');
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', key.endsWith('.png') ? 'image/png' : key.endsWith('.jpg') || key.endsWith('.jpeg') ? 'image/jpeg' : key.endsWith('.gif') ? 'image/gif' : 'image/webp');
  headers.set('Cache-Control', 'public, max-age=604800');
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(object, { headers });
};
