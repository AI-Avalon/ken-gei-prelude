import { useMemo } from 'react';
import type { Concert } from '../types';

interface Props {
  year: number;
  month: number; // 0-indexed
  concerts: Concert[];
  onDateClick?: (date: Date) => void;
  onMonthChange: (year: number, month: number) => void;
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

export default function Calendar({ year, month, concerts, onDateClick, onMonthChange }: Props) {
  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{ date: number | null; concerts: Concert[] }> = [];

    // Pad leading blanks
    for (let i = 0; i < startDay; i++) {
      cells.push({ date: null, concerts: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayConcerts = concerts.filter((c) => c.date === dateStr);
      cells.push({ date: d, concerts: dayConcerts });
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
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-stone-50 border-b">
        <button onClick={prevMonth} className="p-2 hover:bg-stone-200 rounded-lg">◀</button>
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold">
            {year}年{month + 1}月
          </h3>
          {!isCurrentMonth && (
            <button onClick={goToday} className="text-xs text-primary-600 hover:underline">
              今月に戻る
            </button>
          )}
        </div>
        <button onClick={nextMonth} className="p-2 hover:bg-stone-200 rounded-lg">▶</button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7">
        {DAY_NAMES.map((name, i) => (
          <div
            key={name}
            className={`text-center text-xs font-medium py-2 ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-primary-500' : 'text-stone-500'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-7">
        {days.map((cell, i) => {
          const dayOfWeek = i % 7;
          const isToday = isCurrentMonth && cell.date === today.getDate();
          const hasConcerts = cell.concerts.length > 0;

          return (
            <div
              key={i}
              className={`min-h-[4rem] sm:min-h-[5rem] border-t border-r p-1 ${
                cell.date === null ? 'bg-stone-50' : hasConcerts ? 'cursor-pointer hover:bg-primary-50' : ''
              } ${dayOfWeek === 0 ? 'border-l' : ''}`}
              onClick={() => {
                if (cell.date && onDateClick) {
                  onDateClick(new Date(year, month, cell.date));
                }
              }}
            >
              {cell.date !== null && (
                <>
                  <span
                    className={`inline-block w-6 h-6 text-center text-sm leading-6 rounded-full ${
                      isToday
                        ? 'bg-primary-600 text-white font-bold'
                        : dayOfWeek === 0
                        ? 'text-red-500'
                        : dayOfWeek === 6
                        ? 'text-primary-500'
                        : 'text-stone-700'
                    }`}
                  >
                    {cell.date}
                  </span>
                  <div className="space-y-0.5 mt-0.5">
                    {cell.concerts.slice(0, 2).map((c) => (
                      <div
                        key={c.id}
                        className="text-[10px] sm:text-xs truncate px-1 py-0.5 rounded bg-primary-100 text-primary-800"
                        title={c.title}
                      >
                        {c.title}
                      </div>
                    ))}
                    {cell.concerts.length > 2 && (
                      <div className="text-[10px] text-stone-500 px-1">
                        +{cell.concerts.length - 2}件
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
