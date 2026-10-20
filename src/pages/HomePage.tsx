import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchConcerts } from '../lib/api';
import { SITE_NAME, SITE_TAGLINE, CATEGORIES } from '../lib/constants';
import ConcertCard from '../components/ConcertCard';
import type { Concert } from '../types';

/**
 * Single JSX Tree HomePage
 * Skill: `.agent/skills/responsive-and-truncation-auditor/SKILL.md`
 * - Identical data and JSX structure across Mobile (375px) and Desktop (1440px).
 * - Responsive CSS Grid / Flexbox layout with fluid typography and zero text clipping.
 */
export default function HomePage() {
  const [todayConcerts, setTodayConcerts] = useState<Concert[]>([]);
  const [thisWeek, setThisWeek] = useState<Concert[]>([]);
  const [upcoming, setUpcoming] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const weekLater = new Date(d);
    weekLater.setDate(weekLater.getDate() + 7);
    const weekEnd = `${weekLater.getFullYear()}-${String(weekLater.getMonth() + 1).padStart(2, '0')}-${String(weekLater.getDate()).padStart(2, '0')}`;

    Promise.all([
      fetchConcerts({ dateFrom: today, dateTo: today, limit: 10 }),
      fetchConcerts({ dateFrom: today, dateTo: weekEnd, sort: 'date_asc', limit: 20 }),
      fetchConcerts({ dateFrom: today, sort: 'date_asc', limit: 12 }),
    ]).then(([todayRes, weekRes, upcomingRes]) => {
      if (todayRes.ok && todayRes.data) setTodayConcerts(todayRes.data);
      if (weekRes.ok && weekRes.data) {
        setThisWeek(weekRes.data.filter((c) => c.date !== today));
      }
      if (upcomingRes.ok && upcomingRes.data) {
        setUpcoming(upcomingRes.data.filter((c) => c.date !== today));
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  return (
    <div>
      {/* Hero — Concert Hall Elegance (Unified Responsive Tree) */}
      <section className="bg-hero-gradient text-white py-16 sm:py-24 md:py-36 px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, #c4ab6e 1px, transparent 1px), radial-gradient(circle at 75% 75%, #c4ab6e 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-navy-950/60" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <p className="text-primary-400/80 text-xs tracking-[0.35em] uppercase mb-4 sm:mb-6 font-sans animate-fade-in">
            愛知県立芸術大学
          </p>
          <h1 className="fluid-hero-title font-display font-bold mb-3 sm:mb-4 tracking-wider animate-blur-in">
            <span className="text-gold">{SITE_NAME}</span>
          </h1>
          <div className="flex items-center justify-center gap-6 sm:gap-8 my-5 sm:my-7 animate-fade-in">
            <span className="w-14 sm:w-20 h-px bg-gradient-to-r from-transparent to-primary-500/60" />
            <span className="text-primary-400/70 text-xs">♪</span>
            <span className="w-14 sm:w-20 h-px bg-gradient-to-l from-transparent to-primary-500/60" />
          </div>
          <p className="text-base sm:text-xl md:text-2xl text-stone-300/95 mb-8 sm:mb-10 font-serif tracking-wide leading-relaxed animate-fade-in">
            {SITE_TAGLINE}
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 animate-slide-up">
            <Link
              to="/concerts"
              className="bg-primary-600 text-white px-7 sm:px-9 py-3 rounded-lg font-medium hover:bg-primary-500 transition-all shadow-lg shadow-primary-900/40 tracking-wide text-sm sm:text-base"
            >
              演奏会を見る
            </Link>
            <Link
              to="/calendar"
              className="bg-white/10 backdrop-blur-sm border border-primary-400/40 text-primary-200 px-7 sm:px-9 py-3 rounded-lg font-medium hover:bg-white/15 transition-all tracking-wide text-sm sm:text-base"
            >
              📅 カレンダー・日程表
            </Link>
            <Link
              to="/upload"
              className="border border-primary-500/30 text-primary-300 px-7 sm:px-9 py-3 rounded-lg font-medium hover:bg-primary-900/30 hover:border-primary-400/50 transition-all tracking-wide text-sm sm:text-base"
            >
              演奏会を登録する
            </Link>
          </div>
        </div>
      </section>

      {/* Today's Stage */}
      {todayConcerts.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                🔴 本日の演奏会
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">Today&apos;s Stage</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {todayConcerts.map((c) => (
              <ConcertCard key={c.id} concert={c} highlight />
            ))}
          </div>
        </section>
      )}

      {/* This Week */}
      {thisWeek.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                📅 今週の演奏会
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">This Week</p>
            </div>
            <Link to="/concerts?filter=week" className="text-primary-700 hover:text-primary-600 text-xs sm:text-sm font-medium">
              今週すべて →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {thisWeek.slice(0, 8).map((c) => (
              <ConcertCard key={c.id} concert={c} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Concerts */}
      <section className="max-w-6xl mx-auto px-4 py-10 sm:py-16">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
              今後の演奏会
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 tracking-wide">Upcoming Concerts</p>
          </div>
          <Link to="/concerts" className="text-primary-700 hover:text-primary-600 text-sm font-medium transition-colors whitespace-nowrap">
            すべて見る →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
                <div className="skeleton h-36 sm:h-40 w-full" />
                <div className="p-4 space-y-3">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                  <div className="skeleton h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <p className="text-base sm:text-lg mb-2 font-serif">現在予定されている演奏会はありません</p>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              <Link to="/archive" className="btn-secondary text-sm">
                📦 過去の公演アーカイブを見る
              </Link>
              <Link to="/upload" className="btn-primary text-sm">
                演奏会を登録する →
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {upcoming.slice(0, 8).map((c) => (
              <ConcertCard key={c.id} concert={c} />
            ))}
          </div>
        )}

        {upcoming.length > 8 && (
          <div className="text-center mt-8 sm:mt-10">
            <Link to="/concerts" className="btn-secondary inline-block">
              もっと見る（残り{upcoming.length - 8}件）
            </Link>
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="bg-stone-100/70 py-10 sm:py-12 border-y border-stone-200/60">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">カテゴリから探す</h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">Categories</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <Link
                key={key}
                to={`/concerts?category=${key}`}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 ${cat.color} hover:shadow-md transition-all duration-200`}
              >
                {cat.icon} {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-14 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
          <div className="text-center bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-xl">📱</span>
            </div>
            <h3 className="font-serif font-bold text-base sm:text-lg mb-2 text-stone-900">PC・スマートフォン完全対応</h3>
            <p className="text-stone-500 text-xs sm:text-sm leading-relaxed">
              高精細チラシ表裏プレビュー・月間カレンダー・タイムライン表示に対応。GoogleカレンダーやiCalにもワンタップで追加できます。
            </p>
          </div>
          <div className="text-center bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-xl">✏️</span>
            </div>
            <h3 className="font-serif font-bold text-base sm:text-lg mb-2 text-stone-900">誰でもすぐ登録・自動同期</h3>
            <p className="text-stone-500 text-xs sm:text-sm leading-relaxed">
              大学公式イベント情報の毎日自動収集に加え、学生の自主企画リサイタルや室内楽もアカウント不要で即座に掲載できます。
            </p>
          </div>
          <div className="text-center bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-xl">🗺️</span>
            </div>
            <h3 className="font-serif font-bold text-base sm:text-lg mb-2 text-stone-900">スマート会場ナビ＆共有</h3>
            <p className="text-stone-500 text-xs sm:text-sm leading-relaxed">
              奏楽堂・室内楽ホールへのリニモ／名鉄バス案内や県外ホールの経路検索、LINE・X・QRコード共有もワンタップ。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
