import { useEffect, useRef, useState } from 'react';
import { routeUrls } from '../lib/utils';
import type { Venue } from '../types';

interface Props {
  venue: Venue;
}

export default function MapSection({ venue }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!venue.lat || !venue.lng || !mapRef.current) return;

    // Dynamic import of Leaflet
    Promise.all([
      import('leaflet'),
      loadCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'),
    ]).then(([L]) => {
      if (!mapRef.current) return;
      const map = L.default.map(mapRef.current).setView([venue.lat!, venue.lng!], 15);
      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      L.default.marker([venue.lat!, venue.lng!]).addTo(map)
        .bindPopup(venue.name).openPopup();
      setMapLoaded(true);

      return () => { map.remove(); };
    }).catch(() => {
      setMapLoaded(false);
    });
  }, [venue.lat, venue.lng, venue.name]);

  const routes = routeUrls(venue);

  if (!venue.lat || !venue.lng) {
    return (
      <div className="bg-stone-50 rounded-lg p-6 text-center text-stone-500">
        地図情報がありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div ref={mapRef} className="h-64 rounded-lg overflow-hidden border" />
      {!mapLoaded && (
        <div className="text-center text-sm text-stone-500">
          <a href={`https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`}
            target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
            Google Mapsで開く →
          </a>
        </div>
      )}

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
