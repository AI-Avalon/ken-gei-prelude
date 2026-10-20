import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import { fetchConcerts } from '../lib/api';
import { CATEGORIES } from '../lib/constants';
import { isFreeConcert } from '../lib/utils';
import ConcertCard from '../components/ConcertCard';
import FilterBar, { type QuickFilterType } from '../components/FilterBar';
import Calendar, { TimelineAgendaView } from '../components/Calendar';
import type { Concert } from '../types';

export type ViewMode = 'grid' | 'calendar' | 'timeline';

const fuseOptions = {
  keys: [
    'title',
    'subtitle',
    'venue.name',
    'venue.address',
    'category',
    'description',
    'program.composer',
    'program.piece',
    'performers.name',
    'performers.instrument',
    'instruments',
    'tags',
    'departments',
  ],
  threshold: 0.32,
  ignoreLocation: true,
};

export default function ConcertListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial state from URL query parameters
  const viewParam = (searchParams.get('view') as ViewMode) || 'grid';
  const viewMode: ViewMode = ['grid', 'calendar', 'timeline'].includes(viewParam) ? viewParam : 'grid';

  const filterParam = (searchParams.get('filter') as QuickFilterType) || 'all';
  const quickFilter: QuickFilterType = ['all', 'week', 'month', 'free', 'archive'].includes(filterParam)
    ? filterParam
    : 'all';

  const monthParam = searchParams.get('month');
  const now = useMemo(() => new Date(), []);

  const [calYear, setCalYear] = useState(() => {
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      return Number(monthParam.split('-')[0]);
    }
    return now.getFullYear();
  });
  const [calMonth, setCalMonth] = useState(() => {
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      return Number(monthParam.split('-')[1]) - 1;
    }
    return now.getMonth();
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const c = searchParams.get('category');
    return c ? c.split(',').filter(Boolean) : [];
  });
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || 'date_asc');

  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync state changes back to URL query parameters
  const updateUrlParams = useCallback((updates: {
    view?: ViewMode;
    filter?: QuickFilterType;
    categories?: string[];
    q?: string;
    sort?: string;
    month?: string;
  }) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (updates.view !== undefined) {
        if (updates.view === 'grid') next.delete('view');
        else next.set('view', updates.view);
      }
      if (updates.filter !== undefined) {
        if (updates.filter === 'all') next.delete('filter');
        else next.set('filter', updates.filter);
      }
      if (updates.categories !== undefined) {
        if (updates.categories.length === 0) next.delete('category');
        else next.set('category', updates.categories.join(','));
      }
      if (updates.q !== undefined) {
        if (!updates.q.trim()) next.delete('q');
        else next.set('q', updates.q.trim());
      }
      if (updates.sort !== undefined) {
        if (updates.sort === 'date_asc') next.delete('sort');
        else next.set('sort', updates.sort);
      }
      if (updates.month !== undefined) {
        next.set('month', updates.month);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const weekEndStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const monthRange = useMemo(() => {
    const y = viewMode === 'calendar' ? calYear : now.getFullYear();
    const m = viewMode === 'calendar' ? calMonth : now.getMonth();
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  }, [viewMode, calYear, calMonth, now]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    // Fetch broad list so client-side smart search, calendar, and quick filters respond instantaneously
    const isArchiveMode = quickFilter === 'archive';
    const isCalendarMode = viewMode === 'calendar';

    const dateFrom = isArchiveMode
      ? undefined
      : isCalendarMode
      ? monthRange.start
      : todayStr;
    const dateTo = isArchiveMode
      ? todayStr
      : isCalendarMode
      ? monthRange.end
      : undefined;

    fetchConcerts({
      limit: 100,
      category: selectedCategories.length > 0 ? selectedCategories.join(',') : undefined,
      sort: isArchiveMode ? 'date_desc' : sortBy,
      dateFrom,
      dateTo,
    }).then((res) => {
      if (!active) return;
      if (res.ok && res.data) {
        setConcerts(res.data);
      }
      setLoading(false);
    }).catch(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [selectedCategories, sortBy, quickFilter, viewMode, monthRange.start, monthRange.end, todayStr]);

  // Apply QuickFilter + Incremental Smart Search (Composer / Instrument / Venue / Title)
  const filtered = useMemo(() => {
    let result = [...concerts];

    if (quickFilter === 'week') {
      result = result.filter((c) => c.date >= todayStr && c.date <= weekEndStr);
    } else if (quickFilter === 'month') {
      result = result.filter((c) => c.date >= monthRange.start && c.date <= monthRange.end);
    } else if (quickFilter === 'free') {
      result = result.filter((c) => isFreeConcert(c.pricing));
    } else if (quickFilter === 'archive') {
      result = result.filter((c) => c.date < todayStr);
    }

    if (selectedCategories.length > 0) {
      result = result.filter((c) => selectedCategories.includes(c.category));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const fuse = new Fuse(result, fuseOptions);
      const fuseMatches = fuse.search(searchQuery.trim()).map((r) => r.item);
      // Combine exact substring matches across all fields with fuzzy matches
      const exactMatches = result.filter((c) => {
        const haystack = [
          c.title,
          c.subtitle,
          c.venue?.name,
          c.venue?.address,
          c.description,
          ...(c.program || []).map((p) => `${p.composer} ${p.piece}`),
          ...(c.performers || []).map((p) => `${p.name} ${p.instrument || ''}`),
          ...(c.instruments || []),
          ...(c.tags || []),
        ].join(' ').toLowerCase();
        return haystack.includes(q);
      });
      const seen = new Set<string>();
      const merged: Concert[] = [];
      for (const item of [...exactMatches, ...fuseMatches]) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      }
      result = merged;
    }

    return result;
  }, [concerts, quickFilter, selectedCategories, searchQuery, todayStr, weekEndStr, monthRange]);

  const selectedDateConcerts = useMemo(() => {
    if (!selectedDate) return [];
    return filtered.filter((c) => c.date === selectedDate);
  }, [filtered, selectedDate]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      {/* Header + 3-View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="fluid-page-title font-serif font-bold text-stone-900">演奏会一覧・スケジュール</h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1">
            {quickFilter === 'archive'
              ? 'これまでに開催された過去の公演アーカイブ'
              : 'タイトル・作曲家・楽器・会場名で検索、3つのビューで比較'}
          </p>
        </div>

        {/* 3-View Switcher (Grid / Calendar / Timeline) */}
        <div
          className="inline-flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/80 self-start sm:self-auto"
          role="tablist"
          aria-label="表示モード切替"
          data-testid="view-mode-switcher"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'grid'}
            data-testid="view-mode-grid"
            onClick={() => updateUrlParams({ view: 'grid' })}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              viewMode === 'grid'
                ? 'bg-navy-900 text-primary-300 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            🖼️ カード一覧
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'calendar'}
            data-testid="view-mode-calendar"
            onClick={() => updateUrlParams({ view: 'calendar' })}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              viewMode === 'calendar'
                ? 'bg-navy-900 text-primary-300 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            📅 月間カレンダー
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'timeline'}
            data-testid="view-mode-timeline"
            onClick={() => updateUrlParams({ view: 'timeline' })}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              viewMode === 'timeline'
                ? 'bg-navy-900 text-primary-300 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            📋 タイムライン
          </button>
        </div>
      </div>

      {/* Smart Filter Bar */}
      <FilterBar
        categories={CATEGORIES}
        selected={selectedCategories}
        onChange={(cats) => {
          setSelectedCategories(cats);
          updateUrlParams({ categories: cats });
        }}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          updateUrlParams({ q });
        }}
        sortBy={sortBy}
        onSortChange={(s) => {
          setSortBy(s);
          updateUrlParams({ sort: s });
        }}
        quickFilter={quickFilter}
        onQuickFilterChange={(qf) => {
          updateUrlParams({ filter: qf });
        }}
      />

      {/* Main Content Area */}
      <div className="mt-6">
        {loading && concerts.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
                <div className="skeleton h-40 w-full" />
                <div className="p-4 space-y-3">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                  <div className="skeleton h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === 'calendar' ? (
          <div className="space-y-6">
            <Calendar
              year={calYear}
              month={calMonth}
              concerts={filtered}
              selectedDate={selectedDate}
              onMonthChange={(y, m) => {
                setCalYear(y);
                setCalMonth(m);
                setSelectedDate(null);
                updateUrlParams({ month: `${y}-${String(m + 1).padStart(2, '0')}` });
              }}
              onDateClick={(_date, dateStr) => {
                setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
              }}
            />

            {selectedDate && (
              <div className="animate-slide-up bg-stone-50/90 rounded-2xl p-4 sm:p-5 border border-stone-200/80" data-testid="calendar-selected-date-panel">
                <h2 className="font-serif font-bold text-base sm:text-lg mb-3 flex items-center gap-2 text-stone-900 tabular-nums">
                  <span className="text-primary-600">📅</span>
                  <span>{selectedDate.replace(/-/g, '/')} の演奏会（{selectedDateConcerts.length}件）</span>
                </h2>
                {selectedDateConcerts.length === 0 ? (
                  <p className="text-sm text-stone-500 py-4 text-center">この日の演奏会はありません</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedDateConcerts.map((c) => (
                      <ConcertCard key={c.id} concert={c} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Also show monthly list below calendar */}
            <div>
              <h2 className="font-serif font-bold text-base sm:text-lg mb-3 text-stone-800 tabular-nums">
                {calYear}年{calMonth + 1}月の公演一覧（{filtered.length}件）
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((c) => (
                  <ConcertCard key={c.id} concert={c} />
                ))}
              </div>
            </div>
          </div>
        ) : viewMode === 'timeline' ? (
          <TimelineAgendaView concerts={filtered} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200/60 text-stone-400">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-lg mb-2 font-serif text-stone-700">該当する演奏会がありません</p>
            <p className="text-sm mb-4">
              {selectedCategories.length > 0 || searchQuery || quickFilter !== 'all'
                ? 'フィルターや検索条件を変更するか、「過去の公演アーカイブ」をご確認ください'
                : '近日中に演奏会が追加される予定です'}
            </p>
            {quickFilter !== 'archive' && (
              <button
                type="button"
                onClick={() => updateUrlParams({ filter: 'archive', categories: [], q: '' })}
                className="btn-secondary text-sm"
              >
                📦 過去の公演アーカイブを表示する
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-stone-500 mb-3 tabular-nums">{filtered.length}件の公演を表示中</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((c) => (
                <ConcertCard key={c.id} concert={c} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
