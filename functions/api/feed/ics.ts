// Cloudflare Pages Functions — ICS Calendar Feed
// Route: GET /api/feed/ics

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const categories = (url.searchParams.get('category') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  let where = 'WHERE is_published = 1 AND is_deleted = 0';
  const params: string[] = [];
  if (categories.length > 0) {
    where += ` AND category IN (${categories.map(() => '?').join(',')})`;
    params.push(...categories);
  }

  const statement = env.DB.prepare(`SELECT * FROM concerts ${where} ORDER BY date ASC`);
  const results = params.length > 0 ? await statement.bind(...params).all() : await statement.all();

  const events = (results.results || []).map((row) => {
    const startDate = (row.date as string).replace(/-/g, '');
    const startTime = (row.time_start as string).replace(':', '') + '00';
    let endTime: string;
    if (row.time_end) {
      endTime = (row.time_end as string).replace(':', '') + '00';
    } else {
      const [h, m] = (row.time_start as string).split(':').map(Number);
      const endH = (h + 2) % 24;
      endTime = `${String(endH).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
    }

    let venueName = '';
    try {
      const venue = JSON.parse(row.venue_json as string);
      venueName = venue.name || '';
    } catch { /* ignore */ }

    return [
      'BEGIN:VEVENT',
      `DTSTART;TZID=Asia/Tokyo:${startDate}T${startTime}`,
      `DTEND;TZID=Asia/Tokyo:${startDate}T${endTime}`,
      `SUMMARY:${escapeICS(row.title as string)}`,
      `LOCATION:${escapeICS(venueName)}`,
      `URL:https://ken-gei-prelude.pages.dev/concerts/${row.slug}`,
      `UID:${row.id}@ken-gei-prelude`,
      `DESCRIPTION:${escapeICS((row.subtitle as string) || (row.title as string))}`,
      'END:VEVENT',
    ].join('\r\n');
  });

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Crescendo//JP',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeICS(calendarName(categories))}`,
    'X-WR-TIMEZONE:Asia/Tokyo',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar;charset=utf-8',
      'Content-Disposition': 'attachment; filename="crescendo.ics"',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

const CATEGORY_LABELS: Record<string, string> = {
  teiki: '定期演奏会',
  major_teiki: '専攻定期',
  self_planned: '自主企画',
  sotsugyou: '卒業演奏会',
  gakui: '学位審査演奏会',
  recital: 'リサイタル',
  chamber: '室内楽',
  orchestra: 'オーケストラ',
  ensemble: 'アンサンブル',
  opera: 'オペラ',
  wind: '吹奏楽',
  vocal: '声楽',
  piano: 'ピアノ',
  daigaku: '大学主催',
  other: 'その他',
};

function calendarName(categories: string[]): string {
  if (categories.length === 0) return 'Crescendo 演奏会';
  const labels = categories.map((category) => CATEGORY_LABELS[category] || category);
  return `Crescendo ${labels.join('・')}`;
}

function escapeICS(text: string): string {
  return text.replace(/[\\;,\n]/g, (c) => {
    if (c === '\n') return '\\n';
    return '\\' + c;
  });
}
