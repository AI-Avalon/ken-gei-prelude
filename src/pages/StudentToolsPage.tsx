import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIsMobile } from '../hooks/useDevice';

const NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const JP_NOTES = ['ド', 'レb', 'レ', 'ミb', 'ミ', 'ファ', 'ソb', 'ソ', 'ラb', 'ラ', 'シb', 'シ'];

function normalizeIndex(index: number) {
  return ((index % NOTES.length) + NOTES.length) % NOTES.length;
}

function noteFromFrequency(freq: number) {
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  const noteIndex = normalizeIndex(midi);
  const target = 440 * 2 ** ((midi - 69) / 12);
  const cents = Math.round(1200 * Math.log2(freq / target));
  return { midi, note: NOTES[noteIndex], jp: JP_NOTES[noteIndex], target, cents };
}

function detectPitch(buffer: Float32Array, sampleRate: number) {
  let rms = 0;
  for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.012) return null;

  let bestOffset = -1;
  let bestCorrelation = 0;
  const minOffset = Math.floor(sampleRate / 1200);
  const maxOffset = Math.floor(sampleRate / 55);

  for (let offset = minOffset; offset <= maxOffset; offset++) {
    let correlation = 0;
    for (let i = 0; i < buffer.length - offset; i++) {
      correlation += 1 - Math.abs(buffer[i] - buffer[i + offset]);
    }
    correlation /= buffer.length - offset;
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
    }
  }

  if (bestCorrelation < 0.86 || bestOffset <= 0) return null;
  return sampleRate / bestOffset;
}

export default function StudentToolsPage() {
  const isMobile = useIsMobile();
  const [bpm, setBpm] = useState(120);
  const [beats, setBeats] = useState(4);
  const [playing, setPlaying] = useState(false);
  const [beatIndex, setBeatIndex] = useState(0);
  const metronomeCtxRef = useRef<AudioContext | null>(null);
  const metronomeTimerRef = useRef<number | null>(null);
  const nextTickRef = useRef(0);
  const beatRef = useRef(0);

  const [tunerOn, setTunerOn] = useState(false);
  const [pitch, setPitch] = useState<number | null>(null);
  const [tunerError, setTunerError] = useState('');
  const tunerCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [fromKey, setFromKey] = useState(0);
  const [steps, setSteps] = useState(2);
  const [writtenNote, setWrittenNote] = useState(9);
  const toKey = NOTES[normalizeIndex(fromKey + steps)];
  const writtenToSounding = JP_NOTES[normalizeIndex(writtenNote + steps)];

  useEffect(() => {
    if (!playing) {
      if (metronomeTimerRef.current) window.clearInterval(metronomeTimerRef.current);
      metronomeTimerRef.current = null;
      beatRef.current = 0;
      setBeatIndex(0);
      return;
    }

    const ctx = metronomeCtxRef.current || new AudioContext();
    metronomeCtxRef.current = ctx;
    nextTickRef.current = ctx.currentTime + 0.03;
    const secondsPerBeat = 60 / bpm;

    const click = (time: number, accented: boolean) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = accented ? 1760 : 1040;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(accented ? 0.36 : 0.24, time + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(0.055, secondsPerBeat * 0.42));
      osc.connect(gain).connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.06);
    };

    metronomeTimerRef.current = window.setInterval(() => {
      while (nextTickRef.current < ctx.currentTime + 0.1) {
        const currentBeat = beatRef.current;
        click(nextTickRef.current, currentBeat === 0);
        beatRef.current = (currentBeat + 1) % beats;
        setBeatIndex(beatRef.current);
        nextTickRef.current += secondsPerBeat;
      }
    }, 18);

    return () => {
      if (metronomeTimerRef.current) window.clearInterval(metronomeTimerRef.current);
    };
  }, [playing, bpm, beats]);

  useEffect(() => {
    if (!tunerOn) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      analyserRef.current = null;
      setPitch(null);
      return;
    }

    let disposed = false;
    const start = async () => {
      try {
        setTunerError('');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const ctx = new AudioContext({ latencyHint: 'interactive' });
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0;
        ctx.createMediaStreamSource(stream).connect(analyser);
        tunerCtxRef.current = ctx;
        analyserRef.current = analyser;
        streamRef.current = stream;
        const buffer = new Float32Array(analyser.fftSize);

        const loop = () => {
          analyser.getFloatTimeDomainData(buffer);
          const nextPitch = detectPitch(buffer, ctx.sampleRate);
          setPitch(nextPitch);
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        setTunerError('マイクを許可するとチューナーが使えます。');
        setTunerOn(false);
      }
    };
    start();

    return () => {
      disposed = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      tunerCtxRef.current?.close().catch(() => {});
    };
  }, [tunerOn]);

  const note = useMemo(() => pitch ? noteFromFrequency(pitch) : null, [pitch]);
  const needle = note ? Math.max(-50, Math.min(50, note.cents)) : 0;

  return (
    <div className={`${isMobile ? 'px-4 py-5' : 'max-w-5xl mx-auto px-4 py-10'}`}>
      <div className="mb-6">
        <Link to="/" className="text-xs text-stone-400 hover:text-primary-600">ホームへ戻る</Link>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-serif font-bold text-stone-900 mt-2`}>
          音大生ツール
        </h1>
        <p className="text-sm text-stone-500 mt-1">メトロノーム、チューナー、移調だけ。練習中にすぐ触れる軽い道具です。</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="bg-white rounded-xl border border-stone-200/70 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-stone-900">爆速メトロノーム</h2>
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
              <p className="text-6xl font-bold tabular-nums text-stone-900">{bpm}</p>
              <p className="text-xs text-stone-400">BPM</p>
            </div>
            <div className="flex gap-1 pb-3">
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
            min={20}
            max={999}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="mt-5 w-full"
            aria-label="BPM"
          />
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[60, 120, 240, 480].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setBpm(value)}
                className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-2 text-xs font-medium text-stone-700 hover:bg-primary-50"
              >
                {value}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setBeats(value)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${beats === value ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-stone-600 border-stone-200'}`}
              >
                {value}拍
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-stone-200/70 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-stone-900">爆速チューナー</h2>
            <button type="button" onClick={() => setTunerOn((value) => !value)} className={tunerOn ? 'btn-danger text-sm' : 'btn-primary text-sm'}>
              {tunerOn ? '停止' : 'マイク開始'}
            </button>
          </div>
          <div className="rounded-xl bg-stone-950 p-5 text-center text-white">
            <p className="text-xs text-stone-400">検出音</p>
            <p className="mt-1 text-6xl font-bold tracking-tight">{note ? note.note : '--'}</p>
            <p className="text-sm text-stone-400">{note ? `${note.jp} / ${pitch?.toFixed(1)} Hz` : '音を鳴らしてください'}</p>
            <div className="relative mt-5 h-10 rounded-full bg-stone-800">
              <div className="absolute left-1/2 top-0 h-full w-px bg-white/70" />
              <div
                className={`absolute top-1/2 h-7 w-2 -translate-y-1/2 rounded-full ${Math.abs(needle) <= 5 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                style={{ left: `calc(50% + ${needle * 1.6}px)` }}
              />
              <div className="absolute bottom-1 left-3 text-[10px] text-stone-400">低い</div>
              <div className="absolute bottom-1 right-3 text-[10px] text-stone-400">高い</div>
            </div>
            <p className={`mt-3 text-sm font-medium ${note && Math.abs(note.cents) <= 5 ? 'text-emerald-300' : 'text-stone-300'}`}>
              {note ? `${note.cents > 0 ? '+' : ''}${note.cents} cents` : tunerError || 'リアルタイムで反応します'}
            </p>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-stone-200/70 p-5 shadow-sm lg:col-span-2">
          <h2 className="font-bold text-stone-900 mb-4">移調メモ</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <label className="text-xs text-stone-500">
              元の調
              <select className="input mt-1" value={fromKey} onChange={(e) => setFromKey(Number(e.target.value))}>
                {NOTES.map((item, index) => <option key={item} value={index}>{item} / {JP_NOTES[index]}</option>)}
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
              <p className="text-xs text-primary-700">移調後の調</p>
              <p className="text-2xl font-bold text-primary-900">{toKey}</p>
            </div>
            <label className="text-xs text-stone-500">
              書いてある音
              <select className="input mt-1" value={writtenNote} onChange={(e) => setWrittenNote(Number(e.target.value))}>
                {NOTES.map((item, index) => <option key={item} value={index}>{item} / {JP_NOTES[index]}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 rounded-xl bg-stone-50 border border-stone-100 p-4 text-sm text-stone-700">
            書いてある音を同じ半音幅で動かすと <span className="font-bold text-stone-900">{writtenToSounding}</span>。
          </div>
        </section>
      </div>
    </div>
  );
}
