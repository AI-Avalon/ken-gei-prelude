// Crescendo — Calendar Add Dropdown
// Spec: Chapter 10 — カレンダー連携
// 2セクション構成: この予定だけ追加 / 全演奏会をカレンダーに同期

import { useState, useRef, useEffect } from 'react';
import type { Concert } from '../types';
import { googleCalendarUrl, outlookCalendarUrl, yahooCalendarUrl, downloadICS } from '../lib/utils';
import { CATEGORIES, SITE_URL } from '../lib/constants';
import { toast } from './Toast';

interface Props {
  concert: Concert;
}

// プラットフォーム検出
function detectPlatform() {
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMac = /Macintosh|MacIntel/i.test(ua) && !isIOS;
  return { isAndroid, isIOS, isMac };
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
  const feedUrl = (category = '', scheme: 'webcal' | 'https' = 'https') => {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return scheme === 'webcal'
      ? `webcal://${host}/api/feed/ics${query}`
      : `${SITE_URL}/api/feed/ics${query}`;
  };
  const googleSubUrl = (category = '') => `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(feedUrl(category, 'webcal'))}`;

  const { isAndroid, isIOS, isMac } = detectPlatform();

  const copyIcsUrl = (category = '') => {
    navigator.clipboard.writeText(feedUrl(category)).then(() => {
      toast('カレンダーURLをコピーしました', 'success');
    }).catch(() => {
      toast('コピーに失敗しました', 'error');
    });
  };

  // この予定だけ追加
  const singleItems = [
    {
      label: 'Google カレンダーに追加',
      icon: '📅',
      onClick: () => window.open(googleCalendarUrl(concert), '_blank'),
    },
    {
      label: 'Apple カレンダーに追加',
      icon: '🍎',
      onClick: () => downloadICS(concert),
      hidden: isAndroid,
    },
    {
      label: 'TimeTreeに追加',
      icon: '🌲',
      onClick: () => downloadICS(concert),
    },
    {
      label: 'Outlookに追加',
      icon: '📧',
      onClick: () => {
        if (isAndroid) {
          // Androidでは直接URLを使わずICSダウンロード
          downloadICS(concert);
        } else {
          window.open(outlookCalendarUrl(concert), '_blank');
        }
      },
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
  ].filter((item) => !item.hidden);

  const feedChoices = [
    { label: 'すべて', value: '', description: '公開中の全演奏会' },
    { label: CATEGORIES.self_planned.label, value: 'self_planned', description: '学生の自主企画を中心に受け取る' },
    { label: CATEGORIES.daigaku.label, value: 'daigaku', description: '大学主催だけを受け取る' },
    { label: CATEGORIES.major_teiki.label, value: 'major_teiki', description: '専攻定期だけを受け取る' },
    { label: '室内楽/アンサンブル', value: 'chamber,ensemble', description: '小編成の演奏会を受け取る' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center text-base py-3 px-6"
        aria-expanded={open}
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
              type="button"
              onClick={() => { item.onClick(); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 flex items-center gap-3 transition-colors"
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          <div className="border-t border-stone-200 my-1" />

          {/* カレンダー同期 */}
          <div className="px-4 pt-2 pb-1">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">🔄 受け取る演奏会を選んで同期</span>
          </div>
          <p className="px-4 pb-1 text-xs text-stone-400">新しい演奏会が追加されると、選んだ範囲だけ反映されます</p>
          {feedChoices.map((choice) => (
            <div key={choice.value || 'all'} className="px-3 py-2 hover:bg-accent-50 transition-colors">
              <div className="mb-1 text-sm font-medium text-stone-800">{choice.label}</div>
              <div className="mb-2 text-xs text-stone-400">{choice.description}</div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => { window.open(googleSubUrl(choice.value), '_blank'); setOpen(false); }}
                  className="rounded-full bg-white border border-stone-200 px-2.5 py-1 text-[11px] text-stone-700 hover:border-primary-300"
                >
                  Google
                </button>
                {!isAndroid && (
                  <button
                    type="button"
                    onClick={() => { window.location.href = feedUrl(choice.value, 'webcal'); setOpen(false); }}
                    className="rounded-full bg-white border border-stone-200 px-2.5 py-1 text-[11px] text-stone-700 hover:border-primary-300"
                  >
                    {isIOS || isMac ? 'Apple' : 'Apple/iCal'}
                  </button>
                )}
                {!isIOS && !isAndroid && (
                  <button
                    type="button"
                    onClick={() => { window.location.href = feedUrl(choice.value, 'webcal'); setOpen(false); }}
                    className="rounded-full bg-white border border-stone-200 px-2.5 py-1 text-[11px] text-stone-700 hover:border-primary-300"
                  >
                    Outlook
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { copyIcsUrl(choice.value); setOpen(false); }}
                  className="rounded-full bg-white border border-stone-200 px-2.5 py-1 text-[11px] text-stone-700 hover:border-primary-300"
                >
                  URLコピー
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
