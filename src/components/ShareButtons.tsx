import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { googleCalendarUrl, outlookCalendarUrl, yahooCalendarUrl, downloadICS, shareUrls } from '../lib/utils';
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
      <div className="flex flex-wrap gap-2">
        <button onClick={copyLink}
          className="btn-secondary text-sm">
          {copied ? '✅ コピーしました' : '📋 リンクコピー'}
        </button>
        <a href={urls.twitter} target="_blank" rel="noopener noreferrer"
          className="btn-secondary text-sm inline-flex items-center gap-1">
          𝕏 ポスト
        </a>
        <a href={urls.line} target="_blank" rel="noopener noreferrer"
          className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors">
          LINE
        </a>
        <a href={urls.facebook} target="_blank" rel="noopener noreferrer"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          Facebook
        </a>
        <button onClick={() => setShowQR(!showQR)}
          className="btn-secondary text-sm">QR</button>
      </div>

      {/* Calendar buttons */}
      <div className="flex flex-wrap gap-2">
        <a href={googleCalendarUrl(concert)} target="_blank" rel="noopener noreferrer"
          className="btn-secondary text-sm">📅 Google</a>
        <button onClick={() => downloadICS(concert)}
          className="btn-secondary text-sm">🍎 Apple/iCal</button>
        <a href={outlookCalendarUrl(concert)} target="_blank" rel="noopener noreferrer"
          className="btn-secondary text-sm">📧 Outlook</a>
        <a href={yahooCalendarUrl(concert)} target="_blank" rel="noopener noreferrer"
          className="btn-secondary text-sm">📅 Yahoo!</a>
        <button onClick={() => downloadICS(concert)}
          className="btn-secondary text-sm">⬇ ICSダウンロード</button>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-xl p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-4">{concert.title}</h3>
            <QRCodeSVG value={urls.url} size={256} />
            <p className="text-sm text-gray-500 mt-4 max-w-xs break-all">{urls.url}</p>
            <button onClick={() => setShowQR(false)} className="btn-secondary mt-4">閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}
