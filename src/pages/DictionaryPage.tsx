import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Bookmark,
  Volume2,
  Square,
  Share2,
  Check,
  X,
  ArrowRight,
  SlidersHorizontal,
  BookOpen,
  Compass,
} from '../components/EditorialIcons';
import {
  MUSIC_DICTIONARY,
  TERM_CATEGORIES,
  TERM_SCENE_TAGS,
  TERM_LANG_LABELS,
  KANA_ROWS,
  CONFUSING_TERM_COMPARISONS,
  searchMusicalTerms,
  getTermBySlug,
} from '../lib/musicDictionary';
import type { MusicalTerm, TermCategory } from '../types';

const BOOKMARK_STORAGE_KEY = 'prelude_dict_bookmarks_v2';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const QUICK_SEARCH_EXAMPLES = [
  { label: 'Drängend', query: 'drangend' },
  { label: 'Mäßig (maessig)', query: 'maessig' },
  { label: 'Cédez (cedez)', query: 'cedez' },
  { label: 'G.P.', query: 'G.P.' },
  { label: 'l.v.', query: 'l.v.' },
  { label: 'Sul ponticello', query: 'sul ponticello' },
  { label: '駒の近く', query: '駒の近く' },
  { label: '急き立てる', query: '急き立てる' },
  { label: '弱音器', query: '弱音器' },
];

export default function DictionaryPage() {
  const { slug: routeSlug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialQ = searchParams.get('q') || '';
  const initialCat = (searchParams.get('category') as TermCategory | 'all') || 'all';
  const initialScene = searchParams.get('scene') || 'all';
  const queryTermSlug = searchParams.get('term') || '';

  const [query, setQuery] = useState(initialQ);
  const [category, setCategory] = useState<TermCategory | 'all'>(initialCat);
  const [sceneTag, setSceneTag] = useState<string>(initialScene);
  const [letter, setLetter] = useState<string>('all');
  const [kanaRow, setKanaRow] = useState<string>('all');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [showComparisons, setShowComparisons] = useState(true);

  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(BOOKMARK_STORAGE_KEY);
      return saved ? JSON.parse(saved) : ['drangend', 'sul-ponticello', 'cedez', 'generalpause'];
    } catch {
      return ['drangend', 'sul-ponticello', 'cedez', 'generalpause'];
    }
  });

  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Active term for modal (from /dictionary/:slug or ?term=slug)
  const activeSlug = routeSlug || queryTermSlug || null;
  const activeTerm = useMemo(
    () => (activeSlug ? getTermBySlug(activeSlug) || null : null),
    [activeSlug]
  );

  // Native <dialog> ref with light-dismiss support
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeTerm) {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          dialog.setAttribute('open', '');
        }
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [activeTerm]);

  const closeTermDetail = useCallback(() => {
    if (routeSlug) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('term');
      const qs = nextParams.toString();
      navigate(`/dictionary${qs ? `?${qs}` : ''}`, { replace: false });
    } else if (queryTermSlug) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('term');
      setSearchParams(nextParams, { replace: false });
    }
  }, [routeSlug, queryTermSlug, searchParams, navigate, setSearchParams]);

  const openTermDetail = useCallback(
    (termSlug: string) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('term', termSlug);
      setSearchParams(nextParams, { replace: false });
    },
    [searchParams, setSearchParams]
  );

  // Web Audio API Tempo Pulse Audition (Lookahead Scheduler)
  const [playingTermId, setPlayingTermId] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerIdRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const beatCountRef = useRef<number>(0);

  const stopPulse = useCallback(() => {
    if (timerIdRef.current !== null) {
      window.clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    setPlayingTermId(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timerIdRef.current !== null) {
        window.clearInterval(timerIdRef.current);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const toggleTempoPulse = useCallback(
    async (term: MusicalTerm, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (!term.bpm_range) return;

      if (playingTermId === term.id) {
        stopPulse();
        return;
      }

      stopPulse();

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      // iOS / Android silent buffer unlock
      const silentBuf = ctx.createBuffer(1, 1, 22050);
      const silentSrc = ctx.createBufferSource();
      silentSrc.buffer = silentBuf;
      silentSrc.connect(ctx.destination);
      silentSrc.start(0);

      const targetBpm = Math.round((term.bpm_range[0] + term.bpm_range[1]) / 2);
      const secondsPerBeat = 60.0 / targetBpm;

      nextNoteTimeRef.current = ctx.currentTime + 0.04;
      beatCountRef.current = 0;
      setPlayingTermId(term.id);

      const schedulePulse = (time: number, isDownbeat: boolean) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isDownbeat ? 987.77 : 659.25, time);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(isDownbeat ? 0.28 : 0.16, time + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.065);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.07);
      };

      timerIdRef.current = window.setInterval(() => {
        if (!audioCtxRef.current) return;
        while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
          schedulePulse(nextNoteTimeRef.current, beatCountRef.current % 4 === 0);
          nextNoteTimeRef.current += secondsPerBeat;
          beatCountRef.current += 1;
          // Auto stop after 16 beats so it never runs forever
          if (beatCountRef.current > 16) {
            stopPulse();
            return;
          }
        }
      }, 25);
    },
    [playingTermId, stopPulse]
  );

  const toggleBookmark = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarks((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  }, []);

  const handleShareTerm = useCallback(async (term: MusicalTerm, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const shareUrl = `${window.location.origin}/dictionary/${term.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedSlug(term.id);
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch {
      // fallback
    }
  }, []);

  const filteredTerms = useMemo(
    () =>
      searchMusicalTerms(query, {
        category,
        letter,
        kanaRow,
        sceneTag,
        onlyBookmarked,
        bookmarkedIds: bookmarks,
      }),
    [query, category, letter, kanaRow, sceneTag, onlyBookmarked, bookmarks]
  );

  const resetFilters = () => {
    setQuery('');
    setCategory('all');
    setSceneTag('all');
    setLetter('all');
    setKanaRow('all');
    setOnlyBookmarked(false);
  };

  const hasActiveFilters =
    query.trim() !== '' ||
    category !== 'all' ||
    sceneTag !== 'all' ||
    letter !== 'all' ||
    kanaRow !== 'all' ||
    onlyBookmarked;

  return (
    <div className="min-h-screen bg-[#121211] text-stone-200 pb-24">
      {/* Editorial Header Banner */}
      <header className="border-b border-stone-800/80 bg-[#161514] pt-10 pb-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 text-xs tracking-[0.22em] uppercase text-[#C5A059] font-display">
              <span>§ Urtext Lexicon for Performers</span>
              <span className="text-stone-600">—</span>
              <span className="tabular-nums">{MUSIC_DICTIONARY.length} Entries</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOnlyBookmarked((v) => !v)}
                data-testid="dict-bookmark-filter-btn"
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-medium border transition-colors ${
                  onlyBookmarked
                    ? 'bg-[#C5A059]/20 border-[#C5A059] text-[#C5A059]'
                    : 'bg-stone-900/70 border-stone-800 text-stone-300 hover:border-stone-700'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>マイ単語帳</span>
                <span className="tabular-nums px-1.5 py-0.5 rounded bg-stone-950/70 text-[11px]">
                  {bookmarks.length}
                </span>
              </button>
              <Link
                to="/tools?tool=metronome"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium bg-stone-900/70 border border-stone-800 text-stone-300 hover:border-[#C5A059]/50 hover:text-[#C5A059] transition-colors"
              >
                <span>高精度メトロノーム・純正律ドローンへ</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </Link>
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-serif font-semibold text-stone-100 tracking-tight leading-snug">
            演奏者のための音楽楽語辞典
            <span className="block sm:inline sm:ml-4 text-base sm:text-xl font-display italic font-normal text-[#C5A059]">
              Dizionario &amp; Aufführungspraxis
            </span>
          </h1>
          <p className="mt-2.5 text-sm text-stone-400 max-w-3xl leading-relaxed">
            単なる直訳ではなく、実際のボウイング・息の支え・拍節感・アンサンブルでのアプローチまで解説した実戦型データベース。
            ウムラウトやアクサン無しのスペル（<code className="text-[#C5A059] font-mono">maessig</code> / <code className="text-[#C5A059] font-mono">cedez</code>）、略記（<code className="text-[#C5A059] font-mono">G.P.</code> / <code className="text-[#C5A059] font-mono">l.v.</code>）、カタカナ、日本語ニュアンス（「急き立てる」「駒の近く」等）から0msで即座に逆引きできます。
          </p>

          {/* 0ms Incremental Multi-Search Bar */}
          <div className="mt-6 relative">
            <Search
              className="w-5 h-5 text-[#C5A059] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              strokeWidth={1.5}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="dictionary-search-input"
              placeholder="楽語スペル（ウムラウト無し可: maessig, drangend, cedez）、略語（G.P., rit., l.v.）、読み、意味（駒の近く、急き立てる、弱音器）で検索..."
              className="w-full pl-12 pr-24 py-3.5 bg-[#1A1917] border border-stone-700/80 rounded text-sm sm:text-base text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-[#C5A059] transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs text-stone-400 hover:text-stone-200 bg-stone-800/80 rounded"
              >
                クリア
              </button>
            )}
          </div>

          {/* Quick Search Discovery Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-stone-500 mr-1">検索例:</span>
            {QUICK_SEARCH_EXAMPLES.map((ex) => (
              <button
                key={ex.query}
                type="button"
                onClick={() => setQuery(ex.query)}
                className={`px-2.5 py-1 rounded border transition-colors ${
                  query.toLowerCase() === ex.query.toLowerCase()
                    ? 'border-[#C5A059] bg-[#C5A059]/15 text-[#C5A059]'
                    : 'border-stone-800 bg-stone-900/60 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                }`}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Axis 1: Category Tabs */}
        <section aria-label="カテゴリ別ブラウズ" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-[0.18em] text-stone-400 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
              <span>1. 役割・カテゴリ別索引</span>
            </h2>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-[#C5A059] hover:underline"
              >
                すべてのフィルタを解除
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-1.5">
            {TERM_CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  data-testid={`dict-cat-${cat.id}`}
                  className={`px-3 py-2 rounded text-left border transition-colors ${
                    active
                      ? 'bg-[#C5A059]/15 border-[#C5A059] text-stone-100'
                      : 'bg-[#1A1917] border-stone-800/80 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <div className="text-xs font-medium">{cat.label}</div>
                  <div className="text-[10px] font-display italic text-stone-400">{cat.sub}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Axis 2: Scene / Instrument Quick Filter */}
        <section aria-label="楽器・シーン別クイックフィルタ" className="space-y-2">
          <h2 className="text-xs uppercase tracking-[0.18em] text-stone-400 flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
            <span>2. 楽器・レパートリー別クイックフィルタ</span>
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {TERM_SCENE_TAGS.map((tag) => {
              const active = sceneTag === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setSceneTag(tag.id)}
                  data-testid={`dict-scene-${tag.id}`}
                  className={`px-3 py-1.5 rounded text-xs border transition-colors ${
                    active
                      ? 'bg-[#4A6070]/30 border-[#C5A059] text-stone-100'
                      : 'bg-[#1A1917] border-stone-800/80 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <span className="font-medium">{tag.label}</span>
                  <span className="ml-1.5 text-[11px] text-stone-400 hidden sm:inline">
                    ({tag.description})
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Axis 3: A-Z & 五十音 Index */}
        <section
          aria-label="アルファベットおよび五十音インデックス"
          className="bg-[#1A1917] border border-stone-800/80 rounded p-3.5 space-y-3"
        >
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] text-stone-400 mr-2 font-display uppercase tracking-wider">
              A–Z:
            </span>
            <button
              type="button"
              onClick={() => setLetter('all')}
              className={`px-2 py-0.5 rounded text-xs font-mono ${
                letter === 'all'
                  ? 'bg-[#C5A059] text-stone-950 font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              ALL
            </button>
            {ALPHABET.map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setLetter(letter === ch ? 'all' : ch)}
                className={`w-6 h-6 rounded text-xs font-mono transition-colors ${
                  letter === ch
                    ? 'bg-[#C5A059] text-stone-950 font-semibold'
                    : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-stone-800/60">
            <span className="text-[11px] text-stone-400 mr-2">五十音:</span>
            {KANA_ROWS.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setKanaRow(kanaRow === row.id ? 'all' : row.id)}
                className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                  kanaRow === row.id
                    ? 'bg-[#C5A059] text-stone-950 font-semibold'
                    : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                }`}
              >
                {row.label}
              </button>
            ))}
          </div>
        </section>

        {/* Confusing Terms Comparison Cards (似た楽語の使い分け) */}
        <section className="border border-stone-800/80 bg-[#161514] rounded p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#C5A059] font-display">
                § Performer&apos;s Nuance Guide
              </span>
              <h2 className="text-base sm:text-lg font-serif font-semibold text-stone-100">
                現場で迷う「似た楽語の使い分け」比較ガイド
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowComparisons((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs border border-stone-800 text-stone-300 hover:border-stone-700"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>{showComparisons ? '折りたたむ' : '比較カードを表示'}</span>
            </button>
          </div>

          {showComparisons && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {CONFUSING_TERM_COMPARISONS.map((comp) => (
                <div
                  key={comp.id}
                  className="bg-[#1A1917] border border-stone-800/90 rounded p-4 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="font-serif font-semibold text-stone-100 text-sm sm:text-base">
                      {comp.title}
                    </h3>
                    <p className="text-xs text-[#C5A059] mt-0.5">{comp.subtitle}</p>
                    <p className="text-xs text-stone-400 mt-2 leading-relaxed">{comp.summary}</p>
                  </div>
                  <div className="mt-3 space-y-2 pt-3 border-t border-stone-800/70">
                    {comp.items.map((item) => (
                      <div
                        key={item.slug}
                        onClick={() => openTermDetail(item.slug)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') openTermDetail(item.slug);
                        }}
                        className="p-2.5 rounded bg-[#121211] border border-stone-800/70 hover:border-[#C5A059]/60 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display italic text-base text-[#C5A059] font-medium">
                            {item.term}
                          </span>
                          <span className="text-[11px] text-stone-300 font-medium">
                            {item.keyPoint}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                          {item.agogicOrTechnique}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Results Count & Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800/80 pb-3">
          <div className="text-sm text-stone-300">
            該当用語:{' '}
            <strong
              data-testid="dictionary-result-count"
              className="text-stone-100 font-semibold tabular-nums"
            >
              {filteredTerms.length}
            </strong>{' '}
            語
            {query && (
              <span className="ml-2 text-xs text-stone-400">
                （検索語: 「<span className="text-[#C5A059]">{query}</span>」）
              </span>
            )}
          </div>
          <div className="text-xs text-stone-400">
            カードを選択すると詳細な演奏アプローチ・関連語比較・URL共有が開きます
          </div>
        </div>

        {/* Terms Grid */}
        {filteredTerms.length === 0 ? (
          <div className="border border-stone-800/80 bg-[#1A1917] rounded p-10 text-center space-y-3">
            <p className="text-base font-serif text-stone-200">
              指定された条件に一致する楽語が見つかりませんでした。
            </p>
            <p className="text-xs text-stone-400">
              スペルの綴りやカテゴリフィルタを変更してお試しください。
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#C5A059] text-stone-950 text-xs font-semibold"
            >
              すべての楽語を表示する
            </button>
          </div>
        ) : (
          <div
            data-testid="dictionary-results-grid"
            className="grid grid-cols-1 md:grid-cols-2 gap-3.5"
          >
            {filteredTerms.map((term) => {
              const isBookmarked = bookmarks.includes(term.id);
              const isPlaying = playingTermId === term.id;
              const langMeta = TERM_LANG_LABELS[term.lang] || TERM_LANG_LABELS.It;

              return (
                <article
                  key={term.id}
                  data-testid="dictionary-term-card"
                  data-term-slug={term.id}
                  onClick={() => openTermDetail(term.id)}
                  className="group bg-[#1A1917] border border-stone-800/80 hover:border-[#C5A059]/60 rounded p-4 sm:p-5 transition-colors cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                          <h3 className="text-xl sm:text-2xl font-display italic font-semibold text-stone-100 group-hover:text-[#C5A059] transition-colors break-words">
                            {term.term}
                          </h3>
                          {term.abbreviations && term.abbreviations.length > 0 && (
                            <span className="text-xs font-mono text-[#C5A059] bg-[#C5A059]/10 border border-[#C5A059]/30 px-1.5 py-0.5 rounded">
                              略: {term.abbreviations.join(', ')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-400 mt-0.5">{term.reading_kana}</div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded border ${langMeta.badgeClass}`}
                        >
                          {langMeta.label}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => toggleBookmark(term.id, e)}
                          aria-label={`${term.term}を単語帳に保存`}
                          className={`p-1.5 rounded border transition-colors ${
                            isBookmarked
                              ? 'border-[#C5A059] text-[#C5A059] bg-[#C5A059]/15'
                              : 'border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          <Bookmark className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>

                    {/* Short Meaning */}
                    <p className="mt-3 text-sm font-serif font-medium text-stone-100 border-l-2 border-[#C5A059] pl-3 py-0.5">
                      {term.short_meaning}
                    </p>

                    {/* Performer Nuance Preview */}
                    <p className="mt-2.5 text-xs text-stone-300 leading-relaxed">
                      <span className="text-[#C5A059] font-medium">演奏アプローチ: </span>
                      {term.performer_nuance}
                    </p>
                  </div>

                  {/* Card Footer: Tempo Pulse Audition & Related Terms */}
                  <div className="mt-4 pt-3 border-t border-stone-800/70 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {term.bpm_range && (
                        <button
                          type="button"
                          onClick={(e) => toggleTempoPulse(term, e)}
                          data-testid={`tempo-pulse-btn-${term.id}`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border tabular-nums transition-colors ${
                            isPlaying
                              ? 'bg-[#8E2A2A] border-rose-400 text-white'
                              : 'bg-stone-900 border-stone-700 text-[#C5A059] hover:border-[#C5A059]'
                          }`}
                        >
                          {isPlaying ? (
                            <>
                              <Square className="w-3 h-3 fill-current" strokeWidth={1.5} />
                              <span>パルス停止 (♩={Math.round((term.bpm_range[0] + term.bpm_range[1]) / 2)})</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                              <span>
                                ♩={term.bpm_range[0]}–{term.bpm_range[1]} パルス試聴
                              </span>
                            </>
                          )}
                        </button>
                      )}

                      {term.related_terms && term.related_terms.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 text-[11px] text-stone-400">
                          <span>関連:</span>
                          {term.related_terms.slice(0, 3).map((relSlug) => (
                            <span
                              key={relSlug}
                              className="px-1.5 py-0.5 rounded bg-stone-900 text-stone-300 font-display italic"
                            >
                              {relSlug}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleShareTerm(term, e)}
                      className="inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-[#C5A059]"
                      title="この楽語の直リンクURLをコピー"
                    >
                      {copiedSlug === term.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} />
                          <span className="text-emerald-400">URLコピー済</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                          <span>共有</span>
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Term Detail Modal (<dialog closedby="any"> + click-outside fallback) */}
      <dialog
        ref={dialogRef}
        {...({ closedby: 'any' } as Record<string, string>)}
        onClose={closeTermDetail}
        onClick={(e) => {
          if (e.target === dialogRef.current) {
            dialogRef.current?.close();
          }
        }}
        data-testid="dictionary-detail-dialog"
        className="backdrop:bg-black/75 bg-transparent p-0 m-auto max-w-2xl w-[94vw] rounded border border-stone-700 text-stone-100 shadow-2xl"
      >
        {activeTerm && (
          <div className="bg-[#161514] p-5 sm:p-7 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs font-mono uppercase tracking-widest text-[#C5A059]">
                    § {TERM_LANG_LABELS[activeTerm.lang]?.label || activeTerm.lang}
                  </span>
                  {activeTerm.abbreviations && activeTerm.abbreviations.length > 0 && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#C5A059]/15 border border-[#C5A059]/40 text-[#C5A059]">
                      略記: {activeTerm.abbreviations.join(' / ')}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-display italic font-semibold text-stone-100">
                  {activeTerm.term}
                </h2>
                <p className="text-sm text-stone-400 mt-0.5">{activeTerm.reading_kana}</p>
              </div>

              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                data-testid="dictionary-dialog-close"
                aria-label="閉じる"
                className="p-2 rounded border border-stone-800 text-stone-400 hover:text-stone-100 hover:border-stone-600"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#1A1917] border-l-2 border-[#C5A059] p-3.5 rounded-r">
                <div className="text-[11px] uppercase tracking-wider text-[#C5A059] mb-1">
                  端的な意味・訳語
                </div>
                <div className="text-base font-serif font-medium text-stone-100">
                  {activeTerm.short_meaning}
                </div>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-1.5">
                  楽譜上の定義・語源
                </h3>
                <p className="text-sm text-stone-200 leading-relaxed">{activeTerm.definition}</p>
              </div>

              <div className="bg-[#1A1917] border border-stone-800 rounded p-4">
                <h3 className="text-xs uppercase tracking-wider text-[#C5A059] mb-1.5 font-medium">
                  実践演奏・アンサンブルでのアプローチ（Performer&apos;s Nuance）
                </h3>
                <p className="text-sm text-stone-200 leading-relaxed">
                  {activeTerm.performer_nuance}
                </p>
              </div>

              {activeTerm.bpm_range && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1A1917] border border-stone-800 rounded p-3.5">
                  <div>
                    <div className="text-xs text-stone-400">標準テンポ目安 (BPM)</div>
                    <div className="text-lg font-mono font-semibold text-[#C5A059] tabular-nums">
                      ♩ = {activeTerm.bpm_range[0]} – {activeTerm.bpm_range[1]} BPM
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => toggleTempoPulse(activeTerm, e)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-semibold bg-[#C5A059] text-stone-950 hover:bg-[#d4b06a] transition-colors tabular-nums"
                    >
                      {playingTermId === activeTerm.id ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>パルス停止</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" strokeWidth={1.5} />
                          <span>
                            ♩={Math.round((activeTerm.bpm_range[0] + activeTerm.bpm_range[1]) / 2)} を試聴
                          </span>
                        </>
                      )}
                    </button>
                    <Link
                      to={`/tools?tool=metronome&bpm=${Math.round(
                        (activeTerm.bpm_range[0] + activeTerm.bpm_range[1]) / 2
                      )}`}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded text-xs border border-stone-700 text-stone-200 hover:border-[#C5A059]"
                    >
                      <span>メトロノームで開く</span>
                      <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </Link>
                  </div>
                </div>
              )}

              {activeTerm.related_terms && activeTerm.related_terms.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-2">
                    類義語・対義語・比較すべき関連楽語
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {activeTerm.related_terms.map((relSlug) => {
                      const relObj = getTermBySlug(relSlug);
                      return (
                        <button
                          key={relSlug}
                          type="button"
                          onClick={() => openTermDetail(relSlug)}
                          className="px-3 py-1.5 rounded bg-[#1A1917] border border-stone-800 hover:border-[#C5A059] text-left transition-colors"
                        >
                          <div className="text-sm font-display italic text-[#C5A059]">
                            {relObj ? relObj.term : relSlug}
                          </div>
                          {relObj && (
                            <div className="text-[11px] text-stone-400">{relObj.short_meaning}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => toggleBookmark(activeTerm.id, e)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border ${
                    bookmarks.includes(activeTerm.id)
                      ? 'border-[#C5A059] bg-[#C5A059]/15 text-[#C5A059]'
                      : 'border-stone-700 text-stone-300 hover:border-stone-500'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>
                    {bookmarks.includes(activeTerm.id) ? 'マイ単語帳に保存済み' : 'マイ単語帳にピン留め'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleShareTerm(activeTerm, e)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-stone-700 text-stone-300 hover:border-[#C5A059]"
                >
                  {copiedSlug === activeTerm.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} />
                      <span className="text-emerald-400">共有URLをコピーしました</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>直リンクURLをコピー (/dictionary/{activeTerm.id})</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="px-4 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-xs text-stone-200"
              >
                閉じる (Esc)
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
