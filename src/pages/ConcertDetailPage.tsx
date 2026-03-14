import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchConcert, fetchConcerts } from '../lib/api';
import { CATEGORIES, DEPARTMENTS } from '../lib/constants';
import { formatDateLong, formatTime, daysUntil } from '../lib/utils';
import ShareButtons from '../components/ShareButtons';
import CalendarAddDropdown from '../components/CalendarAddDropdown';
import MapSection from '../components/MapSection';
import ConcertCard from '../components/ConcertCard';
import PdfFlyerRenderer from '../components/PdfFlyerRenderer';
import { useIsMobile } from '../hooks/useDevice';
import type { Concert } from '../types';

// Collapsible section with smooth animation
function Section({ title, icon, children, defaultOpen = true }: {
  title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 mb-4 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-stone-50/50 transition-colors"
      >
        <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
          <span>{icon}</span> {title}
        </h2>
        <svg
          className={`w-5 h-5 text-stone-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`transition-all duration-300 ease-out ${
          open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
          {children}
        </div>
      </div>
    </div>
  );
}

// Staggered fade-in wrapper
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div
      className="animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      {children}
    </div>
  );
}

export default function ConcertDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [concert, setConcert] = useState<Concert | null>(null);
  const [related, setRelated] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flyerModal, setFlyerModal] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchConcert(slug).then((res) => {
      // Handle slug redirect (merged/deduplicated concert)
      const redirectSlug = (res as unknown as Record<string, unknown>).redirect_slug as string | undefined;
      if (redirectSlug) {
        navigate(`/concerts/${redirectSlug}`, { replace: true });
        return;
      }
      if (res.ok && res.data) {
        setConcert(res.data);
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

  if (loading) return (
    <div className={`${isMobile ? 'px-4 py-4' : 'max-w-4xl mx-auto px-4 py-8'} space-y-4`}>
      <div className="skeleton h-4 w-48" />
      <div className="skeleton h-10 w-3/4" />
      <div className="skeleton h-6 w-1/3" />
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5 space-y-3">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-4 w-1/2" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5">
        <div className="skeleton h-64 w-full rounded-lg" />
      </div>
    </div>
  );

  if (error || !concert) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <div className="text-5xl mb-4">🎵</div>
        <p className="text-xl text-stone-500 mb-6">{error || '演奏会が見つかりません'}</p>
        <Link to="/concerts" className="btn-primary">演奏会一覧に戻る</Link>
      </div>
    );
  }

  const cat = CATEGORIES[concert.category] || CATEGORIES.other;
  const daysText = daysUntil(concert.date);
  const isToday = daysText === '本日！';
  const isEnded = daysText === '終了';

  return (
    <div className={`${isMobile ? 'px-4 py-4 pb-24' : 'max-w-4xl mx-auto px-4 py-8'}`}>
      {/* Breadcrumb — desktop only */}
      {!isMobile && (
        <FadeIn>
          <nav className="text-sm text-stone-500 mb-6 flex items-center gap-2">
            <Link to="/" className="hover:text-primary-600 transition-colors">ホーム</Link>
            <span className="text-stone-300">/</span>
            <Link to="/concerts" className="hover:text-primary-600 transition-colors">演奏会一覧</Link>
            <span className="text-stone-300">/</span>
            <span className="text-stone-700 truncate max-w-[300px]">{concert.title}</span>
          </nav>
        </FadeIn>
      )}

      {/* Header */}
      <FadeIn delay={50}>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Link to="/concerts" className="text-stone-400 hover:text-primary-600 transition-colors p-1 -ml-1" aria-label="戻る">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className={`badge ${cat.color}`}>{cat.icon} {cat.label}</span>
            <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
              isToday ? 'bg-red-100 text-red-700' : isEnded ? 'bg-stone-100 text-stone-500' : 'bg-primary-100 text-primary-700'
            }`}>
              {daysText}
            </span>
          </div>

          <h1 className={`${isMobile ? 'text-xl' : 'text-3xl md:text-4xl'} font-serif font-bold leading-tight`}>
            {concert.title}
          </h1>
          {concert.subtitle && (
            <p className={`${isMobile ? 'text-base' : 'text-xl'} text-stone-500 mt-2`}>{concert.subtitle}</p>
          )}
        </div>
      </FadeIn>

      {/* Quick info bar */}
      <FadeIn delay={100}>
        <div className={`bg-white rounded-xl border border-stone-200 shadow-sm ${isMobile ? 'p-4' : 'p-5'} mb-4`}>
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-6'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 text-lg">📅</span>
              </div>
              <div>
                <div className="text-xs text-stone-500">日時</div>
                <div className="text-sm font-medium">
                  {formatDateLong(concert.date)}
                  {concert.time_start && <span className="text-stone-500"> {formatTime(concert)}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center flex-shrink-0">
                <span className="text-accent-700 text-lg">📍</span>
              </div>
              <div className="min-w-0">
                <div className="text-xs text-stone-500">会場</div>
                <div className="text-sm font-medium truncate">{concert.venue?.name || '未定'}</div>
                {concert.venue?.address && (
                  <div className="text-xs text-stone-400 truncate">{concert.venue.address}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-700 text-lg">🎫</span>
              </div>
              <div>
                <div className="text-xs text-stone-500">入場</div>
                <div className="text-sm font-medium">
                  {concert.pricing && concert.pricing.length > 0 ? (
                    concert.pricing.every(p => p.amount === 0)
                      ? <span className="text-emerald-600">無料</span>
                      : concert.pricing.map((p, i) => (
                          <span key={i}>
                            {i > 0 && ' / '}
                            {p.amount === 0 ? '無料' : `¥${p.amount.toLocaleString()}`}
                          </span>
                        ))
                  ) : <span className="text-stone-400">情報なし</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Ticket CTA */}
      {concert.ticket_url && (
        <FadeIn delay={150}>
          <a href={concert.ticket_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-700 text-white font-medium px-6 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all mb-4 w-full sm:w-auto sm:inline-flex">
            🎫 チケットを購入・予約する
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </FadeIn>
      )}

      {/* Flyer images */}
      {concert.flyer_r2_keys?.length > 0 && (() => {
        const imageKeys = concert.flyer_r2_keys.filter(key => !key.endsWith('.pdf'));
        const pdfKeys = concert.flyer_r2_keys.filter(key => key.endsWith('.pdf'));
        if (imageKeys.length === 0 && pdfKeys.length === 0) return null;

        return (
          <FadeIn delay={200}>
            <Section title="チラシ" icon="📄" defaultOpen={true}>
              {/* Rendered image flyers */}
              {imageKeys.length > 0 && (
                <>
                  {imageKeys.length > 1 && (
                    <p className="text-sm text-stone-500 mb-3">{imageKeys.length}ページ — タップで拡大</p>
                  )}
                  {isMobile ? (
                    <div className="space-y-3">
                      {imageKeys.map((key, i) => (
                        <div key={i} className="relative">
                          <img
                            src={`/api/image/${key}`}
                            alt={`${concert.title} チラシ ${i + 1}`}
                            className="rounded-lg w-full active:scale-[0.98] transition-transform cursor-pointer shadow-sm"
                            onClick={() => setFlyerModal(`/api/image/${key}`)}
                            loading={i === 0 ? 'eager' : 'lazy'}
                          />
                          {imageKeys.length > 1 && (
                            <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
                              {i + 1}/{imageKeys.length}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`grid gap-4 ${imageKeys.length === 1 ? 'grid-cols-1 max-w-lg' : 'grid-cols-2'}`}>
                      {imageKeys.map((key, i) => (
                        <img
                          key={i}
                          src={`/api/image/${key}`}
                          alt={`${concert.title} チラシ ${i + 1}`}
                          className="rounded-lg cursor-pointer hover:opacity-90 hover:shadow-xl transition-all w-full"
                          onClick={() => setFlyerModal(`/api/image/${key}`)}
                          loading={i === 0 ? 'eager' : 'lazy'}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* PDF flyers — rendered client-side */}
              {pdfKeys.length > 0 && imageKeys.length === 0 && pdfKeys.map((key, i) => (
                <PdfFlyerRenderer
                  key={key}
                  pdfKey={key}
                  concertSlug={concert.slug}
                  alt={`${concert.title} チラシ ${i + 1}`}
                  onClick={(url) => setFlyerModal(url)}
                />
              ))}
            </Section>
          </FadeIn>
        );
      })()}

      {/* Flyer modal */}
      {flyerModal && (() => {
        const flyerKeys = concert.flyer_r2_keys.filter(key => !key.endsWith('.pdf'));
        const currentIndex = flyerKeys.findIndex(k => `/api/image/${k}` === flyerModal);
        const hasPrev = currentIndex > 0;
        const hasNext = currentIndex < flyerKeys.length - 1;

        return (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center animate-fade-in backdrop-blur-sm"
            onClick={() => setFlyerModal(null)}
          >
            {hasPrev && (
              <button
                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center transition-all z-10"
                onClick={(e) => { e.stopPropagation(); setFlyerModal(`/api/image/${flyerKeys[currentIndex - 1]}`); }}
              >
                ‹
              </button>
            )}
            <img
              src={flyerModal}
              alt="チラシ拡大"
              className={`${isMobile ? 'max-h-[85vh] max-w-[95vw]' : 'max-h-[90vh] max-w-[80vw]'} rounded-lg animate-scale-in`}
              onClick={(e) => e.stopPropagation()}
            />
            {hasNext && (
              <button
                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center transition-all z-10"
                onClick={(e) => { e.stopPropagation(); setFlyerModal(`/api/image/${flyerKeys[currentIndex + 1]}`); }}
              >
                ›
              </button>
            )}
            {flyerKeys.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-4 py-1.5 rounded-full backdrop-blur-sm">
                {currentIndex + 1} / {flyerKeys.length}
              </div>
            )}
            <button
              className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center transition-all"
              onClick={() => setFlyerModal(null)}
            >
              ✕
            </button>
          </div>
        );
      })()}

      {/* Pricing — detailed */}
      {concert.pricing && concert.pricing.length > 0 && concert.pricing.some(p => p.amount > 0 || p.note) && (
        <FadeIn delay={250}>
          <Section title="料金" icon="💰" defaultOpen={true}>
            <div className="space-y-2">
              {concert.pricing.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0">
                  <span className="text-stone-700 text-sm">{p.label}</span>
                  <span className={`font-semibold text-sm ${p.amount === 0 ? 'text-emerald-600' : 'text-stone-900'}`}>
                    {p.amount === 0 ? '無料' : `¥${p.amount.toLocaleString()}`}
                    {p.note && <span className="text-xs text-stone-500 font-normal ml-1.5">{p.note}</span>}
                  </span>
                </div>
              ))}
            </div>
            {concert.pricing_note && (
              <p className="text-sm text-amber-700 mt-3 bg-amber-50 px-3 py-2 rounded-lg">⚠ {concert.pricing_note}</p>
            )}
            {concert.ticket_note && (
              <p className="text-sm text-stone-500 mt-2">{concert.ticket_note}</p>
            )}
          </Section>
        </FadeIn>
      )}

      {/* Program */}
      {concert.program?.length > 0 && (
        <FadeIn delay={300}>
          <Section title="プログラム" icon="🎼" defaultOpen={true}>
            <div className="space-y-3">
              {concert.program.map((p, i) => (
                <div key={i}>
                  <div className="text-xs text-stone-500 mb-0.5">{p.composer}</div>
                  <div className="text-sm font-medium text-stone-800">{p.piece}</div>
                </div>
              ))}
            </div>
          </Section>
        </FadeIn>
      )}

      {/* Performers */}
      {concert.performers?.length > 0 && (
        <FadeIn delay={350}>
          <Section title="出演者" icon="🎤" defaultOpen={concert.performers.length <= 10}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {concert.performers.map((p, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 text-sm">
                  <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-700 text-xs font-bold">{p.name.charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-stone-800">{p.name}</span>
                    {p.instrument && <span className="text-stone-500 ml-1">({p.instrument})</span>}
                    {p.year && <span className="text-xs text-stone-400 ml-1">{p.year}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </FadeIn>
      )}

      {/* Supervisors + Guests */}
      {(concert.supervisors?.length > 0 || concert.guest_artists?.length > 0) && (
        <FadeIn delay={400}>
          <Section title={concert.guest_artists?.length > 0 ? '指導者・ゲスト' : '指導者'} icon="👨‍🏫" defaultOpen={true}>
            {concert.supervisors?.length > 0 && (
              <div className="mb-3">
                {concert.supervisors.length > 1 && <div className="text-xs text-stone-500 mb-1">指導者</div>}
                <ul className="space-y-1 text-sm text-stone-700">
                  {concert.supervisors.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {concert.guest_artists?.length > 0 && (
              <div>
                <div className="text-xs text-stone-500 mb-1">ゲスト</div>
                <ul className="space-y-1 text-sm text-stone-700">
                  {concert.guest_artists.map((g, i) => <li key={i}>{g}</li>)}
                </ul>
              </div>
            )}
          </Section>
        </FadeIn>
      )}

      {/* Description */}
      {concert.description && (
        <FadeIn delay={450}>
          <Section title="詳細" icon="📝" defaultOpen={true}>
            <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{concert.description}</p>
          </Section>
        </FadeIn>
      )}

      {/* Seating + Departments */}
      {(concert.seating || concert.departments?.length > 0) && (
        <FadeIn delay={500}>
          <Section title="その他の情報" icon="ℹ️" defaultOpen={true}>
            {concert.seating && (
              <div className="flex items-center gap-2 text-sm mb-2">
                <span className="text-stone-500">座席:</span>
                <span className="font-medium">{concert.seating}</span>
              </div>
            )}
            {concert.departments?.length > 0 && (
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="text-stone-500">専攻:</span>
                {concert.departments.map((d) => {
                  const dept = DEPARTMENTS[d];
                  return dept ? <span key={d} className="badge bg-stone-100 text-stone-700">{dept.icon} {dept.label}</span> : null;
                })}
              </div>
            )}
          </Section>
        </FadeIn>
      )}

      {/* Contact */}
      {(concert.contact_email || concert.contact_tel || concert.contact_person || concert.contact_url) && (
        <FadeIn delay={550}>
          <Section title="お問い合わせ先" icon="📞" defaultOpen={false}>
            <div className="space-y-2 text-sm">
              {concert.contact_person && <p className="flex items-center gap-2"><span className="text-stone-400">👤</span>{concert.contact_person}</p>}
              {concert.contact_email && (
                <p className="flex items-center gap-2">
                  <span className="text-stone-400">✉</span>
                  <a href={`mailto:${concert.contact_email}`} className="text-primary-600 hover:underline">{concert.contact_email}</a>
                </p>
              )}
              {concert.contact_tel && <p className="flex items-center gap-2"><span className="text-stone-400">📞</span>{concert.contact_tel}</p>}
              {concert.contact_url && (
                <p className="flex items-center gap-2">
                  <span className="text-stone-400">🔗</span>
                  <a href={concert.contact_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline truncate">{concert.contact_url}</a>
                </p>
              )}
            </div>
          </Section>
        </FadeIn>
      )}

      {/* Map */}
      {concert.venue && (concert.venue.lat || concert.venue.access?.length) && (
        <FadeIn delay={600}>
          <Section title="地図・アクセス" icon="🗺️" defaultOpen={true}>
            {concert.venue.access && concert.venue.access.length > 0 && (
              <ul className="text-sm text-stone-600 mb-4 space-y-1">
                {concert.venue.access.map((a, i) => <li key={i}>🚃 {a}</li>)}
              </ul>
            )}
            {concert.venue.parking && (
              <p className="text-sm text-stone-600 mb-4">🅿 駐車場: {concert.venue.parking}</p>
            )}
            <MapSection venue={concert.venue} />
          </Section>
        </FadeIn>
      )}

      {/* Actions: Calendar + Share */}
      <FadeIn delay={650}>
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-4'} mb-4`}>
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4 sm:p-5">
            <h2 className="font-bold text-sm mb-3 text-stone-500 uppercase tracking-wider">📅 カレンダーに追加</h2>
            <CalendarAddDropdown concert={concert} />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4 sm:p-5">
            <h2 className="font-bold text-sm mb-3 text-stone-500 uppercase tracking-wider">🔗 共有</h2>
            <ShareButtons concert={concert} />
          </div>
        </div>
      </FadeIn>

      {/* Related */}
      {related.length > 0 && (
        <FadeIn delay={700}>
          <div className="mb-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span>🎵</span> 関連する演奏会
            </h2>
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
              {related.map((c) => (
                <ConcertCard key={c.id} concert={c} />
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Footer info */}
      <FadeIn delay={750}>
        <div className="flex items-center justify-between text-sm text-stone-400 pt-4 border-t border-stone-200">
          <span>👁 {concert.views.toLocaleString()} 回閲覧</span>
          <Link to={`/concerts/${concert.slug}/edit`} className="text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1">
            ✏️ 編集する
          </Link>
        </div>
      </FadeIn>
    </div>
  );
}
