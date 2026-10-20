import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchConcerts } from '../lib/api';
import { SITE_URL, CATEGORIES } from '../lib/constants';
import { isFreeConcert } from '../lib/utils';
import Calendar, { TimelineAgendaView } from '../components/Calendar';
import ConcertCard from '../components/ConcertCard';
import { toast } from '../components/Toast';
import type { Concert } from '../types';

type CalViewMode = 'calendar' | 'timeline' | 'grid';
type CalQuickFilter = 'all' | 'free' | 'orchestra' | 'chamber' | 'piano' | 'vocal';

function CalendarSyncButton() {
  const [showMenu, setShowMenu] = useState(false);
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const host = SITE_URL.replace(/^https?:\/\//, '');
  const webcalUrl = `webcal://${host}/api/feed/ics`;
  const httpsUrl = `${SITE_URL}/api/feed/ics`;
  const googleUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(httpsUrl).then(() => {
      toast('URLをコピーしました', 'success');
    }).catch(() => {});
    setShowMenu(false);
  };

  if (!showMenu) {
    return (
      <button
        type="button"
        onClick={() => setShowMenu(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-50 text-primary-800 hover:bg-primary-100 border border-primary-200/80 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
      >
        📅 カレンダーアプリと同期
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="absolute right-0 top-0 bg-white border border-stone-200 rounded-xl shadow-xl py-2 w-64 z-20 animate-scale-in">
        <div className="px-3 pb-1 text-xs font-bold text-stone-400 uppercase tracking-wider">カレンダーアプリに登録</div>
        <button
          type="button"
          onClick={() => { window.open(googleUrl, '_blank'); setShowMenu(false); }}
          className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
        >
          <span>📅</span> <span>Google カレンダーに登録</span>
        </button>
        {(isIOS || (!isAndroid)) && (
          <button
            type="button"
            onClick={() => { window.location.href = webcalUrl; setShowMenu(false); }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
          >
            <span>🍎</span> <span>{isIOS ? 'Apple カレンダーに登録' : 'Apple / iCal に登録'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={copyUrl}
          className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
        >
          <span>🔗</span> <span>購読URLをコピー</span>
        </button>
        <button
          type="button"
          onClick={() => setShowMenu(false)}
          className="w-full text-left px-4 py-2 text-xs text-stone-400 hover:bg-stone-50"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = useMemo(() => new Date(), []);

  const monthParam = searchParams.get('month');
  const [year, setYear] = useState(() => {
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      return Number(monthParam.split('-')[0]);
    }
    return today.getFullYear();
  });
  const [month, setMonth] = useState(() => {
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      return Number(monthParam.split('-')[1]) - 1;
    }
    return today.getMonth();
  });

  const viewParam = (searchParams.get('view') as CalViewMode) || 'calendar';
  const viewMode: CalViewMode = ['calendar', 'timeline', 'grid'].includes(viewParam) ? viewParam : 'calendar';

  const filterParam = (searchParams.get('filter') as CalQuickFilter) || 'all';
  const quickFilter: CalQuickFilter = ['all', 'free', 'orchestra', 'chamber', 'piano', 'vocal'].includes(filterParam)
    ? filterParam
    : 'all';

  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const syncParams = useCallback((updates: { view?: CalViewMode; month?: string; filter?: CalQuickFilter }) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (updates.view !== undefined) {
        if (updates.view === 'calendar') next.delete('view');
        else next.set('view', updates.view);
      }
      if (updates.month !== undefined) {
        next.set('month', updates.month);
      }
      if (updates.filter !== undefined) {
        if (updates.filter === 'all') next.delete('filter');
        else next.set('filter', updates.filter);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    setLoading(true);
    const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    fetchConcerts({ dateFrom, dateTo, limit: 100, sort: 'date_asc' }).then((res) => {
      if (res.ok && res.data) {
        setConcerts(res.data);
        // Auto-select first date with concerts if none selected
        if (res.data.length > 0) {
          setSelectedDate((prev) => prev || res.data![0].date);
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [year, month]);

  const filteredConcerts = useMemo(() => {
    if (quickFilter === 'all') return concerts;
    if (quickFilter === 'free') return concerts.filter((c) => isFreeConcert(c.pricing));
    return concerts.filter((c) => c.category === quickFilter || c.tags?.includes(quickFilter));
  }, [concerts, quickFilter]);

  const selectedConcerts = useMemo(() => {
    if (!selectedDate) return [];
    return filteredConcerts.filter((c) => c.date === selectedDate);
  }, [filteredConcerts, selectedDate]);

  const filterPills: Array<{ key: CalQuickFilter; label: string }> = [
    { key: 'all', label: 'すべて' },
    { key: 'free', label: '🎫 入場無料' },
    { key: 'orchestra', label: `${CATEGORIES.orchestra.icon} オーケストラ` },
    { key: 'chamber', label: `${CATEGORIES.chamber.icon} 室内楽` },
    { key: 'piano', label: `${CATEGORIES.piano.icon} ピアノ` },
    { key: 'vocal', label: `${CATEGORIES.vocal.icon} 声楽` },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="fluid-page-title font-serif font-bold text-stone-900">カレンダー・月間スケジュール</h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1">
            月間グリッド・タイムライン・カード一覧を切り替えてスケジュールを確認
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className="inline-flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/80"
            role="tablist"
            aria-label="カレンダー表示切替"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'calendar'}
              onClick={() => syncParams({ view: 'calendar' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                viewMode === 'calendar' ? 'bg-navy-900 text-primary-300 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              📅 月間カレンダー
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'timeline'}
              onClick={() => syncParams({ view: 'timeline' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                viewMode === 'timeline' ? 'bg-navy-900 text-primary-300 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              📋 タイムライン
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'grid'}
              onClick={() => syncParams({ view: 'grid' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                viewMode === 'grid' ? 'bg-navy-900 text-primary-300 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              🖼️ カード一覧
            </button>
          </div>
          <CalendarSyncButton />
        </div>
      </div>

      {/* Quick Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5 mb-5 bg-white p-3 rounded-xl border border-stone-200/70 shadow-sm">
        <span className="text-xs font-semibold text-stone-400 mr-1 whitespace-nowrap">クイック絞込:</span>
        {filterPills.map((pill) => {
          const active = quickFilter === pill.key;
          return (
            <button
              key={pill.key}
              type="button"
              onClick={() => syncParams({ filter: pill.key })}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-navy-900 text-primary-300 shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="skeleton h-8 w-32" />
            <div className="skeleton h-8 w-24" />
          </div>
          <div className="grid grid-cols-7 gap-1">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="skeleton h-14 sm:h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ) : viewMode === 'timeline' ? (
        <TimelineAgendaView concerts={filteredConcerts} />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredConcerts.map((c) => (
            <ConcertCard key={c.id} concert={c} />
          ))}
        </div>
      ) : (
        <>
          <Calendar
            year={year}
            month={month}
            concerts={filteredConcerts}
            selectedDate={selectedDate}
            onMonthChange={(y, m) => {
              setYear(y);
              setMonth(m);
              setSelectedDate(null);
              syncParams({ month: `${y}-${String(m + 1).padStart(2, '0')}` });
            }}
            onDateClick={(_date, ds) => {
              setSelectedDate(ds === selectedDate ? null : ds);
            }}
          />

          {/* Selected Date Concerts Panel (Smoothly expanded below calendar) */}
          {selectedDate && (
            <div className="mt-6 animate-slide-up bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm" data-testid="calendar-day-detail">
              <h2 className="font-serif font-bold text-base sm:text-lg mb-4 flex items-center gap-2 text-stone-900 tabular-nums">
                <span className="text-primary-600">📅</span>
                <span>{selectedDate.replace(/-/g, '/')} の演奏会（{selectedConcerts.length}件）</span>
              </h2>
              {selectedConcerts.length === 0 ? (
                <div className="bg-stone-50 rounded-xl p-6 text-center text-stone-400 text-sm">
                  この日の演奏会はありません
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedConcerts.map((c) => (
                    <ConcertCard key={c.id} concert={c} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Monthly Overview Cards */}
          {filteredConcerts.length > 0 && (
            <div className="mt-8">
              <h2 className="font-serif font-bold text-lg mb-4 text-stone-900 tabular-nums">
                {year}年{month + 1}月のすべての公演（{filteredConcerts.length}件）
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredConcerts.map((c) => (
                  <ConcertCard key={c.id} concert={c} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
