import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  adminAuth, adminFetchConcerts, adminUpdateConcert, adminDeleteConcert,
  fetchStats, fetchInquiries, updateInquiry, fetchMaintenanceLogs,
  triggerScrape, triggerMaintenance,
} from '../lib/api';
import { CATEGORIES } from '../lib/constants';
import { formatDateShort } from '../lib/utils';
import Modal from '../components/Modal';
import { toast } from '../components/Toast';
import type { Concert, Inquiry, MaintenanceLogEntry } from '../types';

type Tab = 'overview' | 'concerts' | 'inquiries' | 'flyers' | 'analytics' | 'settings' | 'logs';

export default function AdminPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem('admin_token') || '');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

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
      <div className="max-w-md mx-auto py-20 px-4">
        <div className="card p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">🔒 管理ダッシュボード</h1>
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
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">管理ダッシュボード</h1>
        <button onClick={logout} className="text-sm text-stone-500 hover:text-red-600">
          ログアウト
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6 overflow-x-auto">
        {([
          ['overview', '概要'],
          ['concerts', '演奏会管理'],
          ['inquiries', 'お問い合わせ'],
          ['flyers', 'チラシ管理'],
          ['analytics', '分析'],
          ['settings', '設定'],
          ['logs', 'メンテナンスログ'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab token={token} />}
      {tab === 'concerts' && <ConcertsTab token={token} />}
      {tab === 'inquiries' && <InquiriesTab token={token} />}
      {tab === 'flyers' && <FlyersTab token={token} />}
      {tab === 'analytics' && <AnalyticsTab token={token} />}
      {tab === 'settings' && <SettingsTab token={token} />}
      {tab === 'logs' && <LogsTab token={token} />}
    </div>
  );
}

// ============================================================
// Overview Tab
// ============================================================
function OverviewTab({ token }: { token: string }) {
  const [stats, setStats] = useState<{
    total: number;
    upcoming: number;
    past: number;
    totalViews: number;
    monthViews: number;
    byCategory: Record<string, number>;
    topConcerts: { slug: string; title: string; views: number }[];
    dailyViews: { date: string; count: number }[];
    recentInquiries: number;
    unpublished: number;
  } | null>(null);

  useEffect(() => {
    fetchStats(token).then((res) => {
      if (res.ok && res.data) setStats(res.data);
    });
  }, [token]);

  if (!stats) return <div className="text-center py-8 text-stone-400">読み込み中...</div>;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="総登録数" value={stats.total} icon="📊" />
        <StatCard label="今後の公演" value={stats.upcoming} icon="📅" color="text-primary-600" />
        <StatCard label="終了済み" value={stats.past} icon="✅" />
        <StatCard label="総閲覧数" value={stats.totalViews} icon="👁" />
        <StatCard label="今月の閲覧数" value={stats.monthViews} icon="📈" color="text-green-600" />
      </div>

      {/* Alerts */}
      {stats.unpublished > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-medium text-amber-800">未公開の演奏会が{stats.unpublished}件あります</p>
            <p className="text-sm text-amber-600">自動取得された演奏会を確認してください</p>
          </div>
        </div>
      )}
      {stats.recentInquiries > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-2xl">📩</span>
          <div>
            <p className="font-medium text-primary-800">未読のお問い合わせが{stats.recentInquiries}件あります</p>
          </div>
        </div>
      )}

      {/* Top concerts */}
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4">📊 閲覧数ランキング</h2>
        <div className="space-y-3">
          {stats.topConcerts.map((c, i) => (
            <div key={c.slug} className="flex items-center gap-3">
              <span className="text-lg font-bold text-stone-300 w-6">{i + 1}</span>
              <Link to={`/concerts/${c.slug}`} className="flex-1 text-sm hover:text-primary-600 truncate">
                {c.title}
              </Link>
              <span className="text-sm text-stone-500">👁 {c.views.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category distribution */}
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4">🎵 カテゴリ別分布</h2>
        <div className="space-y-2">
          {Object.entries(stats.byCategory).map(([key, count]) => {
            const cat = CATEGORIES[key] || { label: key, icon: '🎵', color: '' };
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-28 text-sm">{cat.icon} {cat.label}</span>
                <div className="flex-1 bg-stone-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-primary-400 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-sm text-stone-500 w-12 text-right">{count}件</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily views chart (simple text) */}
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4">📈 日別閲覧数（過去30日）</h2>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {stats.dailyViews.slice(-28).map((d) => {
            const maxViews = Math.max(...stats.dailyViews.map((v) => v.count), 1);
            const intensity = Math.round((d.count / maxViews) * 4);
            const bg = ['bg-stone-100', 'bg-primary-100', 'bg-primary-200', 'bg-primary-300', 'bg-primary-400'][intensity];
            return (
              <div key={d.date} className={`${bg} rounded p-1 text-center`} title={`${d.date}: ${d.count}回`}>
                <div className="text-stone-400">{d.date.slice(5)}</div>
                <div className="font-medium">{d.count}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color?: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${color || 'text-stone-800'}`}>{value.toLocaleString()}</div>
      <div className="text-xs text-stone-500">{label}</div>
    </div>
  );
}

// ============================================================
// Concerts Management Tab
// ============================================================
function ConcertsTab({ token }: { token: string }) {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'unpublished' | 'deleted'>('all');

  useEffect(() => {
    adminFetchConcerts(token).then((res) => {
      if (res.ok && res.data) setConcerts(res.data);
      setLoading(false);
    });
  }, [token]);

  const togglePublish = async (concert: Concert) => {
    const res = await adminUpdateConcert(concert.slug, {
      is_published: concert.is_published ? 0 : 1,
    }, token);
    if (res.ok) {
      setConcerts((prev) =>
        prev.map((c) =>
          c.slug === concert.slug ? { ...c, is_published: concert.is_published ? 0 : 1 } : c,
        ),
      );
      toast(`${concert.is_published ? '非公開' : '公開'}にしました`, 'success');
    }
  };

  const handleDelete = async (concert: Concert) => {
    if (!confirm(`「${concert.title}」を削除しますか？`)) return;
    const res = await adminDeleteConcert(concert.slug, token);
    if (res.ok) {
      setConcerts((prev) =>
        prev.map((c) => c.slug === concert.slug ? { ...c, is_deleted: 1 } : c),
      );
      toast('削除しました', 'success');
    }
  };

  const filtered = concerts.filter((c) => {
    if (filter === 'published') return c.is_published && !c.is_deleted;
    if (filter === 'unpublished') return !c.is_published && !c.is_deleted;
    if (filter === 'deleted') return c.is_deleted;
    return true;
  });

  if (loading) return <div className="text-center py-8 text-stone-400">読み込み中...</div>;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['all', 'published', 'unpublished', 'deleted'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === f ? 'bg-primary-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {{ all: 'すべて', published: '公開中', unpublished: '非公開', deleted: 'ゴミ箱' }[f]}
            <span className="ml-1 text-xs">
              ({concerts.filter((c) => {
                if (f === 'published') return c.is_published && !c.is_deleted;
                if (f === 'unpublished') return !c.is_published && !c.is_deleted;
                if (f === 'deleted') return c.is_deleted;
                return true;
              }).length})
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-stone-500">
              <th className="py-2 pr-2">タイトル</th>
              <th className="py-2 pr-2">日付</th>
              <th className="py-2 pr-2">会場</th>
              <th className="py-2 pr-2">カテゴリ</th>
              <th className="py-2 pr-2">👁</th>
              <th className="py-2 pr-2">ステータス</th>
              <th className="py-2">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((c) => {
              const cat = CATEGORIES[c.category] || CATEGORIES.other;
              return (
                <tr key={c.id} className={c.is_deleted ? 'opacity-50' : ''}>
                  <td className="py-2 pr-2">
                    <Link to={`/concerts/${c.slug}`} className="hover:text-primary-600 font-medium">
                      {c.title}
                    </Link>
                    {c.source === 'auto_scrape' && (
                      <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1 rounded">自動取得</span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-stone-500 whitespace-nowrap">{formatDateShort(c.date)}</td>
                  <td className="py-2 pr-2 text-stone-500 truncate max-w-[120px]">{c.venue?.name}</td>
                  <td className="py-2 pr-2">
                    <span className={`badge ${cat.color} text-xs`}>{cat.icon}{cat.label}</span>
                  </td>
                  <td className="py-2 pr-2 text-stone-500">{c.views}</td>
                  <td className="py-2 pr-2">
                    {c.is_deleted ? (
                      <span className="text-red-500 text-xs">🗑 削除済</span>
                    ) : c.is_published ? (
                      <span className="text-green-600 text-xs">🟢 公開</span>
                    ) : (
                      <span className="text-amber-600 text-xs">🟡 非公開</span>
                    )}
                  </td>
                  <td className="py-2 flex gap-2">
                    {!c.is_deleted && (
                      <>
                        <button onClick={() => togglePublish(c)} className="text-xs text-primary-600 hover:underline">
                          {c.is_published ? '非公開に' : '公開する'}
                        </button>
                        <Link to={`/concerts/${c.slug}/edit`} className="text-xs text-stone-500 hover:underline">
                          編集
                        </Link>
                        <button onClick={() => handleDelete(c)} className="text-xs text-red-500 hover:underline">
                          削除
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Inquiries Tab
// ============================================================
function InquiriesTab({ token }: { token: string }) {
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
      setInquiries((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: status as Inquiry['status'] } : i)),
      );
    }
  };

  const saveNote = async (id: number) => {
    const res = await updateInquiry(id, { admin_note: note }, token);
    if (res.ok) {
      setInquiries((prev) =>
        prev.map((i) => (i.id === id ? { ...i, admin_note: note } : i)),
      );
      toast('メモを保存しました', 'success');
    }
  };

  const filtered = inquiries.filter((i) => statusFilter === 'all' || i.status === statusFilter);

  if (loading) return <div className="text-center py-8 text-stone-400">読み込み中...</div>;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['all', 'unread', 'read', 'replied'] as const).map((f) => {
          const icons = { all: '', unread: '🔴', read: '🟢', replied: '✅' };
          const labels = { all: 'すべて', unread: '未読', read: '既読', replied: '返信済' };
          return (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 rounded-full text-sm ${
                statusFilter === f ? 'bg-primary-600 text-white' : 'bg-stone-100 text-stone-600'
              }`}
            >
              {icons[f]} {labels[f]}
              <span className="ml-1 text-xs">
                ({inquiries.filter((i) => f === 'all' || i.status === f).length})
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-stone-500">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">状態</th>
              <th className="py-2 pr-2">名前</th>
              <th className="py-2 pr-2">件名</th>
              <th className="py-2 pr-2">日時</th>
              <th className="py-2">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((inq) => (
              <tr key={inq.id}>
                <td className="py-2 pr-2 text-stone-400">{inq.id}</td>
                <td className="py-2 pr-2">
                  {{ unread: '🔴', read: '🟢', replied: '✅' }[inq.status]}
                </td>
                <td className="py-2 pr-2 font-medium">{inq.name || '(暗号化)'}</td>
                <td className="py-2 pr-2">{inq.subject}</td>
                <td className="py-2 pr-2 text-stone-500 whitespace-nowrap">
                  {inq.created_at?.slice(0, 10)}
                </td>
                <td className="py-2 flex gap-2">
                  <button
                    onClick={() => { setSelected(inq); setNote(inq.admin_note); }}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    詳細
                  </button>
                  {inq.status === 'unread' && (
                    <button
                      onClick={() => changeStatus(inq.id, 'read')}
                      className="text-xs text-stone-500 hover:underline"
                    >
                      既読に
                    </button>
                  )}
                  {inq.status !== 'replied' && (
                    <button
                      onClick={() => changeStatus(inq.id, 'replied')}
                      className="text-xs text-green-600 hover:underline"
                    >
                      返信済に
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="お問い合わせ詳細">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-stone-500">名前</span>
                <p className="font-medium">{selected.name || '(暗号化)'}</p>
              </div>
              <div>
                <span className="text-stone-500">メール</span>
                <p className="font-medium">{selected.email || '(暗号化)'}</p>
              </div>
              <div>
                <span className="text-stone-500">件名</span>
                <p className="font-medium">{selected.subject}</p>
              </div>
              <div>
                <span className="text-stone-500">日時</span>
                <p>{selected.created_at}</p>
              </div>
            </div>
            {selected.concert_id && (
              <div className="text-sm">
                <span className="text-stone-500">関連演奏会: </span>
                <Link to={`/concerts/${selected.concert_id}`} className="text-primary-600 hover:underline">
                  {selected.concert_id}
                </Link>
              </div>
            )}
            <div>
              <span className="text-sm text-stone-500">メッセージ</span>
              <div className="mt-1 p-3 bg-stone-50 rounded-lg text-sm whitespace-pre-wrap">
                {selected.message}
              </div>
            </div>
            <div>
              <label className="text-sm text-stone-500">管理者メモ</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="input w-full mt-1"
                rows={3}
                placeholder="対応メモを記録..."
              />
              <button
                onClick={() => saveNote(selected.id)}
                className="btn-primary text-sm mt-2"
              >
                メモを保存
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// Flyers Tab
// ============================================================
function FlyersTab({ token }: { token: string }) {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetchConcerts(token).then((res) => {
      if (res.ok && res.data) setConcerts(res.data);
      setLoading(false);
    });
  }, [token]);

  if (loading) return <div className="text-center py-8 text-stone-400">読み込み中...</div>;

  const withFlyers = concerts.filter((c) => c.flyer_r2_keys && c.flyer_r2_keys.length > 0);
  const withoutFlyers = concerts.filter((c) => !c.flyer_r2_keys || c.flyer_r2_keys.length === 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="チラシあり" value={withFlyers.length} icon="🖼️" />
        <StatCard label="チラシなし" value={withoutFlyers.length} icon="📄" />
        <StatCard label="総ファイル数" value={withFlyers.reduce((a, c) => a + (c.flyer_r2_keys?.length || 0), 0)} icon="📁" />
        <StatCard label="カバー率" value={Math.round((withFlyers.length / Math.max(concerts.length, 1)) * 100)} icon="📊" color="text-primary-600" />
      </div>

      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4">チラシ未登録の演奏会</h2>
        <div className="space-y-2">
          {withoutFlyers.slice(0, 20).map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <Link to={`/concerts/${c.slug}`} className="hover:text-primary-600 truncate flex-1">
                {c.title}
              </Link>
              <span className="text-stone-400 ml-2 whitespace-nowrap">{formatDateShort(c.date)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4">チラシ一覧</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {withFlyers.map((c) => (
            <Link key={c.id} to={`/concerts/${c.slug}`} className="group">
              <div className="aspect-[3/4] bg-stone-100 rounded-lg overflow-hidden">
                {c.flyer_thumbnail_key ? (
                  <img
                    src={`/api/image/${c.flyer_thumbnail_key}`}
                    alt={c.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">📄</div>
                )}
              </div>
              <p className="text-xs mt-1 truncate text-stone-600">{c.title}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Analytics Tab
// ============================================================
function AnalyticsTab({ token }: { token: string }) {
  const [stats, setStats] = useState<{
    totalViews: number;
    monthViews: number;
    topConcerts: { slug: string; title: string; views: number }[];
    byCategory: Record<string, number>;
    dailyViews: { date: string; count: number }[];
  } | null>(null);

  useEffect(() => {
    fetchStats(token).then((res) => {
      if (res.ok && res.data) setStats(res.data);
    });
  }, [token]);

  if (!stats) return <div className="text-center py-8 text-stone-400">読み込み中...</div>;

  const maxDaily = Math.max(...stats.dailyViews.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-primary-600">{stats.totalViews.toLocaleString()}</div>
          <div className="text-sm text-stone-500">総閲覧数</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-green-600">{stats.monthViews.toLocaleString()}</div>
          <div className="text-sm text-stone-500">今月の閲覧数</div>
        </div>
      </div>

      {/* Daily views bar chart */}
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4">日別閲覧数（過去30日）</h2>
        <div className="flex items-end gap-1 h-40">
          {stats.dailyViews.slice(-30).map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-primary-400 rounded-t"
                style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: d.count > 0 ? '2px' : '0' }}
                title={`${d.date}: ${d.count}回`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-stone-400 mt-1">
          <span>{stats.dailyViews[Math.max(stats.dailyViews.length - 30, 0)]?.date.slice(5)}</span>
          <span>{stats.dailyViews[stats.dailyViews.length - 1]?.date.slice(5)}</span>
        </div>
      </div>

      {/* Top concerts */}
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4">閲覧数ランキング</h2>
        <div className="space-y-3">
          {stats.topConcerts.map((c, i) => (
            <div key={c.slug} className="flex items-center gap-3">
              <span className="text-xl font-bold text-stone-300 w-8 text-right">{i + 1}</span>
              <Link to={`/concerts/${c.slug}`} className="flex-1 text-sm hover:text-primary-600 truncate">
                {c.title}
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-stone-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-primary-400 rounded-full"
                    style={{ width: `${(c.views / Math.max(stats.topConcerts[0]?.views, 1)) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-stone-500 w-16 text-right">{c.views.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category distribution */}
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4">カテゴリ別分布</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Object.entries(stats.byCategory).map(([key, count]) => {
            const cat = CATEGORIES[key] || { label: key, icon: '🎵', color: '' };
            return (
              <div key={key} className="card p-3 text-center">
                <div className="text-xl">{cat.icon}</div>
                <div className="text-lg font-bold">{count}</div>
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
// Settings Tab
// ============================================================
function SettingsTab({ token }: { token: string }) {
  const [scraping, setScraping] = useState(false);
  const [maintaining, setMaintaining] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);
  const [maintenanceResult, setMaintenanceResult] = useState<string | null>(null);

  const handleScrape = async () => {
    setScraping(true);
    setScrapeResult(null);
    try {
      const res = await triggerScrape(token);
      if (res.ok && res.data) {
        const d = res.data;
        setScrapeResult(`✅ ${d.found}件発見、${d.added}件新規追加${d.errors.length > 0 ? `\n⚠️ ${d.errors.join(', ')}` : ''}`);
        toast(`スクレイピング完了: ${d.found}件発見、${d.added}件追加`, 'success');
      } else {
        setScrapeResult(`❌ ${res.error || '失敗'}`);
        toast(res.error || 'スクレイピングに失敗しました', 'error');
      }
    } catch {
      setScrapeResult('❌ 通信エラー');
      toast('スクレイピングに失敗しました', 'error');
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
        toast(res.error || 'メンテナンスに失敗しました', 'error');
      }
    } catch {
      setMaintenanceResult('❌ 通信エラー');
      toast('メンテナンスに失敗しました', 'error');
    } finally {
      setMaintaining(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4">⚙️ サイト設定</h2>
        <div className="space-y-4">
          <div>
            <label className="label">大学公式イベントページURL</label>
            <input
              type="url"
              defaultValue="https://www.aichi-fam-u.ac.jp/event/music/"
              className="input w-full"
              readOnly
            />
            <p className="text-xs text-stone-400 mt-1">スクレイピング対象URL（コード変更が必要）</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4">🔧 メンテナンス操作</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
            <div>
              <p className="font-medium text-sm">🌐 大学サイトスクレイピング</p>
              <p className="text-xs text-stone-500">愛知県芸公式サイトから演奏会情報を取得（通常は毎朝6:00に自動実行）</p>
            </div>
            <button
              onClick={handleScrape}
              disabled={scraping}
              className="btn-primary text-sm"
            >
              {scraping ? '実行中...' : '手動実行'}
            </button>
          </div>
          {scrapeResult && (
            <pre className="text-xs bg-stone-100 rounded p-3 whitespace-pre-wrap">{scrapeResult}</pre>
          )}

          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
            <div>
              <p className="font-medium text-sm">🧹 自動メンテナンス</p>
              <p className="text-xs text-stone-500">古いログ削除・物理削除・レート制限クリア（通常は毎月1日に自動実行）</p>
            </div>
            <button
              onClick={handleMaintenance}
              disabled={maintaining}
              className="btn-primary text-sm"
            >
              {maintaining ? '実行中...' : '手動実行'}
            </button>
          </div>
          {maintenanceResult && (
            <pre className="text-xs bg-stone-100 rounded p-3 whitespace-pre-wrap">{maintenanceResult}</pre>
          )}

          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
            <div>
              <p className="font-medium text-sm">データバックアップ</p>
              <p className="text-xs text-stone-500">D1データをJSON形式でエクスポート</p>
            </div>
            <button className="btn-secondary text-sm" disabled>
              エクスポート（準備中）
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4">ℹ️ システム情報</h2>
        <div className="text-sm space-y-1 text-stone-600">
          <p>バージョン: 1.0.0</p>
          <p>フレームワーク: React 18 + Vite 5</p>
          <p>ホスティング: Cloudflare Pages</p>
          <p>データベース: Cloudflare D1 (SQLite)</p>
          <p>ストレージ: Cloudflare KV</p>
          <p>ライセンス: MIT</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Logs Tab
// ============================================================
function LogsTab({ token }: { token: string }) {
  const [logs, setLogs] = useState<MaintenanceLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaintenanceLogs(token).then((res) => {
      if (res.ok && res.data) setLogs(res.data);
      setLoading(false);
    });
  }, [token]);

  if (loading) return <div className="text-center py-8 text-stone-400">読み込み中...</div>;

  return (
    <div>
      <h2 className="font-bold text-lg mb-4">メンテナンスログ</h2>
      {logs.length === 0 ? (
        <p className="text-stone-400 text-sm">ログはまだありません</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-stone-500">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">タスク</th>
                <th className="py-2 pr-2">結果</th>
                <th className="py-2 pr-2">詳細</th>
                <th className="py-2">実行日時</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="py-2 pr-2 text-stone-400">{log.id}</td>
                  <td className="py-2 pr-2 font-medium">{log.task}</td>
                  <td className="py-2 pr-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      log.result === 'success'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {log.result === 'success' ? '✅ 成功' : '❌ エラー'}
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-stone-500 truncate max-w-[300px]">{log.details}</td>
                  <td className="py-2 text-stone-500 whitespace-nowrap">{log.executed_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Reuse StatCard in FlyersTab
function StatCard2({ label, value, icon, color }: { label: string; value: number; icon: string; color?: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${color || 'text-stone-800'}`}>{value.toLocaleString()}</div>
      <div className="text-xs text-stone-500">{label}</div>
    </div>
  );
}
