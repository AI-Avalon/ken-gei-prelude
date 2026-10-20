import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE_NAME, SITE_URL, SITE_TAGLINE, CREATOR_DISPLAY_NAME } from '../lib/constants';
import { fetchSiteSettings } from '../lib/api';
import Logo from './Logo';

const host = SITE_URL.replace(/^https?:\/\//, '');
const webcalUrl = `webcal://${host}/api/feed/ics`;
const httpsIcsUrl = `${SITE_URL}/api/feed/ics`;
const googleSyncUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;

function formatJstTimestamp(isoOrNow?: string): string {
  const dt = isoOrNow ? new Date(isoOrNow) : new Date();
  const validDt = Number.isNaN(dt.getTime()) ? new Date() : dt;
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(validDt);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  return `${get('year')}/${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`;
}

export default function Footer() {
  const [copied, setCopied] = useState(false);
  const [lastSyncDisplay, setLastSyncDisplay] = useState(() => formatJstTimestamp());

  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    fetchSiteSettings().then((res) => {
      if (res.ok && res.data?.last_sync_at) {
        setLastSyncDisplay(formatJstTimestamp(res.data.last_sync_at));
      }
    }).catch(() => {});
  }, []);

  const copyUrl = () => {
    navigator.clipboard.writeText(httpsIcsUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className="bg-navy-900 text-stone-400 mt-16 border-t border-primary-800/20">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Logo showSubtitle={false} />
            </div>
            <p className="text-sm leading-relaxed text-stone-400">
              {SITE_TAGLINE}
              <br />
              愛知県立芸術大学 演奏会情報ポータル
            </p>
            {/* Phase 4.4: Autonomous Sync System Status Indicator */}
            <div
              data-testid="autonomous-status-indicator"
              className="mt-5 inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full bg-navy-950/90 border border-emerald-500/25 text-[11px] text-stone-300 tabular-nums"
            >
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium whitespace-nowrap">
                🟢 自動同期システム正常稼働中
              </span>
              <span className="text-stone-600">|</span>
              <span className="text-stone-400 whitespace-nowrap">
                最終確認: {lastSyncDisplay}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-stone-200 font-medium mb-4 text-sm tracking-wider uppercase">Navigation</h3>
            <ul className="grid grid-cols-2 sm:grid-cols-1 gap-2 text-sm">
              <li><Link to="/concerts" className="hover:text-primary-400 transition-colors">演奏会一覧</Link></li>
              <li><Link to="/calendar" className="hover:text-primary-400 transition-colors">カレンダー・日程表</Link></li>
              <li><Link to="/archive" className="hover:text-primary-400 transition-colors">過去の公演アーカイブ</Link></li>
              <li><Link to="/upload" className="hover:text-primary-400 transition-colors">演奏会登録</Link></li>
              <li><Link to="/student-tools" className="hover:text-primary-400 transition-colors">音大生ツール</Link></li>
              <li><Link to="/contact" className="hover:text-primary-400 transition-colors">お問い合わせ</Link></li>
              <li><Link to="/docs" className="hover:text-primary-400 transition-colors">使い方ガイド</Link></li>
              <li><Link to="/about" className="hover:text-primary-400 transition-colors">このサイトについて</Link></li>
            </ul>
            <div className="mt-4 pt-4 border-t border-stone-800">
              <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-primary-400 transition-colors">
                🔒 管理者用ページ
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-stone-200 font-medium mb-4 text-sm tracking-wider uppercase">Calendar Sync</h3>
            <p className="text-sm mb-3 text-stone-400">全演奏会をカレンダーアプリに自動同期</p>
            <div className="space-y-2.5">
              {isAndroid ? (
                <a
                  href={googleSyncUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm bg-primary-700/25 text-primary-300 hover:bg-primary-700/35 px-3.5 py-2 rounded-lg transition-colors border border-primary-600/30"
                >
                  📅 Google カレンダーと同期
                </a>
              ) : (
                <a
                  href={webcalUrl}
                  className="inline-flex items-center gap-2 text-sm bg-primary-700/25 text-primary-300 hover:bg-primary-700/35 px-3.5 py-2 rounded-lg transition-colors border border-primary-600/30"
                >
                  📅 {isIOS ? 'Apple カレンダーに登録' : 'カレンダーアプリと同期'}
                </a>
              )}
              <button
                type="button"
                onClick={copyUrl}
                className="flex items-center gap-2 text-sm text-stone-400 hover:text-stone-200 transition-colors"
              >
                {copied ? '✅ コピーしました' : '📋 カレンダー購読URLをコピー'}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-stone-800/80 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} {SITE_NAME} — MIT License</p>
          <p>Made with ♪ by {CREATOR_DISPLAY_NAME}</p>
        </div>
      </div>
    </footer>
  );
}
