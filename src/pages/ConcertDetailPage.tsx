import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchConcert, fetchConcerts } from '../lib/api';
import { CATEGORIES, DEPARTMENTS } from '../lib/constants';
import {
  formatDateLong,
  formatTime,
  daysUntil,
  getConcertStatusBadges,
  resolveSmartVenue,
} from '../lib/utils';
import ShareButtons from '../components/ShareButtons';
import CalendarAddDropdown from '../components/CalendarAddDropdown';
import MapSection from '../components/MapSection';
import ConcertCard from '../components/ConcertCard';
import FlyerPreview from '../components/FlyerPreview';
import type { Concert } from '../types';

function Section({ title, icon, children, defaultOpen = true }: {
  title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200/70 mb-5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-stone-50/60 transition-colors"
      >
        <h2 className="font-serif font-bold text-base flex items-center gap-2.5 text-stone-900">
          <span className="text-lg">{icon}</span> {title}
        </h2>
        <svg
          className={`w-4 h-4 text-stone-400 transition-transform duration-300 shrink-0 ${open ? 'rotate-180' : ''}`}
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

/**
 * Single JSX Tree ConcertDetailPage
 * Skill: `.agent/skills/responsive-and-truncation-auditor/SKILL.md`
 * Skill: `.agent/skills/flyer-pdf-renderer/SKILL.md`
 * - Zero `truncate` or text clipping on title, venue, program, performers, or contact links.
 * - Complete parity between Mobile (375px) and Desktop (1440px).
 * - 3-stage hybrid FlyerPreview with Front/Back tabs, native `<dialog>` zoom lightbox, and PDF actions.
 */
export default function ConcertDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [concert, setConcert] = useState<Concert | null>(null);
  const [related, setRelated] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-4">
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
  }

  if (error || !concert) {
    return (
      <div className="text-center py-20 px-4 animate-fade-in">
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
  const isFree = !hasPricing || concert.pricing.every((p) => p.amount === 0);
  const statusBadges = getConcertStatusBadges(concert);
  const smartVenue = resolveSmartVenue(concert.venue);

  const cleanedPricing = (concert.pricing || []).map((p) => ({
    ...p,
    label: p.label.replace(/\d[\d,]*\s*円/g, '').trim() || '入場料',
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Unified Breadcrumb & Back Navigation (no truncation) */}
      <nav aria-label="パンくずリスト" className="text-xs sm:text-sm text-stone-500 mb-5 flex flex-wrap items-center gap-1.5">
        <Link to="/" className="hover:text-primary-700 transition-colors whitespace-nowrap">ホーム</Link>
        <span>/</span>
        <Link to="/concerts" className="hover:text-primary-700 transition-colors whitespace-nowrap">演奏会一覧</Link>
        <span>/</span>
        <span className="text-stone-700 font-medium break-words [overflow-wrap:anywhere]">{concert.title}</span>
      </nav>

      {/* Header & Badges */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Link
            to="/concerts"
            className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 hover:text-primary-700 bg-stone-100 hover:bg-stone-200/70 px-2.5 py-1 rounded-full transition-colors whitespace-nowrap shrink-0"
          >
            ← 一覧へ戻る
          </Link>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${cat.color}`}>
            {cat.icon} {cat.label}
          </span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 tabular-nums ${
            isToday ? 'bg-red-100 text-red-700' : isEnded ? 'bg-stone-100 text-stone-500' : 'bg-primary-50 text-primary-700'
          }`}>
            {daysText}
          </span>
          {statusBadges.map((b) => (
            <span
              key={b.key}
              className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${b.className}`}
            >
              {b.label}
            </span>
          ))}
        </div>

        {/* Full Title & Subtitle (Zero Truncation) */}
        <h1
          data-testid="concert-detail-title"
          className="fluid-page-title font-serif font-bold text-stone-900 tracking-tight break-words [overflow-wrap:anywhere]"
        >
          {concert.title}
        </h1>
        {concert.subtitle && (
          <p className="text-base sm:text-lg text-stone-600 font-serif mt-2 leading-relaxed break-words [overflow-wrap:anywhere]">
            {concert.subtitle}
          </p>
        )}

        <div className="mt-2.5">
          <Link
            to={`/concerts/${concert.slug}/edit`}
            className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-primary-600 transition-colors"
          >
            ✏️ この演奏会を編集する（登録時のパスワードが必要）
          </Link>
        </div>
      </div>

      {/* Quick Info Card (Date / Open & Start Time / Venue / Pricing) */}
      <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-5 mb-5 space-y-4">
        {/* Date & Time */}
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-primary-600">📅</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-stone-400 font-medium mb-0.5">開催日時・開場／開演時刻</div>
            <div
              data-testid="concert-detail-date"
              className="text-sm sm:text-base font-semibold text-stone-900 tabular-nums break-words [overflow-wrap:anywhere]"
            >
              {formatDateLong(concert.date)}
              <span className="font-normal text-stone-600 ml-2 inline-block">
                {formatTime(concert)}
              </span>
            </div>
          </div>
        </div>

        {/* Venue (No truncation) */}
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-amber-600">📍</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-stone-400 font-medium mb-0.5">会場</div>
            <div
              data-testid="concert-detail-venue"
              className="text-sm sm:text-base font-semibold text-stone-900 break-words [overflow-wrap:anywhere]"
            >
              {smartVenue.name}
            </div>
            {smartVenue.address && (
              <div className="text-xs text-stone-500 mt-0.5 break-words [overflow-wrap:anywhere]">
                {smartVenue.address}
              </div>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-emerald-600">🎫</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-stone-400 font-medium mb-0.5">入場料・座席区分</div>
            <div className="text-sm sm:text-base font-semibold tabular-nums flex flex-wrap items-center gap-x-2 gap-y-1">
              {isFree ? (
                <span className="text-emerald-700">入場無料</span>
              ) : (
                <span className="text-stone-900 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {cleanedPricing.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1">
                      {i > 0 && <span className="text-stone-300">|</span>}
                      <span>{p.label}</span>
                      <span className={p.amount === 0 ? 'text-emerald-700' : 'text-stone-900'}>
                        {p.amount === 0 ? '無料' : `¥${p.amount.toLocaleString()}`}
                      </span>
                    </span>
                  ))}
                </span>
              )}
              {concert.seating && (
                <span className="badge bg-stone-100 text-stone-700 text-xs">
                  {concert.seating}
                </span>
              )}
            </div>
            {concert.pricing_note && (
              <p className="text-xs text-amber-800 mt-1.5 bg-amber-50 px-3 py-1.5 rounded-lg break-words [overflow-wrap:anywhere]">
                {concert.pricing_note}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Ticket CTA */}
      {concert.ticket_url && (
        <a
          href={concert.ticket_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-700 text-white font-semibold px-6 py-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all mb-5 w-full"
        >
          🎫 チケットを購入・予約する
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}

      {/* Calendar & Share Action Row */}
      <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-5 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-serif font-bold text-stone-900">スケジュール登録</h2>
          <p className="text-xs text-stone-500 mt-0.5">GoogleカレンダーやiCal（.ics）に開場・会場・曲目付きで登録</p>
        </div>
        <CalendarAddDropdown concert={concert} />
      </div>

      {/* 3-Stage Hybrid Flyer & PDF Preview (Always rendered: WebP -> PDF.js Canvas -> Classical Poster) */}
      <Section title="チラシ・公式フライヤー" icon="📄" defaultOpen={true}>
        <FlyerPreview concert={concert} />
      </Section>

      {/* Structured Program List (Composer & Piece separated, full text) */}
      {concert.program?.length > 0 && (
        <Section title="プログラム（演奏曲目）" icon="🎼" defaultOpen={true}>
          <div className="divide-y divide-stone-100">
            {concert.program.map((p, i) => (
              <div key={i} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                {p.composer && (
                  <span className="text-xs sm:text-sm font-serif font-semibold text-primary-800 sm:min-w-[160px] shrink-0 break-words [overflow-wrap:anywhere]">
                    {p.composer}
                  </span>
                )}
                <span className="text-sm sm:text-base font-medium text-stone-900 leading-relaxed break-words [overflow-wrap:anywhere]">
                  {p.piece}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Structured Performers List (Always open, zero clipping) */}
      {concert.performers?.length > 0 && (
        <Section title="出演者" icon="🎤" defaultOpen={true}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {concert.performers.map((p, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-50/80 border border-stone-100 text-sm">
                <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  {p.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                  <span className="font-semibold text-stone-900">{p.name}</span>
                  {(p.instrument || p.year) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-stone-500">
                      {p.instrument && <span className="bg-white px-2 py-0.5 rounded border border-stone-200/70">{p.instrument}</span>}
                      {p.year && <span>{p.year}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Supervisors + Guests */}
      {(concert.supervisors?.length > 0 || concert.guest_artists?.length > 0) && (
        <Section title={concert.guest_artists?.length > 0 ? '指導者・ゲスト' : '指導者'} icon="👨‍🏫" defaultOpen={true}>
          {concert.supervisors?.length > 0 && (
            <div className="mb-3">
              {concert.supervisors.length > 1 && <div className="text-xs text-stone-400 mb-1">指導者</div>}
              <ul className="space-y-1 text-sm text-stone-700 break-words [overflow-wrap:anywhere]">
                {concert.supervisors.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {concert.guest_artists?.length > 0 && (
            <div>
              <div className="text-xs text-stone-400 mb-1">ゲスト</div>
              <ul className="space-y-1 text-sm text-stone-700 break-words [overflow-wrap:anywhere]">
                {concert.guest_artists.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>
          )}
        </Section>
      )}

      {/* Description */}
      {concert.description && (
        <Section title="公演詳細・ご案内" icon="📝" defaultOpen={true}>
          <p className="text-sm sm:text-base text-stone-700 whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
            {concert.description}
          </p>
        </Section>
      )}

      {/* Departments & Tags */}
      {(concert.departments?.length > 0 || concert.tags?.length > 0) && (
        <Section title="専攻・タグ" icon="ℹ️" defaultOpen={true}>
          {concert.departments?.length > 0 && (
            <div className="flex items-center gap-2 text-sm flex-wrap mb-2">
              <span className="text-stone-400">専攻:</span>
              {concert.departments.map((d) => {
                const dept = DEPARTMENTS[d];
                return dept ? (
                  <span key={d} className="badge bg-stone-100 text-stone-700">
                    {dept.icon} {dept.label}
                  </span>
                ) : null;
              })}
            </div>
          )}
          {concert.tags?.length > 0 && (
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="text-stone-400">タグ:</span>
              {concert.tags.map((tag) => (
                <span key={tag} className="badge bg-primary-50 text-primary-800">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Smart Venue Navigation & Transit Access (Always rendered) */}
      <Section title="会場ナビ・交通アクセス案内" icon="🗺️" defaultOpen={true}>
        <MapSection venue={concert.venue} />
      </Section>

      {/* Contact / Official Source Links (Open by default, zero truncation) */}
      {(concert.contact_email || concert.contact_tel || concert.contact_person || concert.contact_url || concert.source_url) && (
        <Section title="主催・お問い合わせ・公式リンク" icon="📞" defaultOpen={true}>
          <div className="space-y-2.5 text-sm break-words [overflow-wrap:anywhere]">
            {concert.contact_person && (
              <p className="flex items-start gap-2">
                <span className="text-stone-400 shrink-0">👤</span>
                <span>{concert.contact_person}</span>
              </p>
            )}
            {concert.contact_email && (
              <p className="flex items-start gap-2">
                <span className="text-stone-400 shrink-0">✉️</span>
                <a href={`mailto:${concert.contact_email}`} className="text-primary-700 hover:underline break-all">
                  {concert.contact_email}
                </a>
              </p>
            )}
            {concert.contact_tel && (
              <p className="flex items-start gap-2 tabular-nums">
                <span className="text-stone-400 shrink-0">📞</span>
                <a href={`tel:${concert.contact_tel}`} className="text-primary-700 hover:underline">
                  {concert.contact_tel}
                </a>
              </p>
            )}
            {concert.contact_url && (
              <p className="flex items-start gap-2">
                <span className="text-stone-400 shrink-0">🔗</span>
                <a href={concert.contact_url} target="_blank" rel="noopener noreferrer" className="text-primary-700 hover:underline break-all">
                  {concert.contact_url}
                </a>
              </p>
            )}
            {concert.source_url && concert.source_url !== concert.contact_url && (
              <p className="flex items-start gap-2">
                <span className="text-stone-400 shrink-0">🏛️</span>
                <a href={concert.source_url} target="_blank" rel="noopener noreferrer" className="text-primary-700 hover:underline break-all">
                  公式イベントページを開く ({concert.source_url})
                </a>
              </p>
            )}
          </div>
        </Section>
      )}

      {/* Share Section */}
      <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-5 mb-5">
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">SNS・QRコードで共有</h2>
        <ShareButtons concert={concert} />
      </div>

      {/* Related Concerts */}
      {related.length > 0 && (
        <div className="mb-6">
          <h2 className="font-serif font-bold text-lg mb-4 flex items-center gap-2 text-stone-900">
            🎵 関連する演奏会
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((c) => (
              <ConcertCard key={c.id} concert={c} />
            ))}
          </div>
        </div>
      )}

      {/* Footer Meta */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400 pt-4 border-t border-stone-200/60 tabular-nums">
        <span className="flex items-center gap-1">👁 {(concert.views || 0).toLocaleString()} 回閲覧</span>
        <Link
          to={`/concerts/${concert.slug}/edit`}
          className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-primary-700 bg-stone-100 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          ✏️ 編集する
        </Link>
      </div>
    </div>
  );
}
