// Crescendo — Utility Functions

import { DAY_OF_WEEK, SITE_URL, UNIVERSITY_VENUES, REGIONAL_VENUES, type KnownVenuePreset } from './constants';
import type { Concert, PricingItem, Venue } from '../types';

/** Format date like "2/19(水)" */
export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = DAY_OF_WEEK[d.getDay()];
  return `${month}/${day}(${dow})`;
}

/** Format date like "2025年2月19日（水）" */
export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = DAY_OF_WEEK[d.getDay()];
  return `${year}年${month}月${day}日（${dow}）`;
}

/** Calculate day diff from today (local midnight) */
export function getDaysDiff(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** "あと○日" / "本日！" / "明日開催" / "終了" */
export function daysUntil(dateStr: string): string {
  const diff = getDaysDiff(dateStr);
  if (diff < 0) return '終了';
  if (diff === 0) return '本日！';
  if (diff === 1) return '明日開催';
  return `あと${diff}日`;
}

export interface StatusBadgeInfo {
  key: 'today' | 'tomorrow' | 'weekend' | 'free' | 'archive';
  label: string;
  className: string;
}

/** Check if concert is free */
export function isFreeConcert(pricing?: PricingItem[]): boolean {
  if (!pricing || pricing.length === 0) return true;
  return pricing.every((p) => p.amount === 0);
}

/**
 * Phase 4.1: 公演ステータス・リアルタイム自動判定バッジ
 * 「🔴 本日開催」「🟡 明日開催」「🟢 今週末」「🎫 入場無料」「📦 終演アーカイブ」
 */
export function getConcertStatusBadges(concert: Pick<Concert, 'date' | 'pricing'>): StatusBadgeInfo[] {
  const diff = getDaysDiff(concert.date);
  const badges: StatusBadgeInfo[] = [];
  const target = new Date(concert.date + 'T00:00:00');
  const targetDow = target.getDay(); // 0=Sun, 6=Sat

  if (diff < 0) {
    badges.push({
      key: 'archive',
      label: '📦 終演アーカイブ',
      className: 'bg-stone-100 text-stone-600 border border-stone-200/80',
    });
    return badges;
  }

  if (diff === 0) {
    badges.push({
      key: 'today',
      label: '🔴 本日開催',
      className: 'bg-red-50 text-red-700 border border-red-200 font-bold',
    });
  } else if (diff === 1) {
    badges.push({
      key: 'tomorrow',
      label: '🟡 明日開催',
      className: 'bg-amber-50 text-amber-800 border border-amber-200 font-bold',
    });
  } else if (diff <= 6 && (targetDow === 0 || targetDow === 6)) {
    badges.push({
      key: 'weekend',
      label: '🟢 今週末',
      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold',
    });
  }

  if (isFreeConcert(concert.pricing)) {
    badges.push({
      key: 'free',
      label: '🎫 入場無料',
      className: 'bg-teal-50 text-teal-700 border border-teal-200 font-medium',
    });
  }

  return badges;
}

/**
 * Phase 4.2: スマート会場ナビ＆交通アクセス案内
 * 会場名から自動で座標・住所・学内/学外アクセス案内を解決
 */
export function resolveSmartVenue(venue?: Venue): {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  access: string[];
  parking?: string;
  googleMapsUrl: string;
  isCampus: boolean;
  preset?: KnownVenuePreset;
} {
  const rawName = venue?.name || '愛知県立芸術大学';
  const allPresets = [...Object.values(UNIVERSITY_VENUES), ...Object.values(REGIONAL_VENUES)];
  const matched = allPresets.find((preset) =>
    preset.name === rawName ||
    preset.keywords.some((kw) => rawName.includes(kw))
  );

  const isCampus = Boolean(
    matched?.isCampus ||
    /愛知県立芸術大学|県芸|奏楽堂|室内楽ホール|講義棟/.test(rawName)
  );

  const address = venue?.address || matched?.address || (isCampus ? '愛知県長久手市岩作三ケ峯1-114' : '');
  const lat = venue?.lat || matched?.lat || (isCampus ? 35.18392 : undefined);
  const lng = venue?.lng || matched?.lng || (isCampus ? 137.05519 : undefined);
  const access = (venue?.access && venue.access.length > 0)
    ? venue.access
    : matched?.access || (isCampus ? [
        'リニモ（東部丘陵線）「芸大通駅」下車 徒歩約10〜15分',
        '名鉄バス「愛知県立芸術大学」バス停下車 すぐ（藤が丘駅・長久手古戦場駅より運行）',
      ] : []);
  const parking = venue?.parking || matched?.parking;
  const queryTarget = address ? `${rawName} ${address}` : rawName;
  const googleMapsUrl = matched?.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryTarget)}`;

  return {
    name: rawName,
    address,
    lat,
    lng,
    access,
    parking,
    googleMapsUrl,
    isCampus,
    preset: matched,
  };
}

/** Format views count: 342 → "342", 1234 → "1.2K" */
export function formatViews(views: number): string {
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return String(views);
}

/** Format pricing display — 一般価格優先、なければレンジ */
export function formatPricing(pricing: PricingItem[]): string {
  if (!pricing || pricing.length === 0) return '無料';
  const allFree = pricing.every((p) => p.amount === 0);
  if (allFree) return '無料';

  // 「一般」ラベルの有料項目を優先
  const ippan = pricing.find((p) => p.label.includes('一般') && p.amount > 0);
  if (ippan) return `¥${ippan.amount.toLocaleString()}`;

  // 有料額のレンジ表示
  const nonZero = pricing.filter((p) => p.amount > 0).map((p) => p.amount);
  const min = Math.min(...nonZero);
  const max = Math.max(...nonZero);
  if (min === max) return `¥${min.toLocaleString()}`;
  return `¥${min.toLocaleString()}〜¥${max.toLocaleString()}`;
}

/** Format time display: "18:00開演（17:30開場）" */
export function formatTime(concert: Pick<Concert, 'time_start' | 'time_open' | 'time_end'>): string {
  if (!concert.time_start) return '開演時刻未定';
  let s = `${concert.time_start}開演`;
  if (concert.time_open) s += `（${concert.time_open}開場）`;
  if (concert.time_end) s += `〜${concert.time_end}終演予定`;
  return s;
}

/** Build rich calendar description with open time, venue address, Google Maps URL, performers, program, and official URL */
export function buildCalendarDescription(concert: Concert): string {
  const smartVenue = resolveSmartVenue(concert.venue);
  const lines: string[] = [];

  if (concert.subtitle) {
    lines.push(concert.subtitle);
  }

  const timeParts: string[] = [];
  if (concert.time_start) timeParts.push(`開演: ${concert.time_start}`);
  if (concert.time_open) timeParts.push(`開場: ${concert.time_open}`);
  if (concert.time_end) timeParts.push(`終演予定: ${concert.time_end}`);
  if (timeParts.length > 0) {
    lines.push(`【時間】${timeParts.join(' / ')}`);
  }

  lines.push(`【会場】${smartVenue.name}${smartVenue.address ? ` (${smartVenue.address})` : ''}`);
  lines.push(`【地図】${smartVenue.googleMapsUrl}`);
  lines.push(`【入場料】${formatPricing(concert.pricing)}${concert.pricing_note ? ` (${concert.pricing_note})` : ''}`);

  if (concert.performers && concert.performers.length > 0) {
    const perfText = concert.performers
      .slice(0, 12)
      .map((p) => `${p.name}${p.instrument ? `(${p.instrument})` : ''}`)
      .join('、');
    lines.push(`【出演】${perfText}${concert.performers.length > 12 ? ' ほか' : ''}`);
  }

  if (concert.program && concert.program.length > 0) {
    const progText = concert.program
      .slice(0, 10)
      .map((p) => (p.composer ? `${p.composer}: ${p.piece}` : p.piece))
      .join(' / ');
    lines.push(`【曲目】${progText}`);
  }

  if (concert.description) {
    lines.push('');
    lines.push(concert.description.slice(0, 400));
  }

  lines.push('');
  lines.push(`詳細ページ: ${SITE_URL}/concerts/${concert.slug}`);
  if (concert.source_url) {
    lines.push(`公式情報: ${concert.source_url}`);
  }

  return lines.join('\n');
}

/** Normalize HH:MM to HHMM00 */
function normalizeTimeForCal(rawTime: string | undefined, fallback = '14:00'): string {
  const match = (rawTime || '').trim().match(/^(\d{1,2})[:：](\d{2})/);
  if (!match) return fallback.replace(':', '') + '00';
  return `${match[1].padStart(2, '0')}${match[2]}00`;
}

function normalizeHHMM(rawTime: string | undefined, fallback = '14:00'): string {
  const match = (rawTime || '').trim().match(/^(\d{1,2})[:：](\d{2})/);
  if (!match) return fallback;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

/** Generate Google Calendar URL (Asia/Tokyo timezone safe) */
export function googleCalendarUrl(concert: Concert): string {
  const startDate = concert.date.replace(/-/g, '');
  const timeStart = normalizeHHMM(concert.time_start, '14:00');
  const startTime = normalizeTimeForCal(timeStart);
  let endDate = startDate;
  let endTime: string;
  if (concert.time_end && /^\d{1,2}[:：]\d{2}/.test(concert.time_end)) {
    endTime = normalizeTimeForCal(concert.time_end);
  } else {
    const end = addHours(concert.date, timeStart, 2);
    endDate = end.date.replace(/-/g, '');
    endTime = normalizeTimeForCal(end.time);
  }
  const dates = `${startDate}T${startTime}/${endDate}T${endTime}`;
  const smartVenue = resolveSmartVenue(concert.venue);
  const location = smartVenue.address ? `${smartVenue.name}, ${smartVenue.address}` : smartVenue.name;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: concert.title,
    dates,
    location,
    details: buildCalendarDescription(concert),
    ctz: 'Asia/Tokyo',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Generate Outlook Calendar URL */
export function outlookCalendarUrl(concert: Concert): string {
  const timeStart = normalizeHHMM(concert.time_start, '14:00');
  const start = `${concert.date}T${timeStart}:00`;
  let end: string;
  if (concert.time_end && /^\d{1,2}[:：]\d{2}/.test(concert.time_end)) {
    end = `${concert.date}T${normalizeHHMM(concert.time_end)}:00`;
  } else {
    const endResult = addHours(concert.date, timeStart, 2);
    end = `${endResult.date}T${endResult.time}:00`;
  }
  const smartVenue = resolveSmartVenue(concert.venue);
  const location = smartVenue.address ? `${smartVenue.name} (${smartVenue.address})` : smartVenue.name;
  const params = new URLSearchParams({
    subject: concert.title,
    startdt: start,
    enddt: end,
    location,
    body: buildCalendarDescription(concert),
    path: '/calendar/action/compose',
    rru: 'addevent',
  });
  return `https://outlook.live.com/calendar/0/action/compose?${params}`;
}

/** Generate Yahoo Calendar URL */
export function yahooCalendarUrl(concert: Concert): string {
  const timeStart = normalizeHHMM(concert.time_start, '14:00');
  let endDateStr: string;
  let endTimeStr: string;
  if (concert.time_end && /^\d{1,2}[:：]\d{2}/.test(concert.time_end)) {
    endDateStr = concert.date.replace(/-/g, '');
    endTimeStr = normalizeHHMM(concert.time_end).replace(':', '');
  } else {
    const endResult = addHours(concert.date, timeStart, 2);
    endDateStr = endResult.date.replace(/-/g, '');
    endTimeStr = endResult.time.replace(':', '');
  }
  const st = `${concert.date.replace(/-/g, '')}T${timeStart.replace(':', '')}00`;
  const et = `${endDateStr}T${endTimeStr}00`;
  const smartVenue = resolveSmartVenue(concert.venue);
  const params = new URLSearchParams({
    v: '60',
    TITLE: concert.title,
    ST: st,
    ET: et,
    in_loc: smartVenue.name,
    DESC: buildCalendarDescription(concert),
  });
  return `https://calendar.yahoo.co.jp/?${params}`;
}

function escapeICSValue(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Generate ICS content with explicit Asia/Tokyo VTIMEZONE & rich metadata */
export function generateICS(concert: Concert): string {
  const startDate = concert.date.replace(/-/g, '');
  const timeStart = normalizeHHMM(concert.time_start, '14:00');
  const startTime = normalizeTimeForCal(timeStart);
  let endDate = startDate;
  let endTime: string;
  if (concert.time_end && /^\d{1,2}[:：]\d{2}/.test(concert.time_end)) {
    endTime = normalizeTimeForCal(concert.time_end);
  } else {
    const endResult = addHours(concert.date, timeStart, 2);
    endDate = endResult.date.replace(/-/g, '');
    endTime = normalizeTimeForCal(endResult.time);
  }

  const smartVenue = resolveSmartVenue(concert.venue);
  const location = smartVenue.address ? `${smartVenue.name} (${smartVenue.address})` : smartVenue.name;
  const description = buildCalendarDescription(concert);
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Crescendo//Ken-Gei Prelude//JP',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
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
    'BEGIN:VEVENT',
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=Asia/Tokyo:${startDate}T${startTime}`,
    `DTEND;TZID=Asia/Tokyo:${endDate}T${endTime}`,
    `SUMMARY:${escapeICSValue(concert.title)}`,
    `LOCATION:${escapeICSValue(location)}`,
    `URL:${SITE_URL}/concerts/${concert.slug}`,
    `DESCRIPTION:${escapeICSValue(description)}`,
    `UID:${concert.id || concert.slug}@ken-gei-prelude`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/** Download ICS file */
export function downloadICS(concert: Concert): void {
  const content = generateICS(concert);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${concert.slug}.ics`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/** Share URLs */
export function shareUrls(concert: Concert) {
  const url = `${SITE_URL}/concerts/${concert.slug}`;
  const text = `${concert.title} ${formatDateShort(concert.date)} @${concert.venue?.name || ''} #愛知県芸 #演奏会`;
  const textWithUrl = `${text} ${url}`;
  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    line: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    threads: `https://threads.net/intent/post?text=${encodeURIComponent(textWithUrl)}`,
    bluesky: `https://bsky.app/intent/compose?text=${encodeURIComponent(textWithUrl)}`,
    mail: `mailto:?subject=${encodeURIComponent(concert.title)}&body=${encodeURIComponent(textWithUrl)}`,
    url,
    text,
    textWithUrl,
  };
}

/** Google Maps Directions URLs */
export function routeUrls(venue: { address?: string; name?: string }) {
  const smart = resolveSmartVenue(venue as Venue);
  const dest = encodeURIComponent(smart.address ? `${smart.name} ${smart.address}` : smart.name);
  return {
    fromUni: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent('愛知県立芸術大学')}&destination=${dest}&travelmode=transit`,
    fromLinimo: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent('芸大通駅')}&destination=${dest}&travelmode=walking`,
    fromNagoya: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent('名古屋駅')}&destination=${dest}&travelmode=transit`,
    fromCurrent: (lat: number, lng: number) =>
      `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${dest}&travelmode=transit`,
    byCar: (lat: number, lng: number) =>
      `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${dest}&travelmode=driving`,
  };
}

/** Add hours to a date+time, correctly handling midnight crossover */
export function addHours(date: string, time: string, hours: number): { date: string; time: string } {
  const [y, mo, d] = date.split('-').map(Number);
  const timeMatch = (time || '14:00').match(/^(\d{1,2})[:：](\d{2})/);
  const h = timeMatch ? Number(timeMatch[1]) : 14;
  const m = timeMatch ? Number(timeMatch[2]) : 0;
  const dt = new Date(y, mo - 1, d, h + hours, m);
  const newDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const newTime = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  return { date: newDate, time: newTime };
}

/** SHA-256 hash (browser) */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Normalize text for fingerprint (全角→半角, 空白除去, 小文字) */
export function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/** Classify "free" / "1000円" text into pricing JSON */
export function parsePricingText(text: string): PricingItem[] {
  if (!text || text.trim() === '') return [{ label: '入場料', amount: 0 }];
  const trimmed = text.trim();
  if (trimmed === '無料' || trimmed === 'free' || trimmed === '0') {
    return [{ label: '入場料', amount: 0 }];
  }
  const match = trimmed.match(/(\d+)/);
  if (match) {
    return [{ label: '入場料', amount: parseInt(match[1], 10) }];
  }
  return [{ label: '入場料', amount: 0 }];
}
