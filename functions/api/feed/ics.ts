// Cloudflare Pages Functions — ICS Calendar Feed
// Route: GET /api/feed/ics

interface Env {
  DB: D1Database;
}

function addHoursServer(date: string, time: string, hours: number): { date: string; time: string } {
  const [y, mo, d] = date.split('-').map(Number);
  const mMatch = (time || '14:00').match(/^(\d{1,2})[:：](\d{2})/);
  const h = mMatch ? Number(mMatch[1]) : 14;
  const m = mMatch ? Number(mMatch[2]) : 0;
  const dt = new Date(Date.UTC(y, mo - 1, d, h + hours, m));
  const newDate = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  const newTime = `${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}`;
  return { date: newDate, time: newTime };
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
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

  const events = (results.results || []).map((row) => {
    const rawDate = (row.date as string) || '2026-01-01';
    const startDate = rawDate.replace(/-/g, '');
    const rawStart = ((row.time_start as string) || '14:00').trim();
    const startMatch = rawStart.match(/^(\d{1,2})[:：](\d{2})/);
    const normStart = startMatch ? `${startMatch[1].padStart(2, '0')}:${startMatch[2]}` : '14:00';
    const startTime = normStart.replace(':', '') + '00';

    let endDate = startDate;
    let endTime: string;
    const rawEnd = ((row.time_end as string) || '').trim();
    const endMatch = rawEnd.match(/^(\d{1,2})[:：](\d{2})/);
    if (endMatch) {
      endTime = `${endMatch[1].padStart(2, '0')}${endMatch[2]}00`;
    } else {
      const endCalc = addHoursServer(rawDate, normStart, 2);
      endDate = endCalc.date.replace(/-/g, '');
      endTime = endCalc.time.replace(':', '') + '00';
    }

    let venueName = '愛知県立芸術大学';
    let venueAddress = '';
    try {
      const venue = JSON.parse(row.venue_json as string);
      if (venue?.name) venueName = venue.name;
      if (venue?.address) venueAddress = venue.address;
    } catch { /* ignore */ }

    const descLines: string[] = [];
    if (row.subtitle) descLines.push(String(row.subtitle));
    const timeOpen = (row.time_open as string) || '';
    descLines.push(`【時間】開演: ${normStart}${timeOpen ? ` / 開場: ${timeOpen}` : ''}`);
    descLines.push(`【会場】${venueName}${venueAddress ? ` (${venueAddress})` : ''}`);
    descLines.push(`【地図】https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueName)}`);

    try {
      const performers = JSON.parse((row.performers_json as string) || '[]') as Array<{ name: string; instrument?: string }>;
      if (Array.isArray(performers) && performers.length > 0) {
        descLines.push(`【出演】${performers.slice(0, 10).map(p => `${p.name}${p.instrument ? `(${p.instrument})` : ''}`).join('、')}`);
      }
    } catch { /* ignore */ }

    try {
      const program = JSON.parse((row.program_json as string) || '[]') as Array<{ composer?: string; piece: string }>;
      if (Array.isArray(program) && program.length > 0) {
        descLines.push(`【曲目】${program.slice(0, 8).map(p => (p.composer ? `${p.composer}: ${p.piece}` : p.piece)).join(' / ')}`);
      }
    } catch { /* ignore */ }

    if (row.description) {
      descLines.push(String(row.description).slice(0, 300));
    }
    descLines.push(`詳細: https://ken-gei-prelude.pages.dev/concerts/${row.slug}`);

    return [
      'BEGIN:VEVENT',
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Asia/Tokyo:${startDate}T${startTime}`,
      `DTEND;TZID=Asia/Tokyo:${endDate}T${endTime}`,
      `SUMMARY:${escapeICS(row.title as string)}`,
      `LOCATION:${escapeICS(venueAddress ? `${venueName} (${venueAddress})` : venueName)}`,
      `URL:https://ken-gei-prelude.pages.dev/concerts/${row.slug}`,
      `UID:${row.id}@ken-gei-prelude`,
      `DESCRIPTION:${escapeICS(descLines.join('\n'))}`,
      'END:VEVENT',
    ].join('\r\n');
  });

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Crescendo//Ken-Gei Prelude//JP',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(calendarName(categories))}`,
    'X-WR-TIMEZONE:Asia/Tokyo',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Tokyo',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0900',
    'TZOFFSETTO:+0900',
    'TZNAME:JST',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
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
