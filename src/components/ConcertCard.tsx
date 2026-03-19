import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '../lib/constants';
import { formatDateShort, daysUntil, formatPricing } from '../lib/utils';
import { analyzeConcertFlyers } from '../lib/flyers';
import { useIsMobile } from '../hooks/useDevice';
import type { Concert } from '../types';

/** チラシキーから試行すべきサムネイルURLを優先順に返す（失敗時にフォールバック） */
function getFlyerThumbSrcs(concert: Concert): string[] {
  const srcs: string[] = [];
  const add = (url: string) => { if (!srcs.includes(url)) srcs.push(url); };

  const analysis = concert.flyer_r2_keys?.length > 0
    ? analyzeConcertFlyers(concert.flyer_r2_keys)
    : null;

  const thumbKey = concert.flyer_thumbnail_key;
  // _g{uuid}_o パターンを含む = 変換済みWebPページから明示的にアップロードされた小サムネ
  const isExplicitThumb = Boolean(thumbKey && !thumbKey.endsWith('.pdf') && /_g[a-z0-9-]+_o\d+/i.test(thumbKey));

  // 1. 明示的アップロード済みサムネ（小サイズで確実に存在）
  if (isExplicitThumb && thumbKey) {
    add(`/api/image/${thumbKey}`);
  }

  // 2. 変換済みWebP or 直接画像（JPG等）の先頭（KVに確実に存在）
  if (analysis?.displayKeys.length) {
    add(`/api/image/${analysis.displayKeys[0]}`);
  }

  // 3. 派生サムネイルキー（存在しない可能性あり、フォールバック）
  if (thumbKey && !thumbKey.endsWith('.pdf') && !isExplicitThumb) {
    add(`/api/image/${thumbKey}`);
  }

  // 4. _thumb. を含むキー
  const thumb = concert.flyer_r2_keys?.find((k) => k.includes('_thumb.'));
  if (thumb) add(`/api/image/${thumb}`);

  // 5. PDF以外の任意キー
  const fallback = concert.flyer_r2_keys?.find((k) => !k.endsWith('.pdf'));
  if (fallback) add(`/api/image/${fallback}`);

  return srcs;
}


interface Props {
  concert: Concert;
  highlight?: boolean;
}

export default function ConcertCard({ concert, highlight }: Props) {
  const [thumbSrcIdx, setThumbSrcIdx] = useState(0);
  const cat = CATEGORIES[concert.category] || CATEGORIES.other;
  const status = daysUntil(concert.date);
  const isToday = status === '本日！';
  const isEnded = status === '終了';
  const isMobile = useIsMobile();
  const pricing = formatPricing(concert.pricing);
  const isFree = pricing === '無料';
  const thumbSrcs = getFlyerThumbSrcs(concert);
  const thumbSrc = thumbSrcs[thumbSrcIdx] ?? null;
  const handleThumbError = () => setThumbSrcIdx((i) => i + 1);

  /* ===== Mobile: horizontal card ===== */
  if (isMobile) {
    return (
      <Link
        to={`/concerts/${concert.slug}`}
        className={`flex bg-white rounded-xl shadow-sm border overflow-hidden transition-colors ${
          highlight ? 'border-primary-400 shadow-md' : 'border-stone-100'
        } ${isEnded ? 'opacity-75' : ''}`}
      >
        {/* Thumbnail — left side */}
        <div className="w-[72px] self-stretch flex-shrink-0 bg-stone-100 relative overflow-hidden">
          {thumbSrc ? (
            <img
              src={thumbSrc}
              alt={concert.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              onError={handleThumbError}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-navy-900 to-navy-800 flex items-center justify-center">
              <span className="text-primary-400/60 text-xl">♪</span>
            </div>
          )}
          {isToday && (
            <div className="absolute top-0 left-0 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg">
              TODAY
            </div>
          )}
        </div>
        {/* Info — right side */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold ${isToday ? 'text-red-600' : isEnded ? 'text-stone-400' : 'text-primary-700'}`}>
              {formatDateShort(concert.date)}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
          </div>
          <h3 className="font-medium text-sm text-stone-900 line-clamp-2 leading-snug mb-1">
            {concert.title}
          </h3>
          <p className="text-[11px] text-stone-500 truncate flex items-center gap-1">
            <span className="text-stone-400">📍</span>{concert.venue?.name || '会場未定'}
          </p>
          <div className="flex items-center justify-between mt-1.5 text-[11px]">
            <span className={isFree ? 'text-emerald-600 font-medium' : 'text-stone-600'}>
              {isFree ? '🎫 無料' : pricing}
            </span>
            <span className={`font-medium ${isToday ? 'text-red-500' : isEnded ? 'text-stone-400' : 'text-primary-600'}`}>
              {status}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  /* ===== Desktop: vertical card ===== */
  return (
    <Link
      to={`/concerts/${concert.slug}`}
      className={`card block group ${highlight ? 'ring-2 ring-primary-400 shadow-lg' : ''} ${isEnded ? 'opacity-80' : ''}`}
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-stone-100 overflow-hidden relative">
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={concert.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={handleThumbError}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-navy-900 to-navy-800 flex items-center justify-center">
            <div className="text-center">
              <span className="text-primary-400/60 text-3xl font-display tracking-widest">♪</span>
              <p className="text-stone-600 text-xs mt-2">{cat.label}</p>
            </div>
          </div>
        )}
        {/* Status badge overlay */}
        {isToday && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            TODAY
          </div>
        )}
        {isFree && !isEnded && (
          <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            無料
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Date + Category */}
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-bold ${isToday ? 'text-red-600' : isEnded ? 'text-stone-400' : 'text-primary-700'}`}>
            {formatDateShort(concert.date)}
          </span>
          <span className={`badge text-[10px] ${cat.color}`}>
            {cat.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-medium text-stone-900 line-clamp-2 mb-2 group-hover:text-primary-700 transition-colors leading-snug">
          {concert.title}
        </h3>

        {/* Venue */}
        <p className="text-xs text-stone-500 mb-3 truncate flex items-center gap-1">
          <span className="text-stone-400">📍</span>{concert.venue?.name || '会場未定'}
        </p>

        {/* Bottom row */}
        <div className="flex items-center justify-between text-xs border-t border-stone-100 pt-3">
          <span className={`font-medium ${isFree ? 'text-emerald-600' : 'text-stone-700'}`}>
            {pricing}
          </span>
          <span className={`font-medium ${isToday ? 'text-red-500' : isEnded ? 'text-stone-400' : 'text-primary-600'}`}>
            {status}
          </span>
        </div>
      </div>
    </Link>
  );
}
