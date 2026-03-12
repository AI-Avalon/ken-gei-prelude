import { useState, useEffect, useCallback } from 'react';
import type { Concert, PricingItem, ProgramItem, Performer, Venue, VenueRecord } from '../types';
import { CATEGORIES, DEPARTMENTS, SEATING_OPTIONS } from '../lib/constants';
import { fetchVenues } from '../lib/api';
import { parsePricingText } from '../lib/utils';
import FlyerUploader from './FlyerUploader';

interface Props {
  initialData?: Partial<Concert>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isEdit?: boolean;
  concertSlug?: string;
  submitting?: boolean;
}

export default function ConcertForm({ initialData, onSubmit, isEdit, concertSlug, submitting: externalSubmitting }: Props) {
  const [mode, setMode] = useState<'quick' | 'full'>(isEdit ? 'full' : 'quick');
  const [loading, setLoading] = useState(false);
  const [venueList, setVenueList] = useState<VenueRecord[]>([]);
  const [venueSuggestions, setVenueSuggestions] = useState<VenueRecord[]>([]);
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Form fields
  const [title, setTitle] = useState(initialData?.title || '');
  const [subtitle, setSubtitle] = useState(initialData?.subtitle || '');
  const [date, setDate] = useState(initialData?.date || '');
  const [timeStart, setTimeStart] = useState(initialData?.time_start || '');
  const [timeOpen, setTimeOpen] = useState(initialData?.time_open || '');
  const [timeEnd, setTimeEnd] = useState(initialData?.time_end || '');
  const [venueName, setVenueName] = useState(initialData?.venue?.name || '');
  const [venueAddress, setVenueAddress] = useState(initialData?.venue?.address || '');
  const [venueAccess, setVenueAccess] = useState(initialData?.venue?.access?.join('\n') || '');
  const [venueParking, setVenueParking] = useState(initialData?.venue?.parking || '');
  const [venueLat, setVenueLat] = useState(initialData?.venue?.lat || 0);
  const [venueLng, setVenueLng] = useState(initialData?.venue?.lng || 0);
  const [category, setCategory] = useState(initialData?.category || 'other');
  const [departments, setDepartments] = useState<string[]>(initialData?.departments || []);
  const [pricingText, setPricingText] = useState('');
  const [pricing, setPricing] = useState<PricingItem[]>(initialData?.pricing || [{ label: '入場料', amount: 0 }]);
  const [pricingNote, setPricingNote] = useState(initialData?.pricing_note || '');
  const [seating, setSeating] = useState(initialData?.seating || '');
  const [program, setProgram] = useState<ProgramItem[]>(initialData?.program || []);
  const [performers, setPerformers] = useState<Performer[]>(initialData?.performers || []);
  const [supervisors, setSupervisors] = useState<string[]>(initialData?.supervisors || []);
  const [description, setDescription] = useState(initialData?.description || '');
  const [contactEmail, setContactEmail] = useState(initialData?.contact_email || '');
  const [contactTel, setContactTel] = useState(initialData?.contact_tel || '');
  const [contactPerson, setContactPerson] = useState(initialData?.contact_person || '');
  const [contactUrl, setContactUrl] = useState(initialData?.contact_url || '');
  const [editPassword, setEditPassword] = useState('');
  const [flyerKeys, setFlyerKeys] = useState<string[]>(initialData?.flyer_r2_keys || []);
  const [flyerThumb, setFlyerThumb] = useState(initialData?.flyer_thumbnail_key || '');

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

  const handleVenueInput = useCallback((value: string) => {
    setVenueName(value);
    setDirty(true);
    if (value.length > 0) {
      const filtered = venueList.filter((v) => v.name.includes(value));
      setVenueSuggestions(filtered);
      setShowVenueSuggestions(filtered.length > 0);
    } else {
      setShowVenueSuggestions(false);
    }
  }, [venueList]);

  const selectVenue = (venue: VenueRecord) => {
    setVenueName(venue.name);
    try {
      const data = JSON.parse(venue.data_json) as Venue;
      setVenueAddress(data.address || '');
      setVenueLat(data.lat || 0);
      setVenueLng(data.lng || 0);
      setVenueAccess(data.access?.join('\n') || '');
      setVenueParking(data.parking || '');
    } catch { /* ignore */ }
    setShowVenueSuggestions(false);
  };

  const toggleDept = (dept: string) => {
    setDirty(true);
    setDepartments((prev) => prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
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

    const data: Record<string, unknown> = {
      title,
      subtitle,
      date,
      time_start: timeStart,
      time_open: timeOpen,
      time_end: timeEnd,
      venue,
      venue_name: venueName,
      category,
      departments,
      pricing: finalPricing,
      pricing_note: pricingNote,
      seating,
      program,
      performers,
      supervisors,
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
    }

    try {
      await onSubmit(data);
      setDirty(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" onChange={() => setDirty(true)}>
      {/* Mode toggle */}
      {!isEdit && (
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode('quick')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'quick' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            ⚡ かんたん登録
          </button>
          <button
            type="button"
            onClick={() => setMode('full')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'full' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            🔧 詳細登録
          </button>
        </div>
      )}

      {/* Required fields */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-bold text-lg">基本情報</h3>

        <div>
          <label className="label">タイトル *</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)}
            maxLength={100} required placeholder="例: 第58回 定期演奏会" />
        </div>

        {mode === 'full' && (
          <div>
            <label className="label">サブタイトル</label>
            <input className="input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">日付 *</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">開演時刻 *</label>
            <input type="time" className="input" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} required />
          </div>
          {mode === 'full' && (
            <>
              <div>
                <label className="label">開場時刻</label>
                <input type="time" className="input" value={timeOpen} onChange={(e) => setTimeOpen(e.target.value)} />
              </div>
              <div>
                <label className="label">終演予定</label>
                <input type="time" className="input" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
              </div>
            </>
          )}
        </div>

        {/* Venue with suggestions */}
        <div className="relative">
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
            <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
              {venueSuggestions.map((v) => (
                <li
                  key={v.id}
                  className="px-4 py-2 hover:bg-primary-50 cursor-pointer text-sm"
                  onMouseDown={() => selectVenue(v)}
                >
                  {v.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {mode === 'full' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">住所</label>
              <input className="input" value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} />
            </div>
            <div>
              <label className="label">駐車場</label>
              <input className="input" value={venueParking} onChange={(e) => setVenueParking(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="label">アクセス（1行1項目）</label>
              <textarea className="input" rows={2} value={venueAccess} onChange={(e) => setVenueAccess(e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <label className="label">カテゴリ *</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} required>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <option key={key} value={key}>{cat.icon} {cat.label}</option>
            ))}
          </select>
        </div>

        {/* Departments */}
        <div>
          <label className="label">専攻</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(DEPARTMENTS).map(([key, dept]) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleDept(key)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  departments.includes(key)
                    ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                }`}
              >
                {dept.icon} {dept.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-bold text-lg">料金</h3>
        {mode === 'quick' ? (
          <div>
            <label className="label">料金（テキスト入力）</label>
            <input className="input" value={pricingText} onChange={(e) => setPricingText(e.target.value)}
              placeholder="例: 無料、1000円" />
            <p className="text-xs text-gray-500 mt-1">「無料」「1000円」のように入力してください</p>
          </div>
        ) : (
          <>
            {pricing.map((item, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="label">区分名</label>
                  <input className="input" value={item.label}
                    onChange={(e) => {
                      const next = [...pricing];
                      next[i] = { ...next[i], label: e.target.value };
                      setPricing(next);
                    }} />
                </div>
                <div className="w-32">
                  <label className="label">金額</label>
                  <input type="number" className="input" value={item.amount}
                    onChange={(e) => {
                      const next = [...pricing];
                      next[i] = { ...next[i], amount: parseInt(e.target.value) || 0 };
                      setPricing(next);
                    }} />
                </div>
                <div className="flex-1">
                  <label className="label">備考</label>
                  <input className="input" value={item.note || ''}
                    onChange={(e) => {
                      const next = [...pricing];
                      next[i] = { ...next[i], note: e.target.value };
                      setPricing(next);
                    }} />
                </div>
                <button type="button" onClick={() => setPricing(pricing.filter((_, j) => j !== i))}
                  className="text-red-500 p-2 hover:bg-red-50 rounded">🗑</button>
              </div>
            ))}
            <button type="button" onClick={() => setPricing([...pricing, { label: '', amount: 0 }])}
              className="text-sm text-primary-600 hover:text-primary-700">+ 料金区分を追加</button>
            <div>
              <label className="label">料金備考</label>
              <input className="input" value={pricingNote} onChange={(e) => setPricingNote(e.target.value)}
                placeholder="例: 未就学児入場不可" />
            </div>
          </>
        )}

        {mode === 'full' && (
          <div>
            <label className="label">座席種別</label>
            <select className="input" value={seating} onChange={(e) => setSeating(e.target.value)}>
              {SEATING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Program & Performers (full mode only) */}
      {mode === 'full' && (
        <>
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-bold text-lg">プログラム</h3>
            {program.map((item, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="label">作曲者</label>
                  <input className="input" value={item.composer}
                    onChange={(e) => {
                      const next = [...program];
                      next[i] = { ...next[i], composer: e.target.value };
                      setProgram(next);
                    }} />
                </div>
                <div className="flex-1">
                  <label className="label">曲名</label>
                  <input className="input" value={item.piece}
                    onChange={(e) => {
                      const next = [...program];
                      next[i] = { ...next[i], piece: e.target.value };
                      setProgram(next);
                    }} />
                </div>
                <button type="button" onClick={() => setProgram(program.filter((_, j) => j !== i))}
                  className="text-red-500 p-2 hover:bg-red-50 rounded">🗑</button>
              </div>
            ))}
            <button type="button" onClick={() => setProgram([...program, { composer: '', piece: '' }])}
              className="text-sm text-primary-600 hover:text-primary-700">+ プログラムを追加</button>
          </div>

          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-bold text-lg">出演者</h3>
            {performers.map((item, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="label">名前</label>
                  <input className="input" value={item.name}
                    onChange={(e) => {
                      const next = [...performers];
                      next[i] = { ...next[i], name: e.target.value };
                      setPerformers(next);
                    }} />
                </div>
                <div className="w-40">
                  <label className="label">学年</label>
                  <input className="input" value={item.year || ''}
                    onChange={(e) => {
                      const next = [...performers];
                      next[i] = { ...next[i], year: e.target.value };
                      setPerformers(next);
                    }} />
                </div>
                <div className="w-32">
                  <label className="label">楽器</label>
                  <input className="input" value={item.instrument || ''}
                    onChange={(e) => {
                      const next = [...performers];
                      next[i] = { ...next[i], instrument: e.target.value };
                      setPerformers(next);
                    }} />
                </div>
                <button type="button" onClick={() => setPerformers(performers.filter((_, j) => j !== i))}
                  className="text-red-500 p-2 hover:bg-red-50 rounded">🗑</button>
              </div>
            ))}
            <button type="button" onClick={() => setPerformers([...performers, { name: '' }])}
              className="text-sm text-primary-600 hover:text-primary-700">+ 出演者を追加</button>
          </div>

          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-bold text-lg">指導者</h3>
            {supervisors.map((name, i) => (
              <div key={i} className="flex gap-2">
                <input className="input flex-1" value={name}
                  onChange={(e) => {
                    const next = [...supervisors];
                    next[i] = e.target.value;
                    setSupervisors(next);
                  }}
                  placeholder="例: 西谷牧人（准教授）" />
                <button type="button" onClick={() => setSupervisors(supervisors.filter((_, j) => j !== i))}
                  className="text-red-500 p-2 hover:bg-red-50 rounded">🗑</button>
              </div>
            ))}
            <button type="button" onClick={() => setSupervisors([...supervisors, ''])}
              className="text-sm text-primary-600 hover:text-primary-700">+ 指導者を追加</button>
          </div>

          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-bold text-lg">その他の情報</h3>
            <div>
              <label className="label">説明文</label>
              <textarea className="input" rows={4} value={description}
                onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">連絡先メール</label>
                <input type="email" className="input" value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)} />
              </div>
              <div>
                <label className="label">連絡先電話</label>
                <input type="tel" className="input" value={contactTel}
                  onChange={(e) => setContactTel(e.target.value)} />
              </div>
              <div>
                <label className="label">代表者名</label>
                <input className="input" value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)} />
              </div>
              <div>
                <label className="label">公式URL/SNS</label>
                <input type="url" className="input" value={contactUrl}
                  onChange={(e) => setContactUrl(e.target.value)} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Flyer upload */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-bold text-lg">チラシ画像</h3>
        <FlyerUploader
          concertSlug={concertSlug}
          existingKeys={flyerKeys}
          onUpload={(key, thumbKey) => {
            setFlyerKeys((prev) => [...prev, key]);
            setFlyerThumb(thumbKey);
          }}
        />
      </div>

      {/* Edit password */}
      {!isEdit && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 space-y-4">
          <h3 className="font-bold text-lg">🔑 編集用パスワード *</h3>
          <input
            type="password"
            className="input"
            value={editPassword}
            onChange={(e) => setEditPassword(e.target.value)}
            minLength={4}
            required
            placeholder="4文字以上"
          />
          <p className="text-sm text-amber-700">
            💡 あとからこの演奏会を編集・削除する際に必要です。忘れないようにメモしてください。
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button type="submit" disabled={loading} className="btn-primary text-lg px-8">
          {loading ? '送信中...' : isEdit ? '✅ 更新する' : '🎵 登録する'}
        </button>
      </div>
    </form>
  );
}
