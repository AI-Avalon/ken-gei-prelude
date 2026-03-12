import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchConcert, fetchConcerts } from '../lib/api';
import { CATEGORIES, DEPARTMENTS } from '../lib/constants';
import { formatDateLong, formatTime, formatPricing, daysUntil } from '../lib/utils';
import ShareButtons from '../components/ShareButtons';
import CalendarAddDropdown from '../components/CalendarAddDropdown';
import MapSection from '../components/MapSection';
import ConcertCard from '../components/ConcertCard';
import type { Concert } from '../types';

export default function ConcertDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [concert, setConcert] = useState<Concert | null>(null);
  const [related, setRelated] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flyerModal, setFlyerModal] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchConcert(slug).then((res) => {
      if (res.ok && res.data) {
        setConcert(res.data);
        // Fetch related concerts (same category)
        fetchConcerts({ category: res.data.category, limit: 4 }).then((r) => {
          if (r.ok && r.data) {
            setRelated(r.data.filter((c) => c.slug !== slug).slice(0, 3));
          }
        });
      } else {
        setError(res.error || '演奏会が見つかりません');
      }
      setLoading(false);
    });
  }, [slug]);

  if (loading) return <div className="text-center py-20 text-gray-400">読み込み中...</div>;
  if (error || !concert) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-gray-500 mb-4">{error || '演奏会が見つかりません'}</p>
        <Link to="/concerts" className="btn-primary">演奏会一覧に戻る</Link>
      </div>
    );
  }

  const cat = CATEGORIES[concert.category] || CATEGORIES.other;
  const daysText = daysUntil(concert.date);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary-600">ホーム</Link>
        <span className="mx-2">&gt;</span>
        <Link to="/concerts" className="hover:text-primary-600">演奏会一覧</Link>
        <span className="mx-2">&gt;</span>
        <span className="text-gray-700">{concert.title}</span>
      </nav>

      {/* Category badge & status */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`badge ${cat.color}`}>{cat.icon} {cat.label}</span>
        <span className={`text-sm font-medium ${
          daysText === '本日！' ? 'text-red-600' : daysText === '終了' ? 'text-gray-400' : 'text-primary-600'
        }`}>
          {daysText}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">{concert.title}</h1>
      {concert.subtitle && <p className="text-xl text-gray-600 mb-6">{concert.subtitle}</p>}

      {/* Basic info table */}
      <div className="card p-6 mb-6">
        <table className="w-full">
          <tbody className="divide-y">
            <tr>
              <td className="py-3 pr-4 text-gray-500 font-medium w-24">日時</td>
              <td className="py-3">
                {formatDateLong(concert.date)} {formatTime(concert)}
              </td>
            </tr>
            <tr>
              <td className="py-3 pr-4 text-gray-500 font-medium">会場</td>
              <td className="py-3">
                <span className="font-medium">{concert.venue?.name}</span>
                {concert.venue?.address && (
                  <span className="block text-sm text-gray-500">{concert.venue.address}</span>
                )}
              </td>
            </tr>
            {concert.seating && (
              <tr>
                <td className="py-3 pr-4 text-gray-500 font-medium">座席</td>
                <td className="py-3">{concert.seating}</td>
              </tr>
            )}
            {concert.departments?.length > 0 && (
              <tr>
                <td className="py-3 pr-4 text-gray-500 font-medium">専攻</td>
                <td className="py-3 flex flex-wrap gap-2">
                  {concert.departments.map((d) => {
                    const dept = DEPARTMENTS[d];
                    return dept ? (
                      <span key={d} className="text-sm">{dept.icon} {dept.label}</span>
                    ) : null;
                  })}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pricing */}
      {concert.pricing && concert.pricing.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">料金</h2>
          <div className="space-y-2">
            {concert.pricing.map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-gray-700">{p.label}</span>
                <span className="font-medium">
                  {p.amount === 0 ? '無料' : `¥${p.amount.toLocaleString()}`}
                  {p.note && <span className="text-sm text-gray-500 ml-2">{p.note}</span>}
                </span>
              </div>
            ))}
          </div>
          {concert.pricing_note && (
            <p className="text-sm text-amber-700 mt-3 flex items-center gap-1">
              ⚠ {concert.pricing_note}
            </p>
          )}
          {concert.ticket_url && (
            <a href={concert.ticket_url} target="_blank" rel="noopener noreferrer"
              className="inline-block mt-3 text-primary-600 hover:underline text-sm">
              🎫 チケット情報 →
            </a>
          )}
          {concert.ticket_note && (
            <p className="text-sm text-gray-500 mt-2">{concert.ticket_note}</p>
          )}
        </div>
      )}

      {/* Flyer images */}
      {concert.flyer_r2_keys?.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">チラシ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {concert.flyer_r2_keys.map((key, i) => (
              <img
                key={i}
                src={`/api/image/${key}`}
                alt={`${concert.title} チラシ ${i + 1}`}
                className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setFlyerModal(`/api/image/${key}`)}
                loading="lazy"
              />
            ))}
          </div>
        </div>
      )}

      {/* Flyer modal */}
      {flyerModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setFlyerModal(null)}
        >
          <img src={flyerModal} alt="チラシ拡大" className="max-h-[90vh] max-w-full rounded-lg" />
          <button
            className="absolute top-4 right-4 text-white text-3xl hover:opacity-70"
            onClick={() => setFlyerModal(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Program */}
      {concert.program?.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">プログラム</h2>
          <div className="space-y-2">
            {concert.program.map((p, i) => (
              <div key={i} className="flex gap-4 text-sm">
                <span className="text-gray-500 min-w-[120px]">{p.composer}</span>
                <span className="text-gray-800">{p.piece}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performers */}
      {concert.performers?.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">出演者</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {concert.performers.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-800">{p.name}</span>
                {p.instrument && <span className="text-gray-500">({p.instrument})</span>}
                {p.year && <span className="text-xs text-gray-400">{p.year}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supervisors */}
      {concert.supervisors?.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">指導者</h2>
          <ul className="space-y-1 text-sm text-gray-700">
            {concert.supervisors.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Guest artists */}
      {concert.guest_artists?.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">ゲスト</h2>
          <ul className="space-y-1 text-sm text-gray-700">
            {concert.guest_artists.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Description */}
      {concert.description && (
        <div className="card p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">詳細</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{concert.description}</p>
        </div>
      )}

      {/* Contact */}
      {(concert.contact_email || concert.contact_tel || concert.contact_person || concert.contact_url) && (
        <div className="card p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">お問い合わせ先</h2>
          <div className="space-y-1 text-sm">
            {concert.contact_person && <p>代表: {concert.contact_person}</p>}
            {concert.contact_email && (
              <p>✉ <a href={`mailto:${concert.contact_email}`} className="text-primary-600 hover:underline">{concert.contact_email}</a></p>
            )}
            {concert.contact_tel && <p>📞 {concert.contact_tel}</p>}
            {concert.contact_url && (
              <p>🔗 <a href={concert.contact_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{concert.contact_url}</a></p>
            )}
          </div>
        </div>
      )}

      {/* Map */}
      {concert.venue && (
        <div className="card p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">地図・アクセス</h2>
          {concert.venue.access && concert.venue.access.length > 0 && (
            <ul className="text-sm text-gray-600 mb-4 space-y-1">
              {concert.venue.access.map((a, i) => (
                <li key={i}>🚃 {a}</li>
              ))}
            </ul>
          )}
          {concert.venue.parking && (
            <p className="text-sm text-gray-600 mb-4">🅿 駐車場: {concert.venue.parking}</p>
          )}
          <MapSection venue={concert.venue} />
        </div>
      )}

      {/* Calendar Add */}
      <div className="card p-6 mb-6">
        <h2 className="font-bold text-lg mb-3">カレンダーに追加</h2>
        <CalendarAddDropdown concert={concert} />
      </div>

      {/* Share */}
      <div className="card p-6 mb-6">
        <h2 className="font-bold text-lg mb-3">共有</h2>
        <ShareButtons concert={concert} />
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-lg mb-4">関連する演奏会</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((c) => (
              <ConcertCard key={c.id} concert={c} />
            ))}
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="flex items-center justify-between text-sm text-gray-400 pt-4 border-t">
        <span>👁 {concert.views.toLocaleString()} 回閲覧</span>
        <Link to={`/concerts/${concert.slug}/edit`} className="text-primary-600 hover:underline">
          ✏️ この演奏会を編集
        </Link>
      </div>
    </div>
  );
}
