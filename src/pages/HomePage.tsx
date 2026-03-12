import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchConcerts } from '../lib/api';
import { daysUntil, formatDateShort } from '../lib/utils';
import { SITE_NAME, SITE_TAGLINE, CATEGORIES } from '../lib/constants';
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
      {/* Hero — Dark elegant concert hall aesthetic */}
      <section className="bg-hero-gradient text-white py-32 md:py-40 px-4 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-[0.02]" style={{backgroundImage: 'radial-gradient(circle at 25% 25%, #c4ab6e 1px, transparent 1px), radial-gradient(circle at 75% 75%, #c4ab6e 1px, transparent 1px)', backgroundSize: '80px 80px'}} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-navy-950/50" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <p className="text-primary-400/80 text-xs tracking-[0.4em] uppercase mb-6 font-sans animate-fade-in">
            愛知県立芸術大学 音楽学部
          </p>
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-display font-bold mb-4 tracking-wider animate-blur-in">
            <span className="text-gold">{SITE_NAME}</span>
          </h1>
          <div className="flex items-center justify-center gap-8 my-8 animate-fade-in">
            <span className="w-20 h-px bg-gradient-to-r from-transparent to-primary-500/60" />
            <span className="text-primary-500/60 text-xs">♪</span>
            <span className="w-20 h-px bg-gradient-to-l from-transparent to-primary-500/60" />
          </div>
          <p className="text-lg md:text-2xl text-stone-300/90 mb-12 font-serif tracking-wide leading-relaxed animate-fade-in">
            {SITE_TAGLINE}
          </p>
          <div className="flex flex-wrap justify-center gap-5 animate-slide-up">
            <Link to="/concerts" className="bg-primary-600 text-white px-10 py-3.5 rounded-lg font-medium hover:bg-primary-500 transition-all shadow-lg shadow-primary-900/40 tracking-wide hover:shadow-xl hover:-translate-y-0.5">
              演奏会を見る
            </Link>
            <Link to="/upload" className="border border-primary-500/30 text-primary-300 px-10 py-3.5 rounded-lg font-medium hover:bg-primary-900/30 hover:border-primary-400/50 transition-all tracking-wide hover:-translate-y-0.5">
              演奏会を登録する
            </Link>
          </div>
        </div>
      </section>

      {/* Today's Stage */}
      {todayConcerts.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif font-bold text-stone-900">Today&apos;s Stage</h2>
            <p className="text-sm text-stone-500 mt-1">— 本日の演奏会 —</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {todayConcerts.map((c) => (
              <ConcertCard key={c.id} concert={c} highlight />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming concerts */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-20">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">Upcoming</h2>
            <p className="text-sm text-stone-400 mt-1.5 tracking-wide">今後の演奏会</p>
          </div>
          <Link to="/concerts" className="text-primary-700 hover:text-primary-600 text-sm font-medium transition-colors">
            すべて見る →
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-16 text-stone-400">
            <div className="inline-block w-6 h-6 border-2 border-primary-300 border-t-transparent rounded-full animate-spin mb-3" />
            <p>読み込み中...</p>
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="text-lg mb-2 font-serif">現在予定されている演奏会はありません</p>
            <Link to="/upload" className="text-primary-700 hover:underline">
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
          <div className="text-center mt-10">
            <Link to="/concerts" className="btn-secondary">
              もっと見る（{upcoming.length - 8}件以上）
            </Link>
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="bg-stone-100/50 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif font-bold text-stone-900">Categories</h2>
            <p className="text-sm text-stone-500 mt-1">カテゴリから探す</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <Link
                key={key}
                to={`/concerts?category=${key}`}
                className={`px-5 py-2 rounded-full text-sm font-medium ${cat.color} hover:shadow-md transition-all duration-200`}
              >
                {cat.icon} {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="font-serif font-bold text-lg mb-2 text-stone-900">スマートフォン対応</h3>
            <p className="text-stone-500 text-sm leading-relaxed">いつでもどこでも演奏会情報をチェック。カレンダーにもワンタップで追加できます。</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </div>
            <h3 className="font-serif font-bold text-lg mb-2 text-stone-900">誰でも登録</h3>
            <p className="text-stone-500 text-sm leading-relaxed">アカウント登録不要。パスワードを設定するだけで、すぐに演奏会を掲載できます。</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </div>
            <h3 className="font-serif font-bold text-lg mb-2 text-stone-900">かんたん共有</h3>
            <p className="text-stone-500 text-sm leading-relaxed">LINE、X、QRコードで簡単シェア。友達や先生に演奏会を広めましょう。</p>
          </div>
        </div>
      </section>
    </div>
  );
}
