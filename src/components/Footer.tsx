import { Link } from 'react-router-dom';
import { SITE_NAME, SITE_URL, SITE_TAGLINE, CREATOR_NAME, CREATOR_HANDLE } from '../lib/constants';

const webcalUrl = `webcal://${SITE_URL.replace(/^https?:\/\//, '')}/api/feed/ics`;

export default function Footer() {
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
              <li><Link to="/admin" className="hover:text-primary-400 transition-colors text-stone-600">管理者</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-stone-300 font-medium mb-4 text-sm tracking-wider uppercase">Calendar</h3>
            <p className="text-sm mb-2">全演奏会をカレンダーに自動同期</p>
            <code className="text-xs bg-navy-950 px-2 py-1 rounded block break-all text-stone-400 border border-stone-800">
              {webcalUrl}
            </code>
            <div className="mt-5 flex items-center gap-4">
              <a
                href="https://github.com/AI-Avalon/ken-gei-prelude"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:text-primary-400 transition-colors"
              >
                GitHub →
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-stone-800 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-600">
          <p>© {new Date().getFullYear()} {SITE_NAME} — MIT License</p>
          <p>Made by {CREATOR_NAME} (<a href={`https://github.com/${CREATOR_HANDLE}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary-400 transition-colors">@{CREATOR_HANDLE}</a>)</p>
        </div>
      </div>
    </footer>
  );
}
