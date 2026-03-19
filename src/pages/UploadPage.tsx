import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ConcertForm from '../components/ConcertForm';
import FlyerUploader from '../components/FlyerUploader';
import { createConcert, uploadFlyer, fetchSiteSettings } from '../lib/api';
import { buildFlyerThumbnailName, buildFlyerUploadName, type FlyerFile } from '../lib/flyers';
import { toast } from '../components/Toast';
import { useIsMobile } from '../hooks/useDevice';

type LocationState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'granted'; lat: number; lng: number }
  | { status: 'denied'; message: string }
  | { status: 'not_required' };

export default function UploadPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [flyerFiles, setFlyerFiles] = useState<FlyerFile[]>([]);
  const [flyerThumbnailIndex, setFlyerThumbnailIndex] = useState(0);
  const isMobile = useIsMobile();

  const [locationState, setLocationState] = useState<LocationState>({ status: 'idle' });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [locationRequired, setLocationRequired] = useState(false);
  const [radiusKm, setRadiusKm] = useState(50);

  useEffect(() => {
    fetchSiteSettings().then((res) => {
      if (res.ok && res.data) {
        if (res.data.location_restriction_enabled) {
          setLocationRequired(true);
          setRadiusKm(res.data.location_restriction_radius_km);
          setLocationState({ status: 'checking' });
          requestLocation();
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

  const requestLocation = () => {
    setLocationState({ status: 'checking' });
    if (!navigator.geolocation) {
      setLocationState({ status: 'denied', message: 'お使いのブラウザは位置情報に対応していません。' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationState({ status: 'granted', lat: pos.coords.latitude, lng: pos.coords.longitude });
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
      { timeout: 15000, maximumAge: 60000 }
    );
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    // Attach location if available
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

      // Upload all flyer files
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
          if (uploadRes.ok) {
            uploadCount++;
          }
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

  // Location restriction banner
  const renderLocationBanner = () => {
    if (!locationRequired) return null;
    if (locationState.status === 'checking') {
      return (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="font-medium text-sm text-amber-800">位置情報を確認しています...</p>
            <p className="text-xs text-amber-600 mt-0.5">愛知県立芸術大学付近（{radiusKm}km以内）からのみ登録できます</p>
          </div>
        </div>
      );
    }
    if (locationState.status === 'granted') {
      return (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
          <span className="text-xl">✅</span>
          <div>
            <p className="font-medium text-sm text-emerald-800">位置情報を確認しました</p>
            <p className="text-xs text-emerald-600 mt-0.5">愛知県立芸術大学付近からアクセスしています</p>
          </div>
        </div>
      );
    }
    if (locationState.status === 'denied') {
      return (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-xl">📍</span>
            <div className="flex-1">
              <p className="font-medium text-sm text-red-800">位置情報が必要です</p>
              <p className="text-xs text-red-600 mt-0.5 mb-3">{locationState.message}</p>
              <button
                type="button"
                onClick={requestLocation}
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

  // If location is required but denied/checking, disable the form
  const locationBlocked =
    locationRequired &&
    (locationState.status === 'denied' || locationState.status === 'checking' || locationState.status === 'idle');

  return (
    <div className={`${isMobile ? 'px-4 py-4' : 'max-w-3xl mx-auto px-4 py-8'} overflow-hidden`}>
      <h1 className={`${isMobile ? 'text-xl' : 'text-2xl sm:text-3xl'} font-bold mb-2`}>演奏会を登録する</h1>
      <p className="text-stone-500 mb-6 text-sm">
        誰でも登録できます。編集用パスワードを設定すると、後から内容を変更できます。
      </p>

      {renderLocationBanner()}

      {locationBlocked ? (
        <div className="bg-stone-50 rounded-xl border border-stone-200 p-8 text-center">
          <p className="text-stone-500 text-sm">位置情報が確認できるまでフォームは表示されません。</p>
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
