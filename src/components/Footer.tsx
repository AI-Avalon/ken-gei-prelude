import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE_NAME, SITE_URL, SITE_TAGLINE, CREATOR_NAME } from '../lib/constants';

const webcalUrl = `webcal://${SITE_URL.replace(/^https?:\/\//, '')}/api/feed/ics`;
const httpsIcsUrl = `${SITE_URL}/api/feed/ics`;

export default function Footer() {
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    navigator.clipboard.writeText(httpsIcsUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className="bg-navy-900 text-stone-500 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="font-display text-xl tracking-widest text-primary-400">{SITE_NAME}</span>
            </div>
            <p className="text-sm leading-relaxed text-stone-500">
              {SITE_TAGLINE}
              <br />
              愛知県立芸術大学 音楽学部 演奏会情報ポータル
            </p>
          </div>
          <div>
            <h3 className="text-stone-300 font-medium mb-4 text-sm tracking-wider uppercase">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/concerts" className="hover:text-primary-400 transition-colors">演奏会一覧</Link></li>
              <li><Link to="/upload" className="hover:text-primary-400 transition-colors">演奏会登録</Link></li>
              <li><Link to="/calendar" className="hover:text-primary-400 transition-colors">カレンダー</Link></li>
              <li><Link to="/contact" className="hover:text-primary-400 transition-colors">お問い合わせ</Link></li>
              <li><Link to="/docs" className="hover:text-primary-400 transition-colors">使い方</Link></li>
              <li><Link to="/about" className="hover:text-primary-400 transition-colors">このサイトについて</Link></li>
            </ul>
            <div className="mt-4 pt-4 border-t border-stone-800">
              <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-primary-400 transition-colors">
                🔒 管理者用ページ
              </Link>
            </div>
          </div>
          <div>
            <h3 className="text-stone-300 font-medium mb-4 text-sm tracking-wider uppercase">Calendar</h3>
            <p className="text-sm mb-3">全演奏会をカレンダーに自動同期</p>
            <div className="space-y-2">
              <a
                href={webcalUrl}
                className="inline-flex items-center gap-2 text-sm bg-primary-700/20 text-primary-400 hover:bg-primary-700/30 px-3 py-2 rounded-lg transition-colors"
              >
                📅 カレンダーアプリで購読
              </a>
              <button
                onClick={copyUrl}
                className="flex items-center gap-2 text-sm text-stone-400 hover:text-stone-300 transition-colors"
              >
                {copied ? '✅ コピーしました' : '📋 購読URLをコピー'}
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-stone-800 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-600">
          <p>© {new Date().getFullYear()} {SITE_NAME} — MIT License</p>
          <p>Made with ♪ by {CREATOR_NAME}</p>
        </div>
      </div>
    </footer>
  );
}
