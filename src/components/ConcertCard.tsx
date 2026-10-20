import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '../lib/constants';
import { formatDateShort, daysUntil, formatPricing, getConcertStatusBadges } from '../lib/utils';
import { analyzeConcertFlyers } from '../lib/flyers';
import type { Concert } from '../types';

/** チラシキーから試行すべきサムネイルURLを優先順に返す（失敗時にフォールバック） */
function getFlyerThumbSrcs(concert: Concert): string[] {
  const srcs: string[] = [];
  const add = (url: string) => { if (!srcs.includes(url)) srcs.push(url); };

  const analysis = concert.flyer_r2_keys?.length > 0
    ? analyzeConcertFlyers(concert.flyer_r2_keys)
    : null;

  const thumbKey = concert.flyer_thumbnail_key;
  const isExplicitThumb = Boolean(thumbKey && !thumbKey.endsWith('.pdf') && /_g[a-z0-9-]+_o\d+/i.test(thumbKey));

  const toUrl = (k: string) => (k.startsWith('http') || k.startsWith('/') || k.startsWith('data:') ? k : `/api/image/${k}`);

  if (isExplicitThumb && thumbKey) {
    add(toUrl(thumbKey));
  }
  if (analysis?.displayKeys.length) {
    add(toUrl(analysis.displayKeys[0]));
  }
  if (thumbKey && !thumbKey.endsWith('.pdf') && !isExplicitThumb) {
    add(toUrl(thumbKey));
  }
  const thumb = concert.flyer_r2_keys?.find((k) => k.includes('_thumb.'));
  if (thumb) add(toUrl(thumb));

  const fallback = concert.flyer_r2_keys?.find((k) => !k.endsWith('.pdf'));
  if (fallback) add(toUrl(fallback));

  return srcs;
}

interface Props {
  concert: Concert;
  highlight?: boolean;
}

/**
 * Single JSX Tree ConcertCard
 * Skill: `.agent/skills/responsive-and-truncation-auditor/SKILL.md`
 * - Zero `truncate` or clipping on title, venue, date, time, or pricing.
 * - Identical information rendered across Mobile (375px) and Desktop (1440px).
 * - Real-time status badges (`🔴 本日開催`, `🟡 明日開催`, `🟢 今週末`, `🎫 入場無料`, `📦 終演アーカイブ`).
 */
export default function ConcertCard({ concert, highlight }: Props) {
  const [thumbSrcIdx, setThumbSrcIdx] = useState(0);
  const [thumbFailed, setThumbFailed] = useState(false);

  const cat = CATEGORIES[concert.category] || CATEGORIES.other;
  const status = daysUntil(concert.date);
  const isToday = status === '本日！';
  const isEnded = status === '終了';
  const pricing = formatPricing(concert.pricing);
  const isFree = pricing === '無料';
  const statusBadges = getConcertStatusBadges(concert);

  const thumbSrcs = getFlyerThumbSrcs(concert);
  const thumbSrc = thumbFailed ? null : (thumbSrcs[thumbSrcIdx] ?? null);

  const handleThumbError = () => {
    if (thumbSrcIdx + 1 < thumbSrcs.length) {
      setThumbSrcIdx((i) => i + 1);
    } else {
      setThumbFailed(true);
    }
  };

  return (
    <Link
      to={`/concerts/${concert.slug}`}
      data-testid="concert-card"
      className={`card flex flex-row sm:flex-col group ${
        highlight ? 'ring-2 ring-primary-400 shadow-lg' : ''
      } ${isEnded ? 'opacity-80' : ''}`}
    >
      {/* Thumbnail Area: Left on mobile, Top on desktop */}
      <div className="w-28 sm:w-full sm:aspect-[4/3] flex-shrink-0 bg-navy-950 overflow-hidden relative self-stretch">
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={concert.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={handleThumbError}
          />
        ) : (
          <div className="w-full h-full min-h-[120px] bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex flex-col items-center justify-center p-3 text-center">
            <span className="text-primary-400/75 text-2xl sm:text-3xl font-display tracking-widest">♪</span>
            <span className="text-[10px] text-primary-300/70 font-serif mt-1">{cat.label}</span>
          </div>
        )}
      </div>

      {/* Content Area: Unified Single JSX Tree */}
      <div className="flex-1 p-3.5 sm:p-4 min-w-0 flex flex-col justify-between">
        <div>
          {/* Date, Time & Category Row */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
            <div className="flex flex-wrap items-center gap-1.5 tabular-nums">
              <span
                data-testid="concert-card-date"
                className={`text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 ${
                  isToday ? 'text-red-600' : isEnded ? 'text-stone-400' : 'text-primary-700'
                }`}
              >
                {formatDateShort(concert.date)}
              </span>
              {concert.time_start && (
                <span className="text-xs text-stone-500 whitespace-nowrap shrink-0">
                  {concert.time_start}開演
                </span>
              )}
            </div>
            <span className={`badge text-[10px] whitespace-nowrap shrink-0 ${cat.color}`}>
              {cat.icon} {cat.label}
            </span>
          </div>

          {/* Real-time Status Badges */}
          {statusBadges.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {statusBadges.map((b) => (
                <span
                  key={b.key}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap shrink-0 ${b.className}`}
                >
                  {b.label}
                </span>
              ))}
            </div>
          )}

          {/* Full Title (No truncation) */}
          <h3
            data-testid="concert-card-title"
            className="fluid-card-title font-serif font-bold text-stone-900 mb-1.5 group-hover:text-primary-700 transition-colors break-words [overflow-wrap:anywhere]"
          >
            {concert.title}
          </h3>

          {/* Full Venue (No truncation) */}
          <p
            data-testid="concert-card-venue"
            className="text-xs text-stone-600 mb-2.5 flex items-start gap-1 break-words [overflow-wrap:anywhere]"
          >
            <span className="text-stone-400 shrink-0 mt-0.5">📍</span>
            <span>{concert.venue?.name || '会場未定'}</span>
          </p>
        </div>

        {/* Bottom Pricing & Countdown Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-t border-stone-100 pt-2.5 mt-auto tabular-nums">
          <span className={`font-semibold whitespace-nowrap shrink-0 ${isFree ? 'text-emerald-700' : 'text-stone-700'}`}>
            {isFree ? '入場無料' : pricing}
          </span>
          <span className={`font-medium whitespace-nowrap shrink-0 ${isToday ? 'text-red-600 font-bold' : isEnded ? 'text-stone-400' : 'text-primary-700'}`}>
            {status}
          </span>
        </div>
      </div>
    </Link>
  );
}
