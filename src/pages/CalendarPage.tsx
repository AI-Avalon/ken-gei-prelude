import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchConcerts } from '../lib/api';
import { SITE_URL } from '../lib/constants';
import Calendar from '../components/Calendar';
import { toast } from '../components/Toast';
import type { Concert } from '../types';

function CalendarSyncButton() {
  const [showMenu, setShowMenu] = useState(false);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

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
        className="text-primary-600 hover:underline text-sm flex items-center gap-1"
      >
        📅 カレンダーに同期
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
          <span>🔗</span> <span>URLをコピー</span>
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
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">カレンダー</h1>
          <p className="text-stone-500 text-sm mt-1">演奏会のスケジュールを月ごとに確認</p>
        </div>
        <CalendarSyncButton />
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="skeleton h-8 w-32" />
            <div className="skeleton h-8 w-24" />
          </div>
          <div className="grid grid-cols-7 gap-1">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="skeleton h-12 sm:h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
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
        <div className="mt-6 animate-slide-up">
          <h2 className="font-bold text-base sm:text-lg mb-3 flex items-center gap-2">
            <span className="text-primary-600">📅</span>
            {selectedDate.replace(/-/g, '/')} の演奏会
          </h2>
          {selectedConcerts.length === 0 ? (
            <div className="bg-stone-50 rounded-xl p-6 text-center text-stone-400 text-sm">
              この日の演奏会はありません
            </div>
          ) : (
            <div className="space-y-3">
              {selectedConcerts.map((c) => (
                <Link
                  key={c.id}
                  to={`/concerts/${c.slug}`}
                  className="block bg-white rounded-xl shadow-sm border border-stone-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]"
                >
                  <div className="flex items-start gap-3">
                    {c.flyer_thumbnail_key && !c.flyer_thumbnail_key.endsWith('.pdf') && (
                      <img
                        src={`/api/image/${c.flyer_thumbnail_key}`}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-stone-900 line-clamp-2">{c.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                        {c.time_start && <span>🕐 {c.time_start}〜</span>}
                        {c.venue?.name && <span className="truncate">📍 {c.venue.name}</span>}
                      </div>
                    </div>
                    <span className="text-primary-600 text-lg flex-shrink-0">›</span>
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
