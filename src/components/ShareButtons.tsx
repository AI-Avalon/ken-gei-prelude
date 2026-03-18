import { useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { shareUrls } from '../lib/utils';
import { useIsMobile } from '../hooks/useDevice';
import type { Concert } from '../types';

export default function ShareButtons({ concert }: { concert: Concert }) {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const isMobile = useIsMobile();
  const urls = shareUrls(concert);

  const copyLink = async () => {
    await navigator.clipboard.writeText(urls.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openQR = useCallback(() => setShowQR(true), []);
  const closeQR = useCallback(() => setShowQR(false), []);

  // モバイルではQRを画面幅に合わせて縮小
  const qrSize = isMobile ? Math.min(200, window.innerWidth - 96) : 256;

  return (
    <div className="space-y-4">
      {/* Share buttons */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <button type="button" onClick={copyLink}
          className="btn-secondary text-sm">
          {copied ? '✅ コピーしました' : '📋 リンクコピー'}
        </button>
        <a href={urls.twitter} target="_blank" rel="noopener noreferrer"
          className="btn-secondary text-sm inline-flex items-center justify-center gap-1">
          𝕏 ポスト
        </a>
        <a href={urls.line} target="_blank" rel="noopener noreferrer"
          className="bg-[#06C755] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#05b34d] transition-colors text-center">
          LINE
        </a>
        <a href={urls.facebook} target="_blank" rel="noopener noreferrer"
          className="bg-[#1877F2] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#166fe5] transition-colors text-center">
          Facebook
        </a>
        <button type="button" onClick={openQR}
          className="btn-secondary text-sm col-span-2 sm:col-span-1">
          📷 QRコード
        </button>
      </div>

      {/* QR Modal — モバイル最適化 */}
      {showQR && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4"
          onClick={closeQR}
        >
          <div
            className="bg-white rounded-2xl p-6 text-center animate-scale-in w-full max-w-xs shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-stone-800 text-left line-clamp-2 flex-1 pr-2">
                {concert.title}
              </h3>
              <button
                type="button"
                onClick={closeQR}
                className="flex-shrink-0 w-7 h-7 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-500 flex items-center justify-center text-xs transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex justify-center bg-white p-3 rounded-xl border border-stone-100">
              <QRCodeSVG value={urls.url} size={qrSize} />
            </div>
            <p className="text-[11px] text-stone-400 mt-3 break-all leading-relaxed">{urls.url}</p>
            <p className="text-xs text-stone-500 mt-2">カメラで読み取るとページが開きます</p>
            <button type="button" onClick={closeQR} className="btn-secondary mt-4 w-full text-sm">閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}
