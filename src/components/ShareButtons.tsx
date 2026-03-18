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
  const qrSize = isMobile ? Math.min(200, Math.max(window.innerWidth - 96, 140)) : 220;

  return (
    <div className="space-y-3">
      {/* メイン共有ボタン — 2列グリッド */}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={copyLink}
          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
            copied
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
          }`}>
          {copied ? '✅ コピーしました' : '📋 リンクコピー'}
        </button>

        <a href={urls.line} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-[#06C755] text-white hover:bg-[#05b34d] transition-colors">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
          LINE
        </a>

        <a href={urls.twitter} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-black text-white hover:bg-stone-800 transition-colors">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          ポスト (X)
        </a>

        <a href={urls.facebook} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-[#1877F2] text-white hover:bg-[#166fe5] transition-colors">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          Facebook
        </a>

        <a href={urls.threads} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-stone-900 text-white hover:bg-stone-700 transition-colors">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.5 12.068v-.065c.024-3.597 1.198-6.338 3.49-8.14C6.858 2.142 9.703 1.5 13.268 1.5c2.538 0 4.766.537 6.487 1.607 1.583 1 2.65 2.46 3.06 4.22l.077.345-2.544.506-.073-.297c-.34-1.34-1.115-2.408-2.305-3.178-1.379-.879-3.17-1.325-5.323-1.325-2.98 0-5.297.715-6.882 2.068-1.613 1.375-2.43 3.497-2.453 6.31v.061c.024 2.814.84 4.936 2.453 6.31 1.585 1.353 3.902 2.068 6.882 2.068 1.706 0 3.2-.258 4.432-.77 1.322-.553 2.29-1.41 2.873-2.547.503-.98.755-2.218.755-3.682v-.024h-6.85v-2.54h9.458v1.8c0 2.114-.415 3.97-1.237 5.512-.877 1.635-2.158 2.894-3.808 3.74-1.52.78-3.298 1.176-5.279 1.176h-.007z"/></svg>
          Threads
        </a>

        <button type="button" onClick={openQR}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100 transition-colors">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-stone-600"><path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM17 13h2v2h-2zM19 15h2v2h-2zM17 17h2v2h-2zM19 19h2v2h-2zM13 19h2v2h-2zM15 19h2v2h-2z"/></svg>
          QRコード
        </button>
      </div>

      {/* Instagram 案内（ウェブ共有API非対応のため） */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-xl">
        <span className="text-base flex-shrink-0">📸</span>
        <div>
          <p className="text-xs font-medium text-purple-800">Instagramで共有する場合</p>
          <p className="text-[11px] text-purple-600 mt-0.5">
            リンクをコピー → ストーリーまたは投稿のリンクスタンプに貼り付けてください
          </p>
        </div>
      </div>

      {/* QR モーダル — モバイル最適化 */}
      {showQR && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6"
          onClick={closeQR}
        >
          <div
            className="bg-white rounded-2xl p-5 text-center shadow-2xl w-full max-w-[320px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-start justify-between gap-2 mb-4">
              <div className="text-left flex-1 min-w-0">
                <p className="text-xs text-stone-400 font-medium">QRコードで共有</p>
                <p className="text-sm font-bold text-stone-800 line-clamp-2 leading-snug mt-0.5">
                  {concert.title}
                </p>
              </div>
              <button type="button" onClick={closeQR}
                className="flex-shrink-0 w-8 h-8 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-500 flex items-center justify-center text-sm transition-colors">
                ✕
              </button>
            </div>

            {/* QRコード */}
            <div className="flex justify-center p-4 bg-white border border-stone-100 rounded-xl mb-3">
              <QRCodeSVG value={urls.url} size={qrSize} />
            </div>

            {/* URL表示 */}
            <p className="text-[10px] text-stone-400 break-all leading-relaxed mb-1">{urls.url}</p>
            <p className="text-xs text-stone-500">カメラで読み取るとページが開きます</p>

            {/* コピーボタン */}
            <button type="button" onClick={copyLink}
              className="mt-4 w-full btn-secondary text-sm">
              {copied ? '✅ URLをコピーしました' : '📋 URLをコピー'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
