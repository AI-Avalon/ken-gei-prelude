// Crescendo — Calendar Add Dropdown
// Spec: Chapter 10 — カレンダー連携
// 2セクション構成: この予定だけ追加 / 全演奏会を自動購読

import { useState, useRef, useEffect } from 'react';
import type { Concert } from '../types';
import { googleCalendarUrl, outlookCalendarUrl, yahooCalendarUrl, downloadICS } from '../lib/utils';
import { SITE_URL } from '../lib/constants';

interface Props {
  concert: Concert;
}

export default function CalendarAddDropdown({ concert }: Props) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const host = SITE_URL.replace(/^https?:\/\//, '');
  const webcalAllUrl = `webcal://${host}/api/feed/ics`;
  const googleSubUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalAllUrl)}`;
  const httpsIcsUrl = `${SITE_URL}/api/feed/ics`;

  // この予定だけ追加
  const singleItems = [
    {
      label: 'Google カレンダーに追加',
      icon: '📅',
      onClick: () => window.open(googleCalendarUrl(concert), '_blank'),
    },
    {
      label: 'Apple / iCalに追加',
      icon: '🍎',
      onClick: () => downloadICS(concert),
    },
    {
      label: 'TimeTreeに追加',
      icon: '🌲',
      onClick: () => downloadICS(concert),
    },
    {
      label: 'Outlookに追加',
      icon: '📧',
      onClick: () => window.open(outlookCalendarUrl(concert), '_blank'),
    },
    {
      label: 'Yahoo!カレンダーに追加',
      icon: '🔴',
      onClick: () => window.open(yahooCalendarUrl(concert), '_blank'),
    },
    {
      label: 'ICSファイルをダウンロード',
      icon: '⬇️',
      onClick: () => downloadICS(concert),
    },
  ];

  // 全演奏会を自動購読
  const subscribeItems = [
    {
      label: 'Google カレンダーで購読',
      icon: '📅',
      onClick: () => window.open(googleSubUrl, '_blank'),
    },
    {
      label: 'Apple / iCalで購読',
      icon: '🍎',
      onClick: () => { window.location.href = webcalAllUrl; },
    },
    {
      label: 'Outlookで購読',
      icon: '📧',
      onClick: () => { window.location.href = webcalAllUrl; },
    },
    {
      label: '購読URL をコピー',
      icon: '🔗',
      onClick: () => {
        navigator.clipboard.writeText(httpsIcsUrl).catch(() => {});
      },
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center text-base py-3 px-6"
      >
        📅 カレンダーに追加
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white border border-stone-200 rounded-xl shadow-2xl py-2 left-0 sm:left-auto sm:right-0 animate-scale-in">
          {/* この予定だけ追加 */}
          <div className="px-4 pt-2 pb-1">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">📌 この予定だけ追加</span>
          </div>
          {singleItems.map((item, i) => (
            <button
              key={`s-${i}`}
              onClick={() => { item.onClick(); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 flex items-center gap-3 transition-colors"
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          <div className="border-t border-stone-200 my-1" />

          {/* 全演奏会を自動購読 */}
          <div className="px-4 pt-2 pb-1">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">🔄 全演奏会を自動購読</span>
          </div>
          <p className="px-4 pb-1 text-xs text-stone-400">新しい演奏会が追加されると自動で反映されます</p>
          {subscribeItems.map((item, i) => (
            <button
              key={`a-${i}`}
              onClick={() => { item.onClick(); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent-50 flex items-center gap-3 transition-colors"
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
