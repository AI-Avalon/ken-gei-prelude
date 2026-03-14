import { useState, useEffect, createContext, useContext } from 'react';

// 640px: スマートフォン/タブレット境界
// iPad mini portrait (744px) はタブレットとしてデスクトップNavBarを表示
const MOBILE_BREAKPOINT = 640;

const DeviceContext = createContext(false);

function useIsMobileInternal(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`); // 639px以下がモバイル
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

export { DeviceContext, useIsMobileInternal };

export function useIsMobile(): boolean {
  return useContext(DeviceContext);
}
