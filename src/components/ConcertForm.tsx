import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Sparkles,
  MapPin,
  Clock,
  AlertCircle,
  Eye,
  Trash2,
  Plus,
  RotateCcw,
  Check,
  Lock,
  User,
} from './EditorialIcons';
import type {
  Concert,
  ConcertStatus,
  PricingItem,
  ProgramItem,
  Performer,
  Venue,
  VenueRecord,
} from '../types';
import {
  CATEGORIES,
  CONCERT_STATUS_MAP,
  DEPARTMENTS,
  SEATING_OPTIONS,
  UNIVERSITY_VENUES,
  REGIONAL_VENUES,
} from '../lib/constants';
import { fetchVenues } from '../lib/api';
import { parsePricingText, resolveConcertStatus } from '../lib/utils';
import FlyerUploader from './FlyerUploader';
import PricingEditor from './PricingEditor';
import ProgramEditor from './ProgramEditor';
import PerformerEditor from './PerformerEditor';

const DRAFT_STORAGE_KEY = 'prelude_concert_form_draft_v2';

const PRICING_QUICK_PRESETS: {
  label: string;
  items: PricingItem[];
  note: string;
  seating?: string;
}[] = [
  {
    label: '無料（全席自由・予約不要）',
    items: [{ label: '入場無料', amount: 0 }],
    note: '全席自由・事前予約不要（整理券なし）',
    seating: '自由席',
  },
  {
    label: '無料（要事前予約・整理券）',
    items: [{ label: '入場無料（要予約）', amount: 0 }],
    note: '入場無料（要事前予約または整理券配布）',
    seating: '自由席',
  },
  {
    label: '一般 1,000円 / 学生 500円',
    items: [
      { label: '一般', amount: 1000 },
      { label: '学生', amount: 500 },
    ],
    note: '当日券同額',
    seating: '自由席',
  },
  {
    label: '一般 2,000円 / 学生 1,000円',
    items: [
      { label: '一般', amount: 2000 },
      { label: '学生', amount: 1000 },
    ],
    note: '学生証をご提示ください',
    seating: '自由席',
  },
  {
    label: '一般 3,000円（全席指定）',
    items: [{ label: '一般', amount: 3000 }],
    note: '未就学児の入場はご遠慮ください',
    seating: '指定席',
  },
];

interface Props {
  initialData?: Partial<Concert>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isEdit?: boolean;
  concertSlug?: string;
  submitting?: boolean;
  hideFlyer?: boolean;
}

export default function ConcertForm({
  initialData,
  onSubmit,
  isEdit,
  concertSlug,
  submitting: externalSubmitting,
  hideFlyer,
}: Props) {
  const [mode, setMode] = useState<'quick' | 'full'>('full');
  const [loading, setLoading] = useState(false);
  const [venueList, setVenueList] = useState<VenueRecord[]>([]);
  const [venueSuggestions, setVenueSuggestions] = useState<VenueRecord[]>([]);
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [previewMode, setPreviewMode] = useState<'card' | 'detail'>('card');

  // Smart Manuscript Parser state
  const [rawManuscript, setRawManuscript] = useState('');
  const [parseFeedback, setParseFeedback] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState(initialData?.title || '');
  const [subtitle, setSubtitle] = useState(initialData?.subtitle || '');
  const [concertStatus, setConcertStatus] = useState<ConcertStatus>(() =>
    resolveConcertStatus(initialData)
  );
  const [date, setDate] = useState(initialData?.date || '');
  const [timeTbd, setTimeTbd] = useState(initialData?.time_start === '時間未定');
  const [timeStart, setTimeStart] = useState(
    initialData?.time_start === '時間未定' ? '' : initialData?.time_start || ''
  );
  const [timeOpen, setTimeOpen] = useState(initialData?.time_open || '');
  const [timeEnd, setTimeEnd] = useState(initialData?.time_end || '');
  const [hasSecondShow, setHasSecondShow] = useState(false);
  const [secondShowOpen, setSecondShowOpen] = useState('');
  const [secondShowStart, setSecondShowStart] = useState('');

  const [venueName, setVenueName] = useState(initialData?.venue?.name || '');
  const [venueAddress, setVenueAddress] = useState(initialData?.venue?.address || '');
  const [venueAccess, setVenueAccess] = useState(initialData?.venue?.access?.join('\n') || '');
  const [venueParking, setVenueParking] = useState(initialData?.venue?.parking || '');
  const [venueLat, setVenueLat] = useState(initialData?.venue?.lat || 0);
  const [venueLng, setVenueLng] = useState(initialData?.venue?.lng || 0);
  const [category, setCategory] = useState(initialData?.category || 'other');
  const [departments, setDepartments] = useState<string[]>(initialData?.departments || []);
  const [pricingText, setPricingText] = useState('');
  const [pricing, setPricing] = useState<PricingItem[]>(
    initialData?.pricing || [{ label: '入場無料', amount: 0 }]
  );
  const [pricingNote, setPricingNote] = useState(initialData?.pricing_note || '');
  const [seating, setSeating] = useState(initialData?.seating || '');
  const [program, setProgram] = useState<ProgramItem[]>(initialData?.program || []);
  const [performers, setPerformers] = useState<Performer[]>(initialData?.performers || []);
  const [supervisors, setSupervisors] = useState<string[]>(initialData?.supervisors || []);
  const [guestArtists, setGuestArtists] = useState<string[]>(initialData?.guest_artists || []);
  const [ticketUrl, setTicketUrl] = useState(initialData?.ticket_url || '');
  const [ticketNote, setTicketNote] = useState(initialData?.ticket_note || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [contactEmail, setContactEmail] = useState(initialData?.contact_email || '');
  const [contactTel, setContactTel] = useState(initialData?.contact_tel || '');
  const [contactPerson, setContactPerson] = useState(initialData?.contact_person || '');
  const [contactUrl, setContactUrl] = useState(initialData?.contact_url || '');
  const [editPassword, setEditPassword] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [flyerKeys, setFlyerKeys] = useState<string[]>(initialData?.flyer_r2_keys || []);
  const [flyerThumb, setFlyerThumb] = useState(initialData?.flyer_thumbnail_key || '');
  const [draftRestored, setDraftRestored] = useState(false);

  // Restore draft from localStorage on mount (for new concert creation)
  useEffect(() => {
    if (isEdit || initialData?.title) return;
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.title) setTitle(saved.title);
      if (saved.subtitle) setSubtitle(saved.subtitle);
      if (saved.concertStatus) setConcertStatus(saved.concertStatus);
      if (saved.date) setDate(saved.date);
      if (saved.timeStart) setTimeStart(saved.timeStart);
      if (saved.timeOpen) setTimeOpen(saved.timeOpen);
      if (saved.venueName) setVenueName(saved.venueName);
      if (saved.venueAddress) setVenueAddress(saved.venueAddress);
      if (saved.venueAccess) setVenueAccess(saved.venueAccess);
      if (saved.venueParking) setVenueParking(saved.venueParking);
      if (saved.category) setCategory(saved.category);
      if (saved.description) setDescription(saved.description);
      setDraftRestored(true);
    } catch {
      // ignore
    }
  }, [isEdit, initialData?.title]);

  // Auto-save draft to localStorage when editing new concert
  useEffect(() => {
    if (isEdit || !dirty) return;
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          title,
          subtitle,
          concertStatus,
          date,
          timeStart,
          timeOpen,
          venueName,
          venueAddress,
          venueAccess,
          venueParking,
          category,
          description,
        })
      );
    } catch {
      // ignore
    }
  }, [
    isEdit,
    dirty,
    title,
    subtitle,
    concertStatus,
    date,
    timeStart,
    timeOpen,
    venueName,
    venueAddress,
    venueAccess,
    venueParking,
    category,
    description,
  ]);

  const clearSavedDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraftRestored(false);
  };

  useEffect(() => {
    fetchVenues().then((res) => {
      if (res.ok && res.data) setVenueList(res.data);
    });
  }, []);

  // Warn on page leave
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // Smart Manuscript Parser (コピペ原稿一括解析)
  const handleParseManuscript = () => {
    const text = rawManuscript.trim();
    if (!text) return;
    const extracted: string[] = [];

    // 1. Date extraction (e.g., 2026年11月15日, 2026/11/15, 2026.11.15)
    const dateMatch = text.match(/(20\d{2})\s*[年/.-]\s*(\d{1,2})\s*[月/.-]\s*(\d{1,2})/);
    if (dateMatch) {
      const y = dateMatch[1];
      const m = dateMatch[2].padStart(2, '0');
      const d = dateMatch[3].padStart(2, '0');
      setDate(`${y}-${m}-${d}`);
      extracted.push(`日付 (${y}-${m}-${d})`);
    }

    // 2. Time extraction (開場 / 開演)
    const openMatch =
      text.match(/開場\s*[:：]?\s*(\d{1,2})[:：時](\d{2})/) ||
      text.match(/(\d{1,2})[:：時](\d{2})\s*開場/);
    if (openMatch) {
      const t = `${openMatch[1].padStart(2, '0')}:${openMatch[2]}`;
      setTimeOpen(t);
      extracted.push(`開場 (${t})`);
    }

    const startMatch =
      text.match(/開演\s*[:：]?\s*(\d{1,2})[:：時](\d{2})/) ||
      text.match(/(\d{1,2})[:：時](\d{2})\s*開演/);
    if (startMatch) {
      const t = `${startMatch[1].padStart(2, '0')}:${startMatch[2]}`;
      setTimeStart(t);
      setTimeTbd(false);
      extracted.push(`開演 (${t})`);
    }

    // 3. Venue matching against presets
    const allPresets = [
      ...Object.values(UNIVERSITY_VENUES),
      ...Object.values(REGIONAL_VENUES),
    ];
    for (const preset of allPresets) {
      const shortName = preset.name.replace('愛知県立芸術大学 ', '').replace('名古屋市', '');
      if (text.includes(preset.name) || text.includes(shortName)) {
        setVenueName(preset.name);
        setVenueAddress(preset.address);
        setVenueLat(preset.lat);
        setVenueLng(preset.lng);
        setVenueAccess(preset.access.join('\n'));
        setVenueParking(preset.parking);
        extracted.push(`会場 (${shortName})`);
        break;
      }
    }

    // 4. Pricing extraction
    if (/入場無料|無料/.test(text)) {
      setPricing([{ label: '入場無料', amount: 0 }]);
      if (/要予約|事前予約|整理券/.test(text)) {
        setPricingNote('入場無料（要事前予約・整理券）');
      } else {
        setPricingNote('入場無料・全席自由');
      }
      extracted.push('入場料 (無料)');
    } else {
      const priceMatches = [...text.matchAll(/(一般|学生|前売|当日|自由席|指定席)?\s*([1-9]\d{0,1},?\d{3}|\d{3,4})\s*円/g)];
      if (priceMatches.length > 0) {
        const items: PricingItem[] = priceMatches.slice(0, 4).map((m) => ({
          label: m[1] || '入場料',
          amount: parseInt(m[2].replace(/,/g, ''), 10),
        }));
        setPricing(items);
        extracted.push(`入場料 (${items.length}件)`);
      }
    }

    // 5. Title extraction (first non-empty line if title is blank)
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!title && lines.length > 0) {
      setTitle(lines[0].slice(0, 90));
      extracted.push('タイトル');
    }

    // 6. Program extraction (lines containing colon / dash / slash between composer & work)
    const progCandidates: ProgramItem[] = [];
    for (const line of lines) {
      const m = line.match(/^([A-Za-zÀ-ÿ.\s・ーァ-ヶ]{2,30})\s*[/:：—－-]\s*(.+)$/);
      if (
        m &&
        !/日時|会場|場所|開場|開演|料金|入場|問合|連絡|主催|後援/.test(m[1]) &&
        m[2].length > 2
      ) {
        progCandidates.push({
          composer: m[1].trim(),
          piece: m[2].trim(),
        });
      }
    }
    if (progCandidates.length > 0) {
      setProgram(progCandidates);
      extracted.push(`プログラム (${progCandidates.length}曲)`);
    }

    if (!description) {
      setDescription(text);
    }

    setDirty(true);
    setParseFeedback(
      extracted.length > 0
        ? `自動抽出完了: ${extracted.join(' / ')} を反映しました。`
        : '原稿本文を説明欄へ反映しました。各項目をご確認ください。'
    );
  };

  const applyVenuePreset = (v: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    access: string[];
    parking: string;
  }) => {
    setVenueName(v.name);
    setVenueAddress(v.address);
    setVenueLat(v.lat);
    setVenueLng(v.lng);
    setVenueAccess(v.access.join('\n'));
    setVenueParking(v.parking);
    setShowVenueSuggestions(false);
    setDirty(true);
  };

  const handleVenueInput = useCallback(
    (value: string) => {
      setVenueName(value);
      setDirty(true);
      if (value.length > 0) {
        const filtered = venueList.filter((v) => v.name.includes(value));
        setVenueSuggestions(filtered);
        setShowVenueSuggestions(filtered.length > 0);
      } else {
        setShowVenueSuggestions(false);
      }
    },
    [venueList]
  );

  const selectVenue = (venue: VenueRecord) => {
    setVenueName(venue.name);
    try {
      const data = JSON.parse(venue.data_json) as Venue;
      setVenueAddress(data.address || '');
      setVenueLat(data.lat || 0);
      setVenueLng(data.lng || 0);
      setVenueAccess(data.access?.join('\n') || '');
      setVenueParking(data.parking || '');
    } catch {
      /* ignore */
    }
    setShowVenueSuggestions(false);
  };

  // Google Maps URL parser
  const [gmapUrl, setGmapUrl] = useState('');
  const [gmapStatus, setGmapStatus] = useState<'idle' | 'parsing' | 'ok' | 'error'>('idle');

  const isGoogleInternalId = (name: string): boolean => {
    if (name.length < 20) return false;
    const isBase64Like = /^[A-Za-z0-9+/=_-]+$/.test(name);
    const hasReadableText = /[\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF]/.test(name);
    return isBase64Like && !hasReadableText;
  };

  const extractFromGoogleMapsUrl = useCallback(
    (fullUrl: string): boolean => {
      try {
        const u = new URL(fullUrl);
        let lat = 0,
          lng = 0,
          placeName = '';

        const placeMatch = u.pathname.match(
          /\/place\/([^/@]+)(?:\/@(-?\d+\.?\d*),(-?\d+\.?\d*))?/
        );
        if (placeMatch) {
          const rawName = decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ');
          if (!isGoogleInternalId(rawName)) {
            placeName = rawName;
          }
          if (placeMatch[2] && placeMatch[3]) {
            lat = parseFloat(placeMatch[2]);
            lng = parseFloat(placeMatch[3]);
          }
        }

        if (!lat) {
          const atMatch = u.pathname.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
          if (atMatch) {
            lat = parseFloat(atMatch[1]);
            lng = parseFloat(atMatch[2]);
          }
        }

        const q = u.searchParams.get('q');
        if (q) {
          const coordMatch = q.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
          if (coordMatch) {
            lat = parseFloat(coordMatch[1]);
            lng = parseFloat(coordMatch[2]);
          } else if (!placeName) {
            placeName = q.replace(/\+/g, ' ');
          }
        }

        const ll = u.searchParams.get('ll');
        if (ll && !lat) {
          const llMatch = ll.match(/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
          if (llMatch) {
            lat = parseFloat(llMatch[1]);
            lng = parseFloat(llMatch[2]);
          }
        }

        const data = u.searchParams.get('data') || u.pathname;
        if (!lat) {
          const dataMatch = data.match(/!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
          if (dataMatch) {
            lat = parseFloat(dataMatch[1]);
            lng = parseFloat(dataMatch[2]);
          }
        }

        if (placeName && !venueName) setVenueName(placeName);
        if (lat && lng) {
          setVenueLat(lat);
          setVenueLng(lng);
        }

        return !!(lat || placeName);
      } catch {
        return false;
      }
    },
    [venueName]
  );

  const parseGoogleMapsUrl = useCallback(
    async (url: string) => {
      setGmapUrl(url);
      setDirty(true);
      if (!url.trim()) {
        setGmapStatus('idle');
        return;
      }

      try {
        setGmapStatus('parsing');
        const u = new URL(url.trim());

        const isGoogleMaps =
          u.hostname.includes('google.com') || u.hostname.includes('google.co.jp');
        const isShortUrl =
          u.hostname === 'maps.app.goo.gl' || u.hostname === 'goo.gl' || u.hostname === 'g.co';

        if (!isGoogleMaps && !isShortUrl) {
          setGmapStatus('error');
          return;
        }

        if (isShortUrl) {
          const res = await fetch('/api/resolve-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url.trim() }),
          });
          const json = (await res.json()) as {
            ok: boolean;
            data?: { resolvedUrl: string };
            error?: string;
          };
          if (json.ok && json.data?.resolvedUrl) {
            const success = extractFromGoogleMapsUrl(json.data.resolvedUrl);
            setGmapStatus(success ? 'ok' : 'error');
          } else {
            setGmapStatus('error');
          }
        } else {
          const success = extractFromGoogleMapsUrl(url.trim());
          setGmapStatus(success ? 'ok' : 'error');
        }
      } catch {
        setGmapStatus('error');
      }
    },
    [extractFromGoogleMapsUrl]
  );

  const toggleDept = (dept: string) => {
    setDirty(true);
    setDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || externalSubmitting) return;
    setLoading(true);

    const venue: Venue = {
      name: venueName,
      address: venueAddress,
      lat: venueLat || undefined,
      lng: venueLng || undefined,
      access: venueAccess ? venueAccess.split('\n').filter(Boolean) : [],
      parking: venueParking || undefined,
    };

    const finalPricing = mode === 'quick' ? parsePricingText(pricingText) : pricing;
    const effectiveTimeStart = timeTbd ? '時間未定' : timeStart || '時間未定';

    // Sync concert_status into tags so D1 persists it without schema migration friction
    const existingTags = (initialData?.tags || []).filter((t) => !t.startsWith('status:'));
    const nextTags = [...existingTags, `status:${concertStatus}`];

    let mergedPricingNote = pricingNote;
    if (hasSecondShow && secondShowStart) {
      const matineeInfo = `【2回公演】第2回（夜公演）${secondShowOpen ? `${secondShowOpen}開場 / ` : ''}${secondShowStart}開演`;
      if (!mergedPricingNote.includes(secondShowStart)) {
        mergedPricingNote = mergedPricingNote ? `${mergedPricingNote} | ${matineeInfo}` : matineeInfo;
      }
    }

    const data: Record<string, unknown> = {
      title,
      subtitle,
      concert_status: concertStatus,
      tags: nextTags,
      date,
      time_start: effectiveTimeStart,
      time_open: timeOpen,
      time_end: timeEnd,
      venue,
      venue_name: venueName,
      category,
      departments,
      pricing: finalPricing,
      pricing_note: mergedPricingNote,
      seating,
      program,
      performers,
      supervisors,
      guest_artists: guestArtists,
      ticket_url: ticketUrl,
      ticket_note: ticketNote,
      description,
      contact_email: contactEmail,
      contact_tel: contactTel,
      contact_person: contactPerson,
      contact_url: contactUrl,
      flyer_r2_keys: flyerKeys,
      flyer_thumbnail_key: flyerThumb,
      mode,
    };

    if (!isEdit) {
      data.edit_password = editPassword;
      if (submitterName) data.submitter_name = submitterName;
      if (submitterEmail) data.submitter_email = submitterEmail;
    }

    try {
      await onSubmit(data);
      setDirty(false);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  };

  const statusMeta = CONCERT_STATUS_MAP[concertStatus] || CONCERT_STATUS_MAP.scheduled;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" onChange={() => setDirty(true)}>
      {/* Top Toolbar: Mode Switch & Auto-Saved Draft Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!isEdit && (
          <div className="inline-flex rounded-lg border border-stone-300 bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => setMode('full')}
              className={`px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                mode === 'full'
                  ? 'bg-stone-900 text-[#C5A059] shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              詳細登録モード（推奨）
            </button>
            <button
              type="button"
              onClick={() => setMode('quick')}
              className={`px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                mode === 'quick'
                  ? 'bg-stone-900 text-[#C5A059] shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              簡易登録モード
            </button>
          </div>
        )}

        {draftRestored && !isEdit && (
          <div className="flex items-center gap-2 text-xs text-stone-600 bg-stone-100 border border-stone-300 px-3 py-1.5 rounded">
            <span>自動保存された下書きを復元しました</span>
            <button
              type="button"
              onClick={clearSavedDraft}
              className="inline-flex items-center gap-1 text-rose-700 hover:underline font-medium"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
              <span>破棄</span>
            </button>
          </div>
        )}
      </div>

      {/* Smart Manuscript Parser (コピペ原稿一括入力) */}
      <div className="bg-stone-900 text-stone-100 rounded-xl border border-stone-700 p-4 sm:p-6 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#C5A059]" strokeWidth={1.5} />
            <h3 className="font-serif font-semibold text-base text-stone-100">
              スマート原稿パーサー（チラシ文面・メールからの一括自動入力）
            </h3>
          </div>
          <span className="text-[11px] font-display italic text-[#C5A059]">
            Smart Manuscript Parser
          </span>
        </div>
        <p className="text-xs text-stone-400 leading-relaxed">
          チラシ裏面原稿やSNS告知文、メールの本文をそのまま貼り付けて「自動解析して反映」を押すと、日付・開場/開演時刻・会場（学内＆主要ホール）・入場料・曲目リストを正規表現で自動抽出して各フォーム欄へ流し込みます。
        </p>
        <textarea
          rows={3}
          value={rawManuscript}
          onChange={(e) => setRawManuscript(e.target.value)}
          data-testid="smart-manuscript-textarea"
          placeholder="例: 愛知県立芸術大学 第58回定期演奏会&#10;2026年11月20日（金）開場 18:00 / 開演 18:30&#10;会場：愛知県芸術劇場コンサートホール 入場料：一般 2,000円 / 学生 1,000円&#10;J.ブラームス：交響曲第4番 ホ短調 Op.98"
          className="w-full rounded bg-stone-950 border border-stone-700 p-3 text-xs sm:text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-[#C5A059]"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleParseManuscript}
            data-testid="smart-manuscript-parse-btn"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#C5A059] text-stone-950 text-xs font-semibold hover:bg-[#d4b06a] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>自動解析してフォームに反映</span>
          </button>
          {parseFeedback && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>{parseFeedback}</span>
            </span>
          )}
        </div>
      </div>

      {/* Basic Info & Irregular Concert Status */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-6 space-y-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <h3 className="font-serif font-bold text-lg text-stone-900">
            1. 基本情報・開催ステータス
          </h3>
          <span className="text-xs text-stone-500">* は必須項目</span>
        </div>

        {/* Irregular Status Selector */}
        <div>
          <label className="label flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-stone-600" strokeWidth={1.5} />
            <span>開催ステータス（延期・中止・内容変更・満席などのイレギュラー対応）</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-1.5">
            {(Object.keys(CONCERT_STATUS_MAP) as ConcertStatus[]).map((stKey) => {
              const stInfo = CONCERT_STATUS_MAP[stKey];
              const active = concertStatus === stKey;
              return (
                <button
                  key={stKey}
                  type="button"
                  onClick={() => {
                    setConcertStatus(stKey);
                    setDirty(true);
                  }}
                  data-testid={`concert-status-${stKey}`}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    active
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300'
                  }`}
                >
                  <div className="text-xs font-semibold">{stInfo.label}</div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      active ? 'text-stone-300' : 'text-stone-500'
                    }`}
                  >
                    {stInfo.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label">公演タイトル *</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            required
            placeholder="例: 愛知県立芸術大学 第58回 定期演奏会"
          />
        </div>

        {mode === 'full' && (
          <div>
            <label className="label">サブタイトル・シリーズ名</label>
            <input
              className="input"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="例: 創立60周年記念シリーズ — 弦楽合奏の夕べ"
            />
          </div>
        )}

        {/* Date & Flexible Time Entry */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">開催日 *</label>
              <input
                type="date"
                className="input tabular-nums"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-stone-700">開演時刻 *</label>
                <label className="inline-flex items-center gap-1 text-xs text-stone-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={timeTbd}
                    onChange={(e) => setTimeTbd(e.target.checked)}
                    data-testid="time-tbd-checkbox"
                    className="accent-stone-900"
                  />
                  <span>時間未定</span>
                </label>
              </div>
              <input
                type="time"
                className="input tabular-nums disabled:bg-stone-100 disabled:text-stone-400"
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
                disabled={timeTbd}
                required={!timeTbd}
              />
            </div>

            {mode === 'full' && (
              <>
                <div>
                  <label className="label">開場時刻</label>
                  <input
                    type="time"
                    className="input tabular-nums"
                    value={timeOpen}
                    onChange={(e) => setTimeOpen(e.target.value)}
                    disabled={timeTbd}
                  />
                  {timeOpen && timeStart && !timeTbd && timeOpen > timeStart && (
                    <p className="text-amber-700 text-xs mt-1">
                      開場時刻が開演時刻より後になっています
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">終演予定時刻</label>
                  <input
                    type="time"
                    className="input tabular-nums"
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          {/* 1日2回公演（マチネ・ソワレ）オプション */}
          {mode === 'full' && (
            <div className="pt-1">
              <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={hasSecondShow}
                  onChange={(e) => setHasSecondShow(e.target.checked)}
                  data-testid="matinee-soiree-checkbox"
                  className="accent-stone-900"
                />
                <Clock className="w-3.5 h-3.5 text-stone-600" strokeWidth={1.5} />
                <span>1日2回公演（マチネ・ソワレ / 昼夜2公演）の時刻を追加する</span>
              </label>

              {hasSecondShow && (
                <div className="mt-2 p-3 rounded-lg bg-stone-50 border border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-600 mb-1">
                      第2回（ソワレ / 夜公演）開場時刻
                    </label>
                    <input
                      type="time"
                      className="input tabular-nums"
                      value={secondShowOpen}
                      onChange={(e) => setSecondShowOpen(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-600 mb-1">
                      第2回（ソワレ / 夜公演）開演時刻
                    </label>
                    <input
                      type="time"
                      className="input tabular-nums"
                      value={secondShowStart}
                      onChange={(e) => setSecondShowStart(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Venue Selection & 1-Tap Presets (Campus + Regional Concert Halls) */}
        <div className="space-y-3 pt-2 border-t border-stone-100">
          <label className="label flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-stone-700" strokeWidth={1.5} />
            <span>会場ワンタップ自動補完（選択すると住所・地図座標・アクセス案内が自動入力されます）</span>
          </label>

          <div className="space-y-2">
            <div className="text-xs font-medium text-stone-500">学内ホール・施設:</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(UNIVERSITY_VENUES).map(([key, v]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyVenuePreset(v)}
                  data-testid={`venue-preset-uni-${key}`}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                    venueName === v.name
                      ? 'bg-stone-900 text-[#C5A059] border-stone-900'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {v.name.replace('愛知県立芸術大学 ', '')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-stone-500">名古屋・愛知県内 主要ホール:</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(REGIONAL_VENUES).map(([key, v]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyVenuePreset(v)}
                  data-testid={`venue-preset-reg-${key}`}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                    venueName === v.name
                      ? 'bg-stone-900 text-[#C5A059] border-stone-900'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {v.name.replace('名古屋市', '')}
                </button>
              ))}
            </div>
          </div>

          <div className="relative pt-1">
            <label className="label">会場名 *</label>
            <input
              className="input"
              value={venueName}
              onChange={(e) => handleVenueInput(e.target.value)}
              onFocus={() => venueSuggestions.length > 0 && setShowVenueSuggestions(true)}
              onBlur={() => setTimeout(() => setShowVenueSuggestions(false), 200)}
              required
              placeholder="例: 愛知県芸術劇場コンサートホール"
            />
            {showVenueSuggestions && (
              <ul className="absolute z-10 w-full bg-white border border-stone-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                {venueSuggestions.map((v) => (
                  <li
                    key={v.id}
                    className="px-4 py-2 hover:bg-stone-100 cursor-pointer text-sm"
                    onMouseDown={() => selectVenue(v)}
                  >
                    {v.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Google Maps URL auto-fill */}
          <div>
            <label className="label text-xs text-stone-600">
              その他の会場の場合: Google Maps URLから座標・会場名を自動取得
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className="input flex-1 min-w-0 text-sm"
                value={gmapUrl}
                onChange={(e) => parseGoogleMapsUrl(e.target.value)}
                placeholder="Google Maps の共有URL（maps.app.goo.gl 等）を貼り付け"
                type="url"
              />
              {gmapStatus === 'parsing' && (
                <span className="self-center text-stone-500 text-xs">解析中...</span>
              )}
              {gmapStatus === 'ok' && venueName && (
                <span className="self-center text-emerald-700 text-xs font-medium">取得完了</span>
              )}
              {gmapStatus === 'error' && (
                <span className="self-center text-rose-600 text-xs">URLを確認してください</span>
              )}
            </div>
          </div>

          {mode === 'full' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">住所</label>
                <input
                  className="input"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                />
              </div>
              <div>
                <label className="label">駐車場・交通備考</label>
                <input
                  className="input"
                  value={venueParking}
                  onChange={(e) => setVenueParking(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">アクセス案内（1行に1項目）</label>
                <textarea
                  className="input"
                  rows={2}
                  value={venueAccess}
                  onChange={(e) => setVenueAccess(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Category & Departments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
          <div>
            <label className="label">公演カテゴリ *</label>
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <option key={key} value={key}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">関連専攻・コース（複数選択可）</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(DEPARTMENTS).map(([key, dept]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleDept(key)}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                    departments.includes(key)
                      ? 'bg-stone-900 text-[#C5A059] border-stone-900'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {dept.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section with Quick Presets */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-6 space-y-4 overflow-hidden">
        <h3 className="font-serif font-bold text-lg text-stone-900">2. 入場料・座席・予約案内</h3>

        <div className="space-y-1.5">
          <div className="text-xs font-medium text-stone-500">料金ワンタッププリセット:</div>
          <div className="flex flex-wrap gap-1.5">
            {PRICING_QUICK_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setPricing(preset.items);
                  setPricingNote(preset.note);
                  if (preset.seating) setSeating(preset.seating);
                  setPricingText(
                    preset.items[0].amount === 0 ? '無料' : `${preset.items[0].amount}円`
                  );
                  setDirty(true);
                }}
                className="px-3 py-1 rounded text-xs border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-900 hover:text-[#C5A059] transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'quick' ? (
          <div>
            <label className="label">料金（テキスト入力）</label>
            <input
              className="input"
              value={pricingText}
              onChange={(e) => setPricingText(e.target.value)}
              placeholder="例: 無料、一般 2,000円 / 学生 1,000円"
            />
          </div>
        ) : (
          <PricingEditor
            pricing={pricing}
            onChange={setPricing}
            pricingNote={pricingNote}
            onNoteChange={setPricingNote}
          />
        )}

        {mode === 'full' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="label">座席種別</label>
              <select
                className="input"
                value={seating}
                onChange={(e) => setSeating(e.target.value)}
              >
                {SEATING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">予約・チケット申込URL</label>
              <input
                type="url"
                className="input"
                value={ticketUrl}
                onChange={(e) => setTicketUrl(e.target.value)}
                placeholder="Googleフォーム・teket等のURL"
              />
            </div>
            <div>
              <label className="label">チケット・入場備考</label>
              <input
                className="input"
                value={ticketNote}
                onChange={(e) => setTicketNote(e.target.value)}
                placeholder="例: 未就学児入場不可 / 整理券配布あり"
              />
            </div>
          </div>
        )}
      </div>

      {/* Program & Performers */}
      {mode === 'full' && (
        <>
          <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-6 space-y-4 overflow-hidden">
            <h3 className="font-serif font-bold text-lg text-stone-900">3. プログラム（曲目）</h3>
            <ProgramEditor program={program} onChange={setProgram} />
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-6 space-y-4 overflow-hidden">
            <h3 className="font-serif font-bold text-lg text-stone-900">4. 出演者・編成</h3>
            <PerformerEditor performers={performers} onChange={setPerformers} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-6 space-y-3 overflow-hidden">
              <h3 className="font-serif font-bold text-base text-stone-900">指導教員・監修</h3>
              {supervisors.map((name, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input flex-1 min-w-0"
                    value={name}
                    onChange={(e) => {
                      const next = [...supervisors];
                      next[i] = e.target.value;
                      setSupervisors(next);
                    }}
                    placeholder="例: ○○ ○○（教授）"
                  />
                  <button
                    type="button"
                    onClick={() => setSupervisors(supervisors.filter((_, j) => j !== i))}
                    aria-label="指導者を削除"
                    className="text-rose-600 p-2 hover:bg-rose-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSupervisors([...supervisors, ''])}
                className="inline-flex items-center gap-1 text-xs font-medium text-stone-700 hover:text-stone-900"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>指導教員を追加</span>
              </button>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-6 space-y-3 overflow-hidden">
              <h3 className="font-serif font-bold text-base text-stone-900">客演・ゲスト奏者</h3>
              {guestArtists.map((name, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input flex-1 min-w-0"
                    value={name}
                    onChange={(e) => {
                      const next = [...guestArtists];
                      next[i] = e.target.value;
                      setGuestArtists(next);
                    }}
                    placeholder="例: ○○ ○○（客演指揮・ピアノ）"
                  />
                  <button
                    type="button"
                    onClick={() => setGuestArtists(guestArtists.filter((_, j) => j !== i))}
                    aria-label="ゲストを削除"
                    className="text-rose-600 p-2 hover:bg-rose-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setGuestArtists([...guestArtists, ''])}
                className="inline-flex items-center gap-1 text-xs font-medium text-stone-700 hover:text-stone-900"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>ゲスト奏者を追加</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-6 space-y-4 overflow-hidden">
            <h3 className="font-serif font-bold text-lg text-stone-900">5. 公演紹介文・お問い合わせ先</h3>
            <div>
              <label className="label">公演紹介・メッセージ</label>
              <textarea
                className="input"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="公演の聴きどころやご来場にあたっての案内をご記入ください"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">問い合わせメール</label>
                <input
                  type="email"
                  className="input"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="label">問い合わせ電話</label>
                <input
                  type="tel"
                  className="input"
                  value={contactTel}
                  onChange={(e) => setContactTel(e.target.value)}
                />
              </div>
              <div>
                <label className="label">主催・問い合わせ窓口名</label>
                <input
                  className="input"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                />
              </div>
              <div>
                <label className="label">公式Webサイト / SNS URL</label>
                <input
                  type="url"
                  className="input"
                  value={contactUrl}
                  onChange={(e) => setContactUrl(e.target.value)}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Flyer upload */}
      {!hideFlyer && (
        <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-6 space-y-4 overflow-hidden">
          <h3 className="font-serif font-bold text-lg text-stone-900">チラシ（PDF / 画像）</h3>
          <FlyerUploader
            concertSlug={concertSlug}
            existingKeys={flyerKeys}
            onUpload={(key, thumbKey) => {
              setFlyerKeys((prev) => [...prev, key]);
              if (thumbKey) setFlyerThumb(thumbKey);
            }}
          />
        </div>
      )}

      {/* Submitter info & Edit Password */}
      {!isEdit && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-6 space-y-3">
            <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-1.5">
              <User className="w-4 h-4 text-stone-600" strokeWidth={1.5} />
              <span>登録担当者情報（非公開・任意）</span>
            </h3>
            <p className="text-xs text-stone-500">
              一般公開ページには表示されません。確認事項が生じた際の連絡用です。
            </p>
            <div className="space-y-2.5">
              <input
                type="text"
                className="input"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                placeholder="担当者氏名（例: 山田 太郎）"
                autoComplete="name"
              />
              <input
                type="email"
                className="input"
                value={submitterEmail}
                onChange={(e) => setSubmitterEmail(e.target.value)}
                placeholder="連絡先メールアドレス"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="bg-stone-50 rounded-xl border border-stone-300 p-4 sm:p-6 space-y-3">
            <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-stone-700" strokeWidth={1.5} />
              <span>編集・更新用パスワード *</span>
            </h3>
            <p className="text-xs text-stone-600">
              登録後に公演内容の修正・チラシ差し替え・ステータス変更を行う際に使用します。
            </p>
            <input
              type="password"
              className="input"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              minLength={4}
              required
              placeholder="4文字以上のパスワードを設定"
            />
          </div>
        </div>
      )}

      {/* Real-Time Dual Preview (Card & Detail View) */}
      <div
        data-testid="concert-dual-preview"
        className="bg-stone-900 text-stone-100 rounded-xl border border-stone-700 p-4 sm:p-6 space-y-4 overflow-hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#C5A059]" strokeWidth={1.5} />
            <h3 className="font-serif font-semibold text-base">
              リアルタイム・デュアルプレビュー
            </h3>
          </div>
          <div className="inline-flex rounded border border-stone-700 bg-stone-950 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setPreviewMode('card')}
              className={`px-3 py-1 rounded ${
                previewMode === 'card'
                  ? 'bg-[#C5A059] text-stone-950 font-semibold'
                  : 'text-stone-400'
              }`}
            >
              一覧カード表示
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('detail')}
              className={`px-3 py-1 rounded ${
                previewMode === 'detail'
                  ? 'bg-[#C5A059] text-stone-950 font-semibold'
                  : 'text-stone-400'
              }`}
            >
              詳細ページ表示
            </button>
          </div>
        </div>

        {previewMode === 'card' ? (
          <div className="max-w-md bg-[#1A1917] border border-stone-800 rounded p-4 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded border border-[#C5A059]/40 text-[#C5A059]">
                {CATEGORIES[category]?.label || '公演'}
              </span>
              {concertStatus !== 'scheduled' && (
                <span className={`text-[11px] px-2 py-0.5 rounded ${statusMeta.badgeClass}`}>
                  {statusMeta.label}
                </span>
              )}
            </div>
            <h4 className="text-lg font-serif font-semibold text-stone-100 break-words">
              {title || '（公演タイトル未入力）'}
            </h4>
            {subtitle && <p className="text-xs text-stone-400 break-words">{subtitle}</p>}
            <div className="text-xs font-mono text-stone-300 tabular-nums">
              {date || 'YYYY-MM-DD'} | {timeTbd ? '時間未定' : timeStart ? `${timeStart} 開演` : '開演時刻未設定'}
            </div>
            <div className="text-xs text-stone-400 break-words">
              会場: {venueName || '（会場未入力）'}
            </div>
          </div>
        ) : (
          <div className="bg-[#1A1917] border border-stone-800 rounded p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded border border-[#C5A059]/40 text-[#C5A059]">
                {CATEGORIES[category]?.label || '公演'}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded ${statusMeta.badgeClass}`}>
                {statusMeta.label}
              </span>
            </div>
            <h4 className="text-xl sm:text-2xl font-serif font-semibold text-stone-100 break-words">
              {title || '（公演タイトル未入力）'}
            </h4>
            {subtitle && <p className="text-sm text-stone-300">{subtitle}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-stone-800 text-xs text-stone-300 tabular-nums">
              <div>
                日時: {date || '未定'}{' '}
                {timeTbd ? '（開演時間未定）' : timeStart ? `${timeStart}開演` : ''}
                {timeOpen ? `（${timeOpen}開場）` : ''}
              </div>
              <div>会場: {venueName || '未定'}</div>
            </div>
            {program.length > 0 && (
              <div className="pt-2 border-t border-stone-800 text-xs space-y-1">
                <div className="text-[#C5A059] font-medium">プログラム</div>
                {program.map((p, idx) => (
                  <div key={idx} className="text-stone-300">
                    {p.composer} — {p.piece}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={loading || externalSubmitting}
          className="btn-primary text-base font-serif px-8 py-3 w-full sm:w-auto"
        >
          {loading || externalSubmitting
            ? '送信処理中...'
            : isEdit
              ? '変更内容を保存する'
              : '演奏会を登録・公開する'}
        </button>
      </div>
    </form>
  );
}
