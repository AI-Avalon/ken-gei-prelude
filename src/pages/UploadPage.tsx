import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ConcertForm from '../components/ConcertForm';
import FlyerUploader from '../components/FlyerUploader';
import { createConcert, uploadFlyer, fetchSiteSettings } from '../lib/api';
import { buildFlyerThumbnailName, buildFlyerUploadName, type FlyerFile } from '../lib/flyers';
import { toast } from '../components/Toast';
import { useIsMobile } from '../hooks/useDevice';

// Haversine distance (km)
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type LocationState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'granted'; lat: number; lng: number; distanceKm: number }
  | { status: 'too_far'; lat: number; lng: number; distanceKm: number }
  | { status: 'denied'; message: string }
  | { status: 'not_required' };

interface SiteSettings {
  location_restriction_enabled: boolean;
  location_restriction_radius_km: number;
  location_restriction_lat: number;
  location_restriction_lng: number;
}

export default function UploadPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [flyerFiles, setFlyerFiles] = useState<FlyerFile[]>([]);
  const [flyerThumbnailIndex, setFlyerThumbnailIndex] = useState(0);
  const isMobile = useIsMobile();

  const [locationState, setLocationState] = useState<LocationState>({ status: 'idle' });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [locationRequired, setLocationRequired] = useState(false);
  const settingsRef = useRef<SiteSettings | null>(null);

  useEffect(() => {
    fetchSiteSettings().then((res) => {
      if (res.ok && res.data) {
        settingsRef.current = res.data;
        if (res.data.location_restriction_enabled) {
          setLocationRequired(true);
          setLocationState({ status: 'checking' });
          requestLocation(res.data);
        } else {
          setLocationState({ status: 'not_required' });
        }
      } else {
        setLocationState({ status: 'not_required' });
      }
      setSettingsLoaded(true);
    }).catch(() => {
      setLocationState({ status: 'not_required' });
      setSettingsLoaded(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestLocation = (settings?: SiteSettings) => {
    const s = settings ?? settingsRef.current;
    setLocationState({ status: 'checking' });
    if (!navigator.geolocation) {
      setLocationState({ status: 'denied', message: 'お使いのブラウザは位置情報に対応していません。' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!s) {
          setLocationState({ status: 'denied', message: '設定の読み込みに失敗しました。ページを再読み込みしてください。' });
          return;
        }
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const distanceKm = haversineKm(lat, lng, s.location_restriction_lat, s.location_restriction_lng);

        if (distanceKm <= s.location_restriction_radius_km) {
          setLocationState({ status: 'granted', lat, lng, distanceKm });
        } else {
          setLocationState({ status: 'too_far', lat, lng, distanceKm });
        }
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? '位置情報の利用が拒否されました。ブラウザの設定から位置情報を許可してください。'
            : err.code === err.POSITION_UNAVAILABLE
            ? '位置情報を取得できませんでした。しばらく待ってから再試行してください。'
            : '位置情報の取得がタイムアウトしました。再試行してください。';
        setLocationState({ status: 'denied', message: msg });
      },
      { timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    const payload = { ...data };
    if (locationState.status === 'granted') {
      payload.submitter_lat = locationState.lat;
      payload.submitter_lng = locationState.lng;
    }

    setSubmitting(true);
    try {
      const res = await createConcert(payload);
      if (!res.ok) {
        toast(res.error || '登録に失敗しました', 'error');
        setSubmitting(false);
        return;
      }

      const concert = res.data!;

      if (flyerFiles.length > 0) {
        let uploadCount = 0;
        for (const [index, flyer] of flyerFiles.entries()) {
          const fd = new FormData();
          fd.append('file', flyer.blob, buildFlyerUploadName(flyer.groupId, index, flyer.pageIndex, flyer.pageTotal));
          if (index === flyerThumbnailIndex) {
            fd.append('thumbnail', flyer.thumbnail, buildFlyerThumbnailName(flyer.groupId, index, flyer.pageIndex, flyer.pageTotal));
          }
          fd.append('concert_slug', concert.slug);
          fd.append('group_id', flyer.groupId);
          fd.append('page_index', String(flyer.pageIndex));
          fd.append('page_total', String(flyer.pageTotal));
          fd.append('sort_index', String(index));
          fd.append('set_thumbnail', index === flyerThumbnailIndex ? '1' : '0');
          const uploadRes = await uploadFlyer(fd);
          if (uploadRes.ok) uploadCount++;
        }
        if (uploadCount < flyerFiles.length) {
          toast(`${flyerFiles.length - uploadCount}枚のチラシのアップロードに失敗しました`, 'error');
        }
      }

      toast('演奏会を登録しました！', 'success');
      navigate(`/concerts/${concert.slug}`);
    } catch {
      toast('エラーが発生しました', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!settingsLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  const s = settingsRef.current;
  const radiusKm = s?.location_restriction_radius_km ?? 5;

  const renderLocationBanner = () => {
    if (!locationRequired) return null;

    if (locationState.status === 'checking') {
      return (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="font-medium text-sm text-amber-800">位置情報を確認しています...</p>
            <p className="text-xs text-amber-600 mt-0.5">愛知県立芸術大学から{radiusKm}km以内からのみ登録できます</p>
          </div>
        </div>
      );
    }

    if (locationState.status === 'granted') {
      return (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
          <span className="text-xl flex-shrink-0">✅</span>
          <div>
            <p className="font-medium text-sm text-emerald-800">位置情報を確認しました</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              愛知県立芸術大学から約{locationState.distanceKm < 0.1 ? '0.1' : locationState.distanceKm.toFixed(1)}km地点からアクセスしています
            </p>
          </div>
        </div>
      );
    }

    if (locationState.status === 'too_far') {
      return (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">📍</span>
            <div className="flex-1">
              <p className="font-medium text-sm text-red-800">登録できる範囲外です</p>
              <p className="text-xs text-red-600 mt-0.5 mb-1">
                愛知県立芸術大学から{radiusKm}km以内からのみ登録できます。
              </p>
              <p className="text-xs text-red-500">
                現在地との距離: 約{locationState.distanceKm.toFixed(0)}km
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (locationState.status === 'denied') {
      return (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">📍</span>
            <div className="flex-1">
              <p className="font-medium text-sm text-red-800">位置情報が必要です</p>
              <p className="text-xs text-red-600 mt-0.5 mb-3">{locationState.message}</p>
              <button
                type="button"
                onClick={() => requestLocation()}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                再試行する
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const locationBlocked =
    locationRequired &&
    locationState.status !== 'granted';

  return (
    <div className={`${isMobile ? 'px-4 py-4' : 'max-w-3xl mx-auto px-4 py-8'} overflow-hidden`}>
      <h1 className={`${isMobile ? 'text-xl' : 'text-2xl sm:text-3xl'} font-bold mb-2`}>演奏会を登録する</h1>
      <p className="text-stone-500 mb-6 text-sm">
        誰でも登録できます。編集用パスワードを設定すると、後から内容を変更できます。
      </p>

      {renderLocationBanner()}

      {locationBlocked ? (
        <div className="bg-stone-50 rounded-xl border border-stone-200 p-8 text-center">
          <p className="text-stone-500 text-sm">
            {locationState.status === 'too_far'
              ? '愛知県立芸術大学の付近からのみ演奏会を登録できます。'
              : '位置情報が確認できるまでフォームは表示されません。'}
          </p>
        </div>
      ) : (
        <>
          <ConcertForm onSubmit={handleSubmit} submitting={submitting} hideFlyer />

          <div className="mt-8 bg-white rounded-xl border p-4 sm:p-6 space-y-4">
            <h2 className="text-lg font-bold">チラシ画像（任意）</h2>
            <FlyerUploader
              onFilesReady={(files) => setFlyerFiles(files)}
              onThumbnailChange={(i) => setFlyerThumbnailIndex(i)}
            />
          </div>
        </>
      )}
    </div>
  );
}
