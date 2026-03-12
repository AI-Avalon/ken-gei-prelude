import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SITE_NAME } from '../lib/constants';

const NAV_LINKS = [
  { path: '/concerts', label: '演奏会一覧' },
  { path: '/calendar', label: 'カレンダー' },
  { path: '/archive', label: 'アーカイブ' },
  { path: '/upload', label: '演奏会登録' },
  { path: '/contact', label: 'お問い合わせ' },
  { path: '/docs', label: '使い方' },
];

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="bg-navy-900/95 border-b border-primary-800/20 sticky top-0 z-50 backdrop-blur-xl backdrop-saturate-150">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3 group">
              <span className="text-primary-400 text-xl tracking-widest font-display font-semibold group-hover:text-primary-300 transition-colors">
                {SITE_NAME}
              </span>
              <span className="hidden sm:inline text-[10px] text-stone-500 tracking-[0.15em] uppercase border-l border-stone-700 pl-3">
                Aichi Univ. of the Arts
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                  location.pathname === link.path
                    ? 'text-primary-300 bg-primary-900/40'
                    : 'text-stone-400 hover:text-primary-300 hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded text-stone-400 hover:text-primary-300 hover:bg-white/5"
              aria-label="メニュー"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-1 border-t border-stone-800 pt-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2 rounded text-base font-medium ${
                  location.pathname === link.path
                    ? 'text-primary-300 bg-primary-900/40'
                    : 'text-stone-400 hover:text-primary-300 hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
