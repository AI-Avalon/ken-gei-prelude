// Ken-Gei Prelude — Calendar Add Dropdown
// Spec: Chapter 10 — カレンダー連携

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

  const webcalUrl = `webcal://${SITE_URL.replace(/^https?:\/\//, '')}/api/feed/ics`;

  const items = [
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
    {
      label: 'Webcalで購読する',
      icon: '🔗',
      onClick: () => { window.location.href = webcalUrl; },
    },
  ];

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-secondary flex items-center gap-2"
      >
        📅 カレンダーに追加
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg py-1 right-0">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 flex items-center gap-3 transition-colors"
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
