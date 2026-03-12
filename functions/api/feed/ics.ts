// Cloudflare Pages Functions — ICS Calendar Feed
// Route: GET /api/feed/ics

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  const results = await env.DB.prepare(
    'SELECT * FROM concerts WHERE is_published = 1 AND is_deleted = 0 ORDER BY date ASC'
  ).all();

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
    'PRODID:-//Ken-Gei Prelude//JP',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Ken-Gei Prelude 演奏会',
    'X-WR-TIMEZONE:Asia/Tokyo',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar;charset=utf-8',
      'Content-Disposition': 'attachment; filename="ken-gei-prelude.ics"',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

function escapeICS(text: string): string {
  return text.replace(/[\\;,\n]/g, (c) => {
    if (c === '\n') return '\\n';
    return '\\' + c;
  });
}
