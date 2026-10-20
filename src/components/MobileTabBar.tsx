import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Music,
  BookOpen,
  Wrench,
  Menu,
  Calendar,
  PlusCircle,
  HelpCircle,
  Archive,
  Mail,
  Info,
  Lock,
} from './EditorialIcons';

const MAIN_TABS = [
  { path: '/', label: 'ホーム', Icon: Home },
  { path: '/concerts', label: '公演一覧', Icon: Music },
  { path: '/dictionary', label: '楽語辞典', Icon: BookOpen },
  { path: '/tools', label: 'ツール', Icon: Wrench },
  { path: '/upload', label: '公演登録', Icon: PlusCircle },
];

const MORE_LINKS = [
  { path: '/calendar', label: 'カレンダー', Icon: Calendar },
  { path: '/faq', label: 'よくある質問 (Q&A)', Icon: HelpCircle },
  { path: '/archive', label: 'アーカイブ', Icon: Archive },
  { path: '/contact', label: 'お問い合わせ', Icon: Mail },
  { path: '/docs', label: '使い方・仕様', Icon: BookOpen },
  { path: '/about', label: 'About', Icon: Info },
  { path: '/admin', label: '管理者ページ', Icon: Lock },
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
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More drawer */}
      <div
        className={`fixed bottom-14 left-0 right-0 z-50 bg-navy-900/98 border-t border-primary-800/20 rounded-t-2xl shadow-2xl transition-all duration-300 ${
          showMore
            ? 'translate-y-0 opacity-100'
            : 'translate-y-[calc(100%+4rem)] opacity-0 pointer-events-none'
        }`}
      >
        <div className="px-3 pt-4 pb-6">
          <div className="w-10 h-1 bg-stone-600 rounded-full mx-auto mb-4" />
          <p className="text-xs text-stone-400 px-3 mb-2.5 uppercase tracking-widest font-medium">
            メニュー
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {MORE_LINKS.map((link) => {
              const IconComp = link.Icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setShowMore(false)}
                  className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-xs sm:text-sm transition-colors ${
                    location.pathname === link.path
                      ? 'bg-primary-900/50 text-primary-300'
                      : 'text-stone-300 hover:bg-white/5'
                  }`}
                >
                  <IconComp className="w-4 h-4 text-[#C5A059] shrink-0" strokeWidth={1.5} />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-navy-900/95 backdrop-blur-xl border-t border-primary-800/20 safe-area-bottom">
        <div className="flex justify-around items-center h-14">
          {MAIN_TABS.map((tab) => {
            const IconComp = tab.Icon;
            const isActive =
              tab.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(tab.path) ||
                  (tab.path === '/tools' && location.pathname === '/student-tools');
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive ? 'text-primary-400' : 'text-stone-400'
                }`}
              >
                <IconComp className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isMoreActive || showMore ? 'text-primary-400' : 'text-stone-400'
            }`}
          >
            <Menu className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-[10px] mt-1 font-medium">その他</span>
          </button>
        </div>
      </nav>
    </>
  );
}
