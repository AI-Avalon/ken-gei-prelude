import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const MAIN_TABS = [
  { path: '/', label: 'ホーム', icon: '🏠' },
  { path: '/concerts', label: '一覧', icon: '🎵' },
  { path: '/calendar', label: 'カレンダー', icon: '📅' },
  { path: '/archive', label: '検索', icon: '🔍' },
];

const MORE_LINKS = [
  { path: '/upload', label: '演奏会を登録', icon: '✏️' },
  { path: '/contact', label: 'お問い合わせ', icon: '✉️' },
  { path: '/docs', label: '使い方ガイド', icon: '📖' },
  { path: '/about', label: 'このサイトについて', icon: 'ℹ️' },
  { path: '/admin', label: '管理者ページ', icon: '🔒' },
];

export default function MobileTabBar() {
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = MORE_LINKS.some((l) => location.pathname === l.path);

  return (
    <>
      {/* More drawer overlay */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More drawer */}
      <div
        className={`fixed bottom-14 left-0 right-0 z-50 bg-navy-900/98 border-t border-primary-800/20 rounded-t-2xl shadow-2xl transition-transform duration-300 ${
          showMore ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="px-2 pt-4 pb-6">
          <div className="w-10 h-1 bg-stone-600 rounded-full mx-auto mb-5" />
          <p className="text-xs text-stone-500 px-4 mb-3 uppercase tracking-widest font-medium">メニュー</p>
          <div className="grid grid-cols-2 gap-1">
            {MORE_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setShowMore(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                  location.pathname === link.path
                    ? 'bg-primary-900/50 text-primary-300'
                    : 'text-stone-300 hover:bg-white/5'
                }`}
              >
                <span className="text-xl">{link.icon}</span>
                <span className="font-medium">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-navy-900/95 backdrop-blur-xl border-t border-primary-800/20 safe-area-bottom">
        <div className="flex justify-around items-center h-14">
          {MAIN_TABS.map((tab) => {
            const isActive = tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive ? 'text-primary-400' : 'text-stone-500'
                }`}
              >
                <span className="text-lg leading-none">{tab.icon}</span>
                <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
              </Link>
            );
          })}
          {/* その他ボタン */}
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isMoreActive || showMore ? 'text-primary-400' : 'text-stone-500'
            }`}
          >
            <span className="text-lg leading-none">≡</span>
            <span className="text-[10px] mt-0.5 font-medium">その他</span>
          </button>
        </div>
      </nav>
    </>
  );
}
