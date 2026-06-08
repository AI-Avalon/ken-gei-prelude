// Cloudflare Pages Function — per-concert HTML metadata for social previews.
// Route: GET /concerts/:slug

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

interface ConcertMetaRow {
  title: string;
  subtitle: string;
  description: string;
  date: string;
  time_start: string;
  venue_json: string;
  flyer_thumbnail_key: string;
  flyer_r2_keys: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

function pickImageKey(row: ConcertMetaRow): string {
  if (row.flyer_thumbnail_key && !row.flyer_thumbnail_key.endsWith('.pdf')) {
    return row.flyer_thumbnail_key;
  }
  const keys = safeJsonParse<string[]>(row.flyer_r2_keys, []);
  return keys.find((key) => !key.endsWith('.pdf') && key.includes('_thumb.'))
    || keys.find((key) => !key.endsWith('.pdf'))
    || '';
}

function encodeImageKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

function formatDescription(row: ConcertMetaRow): string {
  const venue = safeJsonParse<{ name?: string }>(row.venue_json, {});
  const parts = [
    `${row.date}${row.time_start ? ` ${row.time_start}開演` : ''}`,
    venue.name,
    row.subtitle,
    '愛知県立芸術大学の演奏会情報',
  ].filter(Boolean);
  return parts.join(' / ').replace(/\s+/g, ' ').slice(0, 120);
}

function injectMeta(html: string, meta: Record<string, string>): string {
  const tags = Object.entries(meta)
    .filter(([key]) => key !== 'title')
    .map(([key, value]) => {
      const escaped = escapeHtml(value);
      if (key.startsWith('og:')) return `<meta property="${key}" content="${escaped}" />`;
      if (key.startsWith('twitter:')) return `<meta name="${key}" content="${escaped}" />`;
      if (key === 'canonical') return `<link rel="canonical" href="${escaped}" />`;
      return `<meta name="${key}" content="${escaped}" />`;
    })
    .join('\n    ');

  return html
    .replace(/<title>.*?<\/title>/is, `<title>${escapeHtml(meta.title)}</title>`)
    .replace(/<meta\s+(?:name|property)="(?:description|og:title|og:description|og:type|og:url|og:site_name|og:image|og:image:secure_url|og:image:type|og:image:width|og:image:height|og:image:alt|og:locale|twitter:card|twitter:title|twitter:description|twitter:image|twitter:image:alt)"[^>]*>\s*/gi, '')
    .replace('</head>', `    ${tags}\n  </head>`);
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  const slug = String(params.slug || '');
  const indexUrl = new URL('/index.html', request.url);
  const assetResponse = await env.ASSETS.fetch(indexUrl.toString());
  let html = await assetResponse.text();
  if (!html.trim()) {
    const rootResponse = await env.ASSETS.fetch(new URL('/', request.url).toString());
    html = await rootResponse.text();
  }

  const row = await env.DB.prepare(`
    SELECT title, subtitle, description, date, time_start, venue_json, flyer_thumbnail_key, flyer_r2_keys
    FROM concerts
    WHERE slug = ? AND is_deleted = 0 AND is_published = 1
  `).bind(slug).first<ConcertMetaRow>();

  if (!row) {
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    });
  }

  const url = new URL(request.url);
  const canonicalUrl = `${url.origin}/concerts/${slug}`;
  const imageKey = pickImageKey(row);
  const imageUrl = imageKey ? `${url.origin}/api/image/${encodeImageKey(imageKey)}` : `${url.origin}/icon-512.png`;
  const description = formatDescription(row) || '愛知県立芸術大学の演奏会情報';
  const title = `${row.title} | Crescendo`;

  const nextHtml = injectMeta(html, {
    title,
    description,
    canonical: canonicalUrl,
    'og:title': title,
    'og:description': description,
    'og:type': 'article',
    'og:url': canonicalUrl,
    'og:site_name': 'Crescendo',
    'og:image': imageUrl,
    'og:image:secure_url': imageUrl,
    'og:image:width': imageKey ? '1200' : '512',
    'og:image:height': imageKey ? '1600' : '512',
    'og:image:alt': `${row.title} チラシ`,
    'og:locale': 'ja_JP',
    'twitter:card': imageKey ? 'summary_large_image' : 'summary',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': imageUrl,
    'twitter:image:alt': `${row.title} チラシ`,
  });

  return new Response(nextHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
