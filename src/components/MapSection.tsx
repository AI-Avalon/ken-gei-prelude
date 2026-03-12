import { useEffect, useRef, useState } from 'react';
import { routeUrls } from '../lib/utils';
import { UNIVERSITY_VENUES } from '../lib/constants';
import { useIsMobile } from '../hooks/useDevice';
import type { Venue } from '../types';

interface Props {
  venue: Venue;
}

export default function MapSection({ venue }: Props) {
  const isMobile = useIsMobile();

  // Check if this is a known university venue
  const uniVenue = Object.values(UNIVERSITY_VENUES).find(
    (v) => venue.name?.includes(v.name.replace('愛知県立芸術大学 ', '')) || v.name === venue.name
  );

  const lat = uniVenue?.lat || venue.lat;
  const lng = uniVenue?.lng || venue.lng;

  if (!lat || !lng) {
    // No coordinates — show Google Maps search link as fallback
    const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name || '')}`;
    return (
      <div className="bg-stone-50 rounded-lg p-6 text-center space-y-3">
        <p className="text-stone-500">座標情報がないため地図を表示できません</p>
        {venue.name && (
          <a href={searchUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary-600 hover:underline text-sm font-medium">
            📍 「{venue.name}」をGoogle Mapsで検索 →
          </a>
        )}
      </div>
    );
  }

  if (isMobile) {
    return <MobileMap venue={venue} uniVenue={uniVenue} lat={lat} lng={lng} />;
  }
  return <DesktopMap venue={venue} uniVenue={uniVenue} lat={lat} lng={lng} />;
}

/* ========================= Mobile Map ========================= */
interface MapInnerProps {
  venue: Venue;
  uniVenue: typeof UNIVERSITY_VENUES[keyof typeof UNIVERSITY_VENUES] | undefined;
  lat: number;
  lng: number;
}

function MobileMap({ venue, uniVenue, lat, lng }: MapInnerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const routes = routeUrls(venue);

  // Static map image as fallback / initial view
  const googleMapsUrl = uniVenue?.googleMapsUrl
    || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  useEffect(() => {
    if (!mapRef.current) return;
    let map: any;

    Promise.all([
      import('leaflet'),
      loadCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'),
    ]).then(([L]) => {
      if (!mapRef.current) return;
      map = L.default.map(mapRef.current, {
        zoomControl: false,       // Hide zoom buttons on mobile
        attributionControl: false, // Show below instead
      }).setView([lat, lng], 16);

      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      L.default.marker([lat, lng]).addTo(map)
        .bindPopup(venue.name || '').openPopup();

      setMapLoaded(true);

      // Fix Leaflet rendering in lazy-loaded containers
      setTimeout(() => map.invalidateSize(), 100);
    }).catch(() => setMapLoaded(false));

    return () => { if (map) map.remove(); };
  }, [lat, lng, venue.name]);

  return (
    <div className="space-y-3">
      {/* Compact map */}
      <div ref={mapRef} className="h-48 rounded-lg overflow-hidden border border-stone-200" />

      {!mapLoaded && (
        <p className="text-xs text-stone-400 text-center">© OpenStreetMap contributors</p>
      )}

      {/* Primary CTA: Open in Google Maps */}
      <a
        href={googleMapsUrl}
        target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-lg font-medium text-sm active:bg-blue-700 transition-colors"
      >
        📍 Google Mapsで開く
      </a>

      {/* Route buttons — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        <a href={routes.fromUni} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-stone-100 rounded-lg text-xs font-medium text-stone-700 active:bg-stone-200">
          🚃 県芸から
        </a>
        <button
          onClick={() => {
            navigator.geolocation.getCurrentPosition(
              (pos) => window.open(routes.fromCurrent(pos.coords.latitude, pos.coords.longitude), '_blank'),
              () => alert('位置情報を取得できません'),
            );
          }}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-stone-100 rounded-lg text-xs font-medium text-stone-700 active:bg-stone-200"
        >
          📍 現在地から
        </button>
        <button
          onClick={() => {
            navigator.geolocation.getCurrentPosition(
              (pos) => window.open(routes.byCar(pos.coords.latitude, pos.coords.longitude), '_blank'),
              () => alert('位置情報を取得できません'),
            );
          }}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-stone-100 rounded-lg text-xs font-medium text-stone-700 active:bg-stone-200"
        >
          🚗 車で行く
        </button>
      </div>
    </div>
  );
}

/* ========================= Desktop Map ========================= */
function DesktopMap({ venue, uniVenue, lat, lng }: MapInnerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const routes = routeUrls(venue);

  const googleMapsUrl = uniVenue?.googleMapsUrl
    || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  useEffect(() => {
    if (!mapRef.current) return;
    let map: any;

    Promise.all([
      import('leaflet'),
      loadCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'),
    ]).then(([L]) => {
      if (!mapRef.current) return;
      map = L.default.map(mapRef.current).setView([lat, lng], 16);
      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      L.default.marker([lat, lng]).addTo(map)
        .bindPopup(venue.name || '').openPopup();
      setMapLoaded(true);
    }).catch(() => setMapLoaded(false));

    return () => { if (map) map.remove(); };
  }, [lat, lng, venue.name]);

  return (
    <div className="space-y-4">
      <div ref={mapRef} className="h-64 rounded-lg overflow-hidden border" />

      <div className="flex items-center justify-between">
        <a
          href={googleMapsUrl}
          target="_blank" rel="noopener noreferrer"
          className="text-primary-600 hover:underline inline-flex items-center gap-1 text-sm font-medium"
        >
          📍 Google Mapsで開く →
        </a>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={routes.fromUni} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
          🚃 県芸からのルート
        </a>
        <button
          onClick={() => {
            navigator.geolocation.getCurrentPosition(
              (pos) => window.open(routes.fromCurrent(pos.coords.latitude, pos.coords.longitude), '_blank'),
              () => alert('位置情報を取得できません'),
            );
          }}
          className="btn-secondary text-sm"
        >
          📍 現在地からのルート
        </button>
        <button
          onClick={() => {
            navigator.geolocation.getCurrentPosition(
              (pos) => window.open(routes.byCar(pos.coords.latitude, pos.coords.longitude), '_blank'),
              () => alert('位置情報を取得できません'),
            );
          }}
          className="btn-secondary text-sm"
        >
          🚗 車で行く
        </button>
      </div>
    </div>
  );
}

/* ========================= Helpers ========================= */
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
