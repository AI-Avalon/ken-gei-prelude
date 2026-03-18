import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  adminAuth, adminFetchConcerts, adminUpdateConcert, adminDeleteConcert,
  fetchStats, fetchInquiries, updateInquiry, fetchMaintenanceLogs,
  triggerScrape, triggerMaintenance, triggerMaintenanceTask, triggerReset, triggerBulkScrape, exportData,
} from '../lib/api';
import { CATEGORIES } from '../lib/constants';
import { formatDateShort } from '../lib/utils';
import { analyzeConcertFlyers, buildFlyerUploadName, buildFlyerThumbnailName } from '../lib/flyers';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import { useIsMobile } from '../hooks/useDevice';
import type { Concert, Inquiry, MaintenanceLogEntry } from '../types';

type Tab = 'overview' | 'concerts' | 'inquiries' | 'flyers' | 'analytics' | 'settings' | 'logs';

const TAB_LIST: [Tab, string, string][] = [
  ['overview',  '📊 概要',      '概要'],
  ['concerts',  '🎵 演奏会',    '演奏会管理'],
  ['inquiries', '📩 問合せ',    'お問い合わせ'],
  ['flyers',    '🖼️ チラシ',   'チラシ管理'],
  ['analytics', '📈 分析',      '分析'],
  ['settings',  '⚙️ 設定',      '設定'],
  ['logs',      '📋 ログ',      'メンテナンスログ'],
];

// ── 共通スピナー ────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      <span className="text-sm text-stone-400">読み込み中...</span>
    </div>
  );
}

// ── エラー表示 ──────────────────────────────────────────────
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">⚠️</div>
      <p className="text-red-600 font-medium mb-1">データの取得に失敗しました</p>
      <p className="text-stone-400 text-sm mb-6">{message}</p>
      <button type="button" onClick={onRetry} className="btn-primary text-sm">再読み込み</button>
    </div>
  );
}

// ── StatCard ───────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }: {
  label: string; value: number | string; icon: string; color?: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${color || 'text-stone-800'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-xs text-stone-500 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-stone-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ============================================================
// メインページ
// ============================================================
export default function AdminPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem('admin_token') || '');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const isMobile = useIsMobile();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    const res = await adminAuth(password);
    if (res.ok && res.data) {
      setToken(res.data.token);
      sessionStorage.setItem('admin_token', res.data.token);
    } else {
      setAuthError(res.error || 'パスワードが正しくありません');
    }
    setAuthLoading(false);
  };

  const logout = () => {
    setToken('');
    sessionStorage.removeItem('admin_token');
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-8 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <h1 className="text-xl font-bold mb-1">管理ダッシュボード</h1>
            <p className="text-stone-500 mb-6 text-sm">管理者パスワードを入力してください</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="管理者パスワード"
                className="input w-full text-center"
                autoFocus
              />
              {authError && <p className="text-sm text-red-600">{authError}</p>}
              <button type="submit" disabled={authLoading} className="btn-primary w-full">
                {authLoading ? 'ログイン中...' : 'ログイン'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isMobile ? 'pb-24' : 'max-w-7xl mx-auto px-4 py-6'}>
      {/* ヘッダー */}
      {isMobile ? (
        <div className="bg-navy-900/95 sticky top-0 z-30 px-4 h-12 flex items-center justify-between border-b border-primary-800/20">
          <Link to="/" className="text-primary-400 text-sm font-display font-semibold tracking-widest">← Crescendo</Link>
          <span className="text-white text-sm font-bold">管理ダッシュボード</span>
          <button type="button" onClick={logout}
            className="text-xs text-stone-400 hover:text-red-400 px-2 py-1 rounded transition-colors">
            🚪 ログアウト
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 mb-6">
          <div>
            <h1 className="text-2xl font-bold">管理ダッシュボード</h1>
            <p className="text-xs text-stone-400 mt-0.5">Crescendo 管理画面</p>
          </div>
          <button type="button" onClick={logout}
            className="text-xs text-stone-500 hover:text-red-600 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-red-50 transition-colors">
            🚪 ログアウト
          </button>
        </div>
      )}

      {/* タブナビゲーション — モバイルはアイコン、PCは全ラベル */}
      {isMobile ? (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-40 grid grid-cols-7 safe-area-pb">
          {TAB_LIST.map(([key, shortLabel]) => (
            <button
              type="button"
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-col items-center justify-center py-2 text-[10px] gap-0.5 transition-colors ${
                tab === key ? 'text-primary-600' : 'text-stone-400'
              }`}
            >
              <span className="text-base leading-none">{shortLabel.split(' ')[0]}</span>
              <span className="leading-none">{shortLabel.split(' ')[1] || ''}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-1 border-b border-stone-200 mb-6 overflow-x-auto">
          {TAB_LIST.map(([key, , longLabel]) => (
            <button
              type="button"
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                tab === key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {longLabel}
            </button>
          ))}
        </div>
      )}

      {/* コンテンツ */}
      <div className={isMobile ? 'px-4 pt-2' : ''}>
        {tab === 'overview'  && <OverviewTab token={token} isMobile={isMobile} />}
        {tab === 'concerts'  && <ConcertsTab token={token} isMobile={isMobile} />}
        {tab === 'inquiries' && <InquiriesTab token={token} isMobile={isMobile} />}
        {tab === 'flyers'    && <FlyersTab token={token} isMobile={isMobile} />}
        {tab === 'analytics' && <AnalyticsTab token={token} isMobile={isMobile} />}
        {tab === 'settings'  && <SettingsTab token={token} />}
        {tab === 'logs'      && <LogsTab token={token} isMobile={isMobile} />}
      </div>
    </div>
  );
}

// ============================================================
// 概要タブ
// ============================================================
function OverviewTab({ token, isMobile }: { token: string; isMobile: boolean }) {
  const [stats, setStats] = useState<{
    total: number; upcoming: number; past: number;
    totalViews: number; monthViews: number;
    byCategory: Record<string, number>;
    topConcerts: { slug: string; title: string; views: number }[];
    dailyViews: { date: string; count: number }[];
    recentInquiries: number; unpublished: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchStats(token).then((res) => {
      if (res.ok && res.data) setStats(res.data);
      else setError(res.error || 'データの取得に失敗しました');
      setLoading(false);
    }).catch(() => { setError('通信エラー'); setLoading(false); });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!stats) return null;

  const maxDaily = Math.max(...stats.dailyViews.map((d) => d.count), 1);

  return (
    <div className="space-y-5">
      {/* アラート */}
      {stats.unpublished > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="font-semibold text-amber-800 text-sm">未公開の演奏会が {stats.unpublished} 件</p>
            <p className="text-xs text-amber-600 mt-0.5">自動取得された演奏会を確認・公開してください</p>
          </div>
        </div>
      )}
      {stats.recentInquiries > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">📩</span>
          <div>
            <p className="font-semibold text-primary-800 text-sm">未読のお問い合わせが {stats.recentInquiries} 件</p>
          </div>
        </div>
      )}

      {/* 統計カード */}
      <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-5'}`}>
        <StatCard label="総登録数" value={stats.total} icon="📊" />
        <StatCard label="今後の公演" value={stats.upcoming} icon="📅" color="text-primary-600" />
        <StatCard label="終了済み" value={stats.past} icon="✅" />
        <StatCard label="総閲覧数" value={stats.totalViews} icon="👁" />
        <StatCard label="今月の閲覧" value={stats.monthViews} icon="📈" color="text-emerald-600" />
      </div>

      {/* 日別閲覧グラフ */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-5">
        <h2 className="font-bold text-sm mb-4">📈 日別閲覧数（過去30日）</h2>
        <div className="flex items-end gap-0.5 h-28">
          {stats.dailyViews.slice(-30).map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-primary-400 rounded-t-sm"
                style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: d.count > 0 ? '2px' : '0' }}
                title={`${d.date}: ${d.count}回`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-stone-400 mt-1.5">
          <span>{stats.dailyViews[Math.max(stats.dailyViews.length - 30, 0)]?.date.slice(5)}</span>
          <span>{stats.dailyViews[stats.dailyViews.length - 1]?.date.slice(5)}</span>
        </div>
      </div>

      {/* 閲覧ランキング */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-5">
        <h2 className="font-bold text-sm mb-4">🏆 閲覧数ランキング TOP10</h2>
        <div className="space-y-2.5">
          {stats.topConcerts.map((c, i) => (
            <div key={c.slug} className="flex items-center gap-3">
              <span className={`text-sm font-bold w-5 text-right flex-shrink-0 ${
                i === 0 ? 'text-yellow-500' : i === 1 ? 'text-stone-400' : i === 2 ? 'text-amber-600' : 'text-stone-300'
              }`}>{i + 1}</span>
              <Link to={`/concerts/${c.slug}`} className="flex-1 text-xs hover:text-primary-600 truncate">
                {c.title}
              </Link>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isMobile && (
                  <div className="w-20 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-primary-400 rounded-full"
                      style={{ width: `${(c.views / Math.max(stats.topConcerts[0]?.views, 1)) * 100}%` }}
                    />
                  </div>
                )}
                <span className="text-xs text-stone-500 tabular-nums">👁 {c.views.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* カテゴリ分布 */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-5">
        <h2 className="font-bold text-sm mb-4">🎵 カテゴリ別分布</h2>
        <div className="space-y-2">
          {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([key, count]) => {
            const cat = CATEGORIES[key] || { label: key, icon: '🎵', color: '' };
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className={`${isMobile ? 'w-20' : 'w-28'} text-xs truncate`}>{cat.icon} {cat.label}</span>
                <div className="flex-1 bg-stone-100 rounded-full h-3 overflow-hidden">
                  <div className="h-full bg-primary-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-stone-500 w-10 text-right tabular-nums">{count}件</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 演奏会管理タブ
// ============================================================
function ConcertsTab({ token, isMobile }: { token: string; isMobile: boolean }) {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'unpublished' | 'deleted'>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    adminFetchConcerts(token).then((res) => {
      if (res.ok && res.data) setConcerts(res.data);
      setLoading(false);
    });
  }, [token]);

  const togglePublish = async (concert: Concert) => {
    const res = await adminUpdateConcert(concert.slug, { is_published: concert.is_published ? 0 : 1 }, token);
    if (res.ok) {
      setConcerts((prev) => prev.map((c) =>
        c.slug === concert.slug ? { ...c, is_published: concert.is_published ? 0 : 1 } : c
      ));
      toast(`${concert.is_published ? '非公開' : '公開'}にしました`, 'success');
    } else {
      toast(res.error || '更新に失敗しました', 'error');
    }
  };

  const handleDelete = async (concert: Concert) => {
    if (!confirm(`「${concert.title}」を削除しますか？`)) return;
    const res = await adminDeleteConcert(concert.slug, token);
    if (res.ok) {
      setConcerts((prev) => prev.map((c) => c.slug === concert.slug ? { ...c, is_deleted: 1 } : c));
      toast('削除しました', 'success');
    } else {
      toast(res.error || '削除に失敗しました', 'error');
    }
  };

  const filtered = concerts.filter((c) => {
    const matchFilter =
      filter === 'published' ? c.is_published && !c.is_deleted :
      filter === 'unpublished' ? !c.is_published && !c.is_deleted :
      filter === 'deleted' ? !!c.is_deleted : true;
    const matchSearch = !search || c.title.includes(search) || c.venue?.name?.includes(search) || false;
    return matchFilter && matchSearch;
  });

  const counts = {
    all: concerts.length,
    published: concerts.filter((c) => c.is_published && !c.is_deleted).length,
    unpublished: concerts.filter((c) => !c.is_published && !c.is_deleted).length,
    deleted: concerts.filter((c) => !!c.is_deleted).length,
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {/* 検索 + フィルター */}
      <div className="space-y-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="タイトル・会場で絞り込み..."
          className="input w-full"
        />
        <div className={`flex gap-2 ${isMobile ? 'overflow-x-auto pb-1' : 'flex-wrap'}`}>
          {(['all', 'published', 'unpublished', 'deleted'] as const).map((f) => {
            const labels = { all: 'すべて', published: '🟢 公開中', unpublished: '🟡 非公開', deleted: '🗑 削除済' };
            return (
              <button type="button" key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                  filter === f ? 'bg-primary-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}>
                {labels[f]} ({counts[f]})
              </button>
            );
          })}
        </div>
      </div>

      {/* 件数表示 */}
      <p className="text-xs text-stone-400">
        {filtered.length === concerts.length
          ? `全 ${concerts.length} 件`
          : `${filtered.length} 件 / 全 ${concerts.length} 件`}
      </p>

      {/* モバイル: カードレイアウト */}
      {isMobile ? (
        <div className="space-y-2">
          {filtered.map((c) => {
            const cat = CATEGORIES[c.category] || CATEGORIES.other;
            const isExpanded = expandedId === c.id;
            return (
              <div key={c.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${c.is_deleted ? 'opacity-60' : ''}`}>
                <button
                  type="button"
                  className="w-full p-3 text-left flex items-start gap-3"
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cat.color}`}>
                        {cat.icon} {cat.label}
                      </span>
                      {c.source === 'auto_scrape' && (
                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">自動</span>
                      )}
                      {c.is_deleted ? (
                        <span className="text-[10px] text-red-500">🗑 削除済</span>
                      ) : c.is_published ? (
                        <span className="text-[10px] text-emerald-600">🟢 公開</span>
                      ) : (
                        <span className="text-[10px] text-amber-600">🟡 非公開</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-stone-800 line-clamp-2 leading-snug">{c.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {formatDateShort(c.date)} · {c.venue?.name || '会場未定'} · 👁 {c.views}
                    </p>
                  </div>
                  <svg className={`w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isExpanded && !c.is_deleted && (
                  <div className="px-3 pb-3 flex gap-2 flex-wrap border-t border-stone-100 pt-2.5">
                    <Link to={`/concerts/${c.slug}`}
                      className="text-xs text-stone-500 bg-stone-100 px-3 py-1.5 rounded-lg hover:bg-stone-200">
                      詳細
                    </Link>
                    <Link to={`/concerts/${c.slug}/edit`}
                      className="text-xs text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg hover:bg-primary-100">
                      ✏️ 編集
                    </Link>
                    <button type="button" onClick={() => togglePublish(c)}
                      className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100">
                      {c.is_published ? '非公開に' : '公開する'}
                    </button>
                    <button type="button" onClick={() => handleDelete(c)}
                      className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100">
                      🗑 削除
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* PC: テーブルレイアウト */
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50 text-left text-stone-500 text-xs">
                  <th className="py-3 px-4 font-medium">タイトル</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">日付</th>
                  <th className="py-3 px-4 font-medium">会場</th>
                  <th className="py-3 px-4 font-medium">カテゴリ</th>
                  <th className="py-3 px-4 font-medium">👁</th>
                  <th className="py-3 px-4 font-medium">状態</th>
                  <th className="py-3 px-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filtered.map((c) => {
                  const cat = CATEGORIES[c.category] || CATEGORIES.other;
                  return (
                    <tr key={c.id}
                      className={`hover:bg-stone-50/50 transition-colors ${c.is_deleted ? 'opacity-50' : ''}`}>
                      <td className="py-3 px-4 max-w-[260px]">
                        <Link to={`/concerts/${c.slug}`}
                          className="hover:text-primary-600 font-medium line-clamp-1 block">
                          {c.title}
                        </Link>
                        {c.source === 'auto_scrape' && (
                          <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">自動取得</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-500 whitespace-nowrap text-xs">{formatDateShort(c.date)}</td>
                      <td className="py-3 px-4 text-stone-500 truncate max-w-[140px] text-xs">{c.venue?.name || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cat.color}`}>
                          {cat.icon} {cat.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-500 text-xs tabular-nums">{c.views.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        {c.is_deleted ? (
                          <span className="text-red-500 text-xs">🗑 削除済</span>
                        ) : c.is_published ? (
                          <span className="text-emerald-600 text-xs">🟢 公開</span>
                        ) : (
                          <span className="text-amber-600 text-xs">🟡 非公開</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {!c.is_deleted && (
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => togglePublish(c)}
                              className="text-xs text-primary-600 hover:underline">
                              {c.is_published ? '非公開に' : '公開する'}
                            </button>
                            <Link to={`/concerts/${c.slug}/edit`}
                              className="text-xs text-stone-500 hover:underline">
                              編集
                            </Link>
                            <button type="button" onClick={() => handleDelete(c)}
                              className="text-xs text-red-500 hover:underline">
                              削除
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-stone-400">
          <p className="text-3xl mb-2">🎵</p>
          <p className="text-sm">該当する演奏会はありません</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// お問い合わせタブ
// ============================================================
function InquiriesTab({ token, isMobile }: { token: string; isMobile: boolean }) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read' | 'replied'>('all');
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    fetchInquiries(token).then((res) => {
      if (res.ok && res.data) setInquiries(res.data);
      setLoading(false);
    });
  }, [token]);

  const changeStatus = async (id: number, status: string) => {
    const res = await updateInquiry(id, { status }, token);
    if (res.ok) {
      setInquiries((prev) => prev.map((i) => i.id === id ? { ...i, status: status as Inquiry['status'] } : i));
    }
  };

  const saveNote = async (id: number) => {
    const res = await updateInquiry(id, { admin_note: note }, token);
    if (res.ok) {
      setInquiries((prev) => prev.map((i) => i.id === id ? { ...i, admin_note: note } : i));
      toast('メモを保存しました', 'success');
    }
  };

  const filtered = inquiries.filter((i) => statusFilter === 'all' || i.status === statusFilter);

  if (loading) return <Spinner />;

  const counts = {
    all: inquiries.length,
    unread: inquiries.filter((i) => i.status === 'unread').length,
    read: inquiries.filter((i) => i.status === 'read').length,
    replied: inquiries.filter((i) => i.status === 'replied').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['all', 'unread', 'read', 'replied'] as const).map((f) => {
          const icons = { all: '', unread: '🔴', read: '🟢', replied: '✅' };
          const labels = { all: 'すべて', unread: '未読', read: '既読', replied: '返信済' };
          return (
            <button type="button" key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === f ? 'bg-primary-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}>
              {icons[f]} {labels[f]} ({counts[f]})
            </button>
          );
        })}
      </div>

      {/* モバイル: カード / PC: テーブル */}
      {isMobile ? (
        <div className="space-y-2">
          {filtered.map((inq) => (
            <button type="button" key={inq.id}
              className="w-full bg-white rounded-xl border shadow-sm p-3 text-left"
              onClick={() => { setSelected(inq); setNote(inq.admin_note || ''); }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{{ unread: '🔴', read: '🟢', replied: '✅' }[inq.status]}</span>
                    <span className="text-xs font-medium text-stone-800 truncate">{inq.name || '(暗号化)'}</span>
                  </div>
                  <p className="text-xs text-stone-600 truncate">{inq.subject}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">{inq.created_at?.slice(0, 10)}</p>
                </div>
                <svg className="w-4 h-4 text-stone-300 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-left text-stone-500 text-xs">
                <th className="py-3 px-4 font-medium">#</th>
                <th className="py-3 px-4 font-medium">状態</th>
                <th className="py-3 px-4 font-medium">名前</th>
                <th className="py-3 px-4 font-medium">件名</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">日時</th>
                <th className="py-3 px-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.map((inq) => (
                <tr key={inq.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="py-3 px-4 text-stone-400 text-xs">{inq.id}</td>
                  <td className="py-3 px-4">
                    <span className="text-sm">{{ unread: '🔴', read: '🟢', replied: '✅' }[inq.status]}</span>
                  </td>
                  <td className="py-3 px-4 font-medium text-xs">{inq.name || '(暗号化)'}</td>
                  <td className="py-3 px-4 text-xs truncate max-w-[200px]">{inq.subject}</td>
                  <td className="py-3 px-4 text-stone-400 whitespace-nowrap text-xs">{inq.created_at?.slice(0, 10)}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button type="button"
                        onClick={() => { setSelected(inq); setNote(inq.admin_note || ''); }}
                        className="text-xs text-primary-600 hover:underline">詳細</button>
                      {inq.status === 'unread' && (
                        <button type="button" onClick={() => changeStatus(inq.id, 'read')}
                          className="text-xs text-stone-500 hover:underline">既読に</button>
                      )}
                      {inq.status !== 'replied' && (
                        <button type="button" onClick={() => changeStatus(inq.id, 'replied')}
                          className="text-xs text-emerald-600 hover:underline">返信済に</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-stone-400 text-sm">お問い合わせはありません</div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="お問い合わせ詳細">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><span className="text-stone-500 text-xs">名前</span><p className="font-medium">{selected.name || '(暗号化)'}</p></div>
              <div><span className="text-stone-500 text-xs">メール</span><p className="font-medium break-all">{selected.email || '(暗号化)'}</p></div>
              <div><span className="text-stone-500 text-xs">件名</span><p className="font-medium">{selected.subject}</p></div>
              <div><span className="text-stone-500 text-xs">日時</span><p>{selected.created_at}</p></div>
            </div>
            {selected.concert_id && (
              <div className="text-sm">
                <span className="text-stone-500 text-xs">関連演奏会: </span>
                <Link to={`/concerts/${selected.concert_id}`} className="text-primary-600 hover:underline">{selected.concert_id}</Link>
              </div>
            )}
            <div>
              <span className="text-xs text-stone-500">メッセージ</span>
              <div className="mt-1 p-3 bg-stone-50 rounded-xl text-sm whitespace-pre-wrap leading-relaxed">{selected.message}</div>
            </div>
            <div>
              <label className="text-xs text-stone-500">管理者メモ</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)}
                className="input w-full mt-1 text-sm" rows={3} placeholder="対応メモを記録..." />
              <button type="button" onClick={() => saveNote(selected.id)} className="btn-primary text-sm mt-2">
                メモを保存
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
              {selected.status === 'unread' && (
                <button type="button" onClick={() => { changeStatus(selected.id, 'read'); setSelected({ ...selected, status: 'read' }); }}
                  className="btn-secondary text-xs">🟢 既読にする</button>
              )}
              {selected.status !== 'replied' && (
                <button type="button" onClick={() => { changeStatus(selected.id, 'replied'); setSelected({ ...selected, status: 'replied' }); }}
                  className="btn-secondary text-xs">✅ 返信済にする</button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// チラシ管理タブ
// ============================================================
function FlyersTab({ token, isMobile }: { token: string; isMobile: boolean }) {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithout, setShowWithout] = useState(false);

  useEffect(() => {
    adminFetchConcerts(token).then((res) => {
      if (res.ok && res.data) setConcerts(res.data);
      setLoading(false);
    });
  }, [token]);

  if (loading) return <Spinner />;

  const active = concerts.filter((c) => !c.is_deleted);
  const withFlyers = active.filter((c) => c.flyer_r2_keys && c.flyer_r2_keys.length > 0);
  const withoutFlyers = active.filter((c) => !c.flyer_r2_keys || c.flyer_r2_keys.length === 0);
  const coverPct = active.length > 0 ? Math.round((withFlyers.length / active.length) * 100) : 0;
  const totalFiles = withFlyers.reduce((a, c) => a + (c.flyer_r2_keys?.length || 0), 0);

  return (
    <div className="space-y-5">
      {/* 統計 */}
      <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <StatCard label="チラシあり" value={withFlyers.length} icon="🖼️" color="text-primary-600" />
        <StatCard label="チラシなし" value={withoutFlyers.length} icon="📄" />
        <StatCard label="総ファイル数" value={totalFiles} icon="📁" />
        <StatCard label="カバー率" value={`${coverPct}%`} icon="📊" color={coverPct >= 50 ? 'text-emerald-600' : 'text-amber-600'} />
      </div>

      {/* チラシなし一覧（折りたたみ） */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 overflow-hidden">
        <button type="button"
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50/50"
          onClick={() => setShowWithout(!showWithout)}>
          <h2 className="font-bold text-sm">📄 チラシ未登録 ({withoutFlyers.length}件)</h2>
          <svg className={`w-4 h-4 text-stone-400 transition-transform ${showWithout ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showWithout && (
          <div className="px-5 pb-5 space-y-1.5 max-h-80 overflow-y-auto">
            {withoutFlyers.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-xs">
                <Link to={`/concerts/${c.slug}`} className="hover:text-primary-600 truncate flex-1 mr-2">{c.title}</Link>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-stone-400">{formatDateShort(c.date)}</span>
                  <Link to={`/concerts/${c.slug}/edit`} className="text-primary-600 hover:underline">編集</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* チラシ一覧グリッド */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-5">
        <h2 className="font-bold text-sm mb-4">🖼️ チラシ一覧 ({withFlyers.length}件)</h2>
        <div className={`grid gap-3 ${isMobile ? 'grid-cols-3' : 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-8'}`}>
          {withFlyers.map((c) => {
            const flyerAnalysis = c.flyer_r2_keys ? analyzeConcertFlyers(c.flyer_r2_keys) : null;
            const thumbKey = c.flyer_thumbnail_key && !c.flyer_thumbnail_key.endsWith('.pdf')
              ? c.flyer_thumbnail_key
              : flyerAnalysis?.displayKeys[0] || null;
            return (
              <Link key={c.id} to={`/concerts/${c.slug}`} className="group">
                <div className="aspect-[3/4] bg-stone-100 rounded-lg overflow-hidden relative">
                  {thumbKey ? (
                    <img src={`/api/image/${thumbKey}`} alt={c.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300 text-xl">📄</div>
                  )}
                </div>
                <p className="text-[10px] mt-1 truncate text-stone-500 leading-tight">{c.title}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 分析タブ
// ============================================================
function AnalyticsTab({ token, isMobile }: { token: string; isMobile: boolean }) {
  const [stats, setStats] = useState<{
    totalViews: number; monthViews: number;
    topConcerts: { slug: string; title: string; views: number }[];
    byCategory: Record<string, number>;
    dailyViews: { date: string; count: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchStats(token).then((res) => {
      if (res.ok && res.data) setStats(res.data);
      else setError(res.error || 'データの取得に失敗しました');
      setLoading(false);
    }).catch(() => { setError('通信エラー'); setLoading(false); });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!stats) return null;

  const maxDaily = Math.max(...stats.dailyViews.map((d) => d.count), 1);

  return (
    <div className="space-y-5">
      <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <StatCard label="総閲覧数" value={stats.totalViews} icon="👁" color="text-primary-600" />
        <StatCard label="今月の閲覧" value={stats.monthViews} icon="📈" color="text-emerald-600" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-5">
        <h2 className="font-bold text-sm mb-4">📈 日別閲覧数（過去30日）</h2>
        <div className="flex items-end gap-0.5 h-36">
          {stats.dailyViews.slice(-30).map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full bg-primary-400 rounded-t-sm"
                style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: d.count > 0 ? '2px' : '0' }}
                title={`${d.date}: ${d.count}回`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-stone-400 mt-1.5">
          <span>{stats.dailyViews[Math.max(stats.dailyViews.length - 30, 0)]?.date.slice(5)}</span>
          <span>{stats.dailyViews[stats.dailyViews.length - 1]?.date.slice(5)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-5">
        <h2 className="font-bold text-sm mb-4">🏆 閲覧数ランキング</h2>
        <div className="space-y-2.5">
          {stats.topConcerts.map((c, i) => (
            <div key={c.slug} className="flex items-center gap-3">
              <span className={`text-sm font-bold w-5 text-right ${
                i === 0 ? 'text-yellow-500' : i === 1 ? 'text-stone-400' : i === 2 ? 'text-amber-600' : 'text-stone-300'
              }`}>{i + 1}</span>
              <Link to={`/concerts/${c.slug}`} className="flex-1 text-xs hover:text-primary-600 truncate">{c.title}</Link>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isMobile && (
                  <div className="w-20 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-primary-400 rounded-full"
                      style={{ width: `${(c.views / Math.max(stats.topConcerts[0]?.views, 1)) * 100}%` }} />
                  </div>
                )}
                <span className="text-xs text-stone-500 tabular-nums">👁 {c.views.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-5">
        <h2 className="font-bold text-sm mb-4">🎵 カテゴリ別分布</h2>
        <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-3 sm:grid-cols-4'}`}>
          {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([key, count]) => {
            const cat = CATEGORIES[key] || { label: key, icon: '🎵', color: '' };
            return (
              <div key={key} className="bg-stone-50 rounded-xl p-3 text-center">
                <div className="text-xl">{cat.icon}</div>
                <div className="text-lg font-bold tabular-nums">{count}</div>
                <div className="text-xs text-stone-500">{cat.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 設定タブ
// ============================================================
// ── PDF → WebP 一括変換ユーティリティ ────────────────────────
async function convertPdfToImages(
  pdfUrl: string,
  concertSlug: string,
  onProgress: (msg: string) => void
): Promise<{ success: boolean; pages: number }> {
  try {
    const res = await fetch(pdfUrl);
    if (!res.ok) return { success: false, pages: 0 };

    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await res.arrayBuffer();
    const cdnBase = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}`;
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: `${cdnBase}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${cdnBase}/standard_fonts/`,
      useWorkerFetch: true,
    }).promise;

    const totalPages = pdf.numPages;
    const groupId = crypto.randomUUID();

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress(`ページ ${pageNum}/${totalPages} を変換中...`);
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 3.0 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await (page.render({ canvasContext: ctx, viewport, canvas } as Parameters<typeof page.render>[0]).promise);

      const pageIndex = pageNum - 1;

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('blob')), 'image/webp', 0.92)
      );

      // サムネイル生成
      const thumbCanvas = document.createElement('canvas');
      const maxThumb = 400;
      let tw = canvas.width, th = canvas.height;
      if (Math.max(tw, th) > maxThumb) {
        const r = maxThumb / Math.max(tw, th);
        tw = Math.round(tw * r); th = Math.round(th * r);
      }
      thumbCanvas.width = tw; thumbCanvas.height = th;
      const tctx = thumbCanvas.getContext('2d');
      if (tctx) {
        tctx.fillStyle = '#ffffff';
        tctx.fillRect(0, 0, tw, th);
        tctx.drawImage(canvas, 0, 0, tw, th);
      }
      const thumbnail = await new Promise<Blob>((resolve, reject) =>
        thumbCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('thumb')), 'image/webp', 0.7)
      );

      // KV にアップロード
      const fd = new FormData();
      fd.append('file', blob, buildFlyerUploadName(groupId, pageIndex, pageIndex, totalPages));
      fd.append('thumbnail', thumbnail, buildFlyerThumbnailName(groupId, pageIndex, pageIndex, totalPages));
      fd.append('concert_slug', concertSlug);
      fd.append('group_id', groupId);
      fd.append('page_index', String(pageIndex));
      fd.append('page_total', String(totalPages));
      fd.append('sort_index', String(pageIndex));
      fd.append('set_thumbnail', pageIndex === 0 ? '1' : '0');
      await fetch('/api/upload', { method: 'POST', body: fd });
    }

    return { success: true, pages: totalPages };
  } catch {
    return { success: false, pages: 0 };
  }
}

function SettingsTab({ token }: { token: string }) {
  const [scraping, setScraping] = useState(false);
  const [maintaining, setMaintaining] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);
  const [maintenanceResult, setMaintenanceResult] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<string | null>(null);

  // PDF 一括事前変換
  const [converting, setConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState<string | null>(null);
  const [convertResult, setConvertResult] = useState<string | null>(null);

  const handleBatchConvert = async () => {
    setConverting(true);
    setConvertProgress('対象の演奏会を確認中...');
    setConvertResult(null);
    try {
      // 全演奏会を取得
      const res = await adminFetchConcerts(token);
      if (!res.ok || !res.data) {
        setConvertResult('❌ 演奏会データの取得に失敗しました');
        return;
      }

      // PDF のみ（未変換）の演奏会を抽出
      const pending = res.data.filter((c) => {
        if (!c.flyer_r2_keys || c.flyer_r2_keys.length === 0) return false;
        const analysis = analyzeConcertFlyers(c.flyer_r2_keys);
        // 変換済みページがなく、かつ PDF キーがある場合のみ対象
        return !analysis.hasCompleteConvertedPages && analysis.pdfKeys.length > 0;
      });

      if (pending.length === 0) {
        setConvertResult('✅ 変換が必要なPDFチラシはありません（すべて変換済み）');
        setConvertProgress(null);
        return;
      }

      setConvertProgress(`${pending.length}件のPDFチラシを変換します...`);

      let done = 0;
      let errors = 0;
      const log: string[] = [];

      for (const concert of pending) {
        const analysis = analyzeConcertFlyers(concert.flyer_r2_keys);
        for (const pdfKey of analysis.pdfKeys) {
          setConvertProgress(`[${done + 1}/${pending.length}] ${concert.title} を変換中...`);
          const result = await convertPdfToImages(
            `/api/image/${pdfKey}`,
            concert.slug,
            (msg) => setConvertProgress(`[${done + 1}/${pending.length}] ${concert.title}: ${msg}`)
          );
          if (result.success) {
            done++;
            log.push(`✅ ${concert.title} (${result.pages}ページ)`);
          } else {
            errors++;
            log.push(`❌ ${concert.title} — 変換失敗`);
          }
        }
      }

      setConvertResult(
        `変換完了: ${done}件成功${errors > 0 ? ` / ${errors}件失敗` : ''}\n\n${log.join('\n')}`
      );
      setConvertProgress(null);
      toast(`PDF変換完了: ${done}件`, done > 0 ? 'success' : 'error');
    } catch (err) {
      setConvertResult('❌ 処理中にエラーが発生しました');
      setConvertProgress(null);
    } finally {
      setConverting(false);
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    setScrapeResult(null);
    try {
      const res = await triggerScrape(token, 'manual');
      if (res.ok && res.data) {
        const d = res.data;
        setScrapeResult(`✅ ${d.found}件発見、${d.added}件新規追加${d.errors.length > 0 ? `\n⚠️ ${d.errors.join(', ')}` : ''}`);
        toast(`完了: ${d.found}件発見、${d.added}件追加`, 'success');
      } else {
        setScrapeResult(`❌ ${res.error || '失敗'}`);
        toast(res.error || '失敗しました', 'error');
      }
    } catch {
      setScrapeResult('❌ 通信エラー');
    } finally {
      setScraping(false);
    }
  };

  const handleMaintenance = async () => {
    setMaintaining(true);
    setMaintenanceResult(null);
    try {
      const res = await triggerMaintenance(token);
      if (res.ok && res.data) {
        const results = res.data.map((r) => `${r.success ? '✅' : '❌'} ${r.task}: ${r.details}`).join('\n');
        setMaintenanceResult(results);
        toast('メンテナンス完了', 'success');
      } else {
        setMaintenanceResult(`❌ ${res.error || '失敗'}`);
        toast(res.error || '失敗しました', 'error');
      }
    } catch {
      setMaintenanceResult('❌ 通信エラー');
    } finally {
      setMaintaining(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* スクレイピング設定 */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-5">
        <h2 className="font-bold text-sm mb-4">⚙️ サイト設定</h2>
        <div>
          <label className="text-xs text-stone-500">大学公式イベントページURL（変更にはコード修正が必要）</label>
          <input
            type="url"
            defaultValue="https://www.aichi-fam-u.ac.jp/event/music/"
            className="input w-full mt-1 text-sm"
            readOnly
            aria-label="スクレイピング対象URL"
          />
        </div>
      </div>

      {/* PDF 一括事前変換 */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-5">
        <h2 className="font-bold text-sm mb-1">📄 PDFチラシの事前変換</h2>
        <p className="text-xs text-stone-500 mb-4">
          自動取得されたPDFチラシは通常、最初の訪問者がページを開いた際にブラウザ内で変換されます。
          このボタンを実行すると未変換のPDFを今すぐ一括処理し、以降の訪問者には即座に画像が表示されます。
        </p>
        <div className="flex items-center justify-between gap-3 p-4 bg-primary-50 border border-primary-100 rounded-xl">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-primary-900">🔄 PDF → 画像 一括変換</p>
            <p className="text-xs text-primary-700 mt-0.5">未変換のPDFチラシをすべて今すぐ画像に変換してKVに保存します</p>
            {convertProgress && (
              <p className="text-xs text-primary-600 mt-1 font-medium animate-pulse">{convertProgress}</p>
            )}
          </div>
          <button type="button" onClick={handleBatchConvert} disabled={converting}
            className="btn-primary text-sm flex-shrink-0">
            {converting ? '⏳ 変換中...' : '今すぐ変換'}
          </button>
        </div>
        {convertResult && (
          <pre className="text-xs bg-stone-100 rounded-xl p-3 whitespace-pre-wrap overflow-x-auto mt-3">{convertResult}</pre>
        )}
      </div>

      {/* メンテナンス操作 */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-5">
        <h2 className="font-bold text-sm mb-4">🔧 メンテナンス操作</h2>
        <div className="space-y-3">
          {/* スクレイピング */}
          <div className="flex items-center justify-between gap-3 p-4 bg-stone-50 rounded-xl">
            <div className="min-w-0">
              <p className="font-medium text-sm">🌐 大学サイトスクレイピング</p>
              <p className="text-xs text-stone-500 mt-0.5">最新3ページ分を取得（詳細情報・画像含む）</p>
            </div>
            <button type="button" onClick={handleScrape} disabled={scraping}
              className="btn-primary text-sm flex-shrink-0">
              {scraping ? '⏳ 実行中...' : '手動実行'}
            </button>
          </div>
          {scrapeResult && (
            <pre className="text-xs bg-stone-100 rounded-xl p-3 whitespace-pre-wrap overflow-x-auto">{scrapeResult}</pre>
          )}

          {/* メンテナンス */}
          <div className="flex items-center justify-between gap-3 p-4 bg-stone-50 rounded-xl">
            <div className="min-w-0">
              <p className="font-medium text-sm">🧹 自動メンテナンス</p>
              <p className="text-xs text-stone-500 mt-0.5">古いログ削除・物理削除・重複除去（通常は毎月1日に自動実行）</p>
            </div>
            <button type="button" onClick={handleMaintenance} disabled={maintaining}
              className="btn-primary text-sm flex-shrink-0">
              {maintaining ? '⏳ 実行中...' : '手動実行'}
            </button>
          </div>
          {maintenanceResult && (
            <pre className="text-xs bg-stone-100 rounded-xl p-3 whitespace-pre-wrap overflow-x-auto">{maintenanceResult}</pre>
          )}

          {/* エクスポート */}
          <div className="flex items-center justify-between gap-3 p-4 bg-stone-50 rounded-xl">
            <div className="min-w-0">
              <p className="font-medium text-sm">💾 データバックアップ</p>
              <p className="text-xs text-stone-500 mt-0.5">D1データをJSON形式でエクスポート</p>
            </div>
            <button type="button"
              className="btn-secondary text-sm flex-shrink-0"
              onClick={async () => {
                toast('エクスポート中...', 'info');
                const blob = await exportData(token);
                if (blob) {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `crescendo-export-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast('エクスポート完了', 'success');
                } else {
                  toast('エクスポートに失敗しました', 'error');
                }
              }}>
              エクスポート
            </button>
          </div>

          {/* リセット */}
          <div className="border-t border-stone-200 pt-3 mt-1">
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="font-medium text-sm text-red-800 mb-1">🗑️ データ全削除＆再構築</p>
              <p className="text-xs text-red-600/80 mb-3">全演奏会データ・画像・ログを削除し、大学サイトから全ページ再スクレイプします</p>
              {!confirmReset ? (
                <button type="button" onClick={() => setConfirmReset(true)} disabled={resetting}
                  className="btn-danger text-sm">
                  リセット
                </button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setConfirmReset(false)} className="btn-secondary text-sm">
                    キャンセル
                  </button>
                  <button type="button"
                    onClick={async () => {
                      setResetting(true);
                      setResetResult(null);
                      setConfirmReset(false);
                      try {
                        setResetResult('⏳ データベース削除中...');
                        const resetRes = await triggerReset(token);
                        if (!resetRes.ok) {
                          setResetResult(`❌ ${resetRes.error || 'リセット失敗'}`);
                          toast(resetRes.error || 'リセットに失敗しました', 'error');
                          return;
                        }
                        setResetResult('✅ データベース削除完了\n⏳ 全ページスクレイピング中...');
                        toast('データ削除完了。再スクレイプ中...', 'success');

                        try {
                          const scrapeRes = await triggerBulkScrape(token);
                          if (scrapeRes.ok && scrapeRes.data) {
                            setResetResult(prev => `${prev}\n✅ ${scrapeRes.data!.found}件発見、${scrapeRes.data!.added}件追加\n⏳ 詳細情報・画像を取得中...`);
                            toast(`再構築完了: ${scrapeRes.data.added}件追加`, 'success');
                          } else {
                            setResetResult(prev => `${prev}\n⚠️ ${scrapeRes.error || '応答なし'}\n「手動実行」で再試行してください`);
                            return;
                          }
                        } catch {
                          setResetResult(prev => `${prev}\n⚠️ スクレイプがタイムアウト\n「手動実行」で再試行してください`);
                          return;
                        }

                        try {
                          let imageDone = false;
                          let imageLoop = 0;
                          while (!imageDone && imageLoop < 10) {
                            imageLoop++;
                            const fetchRes = await triggerMaintenanceTask(token, 'fetch_images');
                            if (!fetchRes.ok || !fetchRes.data || fetchRes.data.length === 0) {
                              setResetResult(prev => `${prev}\n⚠️ 画像取得バッチ${imageLoop}: ${fetchRes.error || '応答なし'}`);
                              break;
                            }
                            const detail = fetchRes.data[0].details;
                            setResetResult(prev => `${prev}\n🔄 画像取得バッチ${imageLoop}: ${detail}`);
                            if (detail.includes('残り 0 件') || detail.includes('画像取得が必要なイベントはありません')) imageDone = true;
                            if (detail.includes('中 0 件の画像を取得')) break;
                          }
                          const maintRes = await triggerMaintenance(token);
                          if (maintRes.ok && maintRes.data) {
                            const summary = maintRes.data.filter(r => r.success).map(r => r.details).join(', ');
                            setResetResult(prev => `${prev}\n✅ メンテナンス完了: ${summary}`);
                          }
                        } catch {
                          setResetResult(prev => `${prev}\n⚠️ メンテナンスがタイムアウト`);
                        }
                      } catch {
                        setResetResult('❌ 通信エラー');
                        toast('リセットに失敗しました', 'error');
                      } finally {
                        setResetting(false);
                      }
                    }}
                    disabled={resetting}
                    className="btn-danger text-sm">
                    {resetting ? '⏳ 実行中...' : '本当に削除する'}
                  </button>
                </div>
              )}
            </div>
            {resetResult && (
              <pre className="text-xs bg-stone-100 rounded-xl p-3 whitespace-pre-wrap overflow-x-auto mt-2">{resetResult}</pre>
            )}
          </div>
        </div>
      </div>

      {/* システム情報 */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-5">
        <h2 className="font-bold text-sm mb-3">ℹ️ システム情報</h2>
        <div className="text-xs space-y-1.5 text-stone-600">
          {[
            ['バージョン', '1.0.0'],
            ['フレームワーク', 'React 18 + Vite 5 + TypeScript'],
            ['ホスティング', 'Cloudflare Pages'],
            ['データベース', 'Cloudflare D1 (SQLite)'],
            ['ストレージ', 'Cloudflare KV'],
            ['スケジューラ', 'Cloudflare Workers Cron'],
            ['ライセンス', 'MIT'],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-stone-400 w-28 flex-shrink-0">{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// メンテナンスログタブ
// ============================================================
function LogsTab({ token, isMobile }: { token: string; isMobile: boolean }) {
  const [logs, setLogs] = useState<MaintenanceLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchMaintenanceLogs(token).then((res) => {
      if (res.ok && res.data) setLogs(res.data);
      setLoading(false);
    });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;

  const filtered = logs.filter((l) => filter === 'all' || l.result === filter);
  const errorCount = logs.filter((l) => l.result === 'error').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'success', 'error'] as const).map((f) => {
            const labels = { all: 'すべて', success: '✅ 成功', error: '❌ エラー' };
            const count = f === 'all' ? logs.length : logs.filter(l => l.result === f).length;
            return (
              <button type="button" key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === f ? 'bg-primary-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}>
                {labels[f]} ({count})
              </button>
            );
          })}
        </div>
        <button type="button" onClick={load} className="text-xs text-stone-400 hover:text-stone-600">↻ 更新</button>
      </div>

      {errorCount > 0 && filter !== 'success' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <span>❌</span>
          <p className="text-sm text-red-700">{errorCount}件のエラーが記録されています</p>
        </div>
      )}

      {isMobile ? (
        /* モバイル: カードレイアウト */
        <div className="space-y-2">
          {filtered.map((log) => (
            <div key={log.id}
              className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <button type="button"
                className="w-full p-3 text-left flex items-start gap-3"
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                <span className={`flex-shrink-0 text-xs px-2 py-1 rounded-full font-medium ${
                  log.result === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {log.result === 'success' ? '✅' : '❌'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800">{log.task}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{log.executed_at}</p>
                </div>
                <svg className={`w-4 h-4 text-stone-400 flex-shrink-0 transition-transform ${expandedId === log.id ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedId === log.id && (
                <div className="px-3 pb-3 border-t border-stone-100 pt-2">
                  <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap">{log.details}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* PC: テーブルレイアウト */
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-left text-stone-500 text-xs">
                <th className="py-3 px-4 font-medium">#</th>
                <th className="py-3 px-4 font-medium">タスク名</th>
                <th className="py-3 px-4 font-medium">結果</th>
                <th className="py-3 px-4 font-medium">詳細</th>
                <th className="py-3 px-4 font-medium whitespace-nowrap">実行日時</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.map((log) => (
                <tr key={log.id}
                  className="hover:bg-stone-50/50 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                  <td className="py-3 px-4 text-stone-400 text-xs tabular-nums">{log.id}</td>
                  <td className="py-3 px-4 font-medium text-xs">{log.task}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      log.result === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {log.result === 'success' ? '✅ 成功' : '❌ エラー'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-stone-500">
                    {expandedId === log.id ? (
                      <span className="whitespace-pre-wrap text-stone-700">{log.details}</span>
                    ) : (
                      <span className="truncate block max-w-[400px]">{log.details}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-stone-400 whitespace-nowrap text-xs">{log.executed_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-stone-400 text-sm">ログはありません</div>
      )}
    </div>
  );
}
