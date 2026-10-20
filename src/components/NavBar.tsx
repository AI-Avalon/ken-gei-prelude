import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';

const NAV_LINKS = [
  { path: '/concerts', label: '演奏会一覧' },
  { path: '/calendar', label: 'カレンダー' },
  { path: '/archive', label: 'アーカイブ' },
  { path: '/student-tools', label: '音大生ツール' },
  { path: '/upload', label: '演奏会登録' },
  { path: '/contact', label: 'お問い合わせ' },
  { path: '/docs', label: '使い方' },
  { path: '/about', label: 'About' },
];

export default function NavBar() {
  const location = useLocation();

  return (
    <header className="bg-navy-900/95 border-b border-primary-800/20 sticky top-0 z-50 backdrop-blur-xl backdrop-saturate-150">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between min-h-[56px] sm:min-h-[64px] py-2 gap-2">
          <div className="flex items-center">
            <Logo showSubtitle={false} />
          </div>

          {/* Single JSX Tree Navigation Bar (scrollable on narrow screens, inline on desktop) */}
          <nav
            aria-label="メインナビゲーション"
            className="flex items-center gap-1 overflow-x-auto scrollbar-hide max-w-full py-0.5"
          >
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-all ${
                    isActive
                      ? 'text-primary-300 bg-primary-900/50 border border-primary-700/40'
                      : 'text-stone-300 hover:text-primary-300 hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
