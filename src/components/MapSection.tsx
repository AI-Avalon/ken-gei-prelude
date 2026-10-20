import { useEffect, useRef, useState } from 'react';
import { routeUrls, resolveSmartVenue } from '../lib/utils';
import type { Venue } from '../types';

interface Props {
  venue: Venue;
}

/**
 * Single JSX Tree Smart Venue Navigation & Transit Access Guide
 * Phase 4.2: Automatically resolves campus & regional concert halls,
 * provides one-tap Linimo / Meitetsu Bus campus access guide, and Google Maps routes.
 */
export default function MapSection({ venue }: Props) {
  const smart = resolveSmartVenue(venue);
  const routes = routeUrls(venue);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showCampusGuide, setShowCampusGuide] = useState(smart.isCampus);

  useEffect(() => {
    setShowCampusGuide(smart.isCampus);
  }, [smart.isCampus]);

  useEffect(() => {
    if (!mapRef.current || !smart.lat || !smart.lng) return;
    let map: any;

    Promise.all([
      import('leaflet'),
      loadCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'),
    ]).then(([L]) => {
      if (!mapRef.current) return;
      map = L.default.map(mapRef.current, {
        attributionControl: true,
      }).setView([smart.lat!, smart.lng!], 16);

      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      L.default.marker([smart.lat!, smart.lng!]).addTo(map)
        .bindPopup(smart.name).openPopup();

      setMapLoaded(true);
      setTimeout(() => map.invalidateSize(), 150);
    }).catch(() => setMapLoaded(false));

    return () => { if (map) map.remove(); };
  }, [smart.lat, smart.lng, smart.name]);

  return (
    <div className="space-y-4" data-testid="smart-venue-nav">
      {/* Venue Summary Header */}
      <div className="bg-stone-50/90 rounded-xl p-4 border border-stone-200/70 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-serif font-bold text-stone-900 text-sm sm:text-base break-words [overflow-wrap:anywhere]">
            📍 {smart.name}
          </div>
          {smart.isCampus && (
            <span className="badge bg-primary-100 text-primary-800 border border-primary-200">
              🏛️ 愛知県立芸術大学 学内会場
            </span>
          )}
        </div>
        {smart.address && (
          <p className="text-xs sm:text-sm text-stone-600 break-words [overflow-wrap:anywhere]">
            住所：{smart.address}
          </p>
        )}
        {smart.access.length > 0 && (
          <ul className="text-xs sm:text-sm text-stone-700 space-y-1 pt-1">
            {smart.access.map((line, i) => (
              <li key={i} className="flex items-start gap-1.5 break-words [overflow-wrap:anywhere]">
                <span className="shrink-0">🚃</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}
        {smart.parking && (
          <p className="text-xs text-stone-500 flex items-start gap-1.5 break-words [overflow-wrap:anywhere]">
            <span className="shrink-0">🅿️</span>
            <span>駐車場：{smart.parking}</span>
          </p>
        )}
      </div>

      {/* One-Tap Campus Access Guide (Linimo Geidaidori / Meitetsu Bus) */}
      {smart.isCampus && (
        <div className="rounded-xl border border-primary-300/60 bg-primary-50/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowCampusGuide(!showCampusGuide)}
            className="w-full flex items-center justify-between px-4 py-3 text-left text-xs sm:text-sm font-bold text-primary-900 hover:bg-primary-100/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span>🚋</span>
              <span>リニモ「芸大通駅」／名鉄バス「愛知県立芸術大学」からのアクセス案内</span>
            </span>
            <span className="text-primary-700 text-xs whitespace-nowrap shrink-0 ml-2">
              {showCampusGuide ? '▲ 閉じる' : '▼ 案内を開く'}
            </span>
          </button>
          {showCampusGuide && (
            <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-stone-700 space-y-2.5 border-t border-primary-200/50">
              <div className="bg-white/90 rounded-lg p-3 border border-primary-200/50 space-y-1">
                <div className="font-bold text-stone-900">① リニモ（愛知高速交通東部丘陵線）をご利用の場合</div>
                <p className="text-stone-600 leading-relaxed">
                  地下鉄東山線「藤が丘駅」または愛知環状鉄道「八草駅」よりリニモに乗車し、
                  <strong>「芸大通駅（知の拠点あいち前）」</strong>下車、徒歩約10〜15分。正門より坂道を上がり各ホールへお進みください。
                </p>
              </div>
              <div className="bg-white/90 rounded-lg p-3 border border-primary-200/50 space-y-1">
                <div className="font-bold text-stone-900">② 名鉄バスをご利用の場合（正門近くまで直通）</div>
                <p className="text-stone-600 leading-relaxed">
                  藤が丘駅または長久手古戦場駅より名鉄バスに乗車し、
                  <strong>「愛知県立芸術大学」</strong>バス停下車すぐ（奏楽堂まで徒歩約3分、室内楽ホールまで徒歩約5分）。
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Map */}
      {smart.lat && smart.lng && (
        <div
          ref={mapRef}
          className="h-52 sm:h-64 rounded-xl overflow-hidden border border-stone-200 shadow-inner"
        />
      )}
      {!mapLoaded && smart.lat && smart.lng && (
        <p className="text-xs text-stone-400 text-center">&copy; OpenStreetMap contributors</p>
      )}

      {/* Smart Route Navigation Buttons (Unified Single JSX Tree) */}
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={smart.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-navy-900 text-primary-300 hover:bg-navy-800 text-xs sm:text-sm font-semibold transition-colors shadow-sm"
        >
          📍 Google マップで会場を開く
        </a>
        {smart.isCampus ? (
          <a
            href={routes.fromLinimo}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 hover:border-primary-400 text-stone-700 text-xs sm:text-sm font-medium transition-colors shadow-sm"
          >
            🚶 芸大通駅からの徒歩ルート
          </a>
        ) : (
          <a
            href={routes.fromUni}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 hover:border-primary-400 text-stone-700 text-xs sm:text-sm font-medium transition-colors shadow-sm"
          >
            🚃 愛知県芸からのルート
          </a>
        )}
        <a
          href={routes.fromNagoya}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 hover:border-primary-400 text-stone-700 text-xs sm:text-sm font-medium transition-colors shadow-sm"
        >
          🚉 名古屋駅からのルート
        </a>
        <button
          type="button"
          onClick={() => {
            navigator.geolocation.getCurrentPosition(
              (pos) => window.open(routes.fromCurrent(pos.coords.latitude, pos.coords.longitude), '_blank'),
              () => window.open(smart.googleMapsUrl, '_blank'),
            );
          }}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 hover:border-primary-400 text-stone-700 text-xs sm:text-sm font-medium transition-colors shadow-sm"
        >
          📍 現在地から公共交通機関で
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.geolocation.getCurrentPosition(
              (pos) => window.open(routes.byCar(pos.coords.latitude, pos.coords.longitude), '_blank'),
              () => window.open(smart.googleMapsUrl, '_blank'),
            );
          }}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 hover:border-primary-400 text-stone-700 text-xs sm:text-sm font-medium transition-colors shadow-sm"
        >
          🚗 車でのルート検索
        </button>
      </div>
    </div>
  );
}

function loadCSS(url: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`link[href="${url}"]`)) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = () => resolve();
    document.head.appendChild(link);
  });
}
