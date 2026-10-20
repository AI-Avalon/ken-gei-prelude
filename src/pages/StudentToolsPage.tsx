import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Volume2,
  Square,
  Play,
  Plus,
  Trash2,
  Copy,
  Check,
  Printer,
  BookOpen,
  Clock,
  Sliders,
  FileSpreadsheet,
  CheckSquare,
  RotateCcw,
} from '../components/EditorialIcons';

type ToolTabId = 'drone' | 'metronome' | 'timer' | 'librarian' | 'producer';

const TOOL_TABS: { id: ToolTabId; label: string; sub: string }[] = [
  { id: 'drone', label: '純正律ドローン・基準音', sub: 'Harmonic Drone & Pitch' },
  { id: 'metronome', label: '高精度メトロノーム', sub: 'Web Audio Clock' },
  { id: 'timer', label: 'プログラム尺・進行表', sub: 'Recital & Stage Timer' },
  { id: 'librarian', label: '編成・製本計算機', sub: 'Librarian & Pult Calc' },
  { id: 'producer', label: '主催者チェックリスト', sub: 'Producer Workflow' },
];

// === TOOL 1 CONSTANTS: HARMONIC DRONE & PITCH REFERENCE ===
const PITCH_PRESETS = [
  { hz: 415, label: '415 Hz', desc: 'バロックピッチ' },
  { hz: 430, label: '430 Hz', desc: 'クラシカル' },
  { hz: 440, label: '440 Hz', desc: '国際標準・ポップス' },
  { hz: 441, label: '441 Hz', desc: '室内楽・ピアノ併せ' },
  { hz: 442, label: '442 Hz', desc: '日本の音大・オケ標準' },
  { hz: 443, label: '443 Hz', desc: '欧州オケ・華やか' },
  { hz: 444, label: '444 Hz', desc: '高輝度ソロ' },
];

const NOTE_NAMES = [
  { semitone: 0, label: 'C', solfege: 'ド (Ut / C)' },
  { semitone: 1, label: 'C♯ / D♭', solfege: 'Cis / Des' },
  { semitone: 2, label: 'D', solfege: 'レ (Re / D)' },
  { semitone: 3, label: 'D♯ / E♭', solfege: 'Dis / Es (E♭)' },
  { semitone: 4, label: 'E', solfege: 'ミ (Mi / E)' },
  { semitone: 5, label: 'F', solfege: 'ファ (Fa / F)' },
  { semitone: 6, label: 'F♯ / G♭', solfege: 'Fis / Ges' },
  { semitone: 7, label: 'G', solfege: 'ソ (Sol / G)' },
  { semitone: 8, label: 'G♯ / A♭', solfege: 'Gis / As' },
  { semitone: 9, label: 'A', solfege: 'ラ (La / A)' },
  { semitone: 10, label: 'A♯ / B♭', solfege: 'B (B♭ / Ais)' },
  { semitone: 11, label: 'B', solfege: 'シ (Si / H)' },
];

const INSTRUMENT_STRING_PRESETS = [
  {
    group: 'チェロ開放弦 (Vc)',
    notes: [
      { label: 'IV: C2', semi: 0, oct: 2 },
      { label: 'III: G2', semi: 7, oct: 2 },
      { label: 'II: D3', semi: 2, oct: 3 },
      { label: 'I: A3', semi: 9, oct: 3 },
    ],
  },
  {
    group: 'ヴィオラ開放弦 (Va)',
    notes: [
      { label: 'IV: C3', semi: 0, oct: 3 },
      { label: 'III: G3', semi: 7, oct: 3 },
      { label: 'II: D4', semi: 2, oct: 4 },
      { label: 'I: A4', semi: 9, oct: 4 },
    ],
  },
  {
    group: 'ヴァイオリン開放弦 (Vn)',
    notes: [
      { label: 'IV: G3', semi: 7, oct: 3 },
      { label: 'III: D4', semi: 2, oct: 4 },
      { label: 'II: A4', semi: 9, oct: 4 },
      { label: 'I: E5', semi: 4, oct: 5 },
    ],
  },
  {
    group: '管楽器チューニング基準音',
    notes: [
      { label: 'オーボエ / 弦 A4', semi: 9, oct: 4 },
      { label: '吹奏楽 / 金管 B♭4', semi: 10, oct: 4 },
      { label: 'ホルン F4', semi: 5, oct: 4 },
      { label: '低音管 B♭2', semi: 10, oct: 2 },
    ],
  },
];

type HarmonyMode = 'root' | 'p5' | 'M3' | 'm3' | 'triad_major' | 'triad_minor';
type DroneTimbre = 'cello_organ' | 'oboe' | 'sine';

const HARMONY_MODES: {
  id: HarmonyMode;
  label: string;
  justRatioLabel: string;
  justRatios: number[];
  equalSemitones: number[];
  centDiffNote: string;
}[] = [
  {
    id: 'root',
    label: '単音 (Root のみ)',
    justRatioLabel: '1 : 1',
    justRatios: [1],
    equalSemitones: [0],
    centDiffNote: '基準根音のみを持続再生します',
  },
  {
    id: 'p5',
    label: '+ 完全5度 (Perfect 5th)',
    justRatioLabel: '純正比 2 : 3 (×1.500)',
    justRatios: [1, 1.5],
    equalSemitones: [0, 7],
    centDiffNote: '純正5度は平均律より +1.96 cent 広く、うなり（ビート）が完全に消えます',
  },
  {
    id: 'M3',
    label: '+ 長3度 (Major 3rd)',
    justRatioLabel: '純正比 4 : 5 (×1.250)',
    justRatios: [1, 1.25],
    equalSemitones: [0, 4],
    centDiffNote: '純正長3度は平均律より -13.69 cent 低く、黄金色に溶け合う共鳴を生みます',
  },
  {
    id: 'm3',
    label: '+ 短3度 (Minor 3rd)',
    justRatioLabel: '純正比 5 : 6 (×1.200)',
    justRatios: [1, 1.2],
    equalSemitones: [0, 3],
    centDiffNote: '純正短3度は平均律より +15.64 cent 高く、深い陰影の協和を得られます',
  },
  {
    id: 'triad_major',
    label: '長三和音 (Major Triad)',
    justRatioLabel: '純正比 4 : 5 : 6',
    justRatios: [1, 1.25, 1.5],
    equalSemitones: [0, 4, 7],
    centDiffNote: '根音・純正長3度(-13.7c)・純正完全5度(+2.0c)の完全協和トライアド',
  },
  {
    id: 'triad_minor',
    label: '短三和音 (Minor Triad)',
    justRatioLabel: '純正比 10 : 12 : 15',
    justRatios: [1, 1.2, 1.5],
    equalSemitones: [0, 3, 7],
    centDiffNote: '根音・純正短3度(+15.6c)・純正完全5度(+2.0c)の短調トライアド',
  },
];

// === TOOL 2 CONSTANTS: PRECISION METRONOME ===
interface MeterConfig {
  id: string;
  label: string;
  beats: number;
  accentPattern: number[]; // 2 = primary downbeat, 1 = secondary group accent, 0 = normal beat
}

const METER_CONFIGS: MeterConfig[] = [
  { id: '1/4', label: '1/4 (1拍子)', beats: 1, accentPattern: [2] },
  { id: '2/4', label: '2/4 (2拍子)', beats: 2, accentPattern: [2, 0] },
  { id: '3/4', label: '3/4 (3拍子)', beats: 3, accentPattern: [2, 0, 0] },
  { id: '4/4', label: '4/4 (4拍子)', beats: 4, accentPattern: [2, 0, 1, 0] },
  { id: '6/8', label: '6/8 (2+2+2 / 3+3)', beats: 6, accentPattern: [2, 0, 0, 1, 0, 0] },
  { id: '9/8', label: '9/8 (3+3+3)', beats: 9, accentPattern: [2, 0, 0, 1, 0, 0, 1, 0, 0] },
  { id: '12/8', label: '12/8 (3+3+3+3)', beats: 12, accentPattern: [2, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0] },
  { id: '5/4-32', label: '5/4 [3+2] 変拍子', beats: 5, accentPattern: [2, 0, 0, 1, 0] },
  { id: '5/4-23', label: '5/4 [2+3] 変拍子', beats: 5, accentPattern: [2, 0, 1, 0, 0] },
  { id: '7/8-223', label: '7/8 [2+2+3] 変拍子', beats: 7, accentPattern: [2, 0, 1, 0, 1, 0, 0] },
  { id: '7/8-322', label: '7/8 [3+2+2] 変拍子', beats: 7, accentPattern: [2, 0, 0, 1, 0, 1, 0] },
];

type SubdivisionMode = 'quarter' | 'eighth' | 'triplet' | 'sixteenth' | 'dotted';
type GrooveTrainingMode = 'normal' | 'silent_3_1' | 'silent_1_1' | 'backbeat_2_4';

const TEMPO_MARKING_PRESETS = [
  { term: 'Grave', bpm: 40 },
  { term: 'Largo', bpm: 48 },
  { term: 'Lento', bpm: 54 },
  { term: 'Adagio', bpm: 66 },
  { term: 'Andante', bpm: 78 },
  { term: 'Moderato', bpm: 98 },
  { term: 'Allegretto', bpm: 112 },
  { term: 'Allegro', bpm: 132 },
  { term: 'Vivace', bpm: 156 },
  { term: 'Presto', bpm: 180 },
  { term: 'Prestissimo', bpm: 204 },
];

// === TOOL 3 TYPES: PROGRAM & RECITAL TIMER ===
interface ProgramPieceItem {
  id: string;
  composer: string;
  title: string;
  durationMin: number;
  durationSec: number;
  transitionSec: number;
  intermissionAfterMin: number;
  stageMemo: string;
}

const EXAM_TIME_LIMITS = [
  { label: '実技試験 15分枠', maxSeconds: 15 * 60 },
  { label: '実技試験 25分枠', maxSeconds: 25 * 60 },
  { label: '卒演・修演 40分枠', maxSeconds: 40 * 60 },
  { label: 'ハーフリサイタル 60分枠', maxSeconds: 60 * 60 },
  { label: 'フルリサイタル 90分枠', maxSeconds: 90 * 60 },
];

// === TOOL 5 TYPES: PRODUCER CHECKLIST ===
interface ProducerCondition {
  id: string;
  label: string;
}

const PRODUCER_CONDITIONS: ProducerCondition[] = [
  { id: 'hall', label: 'ホールを予約する' },
  { id: 'print', label: 'チラシ・プログラムを印刷する' },
  { id: 'insert', label: '他公演へのチラシ挟み込みを行う' },
  { id: 'tuning', label: 'ピアノ調律を手配する' },
  { id: 'recording', label: '録音・録画を行う' },
  { id: 'honorarium', label: 'ゲスト・伴奏者へ謝礼を渡す' },
  { id: 'jasrac', label: 'JASRAC著作権申請が必要' },
];

interface ProducerTask {
  id: string;
  phase: string;
  title: string;
  detail: string;
  requiredCondition?: string;
}

const PRODUCER_TASKS: ProducerTask[] = [
  // Phase 1: 6〜3ヶ月前
  {
    id: 'p1-concept',
    phase: '1. 企画立ち上げ（6〜3ヶ月前）',
    title: '公演タイトル・日時・出演者・メインプログラムの決定',
    detail: '出演者全員のスケジュールと試験日程・学内行事との重複を確認する。',
  },
  {
    id: 'p1-hall-reserve',
    phase: '1. 企画立ち上げ（6〜3ヶ月前）',
    title: '会場（ホール）の仮予約・本申請と利用料金の支払い',
    detail: '本番枠だけでなく、ゲネプロ（リハーサル）枠・搬入出時間・楽屋使用の有無を含めて確保する。',
    requiredCondition: 'hall',
  },
  {
    id: 'p1-guest-offer',
    phase: '1. 企画立ち上げ（6〜3ヶ月前）',
    title: '共演者・伴奏ピアニスト・賛助出演者への正式依頼と謝礼条件の合意',
    detail: '合わせ日程の回数目安、交通費・謝礼金額を事前に誠実に伝えて合意形成する。',
    requiredCondition: 'honorarium',
  },
  {
    id: 'p1-flyer-design',
    phase: '1. 企画立ち上げ（6〜3ヶ月前）',
    title: 'チラシ・チケット原稿の作成とプロフィール写真・曲目表記の校正',
    detail: '作曲家名・作品番号・調性・開場/開演時刻・問い合わせ先メールアドレスの誤字脱字を複数人で二重チェックする。',
    requiredCondition: 'print',
  },

  // Phase 2: 2ヶ月前
  {
    id: 'p2-flyer-print',
    phase: '2. 広報・印刷・挟み込み（2ヶ月前）',
    title: 'チラシ・チケットの印刷発注および「Ken-Gei Prelude」への公演掲載登録',
    detail: 'PDFまたは高解像度フライヤー画像をアップロードし、SNS共有・カレンダー連携を開始する。',
    requiredCondition: 'print',
  },
  {
    id: 'p2-flyer-insert',
    phase: '2. 広報・印刷・挟み込み（2ヶ月前）',
    title: '学内・近隣ホール公演へのチラシ挟み込み（折込）許可申請と納品',
    detail: '相手主催者に必要部数と納品期限・集合時間を確認し、予備を含めて丁合（束ね作業）を行う。',
    requiredCondition: 'insert',
  },
  {
    id: 'p2-jasrac-check',
    phase: '2. 広報・印刷・挟み込み（2ヶ月前）',
    title: '著作権保護期間内の楽曲（没後70年以内等）のリストアップとJASRAC許諾確認',
    detail: '入場料の有無・客席定員数に応じた使用料計算を確認する。',
    requiredCondition: 'jasrac',
  },

  // Phase 3: 1ヶ月前
  {
    id: 'p3-hall-meeting',
    phase: '3. 進行・調律・ステマネ確認（1ヶ月前）',
    title: 'ホール舞台スタッフとの打合せ（舞台図・照明・反響板・椅子と譜面台の数）',
    detail: 'プログラム尺シミュレーターで作成した進行表を持参し、セッティング転換手順と休憩時間を確定する。',
    requiredCondition: 'hall',
  },
  {
    id: 'p3-piano-tuning',
    phase: '3. 進行・調律・ステマネ確認（1ヶ月前）',
    title: 'ピアノ調律師の手配と基準ピッチ（A=442Hz等）・立会い時間の連絡',
    detail: '弦・管とのアンサンブルがある場合は、基準ピッチ（442Hz等）を調律師と出演者全員に周知する。',
    requiredCondition: 'tuning',
  },
  {
    id: 'p3-recording-staff',
    phase: '3. 進行・調律・ステマネ確認（1ヶ月前）',
    title: '録音・撮影業者または記録スタッフの手配と三脚設置位置・電源の確認',
    detail: 'ホール側に客席内カメラ設置スペース（招待席ブロック等）と天吊りマイク利用可否を確認する。',
    requiredCondition: 'recording',
  },
  {
    id: 'p3-program-booklet',
    phase: '3. 進行・調律・ステマネ確認（1ヶ月前）',
    title: '当日配布プログラム冊子（曲目解説・歌詞対訳・挨拶文）の入稿・印刷',
    detail: '終演後のアンコール掲示用紙も合わせて準備しておく。',
    requiredCondition: 'print',
  },
  {
    id: 'p3-staff-assign',
    phase: '3. 進行・調律・ステマネ確認（1ヶ月前）',
    title: '当日スタッフ（ステマネ・譜めくり・受付・影アナ・楽屋係）の役割分担表作成',
    detail: '集合時刻・服装規定（黒服等）・弁当手配の有無を記載したマニュアルを配布する。',
  },

  // Phase 4: 当日持ち物・ゲネプロ
  {
    id: 'p4-stage-items',
    phase: '4. 当日持ち物・ゲネプロ（前日〜当日）',
    title: 'ステージ進行・受付用備品の搬入チェック',
    detail: '製本済みパート譜・スコア、予備弦・リード、養生テープ、ガムテープ、筆記用具、受付釣銭、プログラム、アンケート用紙＆鉛筆。',
  },
  {
    id: 'p4-honorarium-env',
    phase: '4. 当日持ち物・ゲネプロ（前日〜当日）',
    title: '謝礼・お車代の新札準備、熨斗（のし）袋・表書き、領収書用紙の準備',
    detail: '受付の貴重品管理責任者を決め、終演後または開演前のどのタイミングで渡すか共有する。',
    requiredCondition: 'honorarium',
  },
  {
    id: 'p4-rec-check',
    phase: '4. 当日持ち物・ゲネプロ（前日〜当日）',
    title: 'ゲネプロでの録音レベル（ピーク割れ防止）・画角・バッテリー＆SDカード残量確認',
    detail: '開演5分前に録画スタートの合図を出す担当者を決めておく。',
    requiredCondition: 'recording',
  },

  // Phase 5: 終演後精算
  {
    id: 'p5-hall-settle',
    phase: '5. 終演後精算・アーカイブ（終演後）',
    title: 'ホール附帯設備費・ピアノ使用料・延長料金等の当日精算と忘れ物確認',
    detail: '楽屋・譜面台・ロッカーの鍵の返却と原状回復を徹底する。',
    requiredCondition: 'hall',
  },
  {
    id: 'p5-jasrac-report',
    phase: '5. 終演後精算・アーカイブ（終演後）',
    title: 'JASRACへの利用楽曲報告（当日プログラム添付）と使用料振込',
    detail: 'アンコール曲も含めて正確に報告する。',
    requiredCondition: 'jasrac',
  },
  {
    id: 'p5-thank-you',
    phase: '5. 終演後精算・アーカイブ（終演後）',
    title: '共演者・スタッフ・指導教員へのお礼連絡および会計収支報告書の共有',
    detail: '録音・録画データの共有リンク送付と、次回企画への引継ぎメモを残す。',
  },
];

export default function StudentToolsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tool') as ToolTabId | null;
  const activeTab: ToolTabId =
    rawTab && ['drone', 'metronome', 'timer', 'librarian', 'producer'].includes(rawTab)
      ? rawTab
      : 'drone';

  const setActiveTab = (tab: ToolTabId) => {
    const next = new URLSearchParams(searchParams);
    next.set('tool', tab);
    setSearchParams(next, { replace: false });
  };

  // Shared Web Audio Context
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ensureAudioContext = useCallback(async () => {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    // iOS / Android silent buffer unlock
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    return ctx;
  }, []);

  // ============================================================================
  // TOOL 1: HARMONIC DRONE & PITCH REFERENCE STATE & ENGINE
  // ============================================================================
  const [a4Pitch, setA4Pitch] = useState<number>(442.0);
  const [selectedSemitone, setSelectedSemitone] = useState<number>(9); // Default A
  const [selectedOctave, setSelectedOctave] = useState<number>(4); // Default A4
  const [harmonyMode, setHarmonyMode] = useState<HarmonyMode>('p5');
  const [temperament, setTemperament] = useState<'just' | 'equal'>('just');
  const [timbre, setTimbre] = useState<DroneTimbre>('cello_organ');
  const [droneVolume, setDroneVolume] = useState<number>(0.45);
  const [isDronePlaying, setIsDronePlaying] = useState<boolean>(false);

  const droneNodesRef = useRef<{
    oscillators: OscillatorNode[];
    masterGain: GainNode | null;
  }>({ oscillators: [], masterGain: null });

  // Compute root frequency from A4 reference
  const rootFrequency = useMemo(() => {
    // MIDI note for A4 is 69. C4 is 60 (octave 4, semitone 0 -> (4+1)*12 + 0 = 60)
    const midiNote = (selectedOctave + 1) * 12 + selectedSemitone;
    const semitonesFromA4 = midiNote - 69;
    return a4Pitch * Math.pow(2, semitonesFromA4 / 12);
  }, [a4Pitch, selectedSemitone, selectedOctave]);

  const activeHarmonyDef = useMemo(
    () => HARMONY_MODES.find((h) => h.id === harmonyMode) || HARMONY_MODES[0],
    [harmonyMode]
  );

  const chordFrequencies = useMemo(() => {
    if (temperament === 'just') {
      return activeHarmonyDef.justRatios.map((r) => rootFrequency * r);
    }
    return activeHarmonyDef.equalSemitones.map((semi) => rootFrequency * Math.pow(2, semi / 12));
  }, [rootFrequency, temperament, activeHarmonyDef]);

  const stopDrone = useCallback(() => {
    const { oscillators, masterGain } = droneNodesRef.current;
    const ctx = audioCtxRef.current;
    if (masterGain && ctx) {
      try {
        masterGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04);
      } catch {
        // ignore
      }
    }
    setTimeout(() => {
      oscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore
        }
      });
    }, 60);
    droneNodesRef.current = { oscillators: [], masterGain: null };
    setIsDronePlaying(false);
  }, []);

  const startOrUpdateDrone = useCallback(
    async (
      freqs: number[],
      currentTimbre: DroneTimbre,
      vol: number
    ) => {
      const ctx = await ensureAudioContext();
      // Stop existing oscillators cleanly
      droneNodesRef.current.oscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore
        }
      });

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
      masterGain.gain.setTargetAtTime(
        Math.max(0.02, Math.min(0.9, vol)) / Math.sqrt(freqs.length),
        ctx.currentTime,
        0.05
      );

      // Lowpass filter for warm non-fatiguing cello/organ drone
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(
        currentTimbre === 'cello_organ' ? 1650 : currentTimbre === 'oboe' ? 2800 : 8000,
        ctx.currentTime
      );
      filter.Q.setValueAtTime(0.7, ctx.currentTime);

      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      const newOscs: OscillatorNode[] = [];

      // Harmonics recipe: [multiplier, amplitude, waveType]
      const harmonicsRecipe: [number, number, OscillatorType][] =
        currentTimbre === 'cello_organ'
          ? [
              [1, 1.0, 'sawtooth'],
              [2, 0.45, 'triangle'],
              [3, 0.25, 'sine'],
              [4, 0.12, 'sine'],
            ]
          : currentTimbre === 'oboe'
            ? [
                [1, 0.8, 'sawtooth'],
                [2, 0.65, 'sine'],
                [3, 0.55, 'sine'],
                [4, 0.2, 'sine'],
              ]
            : [[1, 1.0, 'sine']];

      freqs.forEach((baseFreq) => {
        harmonicsRecipe.forEach(([mult, amp, waveType]) => {
          const osc = ctx.createOscillator();
          const partGain = ctx.createGain();
          osc.type = waveType;
          osc.frequency.setValueAtTime(baseFreq * mult, ctx.currentTime);
          partGain.gain.setValueAtTime(amp * 0.3, ctx.currentTime);
          osc.connect(partGain);
          partGain.connect(filter);
          osc.start();
          newOscs.push(osc);
        });
      });

      droneNodesRef.current = { oscillators: newOscs, masterGain };
      setIsDronePlaying(true);
    },
    [ensureAudioContext]
  );

  // Live update drone when parameters change while playing
  useEffect(() => {
    if (isDronePlaying) {
      startOrUpdateDrone(chordFrequencies, timbre, droneVolume);
    }
  }, [chordFrequencies, timbre, droneVolume, isDronePlaying, startOrUpdateDrone]);

  // ============================================================================
  // TOOL 2: PRECISION METRONOME STATE & ENGINE
  // ============================================================================
  const initialBpmParam = Number(searchParams.get('bpm'));
  const [bpm, setBpm] = useState<number>(
    initialBpmParam >= 20 && initialBpmParam <= 280 ? initialBpmParam : 108
  );
  const [meterId, setMeterId] = useState<string>('4/4');
  const [subdivision, setSubdivision] = useState<SubdivisionMode>('quarter');
  const [grooveMode, setGrooveMode] = useState<GrooveTrainingMode>('normal');
  const [isMetroPlaying, setIsMetroPlaying] = useState<boolean>(false);
  const [visualBeat, setVisualBeat] = useState<number>(0);
  const [visualBar, setVisualBar] = useState<number>(1);
  const [isSilentBarNow, setIsSilentBarNow] = useState<boolean>(false);

  const activeMeter = useMemo(
    () => METER_CONFIGS.find((m) => m.id === meterId) || METER_CONFIGS[3],
    [meterId]
  );

  const metroTimerRef = useRef<number | null>(null);
  const metroRafRef = useRef<number | null>(null);
  const nextBeatTimeRef = useRef<number>(0);
  const currentBeatIdxRef = useRef<number>(0);
  const currentBarCountRef = useRef<number>(0);
  const scheduledVisualQueueRef = useRef<
    { time: number; beat: number; bar: number; silent: boolean }[]
  >([]);
  const tapTimesRef = useRef<number[]>([]);

  const stopMetronome = useCallback(() => {
    if (metroTimerRef.current !== null) {
      window.clearInterval(metroTimerRef.current);
      metroTimerRef.current = null;
    }
    if (metroRafRef.current !== null) {
      window.cancelAnimationFrame(metroRafRef.current);
      metroRafRef.current = null;
    }
    scheduledVisualQueueRef.current = [];
    setIsMetroPlaying(false);
    setIsSilentBarNow(false);
  }, []);

  const scheduleClickSound = useCallback(
    (ctx: AudioContext, time: number, accentLevel: number, isSubdivision: boolean) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isSubdivision ? 'sine' : 'triangle';

      const freq = isSubdivision
        ? 523.25
        : accentLevel === 2
          ? 1174.66
          : accentLevel === 1
            ? 880.0
            : 659.25;

      const peakGain = isSubdivision
        ? 0.12
        : accentLevel === 2
          ? 0.42
          : accentLevel === 1
            ? 0.28
            : 0.2;

      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(peakGain, time + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.06);
    },
    []
  );

  const startMetronome = useCallback(async () => {
    const ctx = await ensureAudioContext();
    stopMetronome();

    nextBeatTimeRef.current = ctx.currentTime + 0.05;
    currentBeatIdxRef.current = 0;
    currentBarCountRef.current = 0;
    scheduledVisualQueueRef.current = [];
    setIsMetroPlaying(true);

    // 25ms Lookahead Scheduler (100ms ahead window)
    metroTimerRef.current = window.setInterval(() => {
      if (!audioCtxRef.current) return;
      const now = audioCtxRef.current.currentTime;
      const secPerBeat = 60.0 / bpm;

      while (nextBeatTimeRef.current < now + 0.1) {
        const beatIdx = currentBeatIdxRef.current;
        const barIdx = currentBarCountRef.current;
        const beatTime = nextBeatTimeRef.current;

        // Determine if current bar or beat is muted by Groove Training Mode
        const isSilentBar =
          (grooveMode === 'silent_3_1' && barIdx % 4 === 3) ||
          (grooveMode === 'silent_1_1' && barIdx % 2 === 1);

        const isBackbeatMuted =
          grooveMode === 'backbeat_2_4' && beatIdx % 2 === 0; // Only play beats 2 & 4 (idx 1 & 3)

        const shouldMuteMainBeat = isSilentBar || isBackbeatMuted;
        const accent = activeMeter.accentPattern[beatIdx] ?? 0;

        if (!shouldMuteMainBeat) {
          scheduleClickSound(audioCtxRef.current, beatTime, accent, false);

          // Schedule subdivisions inside the beat
          if (subdivision === 'eighth') {
            scheduleClickSound(audioCtxRef.current, beatTime + secPerBeat * 0.5, 0, true);
          } else if (subdivision === 'triplet') {
            scheduleClickSound(audioCtxRef.current, beatTime + secPerBeat / 3, 0, true);
            scheduleClickSound(audioCtxRef.current, beatTime + (secPerBeat * 2) / 3, 0, true);
          } else if (subdivision === 'sixteenth') {
            scheduleClickSound(audioCtxRef.current, beatTime + secPerBeat * 0.25, 0, true);
            scheduleClickSound(audioCtxRef.current, beatTime + secPerBeat * 0.5, 0, true);
            scheduleClickSound(audioCtxRef.current, beatTime + secPerBeat * 0.75, 0, true);
          } else if (subdivision === 'dotted') {
            scheduleClickSound(audioCtxRef.current, beatTime + secPerBeat * 0.75, 0, true);
          }
        }

        scheduledVisualQueueRef.current.push({
          time: beatTime,
          beat: beatIdx,
          bar: barIdx + 1,
          silent: isSilentBar,
        });

        nextBeatTimeRef.current += secPerBeat;
        currentBeatIdxRef.current = (beatIdx + 1) % activeMeter.beats;
        if (currentBeatIdxRef.current === 0) {
          currentBarCountRef.current += 1;
        }
      }
    }, 25);

    const updateVisualLoop = () => {
      if (audioCtxRef.current) {
        const currentTime = audioCtxRef.current.currentTime;
        while (
          scheduledVisualQueueRef.current.length > 0 &&
          scheduledVisualQueueRef.current[0].time <= currentTime
        ) {
          const ev = scheduledVisualQueueRef.current.shift()!;
          setVisualBeat(ev.beat);
          setVisualBar(ev.bar);
          setIsSilentBarNow(ev.silent);
        }
      }
      metroRafRef.current = window.requestAnimationFrame(updateVisualLoop);
    };
    metroRafRef.current = window.requestAnimationFrame(updateVisualLoop);
  }, [bpm, activeMeter, subdivision, grooveMode, ensureAudioContext, stopMetronome, scheduleClickSound]);

  // Restart scheduler cleanly if BPM / meter / subdivision changes while playing
  useEffect(() => {
    if (isMetroPlaying) {
      startMetronome();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, meterId, subdivision, grooveMode]);

  const handleTapTempo = () => {
    const now = performance.now();
    const recent = tapTimesRef.current.filter((t) => now - t < 3000);
    recent.push(now);
    tapTimesRef.current = recent;
    if (recent.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < recent.length; i++) {
        intervals.push(recent[i] - recent[i - 1]);
      }
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const tappedBpm = Math.round(60000 / avgMs);
      if (tappedBpm >= 20 && tappedBpm <= 280) {
        setBpm(tappedBpm);
      }
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopDrone();
      stopMetronome();
    };
  }, [stopDrone, stopMetronome]);

  // ============================================================================
  // TOOL 3: PROGRAM & RECITAL TIMER STATE
  // ============================================================================
  const [doorsOpenTime, setDoorsOpenTime] = useState<string>('18:00');
  const [concertStartTime, setConcertStartTime] = useState<string>('18:30');
  const [examLimitSec, setExamLimitSec] = useState<number>(25 * 60);
  const [copiedSchedule, setCopiedSchedule] = useState<boolean>(false);

  const [programPieces, setProgramPieces] = useState<ProgramPieceItem[]>([
    {
      id: 'piece-1',
      composer: 'J.S. Bach',
      title: '無伴奏ヴァイオリンのためのパルティータ第2番 ニ短調 BWV 1004 より シャコンヌ',
      durationMin: 14,
      durationSec: 30,
      transitionSec: 90,
      intermissionAfterMin: 15,
      stageMemo: '譜面台なし・暗譜 / 照明センタースポット',
    },
    {
      id: 'piece-2',
      composer: 'J. Brahms',
      title: 'ヴァイオリン・ソナタ第3番 ニ短調 Op. 108（全4楽章）',
      durationMin: 21,
      durationSec: 30,
      transitionSec: 120,
      intermissionAfterMin: 0,
      stageMemo: 'ピアノ大屋根全開・譜面台1本設置',
    },
  ]);

  const addProgramPiece = () => {
    setProgramPieces((prev) => [
      ...prev,
      {
        id: `piece-${Date.now()}`,
        composer: '',
        title: `第${prev.length + 1}曲`,
        durationMin: 8,
        durationSec: 0,
        transitionSec: 90,
        intermissionAfterMin: 0,
        stageMemo: '',
      },
    ]);
  };

  const updateProgramPiece = (
    id: string,
    field: keyof ProgramPieceItem,
    value: string | number
  ) => {
    setProgramPieces((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeProgramPiece = (id: string) => {
    if (programPieces.length <= 1) return;
    setProgramPieces((prev) => prev.filter((item) => item.id !== id));
  };

  const timerSimulation = useMemo(() => {
    const [startH, startM] = concertStartTime.split(':').map((n) => parseInt(n || '0', 10));
    let cursorSec = (startH * 60 + startM) * 60;
    let purePerfSec = 0;
    let totalTransitionSec = 0;
    let totalIntermissionSec = 0;

    const formatClock = (totalSeconds: number) => {
      const normalized = ((totalSeconds % 86400) + 86400) % 86400;
      const h = Math.floor(normalized / 3600);
      const m = Math.floor((normalized % 3600) / 60);
      const s = normalized % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const rows = programPieces.map((p, idx) => {
      const pieceSec = Math.max(0, Number(p.durationMin || 0) * 60 + Number(p.durationSec || 0));
      const transSec = Math.max(0, Number(p.transitionSec || 0));
      const interSec = Math.max(0, Number(p.intermissionAfterMin || 0) * 60);

      // Add entrance applause/tuning before piece
      cursorSec += transSec;
      const startTimeStr = formatClock(cursorSec);
      cursorSec += pieceSec;
      const endTimeStr = formatClock(cursorSec);

      let intermissionEndStr: string | null = null;
      if (interSec > 0) {
        cursorSec += interSec;
        intermissionEndStr = formatClock(cursorSec);
      }

      purePerfSec += pieceSec;
      totalTransitionSec += transSec;
      totalIntermissionSec += interSec;

      return {
        index: idx + 1,
        piece: p,
        pieceSec,
        startTimeStr,
        endTimeStr,
        intermissionEndStr,
      };
    });

    const scheduledEndClock = formatClock(cursorSec);
    const totalConcertSec = purePerfSec + totalTransitionSec + totalIntermissionSec;

    return {
      rows,
      purePerfSec,
      totalTransitionSec,
      totalIntermissionSec,
      totalConcertSec,
      scheduledEndClock,
    };
  }, [programPieces, concertStartTime]);

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}分${String(s).padStart(2, '0')}秒`;
  };

  const copyScheduleMarkdown = async () => {
    const lines = [
      `# 演奏会進行表（ステージタイムテーブル）`,
      `- 開場: ${doorsOpenTime} / 開演: ${concertStartTime} / 終演予定: ${timerSimulation.scheduledEndClock}`,
      `- 純演奏時間合計: ${formatMinSec(timerSimulation.purePerfSec)}（全体所要時間: ${formatMinSec(timerSimulation.totalConcertSec)}）`,
      ``,
      `| 順 | 開始〜終了予想 | 作曲家 / 曲目 | 演奏尺 | 出入り・転換 | セッティング備考 |`,
      `|---|---|---|---|---|---|`,
      ...timerSimulation.rows.map(
        (r) =>
          `| ${r.index} | ${r.startTimeStr}〜${r.endTimeStr} | ${r.piece.composer ? `${r.piece.composer}: ` : ''}${r.piece.title} | ${r.piece.durationMin}:${String(r.piece.durationSec).padStart(2, '0')} | ${r.piece.transitionSec}秒${r.piece.intermissionAfterMin > 0 ? ` + 休憩${r.piece.intermissionAfterMin}分` : ''} | ${r.piece.stageMemo || '—'} |`
      ),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedSchedule(true);
      setTimeout(() => setCopiedSchedule(false), 2000);
    } catch {
      // ignore
    }
  };

  // ============================================================================
  // TOOL 4: LIBRARIAN & STAGE CALCULATOR STATE
  // ============================================================================
  const [vn1Players, setVn1Players] = useState<number>(12);
  const [vn2Players, setVn2Players] = useState<number>(10);
  const [vaPlayers, setVaPlayers] = useState<number>(8);
  const [vcPlayers, setVcPlayers] = useState<number>(6);
  const [cbPlayers, setCbPlayers] = useState<number>(4);
  const [windPercPlayers, setWindPercPlayers] = useState<number>(18);
  const [pdfPageCount, setPdfPageCount] = useState<number>(14);

  const librarianStats = useMemo(() => {
    const sections = [
      { name: '1st Violin', players: vn1Players },
      { name: '2nd Violin', players: vn2Players },
      { name: 'Viola', players: vaPlayers },
      { name: 'Violoncello', players: vcPlayers },
      { name: 'Contrabass', players: cbPlayers },
    ];

    const breakdown = sections.map((sec) => {
      const pults = Math.ceil(sec.players / 2);
      // 1 part per pult + 1 principal study copy + 1 librarian backup
      const partsNeeded = pults > 0 ? pults + 2 : 0;
      const standsNeeded = pults;
      const chairsNeeded = sec.name === 'Contrabass' ? Math.ceil(sec.players * 0.75) : sec.players;
      return {
        ...sec,
        pults,
        partsNeeded,
        standsNeeded,
        chairsNeeded,
      };
    });

    const totalStringPlayers = sections.reduce((acc, s) => acc + s.players, 0);
    const totalStringPults = breakdown.reduce((acc, s) => acc + s.pults, 0);
    const totalStringParts = breakdown.reduce((acc, s) => acc + s.partsNeeded, 0);
    const totalStands = totalStringPults + windPercPlayers + 1; // +1 for conductor
    const totalChairs = totalStringPlayers + windPercPlayers + 1; // +1 spare

    // Saddle-stitch A3 booklet calculation
    const cleanPages = Math.max(1, pdfPageCount);
    const paddedMultipleOf4 = Math.ceil(cleanPages / 4) * 4;
    const a3SheetsPerCopy = paddedMultipleOf4 / 4;
    const blankPagesToInsert = paddedMultipleOf4 - cleanPages;
    // Page turns: assuming page 1 is right-hand or cover, every 2 pages after opening spread requires a turn
    const pageTurnsCount = Math.max(0, Math.floor((cleanPages - 1) / 2));

    return {
      breakdown,
      totalStringPlayers,
      totalStringPults,
      totalStringParts,
      totalStands,
      totalChairs,
      paddedMultipleOf4,
      a3SheetsPerCopy,
      blankPagesToInsert,
      pageTurnsCount,
    };
  }, [vn1Players, vn2Players, vaPlayers, vcPlayers, cbPlayers, windPercPlayers, pdfPageCount]);

  // ============================================================================
  // TOOL 5: CONCERT PRODUCER WORKFLOW CHECKLIST STATE
  // ============================================================================
  const [enabledConditions, setEnabledConditions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('prelude_producer_conditions_v2');
      return saved
        ? JSON.parse(saved)
        : ['hall', 'print', 'insert', 'tuning', 'recording', 'honorarium', 'jasrac'];
    } catch {
      return ['hall', 'print', 'insert', 'tuning', 'recording', 'honorarium', 'jasrac'];
    }
  });

  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('prelude_producer_completed_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleProducerCondition = (condId: string) => {
    setEnabledConditions((prev) => {
      const next = prev.includes(condId) ? prev.filter((x) => x !== condId) : [...prev, condId];
      try {
        localStorage.setItem('prelude_producer_conditions_v2', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleProducerTask = (taskId: string) => {
    setCompletedTaskIds((prev) => {
      const next = prev.includes(taskId) ? prev.filter((x) => x !== taskId) : [...prev, taskId];
      try {
        localStorage.setItem('prelude_producer_completed_v2', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const visibleProducerTasks = useMemo(
    () =>
      PRODUCER_TASKS.filter(
        (t) => !t.requiredCondition || enabledConditions.includes(t.requiredCondition)
      ),
    [enabledConditions]
  );

  const producerProgress = useMemo(() => {
    if (visibleProducerTasks.length === 0) return 0;
    const done = visibleProducerTasks.filter((t) => completedTaskIds.includes(t.id)).length;
    return Math.round((done / visibleProducerTasks.length) * 100);
  }, [visibleProducerTasks, completedTaskIds]);

  return (
    <div className="min-h-screen bg-[#121211] text-stone-200 pb-24">
      {/* Header */}
      <header className="border-b border-stone-800/80 bg-[#161514] pt-10 pb-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <span className="text-xs tracking-[0.22em] uppercase text-[#C5A059] font-display">
              § Conservatory Studio Utilities
            </span>
            <Link
              to="/dictionary"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs border border-stone-800 bg-stone-900/70 text-stone-300 hover:border-[#C5A059]/50 hover:text-[#C5A059]"
            >
              <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>演奏者のための音楽楽語辞典へ</span>
            </Link>
          </div>

          <h1 className="text-2xl sm:text-4xl font-serif font-semibold text-stone-100 tracking-tight">
            音大生・演奏家プロフェッショナルツール
            <span className="block sm:inline sm:ml-4 text-base sm:text-xl font-display italic font-normal text-[#C5A059]">
              Atelier &amp; Stage Management Suite
            </span>
          </h1>
          <p className="mt-2 text-sm text-stone-400 max-w-3xl leading-relaxed">
            練習室での純正律音程合わせ・ハードウェアクロック同期メトロノームから、実技試験・リサイタルの秒単位進行表作成、オーケストラのプルト・パート譜製本計算、自主企画の運営タスク管理まで、現場で直ちに使える5つの専門ツール。
          </p>

          {/* 5 Tool Navigation Tabs */}
          <nav
            aria-label="ツール切り替えタブ"
            className="mt-6 grid grid-cols-1 sm:grid-cols-5 gap-2"
          >
            {TOOL_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`tool-tab-${tab.id}`}
                  className={`p-3 rounded text-left border transition-colors ${
                    isActive
                      ? 'bg-[#C5A059]/15 border-[#C5A059] text-stone-100'
                      : 'bg-[#1A1917] border-stone-800/80 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-serif font-semibold">{tab.label}</div>
                  <div className="text-[11px] font-display italic text-[#C5A059] mt-0.5">
                    {tab.sub}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* =====================================================================
            TAB 1: HARMONIC DRONE & PITCH REFERENCE
        ===================================================================== */}
        {activeTab === 'drone' && (
          <section data-testid="tool-panel-drone" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Pitch & Note Controls */}
              <div className="lg:col-span-7 bg-[#1A1917] border border-stone-800/80 rounded p-5 sm:p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
                  <div>
                    <span className="text-[11px] uppercase tracking-widest text-[#C5A059] font-display">
                      Tool 01 — Just Intonation &amp; Pitch Generator
                    </span>
                    <h2 className="text-xl font-serif font-semibold text-stone-100">
                      純正律ハーモニードローン &amp; 基準音ジェネレーター
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      isDronePlaying
                        ? stopDrone()
                        : startOrUpdateDrone(chordFrequencies, timbre, droneVolume)
                    }
                    data-testid="drone-play-toggle"
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold transition-colors ${
                      isDronePlaying
                        ? 'bg-[#8E2A2A] text-white border border-rose-400'
                        : 'bg-[#C5A059] text-stone-950 hover:bg-[#d4b06a]'
                    }`}
                  >
                    {isDronePlaying ? (
                      <>
                        <Square className="w-4 h-4 fill-current" />
                        <span>ドローン停止</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" strokeWidth={1.5} />
                        <span>ドローン再生開始</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Reference A4 Pitch Presets + 0.1Hz Fine Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs uppercase tracking-wider text-stone-400">
                      基準ピッチ設定 (Reference A4)
                    </label>
                    <span
                      data-testid="drone-a4-display"
                      className="text-lg font-mono font-semibold text-[#C5A059] tabular-nums"
                    >
                      A4 = {a4Pitch.toFixed(1)} Hz
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
                    {PITCH_PRESETS.map((p) => (
                      <button
                        key={p.hz}
                        type="button"
                        onClick={() => setA4Pitch(p.hz)}
                        data-testid={`pitch-preset-${p.hz}`}
                        className={`p-2 rounded border text-center transition-colors ${
                          Math.abs(a4Pitch - p.hz) < 0.05
                            ? 'border-[#C5A059] bg-[#C5A059]/20 text-stone-100'
                            : 'border-stone-800 bg-[#121211] text-stone-300 hover:border-stone-700'
                        }`}
                      >
                        <div className="text-xs font-mono font-semibold tabular-nums">
                          {p.label}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5">{p.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setA4Pitch((v) => Math.max(410, Math.round((v - 0.1) * 10) / 10))}
                      className="px-2.5 py-1 rounded bg-stone-900 border border-stone-700 text-xs font-mono tabular-nums"
                    >
                      -0.1 Hz
                    </button>
                    <input
                      type="range"
                      min={410}
                      max={450}
                      step={0.1}
                      value={a4Pitch}
                      onChange={(e) => setA4Pitch(parseFloat(e.target.value))}
                      aria-label="基準ピッチ微調整スライダー"
                      className="flex-1 accent-[#C5A059]"
                    />
                    <button
                      type="button"
                      onClick={() => setA4Pitch((v) => Math.min(450, Math.round((v + 0.1) * 10) / 10))}
                      className="px-2.5 py-1 rounded bg-stone-900 border border-stone-700 text-xs font-mono tabular-nums"
                    >
                      +0.1 Hz
                    </button>
                  </div>
                </div>

                {/* 12 Note Selector + Octave C2 ~ C5 */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs uppercase tracking-wider text-stone-400">
                      根音（Root Note）&amp; オクターブ選択
                    </span>
                    <div className="flex items-center gap-1">
                      {[2, 3, 4, 5].map((oct) => (
                        <button
                          key={oct}
                          type="button"
                          onClick={() => setSelectedOctave(oct)}
                          className={`px-2.5 py-1 rounded text-xs font-mono border ${
                            selectedOctave === oct
                              ? 'border-[#C5A059] bg-[#C5A059] text-stone-950 font-semibold'
                              : 'border-stone-800 bg-[#121211] text-stone-400'
                          }`}
                        >
                          Oct {oct}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {NOTE_NAMES.map((note) => {
                      const active = selectedSemitone === note.semitone;
                      return (
                        <button
                          key={note.semitone}
                          type="button"
                          onClick={() => setSelectedSemitone(note.semitone)}
                          className={`p-2.5 rounded border text-center transition-colors ${
                            active
                              ? 'border-[#C5A059] bg-[#C5A059]/20 text-stone-100'
                              : 'border-stone-800 bg-[#121211] text-stone-300 hover:border-stone-700'
                          }`}
                        >
                          <div className="text-sm font-serif font-semibold">{note.label}</div>
                          <div className="text-[10px] text-stone-400">{note.solfege}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* String & Wind Open-String Quick Presets */}
                <div className="space-y-2.5 pt-2 border-t border-stone-800/80">
                  <div className="text-xs uppercase tracking-wider text-stone-400">
                    弦楽器開放弦・管楽器クイックプリセット
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {INSTRUMENT_STRING_PRESETS.map((grp) => (
                      <div
                        key={grp.group}
                        className="bg-[#121211] border border-stone-800/80 rounded p-3"
                      >
                        <div className="text-xs font-medium text-[#C5A059] mb-2">{grp.group}</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {grp.notes.map((n) => (
                            <button
                              key={n.label}
                              type="button"
                              onClick={() => {
                                setSelectedSemitone(n.semi);
                                setSelectedOctave(n.oct);
                              }}
                              className={`px-2 py-1.5 rounded text-xs font-mono border transition-colors ${
                                selectedSemitone === n.semi && selectedOctave === n.oct
                                  ? 'border-[#C5A059] bg-[#C5A059]/20 text-stone-100'
                                  : 'border-stone-800 text-stone-300 hover:border-stone-700'
                              }`}
                            >
                              {n.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Just Intonation Harmony & Timbre */}
              <div className="lg:col-span-5 bg-[#1A1917] border border-stone-800/80 rounded p-5 sm:p-6 space-y-6">
                {/* Acoustic Frequency Monitor */}
                <div className="bg-[#121211] border border-stone-800 rounded p-4">
                  <div className="text-xs text-stone-400">現在出力中の周波数 (Tabular Acoustic Readout)</div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-2xl font-serif font-semibold text-stone-100">
                      {NOTE_NAMES[selectedSemitone].label}
                      {selectedOctave}
                    </span>
                    <span
                      data-testid="drone-root-freq"
                      className="text-2xl font-mono font-semibold text-[#C5A059] tabular-nums"
                    >
                      {rootFrequency.toFixed(2)} Hz
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-stone-800/80 text-xs font-mono text-stone-300 tabular-nums">
                    構成音: {chordFrequencies.map((f) => `${f.toFixed(2)} Hz`).join(' / ')}
                  </div>
                </div>

                {/* Temperament Toggle: Just Intonation vs Equal Temperament */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-stone-400">
                    音律切替（純正律のうなりの無い共鳴 vs 平均律の比較）
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTemperament('just')}
                      data-testid="temperament-just"
                      className={`p-2.5 rounded border text-xs font-medium transition-colors ${
                        temperament === 'just'
                          ? 'border-[#C5A059] bg-[#C5A059]/20 text-stone-100'
                          : 'border-stone-800 bg-[#121211] text-stone-400'
                      }`}
                    >
                      純正律 (Just Intonation)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemperament('equal')}
                      data-testid="temperament-equal"
                      className={`p-2.5 rounded border text-xs font-medium transition-colors ${
                        temperament === 'equal'
                          ? 'border-[#C5A059] bg-[#C5A059]/20 text-stone-100'
                          : 'border-stone-800 bg-[#121211] text-stone-400'
                      }`}
                    >
                      平均律 (Equal Temperament)
                    </button>
                  </div>
                </div>

                {/* Harmony Interval Selector */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-stone-400">
                    重音・ハーモニー同時再生モード
                  </label>
                  <div className="space-y-1.5">
                    {HARMONY_MODES.map((hm) => (
                      <button
                        key={hm.id}
                        type="button"
                        onClick={() => setHarmonyMode(hm.id)}
                        data-testid={`harmony-mode-${hm.id}`}
                        className={`w-full p-2.5 rounded border text-left transition-colors ${
                          harmonyMode === hm.id
                            ? 'border-[#C5A059] bg-[#C5A059]/15 text-stone-100'
                            : 'border-stone-800 bg-[#121211] text-stone-300 hover:border-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span>{hm.label}</span>
                          <span className="font-mono text-[#C5A059] tabular-nums">
                            {hm.justRatioLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5">{hm.centDiffNote}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timbre & Volume */}
                <div className="space-y-3 pt-2 border-t border-stone-800/80">
                  <label className="text-xs uppercase tracking-wider text-stone-400">
                    音色（Timbre）選択
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cello_organ', label: 'Warm Cello / Organ', sub: '倍音合成・耳が疲れない' },
                      { id: 'oboe', label: 'Oboe Reference', sub: 'オーケストラA音合わせ' },
                      { id: 'sine', label: 'Pure Sine', sub: '純音サイン波' },
                    ].map((tItem) => (
                      <button
                        key={tItem.id}
                        type="button"
                        onClick={() => setTimbre(tItem.id as DroneTimbre)}
                        className={`p-2 rounded border text-left ${
                          timbre === tItem.id
                            ? 'border-[#C5A059] bg-[#C5A059]/20 text-stone-100'
                            : 'border-stone-800 bg-[#121211] text-stone-300'
                        }`}
                      >
                        <div className="text-xs font-semibold">{tItem.label}</div>
                        <div className="text-[10px] text-stone-400 mt-0.5">{tItem.sub}</div>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-xs text-stone-400">音量</span>
                    <input
                      type="range"
                      min={0.05}
                      max={0.85}
                      step={0.05}
                      value={droneVolume}
                      onChange={(e) => setDroneVolume(parseFloat(e.target.value))}
                      aria-label="ドローン音量"
                      className="flex-1 accent-[#C5A059]"
                    />
                    <span className="text-xs font-mono text-stone-300 tabular-nums">
                      {Math.round(droneVolume * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            TAB 2: PRECISION WEB AUDIO METRONOME
        ===================================================================== */}
        {activeTab === 'metronome' && (
          <section data-testid="tool-panel-metronome" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-[#1A1917] border border-stone-800/80 rounded p-5 sm:p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
                  <div>
                    <span className="text-[11px] uppercase tracking-widest text-[#C5A059] font-display">
                      Tool 02 — Hardware-Clock Lookahead Scheduler
                    </span>
                    <h2 className="text-xl font-serif font-semibold text-stone-100">
                      Web Audio 高精度メトロノーム
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTapTempo}
                      data-testid="metronome-tap-btn"
                      className="px-3.5 py-2.5 rounded border border-stone-700 bg-[#121211] text-xs font-medium text-stone-200 hover:border-[#C5A059]"
                    >
                      Tap Tempo
                    </button>
                    <button
                      type="button"
                      onClick={() => (isMetroPlaying ? stopMetronome() : startMetronome())}
                      data-testid="metronome-play-toggle"
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold transition-colors ${
                        isMetroPlaying
                          ? 'bg-[#8E2A2A] text-white border border-rose-400'
                          : 'bg-[#C5A059] text-stone-950 hover:bg-[#d4b06a]'
                      }`}
                    >
                      {isMetroPlaying ? (
                        <>
                          <Square className="w-4 h-4 fill-current" />
                          <span>停止</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>スタート</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* BPM Readout & Pendulum Beat Indicator */}
                <div className="bg-[#121211] border border-stone-800 rounded p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-stone-400">テンポ設定 (20 – 280 BPM)</div>
                    <div
                      data-testid="metronome-bpm-display"
                      className="text-4xl font-mono font-bold text-[#C5A059] tabular-nums"
                    >
                      ♩ = {bpm}
                    </div>
                    <div className="text-xs text-stone-400 mt-1 tabular-nums">
                      第 {visualBar} 小節 {isSilentBarNow ? '（サイレント小節・体内カウント中）' : ''}
                    </div>
                  </div>

                  {/* Visual Pendulum Dots */}
                  <div className="flex flex-wrap items-center gap-2">
                    {Array.from({ length: activeMeter.beats }).map((_, idx) => {
                      const isCurrent = isMetroPlaying && visualBeat === idx;
                      const accent = activeMeter.accentPattern[idx];
                      return (
                        <div
                          key={idx}
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold border transition-all tabular-nums ${
                            isCurrent
                              ? isSilentBarNow
                                ? 'border-sky-400 bg-sky-950 text-sky-200 scale-110'
                                : accent === 2
                                  ? 'border-[#C5A059] bg-[#C5A059] text-stone-950 scale-110'
                                  : 'border-stone-200 bg-stone-200 text-stone-950 scale-105'
                              : accent === 2
                                ? 'border-[#C5A059]/50 text-[#C5A059]'
                                : accent === 1
                                  ? 'border-stone-600 text-stone-300'
                                  : 'border-stone-800 text-stone-500'
                          }`}
                        >
                          {idx + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* BPM Slider & Step Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBpm((v) => Math.max(20, v - 5))}
                    className="px-2.5 py-1.5 rounded bg-stone-900 border border-stone-700 text-xs font-mono tabular-nums"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => setBpm((v) => Math.max(20, v - 1))}
                    className="px-2.5 py-1.5 rounded bg-stone-900 border border-stone-700 text-xs font-mono tabular-nums"
                  >
                    -1
                  </button>
                  <input
                    type="range"
                    min={20}
                    max={280}
                    value={bpm}
                    onChange={(e) => setBpm(parseInt(e.target.value, 10))}
                    aria-label="BPMスライダー"
                    className="flex-1 accent-[#C5A059]"
                  />
                  <button
                    type="button"
                    onClick={() => setBpm((v) => Math.min(280, v + 1))}
                    className="px-2.5 py-1.5 rounded bg-stone-900 border border-stone-700 text-xs font-mono tabular-nums"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setBpm((v) => Math.min(280, v + 5))}
                    className="px-2.5 py-1.5 rounded bg-stone-900 border border-stone-700 text-xs font-mono tabular-nums"
                  >
                    +5
                  </button>
                </div>

                {/* Musical Term Tempo Selector */}
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wider text-stone-400">
                    楽語連動テンポセレクター（ワンタップで標準BPMへジャンプ）
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPO_MARKING_PRESETS.map((tp) => (
                      <button
                        key={tp.term}
                        type="button"
                        onClick={() => setBpm(tp.bpm)}
                        className={`px-2.5 py-1.5 rounded border text-xs transition-colors ${
                          Math.abs(bpm - tp.bpm) <= 4
                            ? 'border-[#C5A059] bg-[#C5A059]/20 text-stone-100'
                            : 'border-stone-800 bg-[#121211] text-stone-300 hover:border-stone-700'
                        }`}
                      >
                        <span className="font-display italic font-semibold text-[#C5A059]">
                          {tp.term}
                        </span>
                        <span className="ml-1.5 font-mono text-[11px] text-stone-400 tabular-nums">
                          ({tp.bpm})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Meter, Subdivisions & Silent Bar Training */}
              <div className="lg:col-span-5 bg-[#1A1917] border border-stone-800/80 rounded p-5 sm:p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-stone-400">
                    拍子・変拍子アクセント設定
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {METER_CONFIGS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMeterId(m.id)}
                        className={`p-2 rounded border text-xs font-mono text-left ${
                          meterId === m.id
                            ? 'border-[#C5A059] bg-[#C5A059]/20 text-stone-100 font-semibold'
                            : 'border-stone-800 bg-[#121211] text-stone-300'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-stone-400">
                    リズム分割 (Subdivisions)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      { id: 'quarter', label: '4分音符 (♩)' },
                      { id: 'eighth', label: '8分音符 (♫)' },
                      { id: 'triplet', label: '3連符 (Triplet)' },
                      { id: 'sixteenth', label: '16分音符 (♬)' },
                      { id: 'dotted', label: '付点リズム' },
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setSubdivision(sub.id as SubdivisionMode)}
                        className={`p-2 rounded border text-xs text-left ${
                          subdivision === sub.id
                            ? 'border-[#C5A059] bg-[#C5A059]/20 text-stone-100 font-semibold'
                            : 'border-stone-800 bg-[#121211] text-stone-300'
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-stone-800/80">
                  <label className="text-xs uppercase tracking-wider text-[#C5A059]">
                    サイレント小節・体内テンポ強化モード
                  </label>
                  <div className="space-y-1.5">
                    {[
                      {
                        id: 'normal',
                        title: '通常再生（全小節・全拍）',
                        desc: 'すべての小節と拍を正確にクリック再生します',
                      },
                      {
                        id: 'silent_3_1',
                        title: '3小節再生 ＋ 1小節サイレント（無音）',
                        desc: '4小節目のクリックを消し、無音中に自分のテンポが走ったり遅れたりしないか検証します',
                      },
                      {
                        id: 'silent_1_1',
                        title: '1小節再生 ＋ 1小節サイレント',
                        desc: '1小節おきに無音になる上級アンサンブル訓練モード',
                      },
                      {
                        id: 'backbeat_2_4',
                        title: '裏拍（2・4拍目）のみ再生',
                        desc: '1・3拍目を自分で感じ、2・4拍目のクリックと重なるように練習するグルーヴ強化モード',
                      },
                    ].map((gm) => (
                      <button
                        key={gm.id}
                        type="button"
                        onClick={() => setGrooveMode(gm.id as GrooveTrainingMode)}
                        data-testid={`groove-mode-${gm.id}`}
                        className={`w-full p-2.5 rounded border text-left ${
                          grooveMode === gm.id
                            ? 'border-[#C5A059] bg-[#C5A059]/15 text-stone-100'
                            : 'border-stone-800 bg-[#121211] text-stone-300'
                        }`}
                      >
                        <div className="text-xs font-semibold">{gm.title}</div>
                        <div className="text-[11px] text-stone-400 mt-0.5">{gm.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            TAB 3: PROGRAM & RECITAL TIMER SIMULATOR
        ===================================================================== */}
        {activeTab === 'timer' && (
          <section data-testid="tool-panel-timer" className="space-y-6">
            <div className="bg-[#1A1917] border border-stone-800/80 rounded p-5 sm:p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
                <div>
                  <span className="text-[11px] uppercase tracking-widest text-[#C5A059] font-display">
                    Tool 03 — Program Duration &amp; Stage Manager Timetable
                  </span>
                  <h2 className="text-xl font-serif font-semibold text-stone-100">
                    演奏会・実技試験 プログラム尺＆進行表シミュレーター
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyScheduleMarkdown}
                    data-testid="timer-copy-markdown"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-stone-700 bg-[#121211] text-xs font-medium text-stone-200 hover:border-[#C5A059]"
                  >
                    {copiedSchedule ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">進行表をコピーしました</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>進行表をMarkdownコピー</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#C5A059] text-stone-950 text-xs font-semibold"
                  >
                    <Printer className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>進行表を印刷</span>
                  </button>
                </div>
              </div>

              {/* Summary Dashboard Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#121211] border border-stone-800 rounded p-4">
                  <div className="text-xs text-stone-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
                    <span>純粋な演奏時間合計</span>
                  </div>
                  <div
                    data-testid="timer-pure-duration"
                    className="text-2xl font-mono font-bold text-stone-100 mt-1 tabular-nums"
                  >
                    {formatMinSec(timerSimulation.purePerfSec)}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <select
                      value={examLimitSec}
                      onChange={(e) => setExamLimitSec(Number(e.target.value))}
                      aria-label="規定時間プリセット"
                      className="bg-stone-900 border border-stone-700 rounded px-2 py-0.5 text-[11px] text-stone-200"
                    >
                      {EXAM_TIME_LIMITS.map((lim) => (
                        <option key={lim.maxSeconds} value={lim.maxSeconds}>
                          {lim.label}
                        </option>
                      ))}
                    </select>
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        timerSimulation.purePerfSec > examLimitSec
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {timerSimulation.purePerfSec > examLimitSec
                        ? `+${formatMinSec(timerSimulation.purePerfSec - examLimitSec)} 超過`
                        : `残り ${formatMinSec(examLimitSec - timerSimulation.purePerfSec)}`}
                    </span>
                  </div>
                </div>

                <div className="bg-[#121211] border border-stone-800 rounded p-4">
                  <div className="text-xs text-stone-400">開場 / 開演時刻設定</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-xs text-stone-400">
                      開場
                      <input
                        type="time"
                        value={doorsOpenTime}
                        onChange={(e) => setDoorsOpenTime(e.target.value)}
                        className="mt-0.5 w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm font-mono text-stone-100 tabular-nums"
                      />
                    </label>
                    <label className="text-xs text-stone-400">
                      開演
                      <input
                        type="time"
                        value={concertStartTime}
                        onChange={(e) => setConcertStartTime(e.target.value)}
                        className="mt-0.5 w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm font-mono text-stone-100 tabular-nums"
                      />
                    </label>
                  </div>
                </div>

                <div className="bg-[#121211] border border-stone-800 rounded p-4">
                  <div className="text-xs text-stone-400">終演予定時刻（出入り・転換・休憩込み）</div>
                  <div
                    data-testid="timer-scheduled-end"
                    className="text-2xl font-mono font-bold text-[#C5A059] mt-1 tabular-nums"
                  >
                    {timerSimulation.scheduledEndClock} 終演予定
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1.5 tabular-nums">
                    総拘束時間: {formatMinSec(timerSimulation.totalConcertSec)}（転換計{' '}
                    {formatMinSec(timerSimulation.totalTransitionSec)} / 休憩{' '}
                    {Math.round(timerSimulation.totalIntermissionSec / 60)}分）
                  </div>
                </div>
              </div>

              {/* Piece Rows Editor */}
              <div className="space-y-3">
                {timerSimulation.rows.map((row) => (
                  <div
                    key={row.piece.id}
                    className="bg-[#121211] border border-stone-800/90 rounded p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#C5A059]/20 text-[#C5A059] font-mono text-xs font-semibold tabular-nums">
                          #{row.index}
                        </span>
                        <span className="font-mono text-xs text-stone-200 tabular-nums">
                          進行予想: <strong>{row.startTimeStr}</strong> 〜{' '}
                          <strong>{row.endTimeStr}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProgramPiece(row.piece.id)}
                        aria-label="曲目を削除"
                        className="text-xs text-stone-400 hover:text-rose-400 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>削除</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] text-stone-400 mb-1">作曲家名</label>
                        <input
                          type="text"
                          value={row.piece.composer}
                          onChange={(e) =>
                            updateProgramPiece(row.piece.id, 'composer', e.target.value)
                          }
                          placeholder="例: L.v. Beethoven"
                          className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-xs text-stone-100"
                        />
                      </div>
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] text-stone-400 mb-1">
                          曲目・作品番号・楽章
                        </label>
                        <input
                          type="text"
                          value={row.piece.title}
                          onChange={(e) =>
                            updateProgramPiece(row.piece.id, 'title', e.target.value)
                          }
                          placeholder="例: ピアノソナタ第23番「熱情」Op.57"
                          className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-xs text-stone-100"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-stone-400 mb-1">
                          演奏時間 (分 : 秒)
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={180}
                            value={row.piece.durationMin}
                            onChange={(e) =>
                              updateProgramPiece(
                                row.piece.id,
                                'durationMin',
                                parseInt(e.target.value || '0', 10)
                              )
                            }
                            aria-label="演奏時間（分）"
                            className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-xs font-mono text-stone-100 tabular-nums"
                          />
                          <span className="text-stone-400">:</span>
                          <input
                            type="number"
                            min={0}
                            max={59}
                            value={row.piece.durationSec}
                            onChange={(e) =>
                              updateProgramPiece(
                                row.piece.id,
                                'durationSec',
                                parseInt(e.target.value || '0', 10)
                              )
                            }
                            aria-label="演奏時間（秒）"
                            className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-xs font-mono text-stone-100 tabular-nums"
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-stone-400 mb-1">
                          曲前転換・拍手 (秒)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={600}
                          step={10}
                          value={row.piece.transitionSec}
                          onChange={(e) =>
                            updateProgramPiece(
                              row.piece.id,
                              'transitionSec',
                              parseInt(e.target.value || '0', 10)
                            )
                          }
                          aria-label="転換秒数"
                          className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-xs font-mono text-stone-100 tabular-nums"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                      <div className="sm:col-span-8">
                        <input
                          type="text"
                          value={row.piece.stageMemo}
                          onChange={(e) =>
                            updateProgramPiece(row.piece.id, 'stageMemo', e.target.value)
                          }
                          placeholder="ステマネ・転換メモ（例: ピアノ半開→全開、チェロエンドピンストッパー設置、譜めくり有）"
                          className="w-full bg-stone-900/70 border border-stone-800 rounded px-2.5 py-1.5 text-xs text-stone-300"
                        />
                      </div>
                      <div className="sm:col-span-4 flex items-center gap-2">
                        <span className="text-[11px] text-stone-400 shrink-0">この曲の後に休憩:</span>
                        {[0, 15, 20].map((minVal) => (
                          <button
                            key={minVal}
                            type="button"
                            onClick={() =>
                              updateProgramPiece(row.piece.id, 'intermissionAfterMin', minVal)
                            }
                            className={`px-2.5 py-1 rounded text-xs font-mono border ${
                              row.piece.intermissionAfterMin === minVal
                                ? 'border-[#C5A059] bg-[#C5A059]/20 text-[#C5A059]'
                                : 'border-stone-800 text-stone-400'
                            }`}
                          >
                            {minVal === 0 ? 'なし' : `${minVal}分`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addProgramPiece}
                  data-testid="timer-add-piece-btn"
                  className="w-full py-3 rounded border border-dashed border-stone-700 hover:border-[#C5A059] text-xs font-medium text-stone-300 hover:text-[#C5A059] inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  <span>曲目を追加する</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            TAB 4: ORCHESTRA LIBRARIAN & STAGE CALCULATOR
        ===================================================================== */}
        {activeTab === 'librarian' && (
          <section data-testid="tool-panel-librarian" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* String Pult & Stage Equipment Calculator */}
              <div className="lg:col-span-7 bg-[#1A1917] border border-stone-800/80 rounded p-5 sm:p-6 space-y-5">
                <div>
                  <span className="text-[11px] uppercase tracking-widest text-[#C5A059] font-display">
                    Tool 04 — Orchestra Pult, Stand &amp; Part Score Calculator
                  </span>
                  <h2 className="text-xl font-serif font-semibold text-stone-100">
                    オーケストラ編成・プルト＆ステージ備品計算機
                  </h2>
                  <p className="text-xs text-stone-400 mt-1">
                    弦5部と管打楽器の人数を入力すると、1プルト（2人1組）あたりの譜面台数・パート譜印刷部数（プルト数＋首席予備＋ライブラリアン控え）・ステージ椅子脚数を自動算出します。
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: '1st Violin 人数', val: vn1Players, set: setVn1Players },
                    { label: '2nd Violin 人数', val: vn2Players, set: setVn2Players },
                    { label: 'Viola 人数', val: vaPlayers, set: setVaPlayers },
                    { label: 'Violoncello 人数', val: vcPlayers, set: setVcPlayers },
                    { label: 'Contrabass 人数', val: cbPlayers, set: setCbPlayers },
                    { label: '管・打・ハープ人数', val: windPercPlayers, set: setWindPercPlayers },
                  ].map((item) => (
                    <label
                      key={item.label}
                      className="bg-[#121211] border border-stone-800 rounded p-3 block"
                    >
                      <span className="text-xs text-stone-400 block mb-1">{item.label}</span>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={item.val}
                        onChange={(e) => item.set(Math.max(0, parseInt(e.target.value || '0', 10)))}
                        className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-base font-mono font-semibold text-stone-100 tabular-nums"
                      />
                    </label>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-stone-800 text-stone-400">
                        <th className="py-2 pr-3">パート</th>
                        <th className="py-2 px-3 tabular-nums">奏者数</th>
                        <th className="py-2 px-3 tabular-nums">プルト数 (Pult)</th>
                        <th className="py-2 px-3 tabular-nums text-[#C5A059]">必要パート譜部数</th>
                        <th className="py-2 pl-3 tabular-nums">必要譜面台数</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/70 font-mono tabular-nums">
                      {librarianStats.breakdown.map((row) => (
                        <tr key={row.name}>
                          <td className="py-2.5 pr-3 font-serif text-stone-200">{row.name}</td>
                          <td className="py-2.5 px-3">{row.players} 名</td>
                          <td className="py-2.5 px-3">{row.pults} Pult</td>
                          <td className="py-2.5 px-3 font-semibold text-[#C5A059]">
                            {row.partsNeeded} 部
                          </td>
                          <td className="py-2.5 pl-3">{row.standsNeeded} 本</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-stone-800">
                  <div className="bg-[#121211] border border-stone-800 rounded p-3">
                    <div className="text-[11px] text-stone-400">弦パート譜 総印刷部数</div>
                    <div
                      data-testid="librarian-total-parts"
                      className="text-xl font-mono font-bold text-[#C5A059] tabular-nums mt-0.5"
                    >
                      {librarianStats.totalStringParts} 部
                    </div>
                  </div>
                  <div className="bg-[#121211] border border-stone-800 rounded p-3">
                    <div className="text-[11px] text-stone-400">ステージ譜面台 総数</div>
                    <div className="text-xl font-mono font-bold text-stone-100 tabular-nums mt-0.5">
                      {librarianStats.totalStands} 本
                    </div>
                  </div>
                  <div className="bg-[#121211] border border-stone-800 rounded p-3">
                    <div className="text-[11px] text-stone-400">ステージ椅子 総数</div>
                    <div className="text-xl font-mono font-bold text-stone-100 tabular-nums mt-0.5">
                      {librarianStats.totalChairs} 脚
                    </div>
                  </div>
                </div>
              </div>

              {/* Part Booklet Saddle-Stitch Calculator */}
              <div className="lg:col-span-5 bg-[#1A1917] border border-stone-800/80 rounded p-5 sm:p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#C5A059]" strokeWidth={1.5} />
                  <h3 className="text-lg font-serif font-semibold text-stone-100">
                    パート譜・A3二つ折り（中綴じ）製本計算機
                  </h3>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  PDFパート譜の総ページ数を入力すると、A3両面印刷・二つ折り（小冊子製本）に必要なA3用紙枚数と、4の倍数に揃えるための空白ページ数、めくり（ページターン）発生回数を算出します。
                </p>

                <label className="block bg-[#121211] border border-stone-800 rounded p-4">
                  <span className="text-xs text-stone-400 block mb-1.5">
                    パート譜PDFの総ページ数（表紙除く本文ページ数）
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={pdfPageCount}
                    onChange={(e) => setPdfPageCount(Math.max(1, parseInt(e.target.value || '1', 10)))}
                    data-testid="librarian-pdf-pages-input"
                    className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-lg font-mono font-bold text-[#C5A059] tabular-nums"
                  />
                </label>

                <div className="space-y-2.5 bg-[#121211] border border-stone-800 rounded p-4 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-stone-800">
                    <span className="text-stone-400">小冊子（4の倍数）換算ページ数</span>
                    <span className="font-mono font-semibold text-stone-100 tabular-nums">
                      {librarianStats.paddedMultipleOf4} ページ
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-stone-800">
                    <span className="text-stone-400">1部あたりの必要A3用紙枚数（両面）</span>
                    <span
                      data-testid="librarian-a3-sheets"
                      className="font-mono text-base font-bold text-[#C5A059] tabular-nums"
                    >
                      A3 × {librarianStats.a3SheetsPerCopy} 枚
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-stone-800">
                    <span className="text-stone-400">調整用空白ページ数（表紙裏・巻末等）</span>
                    <span className="font-mono font-semibold text-stone-200 tabular-nums">
                      残り {librarianStats.blankPagesToInsert} ページ分
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-stone-400">演奏中の譜めくり発生回数目安</span>
                    <span className="font-mono font-semibold text-stone-200 tabular-nums">
                      約 {librarianStats.pageTurnsCount} 回
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded bg-stone-900/60 border border-stone-800 text-xs text-stone-300 leading-relaxed">
                  <strong className="text-[#C5A059]">ライブラリアンの鉄則:</strong>{' '}
                  1ページ目を「左ページ（見開き左側）」から開始させると、最初の譜めくりまでの時間を2ページ分稼ぐことができます。空白ページが{' '}
                  <span className="font-mono">{librarianStats.blankPagesToInsert}</span>{' '}
                  ページある場合は、休符の少ない難所の前に白紙またはコピー貼り付けを挿入してめくり位置を調整してください。
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            TAB 5: CONCERT PRODUCER WORKFLOW CHECKLIST
        ===================================================================== */}
        {activeTab === 'producer' && (
          <section data-testid="tool-panel-producer" className="space-y-6">
            <div className="bg-[#1A1917] border border-stone-800/80 rounded p-5 sm:p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
                <div>
                  <span className="text-[11px] uppercase tracking-widest text-[#C5A059] font-display">
                    Tool 05 — Self-Produced Recital &amp; Concert Workflow
                  </span>
                  <h2 className="text-xl font-serif font-semibold text-stone-100">
                    演奏会プロデューサー・チェックリスト
                  </h2>
                  <p className="text-xs text-stone-400 mt-1">
                    自主企画・門下生発表会・卒演の条件スイッチを切り替えると、必要なタスクだけがタイムライン順に自動抽出されます（ブラウザに自動保存）。
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[11px] text-stone-400">達成率</div>
                    <div
                      data-testid="producer-progress-pct"
                      className="text-xl font-mono font-bold text-[#C5A059] tabular-nums"
                    >
                      {producerProgress}%
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCompletedTaskIds([]);
                      localStorage.removeItem('prelude_producer_completed_v2');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-stone-800 text-xs text-stone-400 hover:text-stone-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>チェックをリセット</span>
                  </button>
                </div>
              </div>

              {/* Condition Switches */}
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
                  <span>公演条件スイッチ（OFFにすると該当タスクが非表示になります）</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRODUCER_CONDITIONS.map((cond) => {
                    const enabled = enabledConditions.includes(cond.id);
                    return (
                      <button
                        key={cond.id}
                        type="button"
                        onClick={() => toggleProducerCondition(cond.id)}
                        data-testid={`producer-cond-${cond.id}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors ${
                          enabled
                            ? 'border-[#C5A059] bg-[#C5A059]/20 text-stone-100 font-medium'
                            : 'border-stone-800 bg-[#121211] text-stone-500 line-through'
                        }`}
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
                        <span>{cond.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tasks Grouped by Phase */}
              <div className="space-y-5">
                {Array.from(new Set(visibleProducerTasks.map((t) => t.phase))).map((phaseName) => {
                  const phaseTasks = visibleProducerTasks.filter((t) => t.phase === phaseName);
                  return (
                    <div
                      key={phaseName}
                      className="bg-[#121211] border border-stone-800/90 rounded p-4 space-y-2.5"
                    >
                      <h3 className="text-sm font-serif font-semibold text-[#C5A059] border-b border-stone-800 pb-2">
                        {phaseName}
                      </h3>
                      <div className="space-y-2">
                        {phaseTasks.map((task) => {
                          const checked = completedTaskIds.includes(task.id);
                          return (
                            <label
                              key={task.id}
                              className={`flex items-start gap-3 p-2.5 rounded border cursor-pointer transition-colors ${
                                checked
                                  ? 'border-stone-800/50 bg-stone-950/40 text-stone-500'
                                  : 'border-stone-800 bg-[#1A1917] text-stone-200 hover:border-stone-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleProducerTask(task.id)}
                                className="mt-1 accent-[#C5A059]"
                              />
                              <div>
                                <div
                                  className={`text-xs sm:text-sm font-medium ${
                                    checked ? 'line-through text-stone-500' : 'text-stone-100'
                                  }`}
                                >
                                  {task.title}
                                </div>
                                <div className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                                  {task.detail}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
