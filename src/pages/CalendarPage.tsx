import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchConcerts } from '../lib/api';
import { SITE_URL } from '../lib/constants';
import Calendar from '../components/Calendar';
import type { Concert } from '../types';

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

    fetchConcerts({ dateFrom, dateTo, limit: 100, sort: 'date_asc' }).then((res) => {
      if (res.ok && res.data) setConcerts(res.data);
      setLoading(false);
    });
  }, [year, month]);

  const selectedConcerts = selectedDate
    ? concerts.filter((c) => c.date === selectedDate)
    : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">カレンダー</h1>
          <p className="text-stone-500 text-sm mt-1">演奏会のスケジュールを月ごとに確認</p>
        </div>
        <div className="text-sm text-stone-500">
          <a
            href={`webcal://${SITE_URL.replace(/^https?:\/\//, '')}/api/feed/ics`}
            className="text-primary-600 hover:underline"
          >
            📅 カレンダーを購読
          </a>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-stone-400">読み込み中...</div>
      ) : (
        <Calendar
          year={year}
          month={month}
          concerts={concerts}
          onMonthChange={(y, m) => {
            setYear(y);
            setMonth(m);
            setSelectedDate(null);
          }}
          onDateClick={(date) => {
            const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            setSelectedDate(ds === selectedDate ? null : ds);
          }}
        />
      )}

      {/* Selected date concerts */}
      {selectedDate && (
        <div className="mt-6">
          <h2 className="font-bold text-lg mb-3">
            {selectedDate.replace(/-/g, '/')} の演奏会
          </h2>
          {selectedConcerts.length === 0 ? (
            <p className="text-stone-400 text-sm">この日の演奏会はありません</p>
          ) : (
            <div className="space-y-3">
              {selectedConcerts.map((c) => (
                <Link
                  key={c.id}
                  to={`/concerts/${c.slug}`}
                  className="card block p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{c.title}</p>
                      <p className="text-sm text-stone-500">{c.time_start}〜 {c.venue?.name}</p>
                    </div>
                    <span className="text-primary-600">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
