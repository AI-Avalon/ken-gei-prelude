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
import { analyzeConcertFlyers } from '../lib/flyers';
import type { Concert } from '../types';

// Collapsible section
function Section({ title, icon, children, defaultOpen = true }: {
  title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 mb-5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50/50 transition-colors"
      >
        <h2 className="font-bold text-[15px] flex items-center gap-2.5 text-stone-800">
          <span className="text-lg">{icon}</span> {title}
        </h2>
        <svg
          className={`w-4 h-4 text-stone-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-0">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Staggered fade-in — instant on mobile
function FadeIn({ children, delay = 0, mobile }: { children: React.ReactNode; delay?: number; mobile?: boolean }) {
  if (mobile) return <>{children}</>;
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
    <div className={`${isMobile ? 'px-4 py-6' : 'max-w-3xl mx-auto px-6 py-10'} space-y-4`}>
      <div className="skeleton h-4 w-48" />
      <div className="skeleton h-10 w-3/4" />
      <div className="skeleton h-6 w-1/3" />
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/60 p-6 space-y-3">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-4 w-1/2" />
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
  const hasPricing = concert.pricing && concert.pricing.length > 0;
  const isFree = hasPricing && concert.pricing.every(p => p.amount === 0);

  // Clean pricing labels — remove any embedded price text from label
  const cleanedPricing = (concert.pricing || []).map(p => ({
    ...p,
    label: p.label.replace(/\d[\d,]*\s*円/g, '').trim() || '入場料',
  }));

  return (
    <div className={`${isMobile ? 'px-4 pt-5 pb-24' : 'max-w-3xl mx-auto px-6 py-10'}`}>
      {/* Breadcrumb — desktop */}
      {!isMobile && (
        <FadeIn mobile={isMobile}>
          <nav className="text-sm text-stone-400 mb-8 flex items-center gap-1.5">
            <Link to="/" className="hover:text-primary-600 transition-colors">ホーム</Link>
            <span>/</span>
            <Link to="/concerts" className="hover:text-primary-600 transition-colors">演奏会一覧</Link>
            <span>/</span>
            <span className="text-stone-600 truncate max-w-[300px]">{concert.title}</span>
          </nav>
        </FadeIn>
      )}

      {/* Header */}
      <FadeIn delay={50} mobile={isMobile}>
        <div className="mb-6">
          {/* Back + badges */}
          <div className="flex items-center gap-2.5 mb-3">
            {isMobile && (
              <Link to="/concerts" className="text-stone-400 hover:text-primary-600 transition-colors -ml-1" aria-label="戻る">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            )}
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cat.color}`}>{cat.icon} {cat.label}</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              isToday ? 'bg-red-100 text-red-700' : isEnded ? 'bg-stone-100 text-stone-500' : 'bg-primary-50 text-primary-700'
            }`}>
              {daysText}
            </span>
          </div>

          {/* Title */}
          <h1 className={`${isMobile ? 'text-[22px] leading-tight' : 'text-3xl'} font-bold text-stone-900 tracking-tight`}>
            {concert.title}
          </h1>
          {concert.subtitle && (
            <p className={`${isMobile ? 'text-base' : 'text-lg'} text-stone-500 mt-1.5`}>{concert.subtitle}</p>
          )}
          {/* 編集リンク（登録者向け） */}
          <div className="mt-2">
            <Link
              to={`/concerts/${concert.slug}/edit`}
              className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-primary-600 transition-colors"
            >
              ✏️ この演奏会を編集する（登録時のパスワードが必要）
            </Link>
          </div>
        </div>
      </FadeIn>

      {/* Quick info */}
      <FadeIn delay={100} mobile={isMobile}>
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5 mb-5 space-y-4">
          {/* Date */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-primary-600">📅</span>
            </div>
            <div>
              <div className="text-xs text-stone-400 font-medium mb-0.5">日時</div>
              <div className="text-sm font-semibold text-stone-800">
                {formatDateLong(concert.date)}
                {concert.time_start && <span className="font-normal text-stone-500 ml-1">{formatTime(concert)}</span>}
              </div>
            </div>
          </div>
          {/* Venue */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-amber-600">📍</span>
            </div>
            <div className="min-w-0">
              <div className="text-xs text-stone-400 font-medium mb-0.5">会場</div>
              <div className="text-sm font-semibold text-stone-800 truncate">{concert.venue?.name || '未定'}</div>
              {concert.venue?.address && (
                <div className="text-xs text-stone-400">{concert.venue.address}</div>
              )}
            </div>
          </div>
          {/* Pricing inline */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-emerald-600">🎫</span>
            </div>
            <div>
              <div className="text-xs text-stone-400 font-medium mb-0.5">入場料</div>
              <div className="text-sm font-semibold">
                {isFree ? (
                  <span className="text-emerald-600">入場無料</span>
                ) : hasPricing ? (
                  <span className="text-stone-800">
                    {cleanedPricing.filter(p => p.amount > 0).map((p, i) => (
                      <span key={i}>
                        {i > 0 && <span className="text-stone-300 mx-1">|</span>}
                        {p.label} ¥{p.amount.toLocaleString()}
                      </span>
                    ))}
                  </span>
                ) : <span className="text-stone-400">情報なし</span>}
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Ticket CTA */}
      {concert.ticket_url && (
        <FadeIn delay={120} mobile={isMobile}>
          <a href={concert.ticket_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-700 text-white font-semibold px-6 py-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all mb-5 w-full">
            🎫 チケットを購入・予約する
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </FadeIn>
      )}

      {/* Calendar — always prominent */}
      <FadeIn delay={140} mobile={isMobile}>
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5 mb-5">
          <CalendarAddDropdown concert={concert} />
        </div>
      </FadeIn>

      {/* Flyer images */}
      {concert.flyer_r2_keys?.length > 0 && (() => {
        const flyerAnalysis = analyzeConcertFlyers(concert.flyer_r2_keys);
        const displayKeys = flyerAnalysis.displayKeys;
        const pdfKeys = flyerAnalysis.pdfKeys;
        if (displayKeys.length === 0 && pdfKeys.length === 0) return null;

        return (
          <FadeIn delay={180} mobile={isMobile}>
            <Section title="チラシ" icon="📄" defaultOpen={true}>
              {displayKeys.length > 0 && (
                isMobile ? (
                  /* モバイル: 複数枚は横スクロール、1枚は中央寄せ */
                  displayKeys.length === 1 ? (
                    <div className="flex justify-center">
                      <div
                        className="relative w-full max-w-[260px] aspect-[3/4] bg-stone-50 rounded-xl overflow-hidden shadow-sm cursor-pointer group"
                        onClick={() => setFlyerModal(`/api/image/${displayKeys[0]}`)}
                      >
                        <img
                          src={`/api/image/${displayKeys[0]}`}
                          alt={`${concert.title} チラシ`}
                          className="w-full h-full object-contain"
                          loading="eager"
                        />
                        <div className="absolute inset-0 flex items-end justify-center pb-3 opacity-0 group-active:opacity-100 transition-opacity bg-black/10">
                          <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">タップで拡大</span>
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                          🔍 拡大
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="-mx-5 px-5">
                      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
                        {displayKeys.map((key, i) => (
                          <div
                            key={i}
                            className="relative flex-shrink-0 w-[200px] aspect-[3/4] bg-stone-50 rounded-xl overflow-hidden shadow-sm cursor-pointer snap-start"
                            onClick={() => setFlyerModal(`/api/image/${key}`)}
                          >
                            <img
                              src={`/api/image/${key}`}
                              alt={`${concert.title} チラシ ${i + 1}`}
                              className="w-full h-full object-contain"
                              loading={i === 0 ? 'eager' : 'lazy'}
                            />
                            <span className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                              {i === 0 ? '表' : '裏'}
                            </span>
                            <div className="absolute bottom-2 right-2 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                              🔍 拡大
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1.5 text-center">← スワイプで複数枚確認 →</p>
                    </div>
                  )
                ) : (
                  /* デスクトップ: グリッド表示 */
                  <div className={`grid gap-5 ${displayKeys.length === 1 ? 'max-w-sm mx-auto' : 'grid-cols-2'}`}>
                    {displayKeys.map((key, i) => (
                      <div
                        key={i}
                        className="relative aspect-[3/4] bg-stone-50 rounded-xl overflow-hidden shadow-sm cursor-pointer group"
                        onClick={() => setFlyerModal(`/api/image/${key}`)}
                      >
                        <img
                          src={`/api/image/${key}`}
                          alt={`${concert.title} チラシ ${i + 1}`}
                          className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
                          loading={i === 0 ? 'eager' : 'lazy'}
                        />
                        {displayKeys.length > 1 && (
                          <span className="absolute top-2.5 right-2.5 bg-black/50 text-white text-[11px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                            {i === 0 ? '表' : '裏'}
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
                          <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">クリックで拡大</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {pdfKeys.length > 0 && pdfKeys.map((key, i) => (
                <PdfFlyerRenderer
                  key={key}
                  pdfKey={key}
                  concertSlug={concert.slug}
                  alt={`${concert.title} チラシ ${i + 1}`}
                  onClick={(url) => setFlyerModal(url)}
                  startPage={1}
                />
              ))}

              {/* PDF download link */}
              {pdfKeys.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {pdfKeys.map((key, i) => (
                    <a
                      key={key}
                      href={`/api/image/${key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
                    >
                      📄 PDF{pdfKeys.length > 1 ? ` (${i + 1})` : ''}を開く
                    </a>
                  ))}
                </div>
              )}
            </Section>
          </FadeIn>
        );
      })()}

      {/* Share — below flyers */}
      <FadeIn delay={220} mobile={isMobile}>
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-5 mb-5">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">共有</h2>
          <ShareButtons concert={concert} />
        </div>
      </FadeIn>

      {/* Flyer modal */}
      {flyerModal && (() => {
        const flyerKeys = analyzeConcertFlyers(concert.flyer_r2_keys).modalKeys;
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
                type="button"
                className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center transition-all z-10"
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
                type="button"
                className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center transition-all z-10"
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
              type="button"
              className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center transition-all"
              onClick={() => setFlyerModal(null)}
            >
              ✕
            </button>
          </div>
        );
      })()}

      {/* Pricing — detailed */}
      {hasPricing && cleanedPricing.some(p => p.amount > 0 || p.note) && (
        <FadeIn delay={260} mobile={isMobile}>
          <Section title="料金詳細" icon="💰" defaultOpen={true}>
            <div className="divide-y divide-stone-100">
              {cleanedPricing.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <span className="text-stone-600 text-[14px]">{p.label}</span>
                  <span className={`font-semibold text-[14px] ${p.amount === 0 ? 'text-emerald-600' : 'text-stone-900'}`}>
                    {p.amount === 0 ? '無料' : `¥${p.amount.toLocaleString()}`}
                  </span>
                </div>
              ))}
            </div>
            {concert.pricing_note && (
              <p className="text-sm text-amber-700 mt-3 bg-amber-50/80 px-3 py-2 rounded-lg">{concert.pricing_note}</p>
            )}
          </Section>
        </FadeIn>
      )}

      {/* Program */}
      {concert.program?.length > 0 && (
        <FadeIn delay={300} mobile={isMobile}>
          <Section title="プログラム" icon="🎼" defaultOpen={true}>
            <div className="space-y-3">
              {concert.program.map((p, i) => (
                <div key={i} className="pl-3 border-l-2 border-primary-200">
                  <div className="text-xs text-stone-400">{p.composer}</div>
                  <div className="text-sm font-medium text-stone-800">{p.piece}</div>
                </div>
              ))}
            </div>
          </Section>
        </FadeIn>
      )}

      {/* Performers */}
      {concert.performers?.length > 0 && (
        <FadeIn delay={340} mobile={isMobile}>
          <Section title="出演者" icon="🎤" defaultOpen={concert.performers.length <= 10}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {concert.performers.map((p, i) => (
                <div key={i} className="flex items-center gap-2.5 py-1.5 text-sm">
                  <div className="w-7 h-7 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    {p.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-stone-800">{p.name}</span>
                    {p.instrument && <span className="text-stone-400 ml-1 text-xs">({p.instrument})</span>}
                    {p.year && <span className="text-stone-400 ml-1 text-xs">{p.year}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </FadeIn>
      )}

      {/* Supervisors + Guests */}
      {(concert.supervisors?.length > 0 || concert.guest_artists?.length > 0) && (
        <FadeIn delay={380} mobile={isMobile}>
          <Section title={concert.guest_artists?.length > 0 ? '指導者・ゲスト' : '指導者'} icon="👨‍🏫" defaultOpen={true}>
            {concert.supervisors?.length > 0 && (
              <div className="mb-3">
                {concert.supervisors.length > 1 && <div className="text-xs text-stone-400 mb-1">指導者</div>}
                <ul className="space-y-1 text-sm text-stone-700">
                  {concert.supervisors.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {concert.guest_artists?.length > 0 && (
              <div>
                <div className="text-xs text-stone-400 mb-1">ゲスト</div>
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
        <FadeIn delay={420} mobile={isMobile}>
          <Section title="詳細" icon="📝" defaultOpen={true}>
            <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">{concert.description}</p>
          </Section>
        </FadeIn>
      )}

      {/* Seating + Departments */}
      {(concert.seating || concert.departments?.length > 0) && (
        <FadeIn delay={460} mobile={isMobile}>
          <Section title="その他" icon="ℹ️" defaultOpen={true}>
            {concert.seating && (
              <div className="flex items-center gap-2 text-sm mb-2">
                <span className="text-stone-400">座席</span>
                <span className="font-medium">{concert.seating}</span>
              </div>
            )}
            {concert.departments?.length > 0 && (
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="text-stone-400">専攻</span>
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
        <FadeIn delay={500} mobile={isMobile}>
          <Section title="お問い合わせ先" icon="📞" defaultOpen={false}>
            <div className="space-y-2 text-sm">
              {concert.contact_person && <p className="flex items-center gap-2"><span className="text-stone-300">👤</span>{concert.contact_person}</p>}
              {concert.contact_email && (
                <p className="flex items-center gap-2 min-w-0">
                  <span className="text-stone-300 flex-shrink-0">✉</span>
                  <a href={`mailto:${concert.contact_email}`} className="text-primary-600 hover:underline truncate">{concert.contact_email}</a>
                </p>
              )}
              {concert.contact_tel && <p className="flex items-center gap-2"><span className="text-stone-300">📞</span>{concert.contact_tel}</p>}
              {concert.contact_url && (
                <p className="flex items-center gap-2 min-w-0">
                  <span className="text-stone-300 flex-shrink-0">🔗</span>
                  <a href={concert.contact_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline truncate">{concert.contact_url}</a>
                </p>
              )}
            </div>
          </Section>
        </FadeIn>
      )}

      {/* Map */}
      {concert.venue && (concert.venue.lat || concert.venue.access?.length) && (
        <FadeIn delay={540} mobile={isMobile}>
          <Section title="アクセス" icon="🗺️" defaultOpen={true}>
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

      {/* Related */}
      {related.length > 0 && (
        <FadeIn delay={580} mobile={isMobile}>
          <div className="mb-6">
            <h2 className="font-bold text-base mb-4 flex items-center gap-2 text-stone-800">
              🎵 関連する演奏会
            </h2>
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
              {related.map((c) => (
                <ConcertCard key={c.id} concert={c} />
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Footer */}
      <FadeIn delay={620} mobile={isMobile}>
        <div className="flex items-center justify-between text-xs text-stone-400 pt-4 border-t border-stone-200/60">
          <span className="flex items-center gap-1">👁 {concert.views.toLocaleString()} 回閲覧</span>
          <Link
            to={`/concerts/${concert.slug}/edit`}
            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-primary-600 bg-stone-100 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            ✏️ 編集する
          </Link>
        </div>
      </FadeIn>
    </div>
  );
}
