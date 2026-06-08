import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '../components/Toast';
import { useIsMobile } from '../hooks/useDevice';

const DEFAULT_CHECKS = [
  '楽譜',
  '譜面台',
  '衣装',
  '靴',
  'チューナー',
  'メトロノーム',
  '予備弦・リード',
  '飲み物',
  '交通経路',
  '開場・開演時刻',
];

const NOTES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

function normalizeIndex(index: number) {
  return ((index % NOTES.length) + NOTES.length) % NOTES.length;
}

export default function StudentToolsPage() {
  const isMobile = useIsMobile();
  const [bpm, setBpm] = useState(84);
  const [beats, setBeats] = useState(4);
  const [playing, setPlaying] = useState(false);
  const [beatIndex, setBeatIndex] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const beatRef = useRef(0);

  const [fromKey, setFromKey] = useState(0);
  const [steps, setSteps] = useState(2);
  const toKey = NOTES[normalizeIndex(fromKey + steps)];

  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [checks, setChecks] = useState<boolean[]>(() => {
    try {
      const saved = localStorage.getItem('student_tools_checks');
      return saved ? JSON.parse(saved) : DEFAULT_CHECKS.map(() => false);
    } catch {
      return DEFAULT_CHECKS.map(() => false);
    }
  });

  useEffect(() => {
    localStorage.setItem('student_tools_checks', JSON.stringify(checks));
  }, [checks]);

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      setBeatIndex(0);
      beatRef.current = 0;
      return;
    }

    const intervalMs = 60000 / bpm;
    const tick = () => {
      const ctx = audioRef.current || new AudioContext();
      audioRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const currentBeat = beatRef.current;
      const accented = currentBeat % beats === 0;
      osc.frequency.value = accented ? 1320 : 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(accented ? 0.34 : 0.22, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
      beatRef.current = (currentBeat + 1) % beats;
      setBeatIndex(beatRef.current);
    };

    tick();
    timerRef.current = window.setInterval(tick, intervalMs);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [playing, bpm, beats]);

  const shareText = useMemo(() => {
    const parts = [
      eventTitle || '演奏会のお知らせ',
      eventDate && `日時: ${eventDate}`,
      eventVenue && `会場: ${eventVenue}`,
      'Crescendoで詳細をチェック',
    ].filter(Boolean);
    return parts.join('\n');
  }, [eventTitle, eventDate, eventVenue]);

  const copyShareText = async () => {
    await navigator.clipboard.writeText(shareText);
    toast('告知文をコピーしました', 'success');
  };

  const resetChecks = () => setChecks(DEFAULT_CHECKS.map(() => false));

  return (
    <div className={`${isMobile ? 'px-4 py-5' : 'max-w-5xl mx-auto px-4 py-10'}`}>
      <div className="mb-6">
        <Link to="/" className="text-xs text-stone-400 hover:text-primary-600">ホームへ戻る</Link>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-serif font-bold text-stone-900 mt-2`}>
          音大生ツール
        </h1>
        <p className="text-sm text-stone-500 mt-1">練習、告知、本番準備を無料でまとめて扱えます。</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="bg-white rounded-xl border border-stone-200/70 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-stone-900">メトロノーム</h2>
            <button
              type="button"
              onClick={() => setPlaying((value) => !value)}
              className={playing ? 'btn-danger text-sm' : 'btn-primary text-sm'}
            >
              {playing ? '停止' : '再生'}
            </button>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-5xl font-bold tabular-nums text-stone-900">{bpm}</p>
              <p className="text-xs text-stone-400">BPM</p>
            </div>
            <div className="flex gap-1 pb-2">
              {Array.from({ length: beats }).map((_, index) => (
                <span
                  key={index}
                  className={`h-3 w-3 rounded-full ${index === beatIndex ? 'bg-primary-600' : 'bg-stone-200'}`}
                />
              ))}
            </div>
          </div>
          <input
            type="range"
            min={40}
            max={220}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="mt-5 w-full"
            aria-label="BPM"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {[2, 3, 4, 5, 6].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setBeats(value)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${beats === value ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-stone-600 border-stone-200'}`}
              >
                {value}/4
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-stone-200/70 p-5 shadow-sm">
          <h2 className="font-bold text-stone-900 mb-4">移調メモ</h2>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs text-stone-500">
              元の調
              <select className="input mt-1" value={fromKey} onChange={(e) => setFromKey(Number(e.target.value))}>
                {NOTES.map((note, index) => <option key={note} value={index}>{note}</option>)}
              </select>
            </label>
            <label className="text-xs text-stone-500">
              半音
              <input
                type="number"
                className="input mt-1"
                value={steps}
                onChange={(e) => setSteps(Number(e.target.value))}
              />
            </label>
            <div className="rounded-lg bg-primary-50 border border-primary-100 p-3">
              <p className="text-xs text-primary-700">移調後</p>
              <p className="text-2xl font-bold text-primary-900">{toKey}</p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-stone-200/70 p-5 shadow-sm">
          <h2 className="font-bold text-stone-900 mb-4">告知文メーカー</h2>
          <div className="space-y-3">
            <input className="input" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="演奏会タイトル" />
            <input className="input" value={eventDate} onChange={(e) => setEventDate(e.target.value)} placeholder="日時" />
            <input className="input" value={eventVenue} onChange={(e) => setEventVenue(e.target.value)} placeholder="会場" />
            <textarea className="input" rows={5} value={shareText} readOnly aria-label="告知文" />
            <button type="button" onClick={copyShareText} className="btn-secondary w-full text-sm">コピー</button>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-stone-200/70 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-stone-900">本番チェック</h2>
            <button type="button" onClick={resetChecks} className="text-xs text-stone-400 hover:text-primary-600">
              リセット
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEFAULT_CHECKS.map((label, index) => (
              <label key={label} className="flex items-center gap-2 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={checks[index] || false}
                  onChange={(e) => {
                    const next = [...checks];
                    next[index] = e.target.checked;
                    setChecks(next);
                  }}
                />
                <span className={checks[index] ? 'text-stone-400 line-through' : 'text-stone-700'}>{label}</span>
              </label>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
