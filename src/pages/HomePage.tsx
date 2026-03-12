import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchConcerts } from '../lib/api';
import { daysUntil, formatDateShort } from '../lib/utils';
import { SITE_NAME_JP, SITE_DESCRIPTION, CATEGORIES } from '../lib/constants';
import ConcertCard from '../components/ConcertCard';
import type { Concert } from '../types';

export default function HomePage() {
  const [todayConcerts, setTodayConcerts] = useState<Concert[]>([]);
  const [upcoming, setUpcoming] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    Promise.all([
      fetchConcerts({ dateFrom: today, dateTo: today, limit: 10 }),
      fetchConcerts({ dateFrom: today, sort: 'date_asc', limit: 12 }),
    ]).then(([todayRes, upcomingRes]) => {
      if (todayRes.ok && todayRes.data) setTodayConcerts(todayRes.data);
      if (upcomingRes.ok && upcomingRes.data) {
        setUpcoming(upcomingRes.data.filter((c) => c.date !== today));
      }
      setLoading(false);
    });
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-accent-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">
            🎵 {SITE_NAME_JP}
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-8">
            {SITE_DESCRIPTION}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/concerts" className="bg-white text-primary-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors">
              演奏会を見る
            </Link>
            <Link to="/upload" className="border-2 border-white text-white px-6 py-3 rounded-lg font-bold hover:bg-white/10 transition-colors">
              演奏会を登録する
            </Link>
          </div>
        </div>
      </section>

      {/* Today's Stage */}
      {todayConcerts.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            🎭 Today&apos;s Stage
            <span className="text-sm font-normal text-gray-500">— 今日の演奏会</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {todayConcerts.map((c) => (
              <ConcertCard key={c.id} concert={c} highlight />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming concerts */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            📅 今後の演奏会
          </h2>
          <Link to="/concerts" className="text-primary-600 hover:underline text-sm">
            すべて見る →
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">読み込み中...</div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-2">現在予定されている演奏会はありません</p>
            <Link to="/upload" className="text-primary-600 hover:underline">
              演奏会を登録する →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {upcoming.slice(0, 8).map((c) => (
              <ConcertCard key={c.id} concert={c} />
            ))}
          </div>
        )}

        {upcoming.length > 8 && (
          <div className="text-center mt-8">
            <Link to="/concerts" className="btn-secondary">
              もっと見る（{upcoming.length - 8}件以上）
            </Link>
          </div>
        )}
      </section>

      {/* Quick access */}
      <section className="bg-gray-50 py-10">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">カテゴリから探す</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <Link
                key={key}
                to={`/concerts?category=${key}`}
                className={`px-4 py-2 rounded-full text-sm font-medium ${cat.color} hover:opacity-80 transition-opacity`}
              >
                {cat.icon} {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl mb-3">📱</div>
            <h3 className="font-bold text-lg mb-2">スマホ対応</h3>
            <p className="text-gray-500 text-sm">いつでもどこでも演奏会情報をチェック。カレンダーにもワンタップで追加。</p>
          </div>
          <div>
            <div className="text-4xl mb-3">✏️</div>
            <h3 className="font-bold text-lg mb-2">誰でも登録</h3>
            <p className="text-gray-500 text-sm">アカウント登録不要。パスワードを設定するだけで、すぐに演奏会を掲載できます。</p>
          </div>
          <div>
            <div className="text-4xl mb-3">🔗</div>
            <h3 className="font-bold text-lg mb-2">かんたん共有</h3>
            <p className="text-gray-500 text-sm">LINE、X、QRコードなど。友達や先生に演奏会を広めよう。</p>
          </div>
        </div>
      </section>
    </div>
  );
}
