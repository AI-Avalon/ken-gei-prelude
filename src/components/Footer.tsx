import { Link } from 'react-router-dom';
import { SITE_NAME, SITE_URL } from '../lib/constants';

const webcalUrl = `webcal://${SITE_URL.replace(/^https?:\/\//, '')}/api/feed/ics`;

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🎵</span>
              <span className="font-serif font-bold text-white">{SITE_NAME}</span>
            </div>
            <p className="text-sm">
              若き才能の「前奏曲」を、手のひらの中に。
              <br />
              愛知県立芸術大学 音楽学部 演奏会情報ポータル
            </p>
          </div>
          <div>
            <h3 className="text-white font-medium mb-3">リンク</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/concerts" className="hover:text-white transition-colors">演奏会一覧</Link></li>
              <li><Link to="/upload" className="hover:text-white transition-colors">演奏会登録</Link></li>
              <li><Link to="/calendar" className="hover:text-white transition-colors">カレンダー</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">お問い合わせ</Link></li>
              <li><Link to="/docs" className="hover:text-white transition-colors">使い方</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">このサイトについて</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-medium mb-3">カレンダー購読</h3>
            <p className="text-sm mb-2">全演奏会をカレンダーに自動同期</p>
            <code className="text-xs bg-gray-800 px-2 py-1 rounded block break-all">
              {webcalUrl}
            </code>
            <div className="mt-4">
              <a
                href="https://github.com/AI-Avalon/ken-gei-prelude"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:text-white transition-colors"
              >
                GitHub →
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-xs">
          <p>© {new Date().getFullYear()} {SITE_NAME} — MIT License</p>
        </div>
      </div>
    </footer>
  );
}
