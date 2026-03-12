// Ken-Gei Prelude — Utility Functions

import { DAY_OF_WEEK, SITE_URL } from './constants';
import type { Concert, PricingItem } from '../types';

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

/** "あと○日" / "本日！" / "終了" */
export function daysUntil(dateStr: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return '終了';
  if (diff === 0) return '本日！';
  return `あと${diff}日`;
}

/** Format views count: 342 → "342", 1234 → "1.2K" */
export function formatViews(views: number): string {
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return String(views);
}

/** Format pricing display */
export function formatPricing(pricing: PricingItem[]): string {
  if (!pricing || pricing.length === 0) return '無料';
  const allFree = pricing.every((p) => p.amount === 0);
  if (allFree) return '無料';
  const maxPrice = Math.max(...pricing.map((p) => p.amount));
  return `¥${maxPrice.toLocaleString()}`;
}

/** Format time display: "18:00開演（17:30開場）" */
export function formatTime(concert: Pick<Concert, 'time_start' | 'time_open' | 'time_end'>): string {
  let s = `${concert.time_start}開演`;
  if (concert.time_open) s += `（${concert.time_open}開場）`;
  return s;
}

/** Generate Google Calendar URL */
export function googleCalendarUrl(concert: Concert): string {
  const startDate = concert.date.replace(/-/g, '');
  const startTime = concert.time_start.replace(':', '') + '00';
  const endTime = concert.time_end
    ? concert.time_end.replace(':', '') + '00'
    : addHours(concert.time_start, 2).replace(':', '') + '00';
  const dates = `${startDate}T${startTime}/${startDate}T${endTime}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: concert.title,
    dates,
    location: concert.venue?.name || '',
    details: `${SITE_URL}/concerts/${concert.slug}`,
    ctz: 'Asia/Tokyo',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Generate Outlook Calendar URL */
export function outlookCalendarUrl(concert: Concert): string {
  const start = `${concert.date}T${concert.time_start}:00`;
  const end = concert.time_end
    ? `${concert.date}T${concert.time_end}:00`
    : `${concert.date}T${addHours(concert.time_start, 2)}:00`;
  const params = new URLSearchParams({
    subject: concert.title,
    startdt: start,
    enddt: end,
    location: concert.venue?.name || '',
    body: `${SITE_URL}/concerts/${concert.slug}`,
  });
  return `https://outlook.office.com/calendar/deeplink/compose?${params}`;
}

/** Generate Yahoo Calendar URL */
export function yahooCalendarUrl(concert: Concert): string {
  const st = `${concert.date.replace(/-/g, '')}T${concert.time_start.replace(':', '')}00`;
  const params = new URLSearchParams({
    v: '60',
    TITLE: concert.title,
    ST: st,
    in_loc: concert.venue?.name || '',
    DESC: `${SITE_URL}/concerts/${concert.slug}`,
  });
  return `https://calendar.yahoo.co.jp/?${params}`;
}

/** Generate ICS content */
export function generateICS(concert: Concert): string {
  const startDate = concert.date.replace(/-/g, '');
  const startTime = `${concert.time_start.replace(':', '')}00`;
  const endTime = concert.time_end
    ? `${concert.time_end.replace(':', '')}00`
    : `${addHours(concert.time_start, 2).replace(':', '')}00`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ken-Gei Prelude//JP',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `DTSTART;TZID=Asia/Tokyo:${startDate}T${startTime}`,
    `DTEND;TZID=Asia/Tokyo:${startDate}T${endTime}`,
    `SUMMARY:${concert.title}`,
    `LOCATION:${concert.venue?.name || ''}`,
    `URL:${SITE_URL}/concerts/${concert.slug}`,
    `DESCRIPTION:${concert.subtitle || concert.title}`,
    `UID:${concert.id}@ken-gei-prelude`,
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
  a.click();
  URL.revokeObjectURL(url);
}

/** Share URLs */
export function shareUrls(concert: Concert) {
  const url = `${SITE_URL}/concerts/${concert.slug}`;
  const text = `${concert.title} ${formatDateShort(concert.date)} @${concert.venue?.name || ''} #愛知県芸 #演奏会`;
  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    line: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    url,
  };
}

/** Google Maps Directions URLs */
export function routeUrls(venue: { address?: string; name?: string }) {
  const dest = encodeURIComponent(venue.address || venue.name || '');
  return {
    fromUni: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent('愛知県立芸術大学')}&destination=${dest}&travelmode=transit`,
    fromCurrent: (lat: number, lng: number) =>
      `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${dest}&travelmode=transit`,
    byCar: (lat: number, lng: number) =>
      `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${dest}&travelmode=driving`,
  };
}

/** Add hours to HH:MM string */
function addHours(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  const newH = (h + hours) % 24;
  return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
