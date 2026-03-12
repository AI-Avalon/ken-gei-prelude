import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { shareUrls } from '../lib/utils';
import type { Concert } from '../types';

export default function ShareButtons({ concert }: { concert: Concert }) {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const urls = shareUrls(concert);

  const copyLink = async () => {
    await navigator.clipboard.writeText(urls.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Share buttons */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <button onClick={copyLink}
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
        <button onClick={() => setShowQR(!showQR)}
          className="btn-secondary text-sm">QR</button>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-xl p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-4">{concert.title}</h3>
            <QRCodeSVG value={urls.url} size={256} />
            <p className="text-sm text-stone-500 mt-4 max-w-xs break-all">{urls.url}</p>
            <button onClick={() => setShowQR(false)} className="btn-secondary mt-4">閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}
