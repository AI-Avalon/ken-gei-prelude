import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES, DAY_OF_WEEK } from '../lib/constants';
import { formatDateShort, formatPricing, getConcertStatusBadges } from '../lib/utils';
import type { Concert } from '../types';

interface Props {
  year: number;
  month: number; // 0-indexed
  concerts: Concert[];
  selectedDate?: string | null;
  onDateClick?: (date: Date, dateStr: string) => void;
  onMonthChange: (year: number, month: number) => void;
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * Enhanced Monthly Calendar View (`Calendar`)
 * - Responsive single JSX tree for Mobile (375px) & Desktop (1440px).
 * - High-visibility indicators (count badge + dots on mobile, wrapped title pills on desktop, zero `truncate`).
 */
export default function Calendar({
  year,
  month,
  concerts,
  selectedDate,
  onDateClick,
  onMonthChange,
}: Props) {
  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{ date: number | null; dateStr: string; concerts: Concert[] }> = [];

    for (let i = 0; i < startDay; i++) {
      cells.push({ date: null, dateStr: '', concerts: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayConcerts = concerts.filter((c) => c.date === dateStr);
      cells.push({ date: d, dateStr, concerts: dayConcerts });
    }

    return cells;
  }, [year, month, concerts]);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const prevMonth = () => {
    if (month === 0) onMonthChange(year - 1, 11);
    else onMonthChange(year, month - 1);
  };

  const nextMonth = () => {
    if (month === 11) onMonthChange(year + 1, 0);
    else onMonthChange(year, month + 1);
  };

  const goToday = () => {
    onMonthChange(today.getFullYear(), today.getMonth());
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 overflow-hidden" data-testid="monthly-calendar">
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-stone-50/90 border-b border-stone-200/70">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="前の月"
          className="px-3 py-1.5 hover:bg-stone-200/80 rounded-lg text-sm font-medium text-stone-700 transition-colors"
        >
          ◀ 前月
        </button>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <h3 className="text-lg sm:text-xl font-serif font-bold text-stone-900 tabular-nums">
            {year}年{month + 1}月
          </h3>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={goToday}
              className="text-xs px-2.5 py-1 rounded-full bg-primary-100 text-primary-800 hover:bg-primary-200 font-medium transition-colors"
            >
              今月に戻る
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="次の月"
          className="px-3 py-1.5 hover:bg-stone-200/80 rounded-lg text-sm font-medium text-stone-700 transition-colors"
        >
          次月 ▶
        </button>
      </div>

      {/* Day of Week Header */}
      <div className="grid grid-cols-7 bg-stone-50/50 border-b border-stone-200/60">
        {DAY_NAMES.map((name, i) => (
          <div
            key={name}
            className={`text-center text-xs font-bold py-2 ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-primary-600' : 'text-stone-500'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {days.map((cell, i) => {
          const dayOfWeek = i % 7;
          const isToday = isCurrentMonth && cell.date === today.getDate();
          const hasConcerts = cell.concerts.length > 0;
          const isSelected = Boolean(cell.dateStr && selectedDate === cell.dateStr);

          return (
            <div
              key={i}
              data-testid={cell.date ? `calendar-day-${cell.dateStr}` : undefined}
              data-has-concerts={hasConcerts ? 'true' : 'false'}
              className={`min-h-[4.5rem] sm:min-h-[6.25rem] border-t border-r border-stone-200/60 p-1 sm:p-1.5 transition-colors flex flex-col justify-between ${
                cell.date === null
                  ? 'bg-stone-50/60'
                  : isSelected
                  ? 'bg-primary-50/90 ring-2 ring-inset ring-primary-500 cursor-pointer'
                  : hasConcerts
                  ? 'cursor-pointer hover:bg-primary-50/50 bg-amber-50/20'
                  : 'cursor-pointer hover:bg-stone-50'
              } ${dayOfWeek === 0 ? 'border-l border-stone-200/60' : ''}`}
              onClick={() => {
                if (cell.date && onDateClick) {
                  onDateClick(new Date(year, month, cell.date), cell.dateStr);
                }
              }}
            >
              {cell.date !== null && (
                <>
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 text-xs sm:text-sm rounded-full tabular-nums ${
                        isToday
                          ? 'bg-primary-700 text-white font-bold shadow-sm'
                          : isSelected
                          ? 'bg-navy-900 text-primary-300 font-bold'
                          : dayOfWeek === 0
                          ? 'text-red-500 font-medium'
                          : dayOfWeek === 6
                          ? 'text-primary-600 font-medium'
                          : 'text-stone-700 font-medium'
                      }`}
                    >
                      {cell.date}
                    </span>
                    {hasConcerts && (
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-600 text-white tabular-nums">
                        {cell.concerts.length}件
                      </span>
                    )}
                  </div>

                  {hasConcerts && (
                    <div className="mt-1 space-y-1">
                      {/* Dots indicator for compact readability */}
                      <div className="flex flex-wrap gap-1 px-0.5">
                        {cell.concerts.slice(0, 4).map((c) => (
                          <span
                            key={c.id}
                            className={`inline-block w-2 h-2 rounded-full ${
                              c.source === 'auto_scrape' ? 'bg-sky-500' : 'bg-emerald-500'
                            }`}
                          />
                        ))}
                      </div>
                      {/* Concert chip (start time + title, wraps cleanly without truncation) */}
                      {cell.concerts.slice(0, 2).map((c) => {
                        const cat = CATEGORIES[c.category] || CATEGORIES.other;
                        return (
                          <div
                            key={c.id}
                            className={`text-[9px] sm:text-[11px] leading-snug px-1 py-0.5 rounded font-medium break-words [overflow-wrap:anywhere] ${
                              c.source === 'auto_scrape'
                                ? 'bg-sky-100/90 text-sky-900'
                                : 'bg-emerald-100/90 text-emerald-900'
                            }`}
                          >
                            <span className="font-bold tabular-nums">{cat.icon} {c.time_start || ''}</span>{' '}
                            <span>{c.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-4 py-2.5 border-t border-stone-200/70 bg-stone-50 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-500" />
            大学公式・自動取得
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            学生・ユーザー登録
          </span>
        </div>
        <span className="text-[11px] text-stone-400">日付をタップすると下に公演カードが展開されます</span>
      </div>
    </div>
  );
}

/**
 * Timeline (Agenda) View (`TimelineAgendaView`)
 * Phase 3.2: Grouped by month, comparing date/weekday, open/start time, venue, pricing, and status at a glance.
 */
export function TimelineAgendaView({ concerts }: { concerts: Concert[] }) {
  const groupedByMonth = useMemo(() => {
    const groups = new Map<string, Concert[]>();
    for (const c of concerts) {
      const ym = (c.date || '').slice(0, 7) || '未定';
      const list = groups.get(ym) || [];
      list.push(c);
      groups.set(ym, list);
    }
    return [...groups.entries()];
  }, [concerts]);

  if (concerts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200/70 p-10 text-center text-stone-400">
        <p className="text-base font-serif">該当するスケジュールの演奏会はありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="timeline-agenda-view">
      {groupedByMonth.map(([ym, items]) => {
        const [y, m] = ym.split('-');
        const heading = y && m ? `${y}年${Number(m)}月` : ym;

        return (
          <section key={ym} className="bg-white rounded-2xl shadow-sm border border-stone-200/80 overflow-hidden">
            <div className="bg-navy-900 text-white px-5 py-3 flex items-center justify-between">
              <h3 className="font-serif font-bold text-base sm:text-lg text-primary-200 tabular-nums">
                📅 {heading} スケジュール
              </h3>
              <span className="text-xs bg-primary-500/20 text-primary-200 px-2.5 py-0.5 rounded-full border border-primary-400/30 tabular-nums">
                {items.length}公演
              </span>
            </div>

            <div className="divide-y divide-stone-100">
              {items.map((c) => {
                const d = new Date(c.date + 'T00:00:00');
                const dayNum = d.getDate();
                const dow = DAY_OF_WEEK[d.getDay()];
                const cat = CATEGORIES[c.category] || CATEGORIES.other;
                const pricing = formatPricing(c.pricing);
                const badges = getConcertStatusBadges(c);

                return (
                  <Link
                    key={c.id}
                    to={`/concerts/${c.slug}`}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 p-4 sm:px-5 hover:bg-primary-50/40 transition-colors group"
                  >
                    {/* Date & Time Column */}
                    <div className="flex sm:flex-col items-baseline sm:items-center justify-between sm:justify-center sm:w-28 shrink-0 bg-stone-50 sm:py-2 sm:px-3 rounded-xl border border-stone-200/60 tabular-nums">
                      <div className="text-sm sm:text-base font-serif font-bold text-stone-900">
                        {formatDateShort(c.date)}
                      </div>
                      <div className="text-xs text-stone-600 mt-0.5">
                        {c.time_start ? `${c.time_start}開演` : '時間未定'}
                        {c.time_open ? ` (${c.time_open}開場)` : ''}
                      </div>
                      <span className="sr-only">{dayNum}日({dow})</span>
                    </div>

                    {/* Title, Badges & Venue */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`badge text-[10px] ${cat.color}`}>
                          {cat.icon} {cat.label}
                        </span>
                        {badges.map((b) => (
                          <span key={b.key} className={`badge text-[10px] ${b.className}`}>
                            {b.label}
                          </span>
                        ))}
                      </div>
                      <h4 className="font-serif font-bold text-stone-900 group-hover:text-primary-700 transition-colors text-sm sm:text-base break-words [overflow-wrap:anywhere]">
                        {c.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600">
                        <span className="break-words [overflow-wrap:anywhere]">
                          📍 {c.venue?.name || '会場未定'}
                        </span>
                        <span className="font-semibold text-stone-800 tabular-nums">
                          🎫 {pricing === '無料' ? '入場無料' : pricing}
                        </span>
                      </div>
                    </div>

                    {/* Arrow CTA */}
                    <div className="hidden sm:flex items-center text-xs font-medium text-primary-700 group-hover:translate-x-0.5 transition-transform shrink-0">
                      詳細 →
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
