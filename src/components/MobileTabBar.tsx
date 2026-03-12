import { Link, useLocation } from 'react-router-dom';

const TABS = [
  { path: '/', label: 'ホーム', icon: '🏠' },
  { path: '/concerts', label: '一覧', icon: '🎵' },
  { path: '/calendar', label: 'カレンダー', icon: '📅' },
  { path: '/upload', label: '登録', icon: '✏️' },
  { path: '/docs', label: 'その他', icon: '≡' },
];

export default function MobileTabBar() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-navy-900/95 backdrop-blur-xl border-t border-primary-800/20 safe-area-bottom">
      <div className="flex justify-around items-center h-14">
        {TABS.map((tab) => {
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
      </div>
    </nav>
  );
}
