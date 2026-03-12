import { useEffect, useRef, useState } from 'react';
import { routeUrls } from '../lib/utils';
import { UNIVERSITY_VENUES } from '../lib/constants';
import type { Venue } from '../types';

interface Props {
  venue: Venue;
}

export default function MapSection({ venue }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Check if this is a known university venue
  const uniVenue = Object.values(UNIVERSITY_VENUES).find(
    (v) => venue.name?.includes(v.name.replace('愛知県立芸術大学 ', '')) || v.name === venue.name
  );

  useEffect(() => {
    const lat = uniVenue?.lat || venue.lat;
    const lng = uniVenue?.lng || venue.lng;
    if (!lat || !lng || !mapRef.current) return;

    // Dynamic import of Leaflet
    Promise.all([
      import('leaflet'),
      loadCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'),
    ]).then(([L]) => {
      if (!mapRef.current) return;
      const map = L.default.map(mapRef.current).setView([lat, lng], 16);
      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      L.default.marker([lat, lng]).addTo(map)
        .bindPopup(venue.name).openPopup();
      setMapLoaded(true);

      return () => { map.remove(); };
    }).catch(() => {
      setMapLoaded(false);
    });
  }, [venue.lat, venue.lng, venue.name, uniVenue]);

  const routes = routeUrls(venue);
  const lat = uniVenue?.lat || venue.lat;
  const lng = uniVenue?.lng || venue.lng;

  if (!lat || !lng) {
    return (
      <div className="bg-stone-50 rounded-lg p-6 text-center text-stone-500">
        地図情報がありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div ref={mapRef} className="h-64 rounded-lg overflow-hidden border" />

      {/* Google Maps link — always show */}
      <div className="text-center text-sm">
        <a
          href={uniVenue?.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
          target="_blank" rel="noopener noreferrer"
          className="text-primary-600 hover:underline inline-flex items-center gap-1"
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
              (pos) => {
                window.open(routes.fromCurrent(pos.coords.latitude, pos.coords.longitude), '_blank');
              },
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
              (pos) => {
                window.open(routes.byCar(pos.coords.latitude, pos.coords.longitude), '_blank');
              },
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
