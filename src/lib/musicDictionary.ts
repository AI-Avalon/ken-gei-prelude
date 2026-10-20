import rawDictionary from '../data/musicDictionary.json';
import type { MusicalTerm, TermCategory, TermLanguage } from '../types';

export const MUSIC_DICTIONARY: MusicalTerm[] = rawDictionary as MusicalTerm[];

export const TERM_CATEGORIES: { id: TermCategory | 'all'; label: string; sub: string }[] = [
  { id: 'all', label: 'すべて', sub: 'All Terms' },
  { id: 'tempo', label: '速度標語', sub: 'Tempo' },
  { id: 'tempo_change', label: '速度変化', sub: 'Agogics' },
  { id: 'dynamics', label: '強弱・強調', sub: 'Dynamics' },
  { id: 'expression', label: '発想・表情', sub: 'Expression' },
  { id: 'technique', label: '奏法・略語', sub: 'Technique & Abbr.' },
  { id: 'german_dir', label: 'ドイツ語指示', sub: 'Deutsch' },
  { id: 'french_dir', label: 'フランス語指示', sub: 'Français' },
  { id: 'theory_form', label: '楽式・和声・理論', sub: 'Theory & Form' },
];

export const TERM_SCENE_TAGS: { id: string; label: string; description: string }[] = [
  { id: 'all', label: '全パート・全般', description: 'すべての楽器・編成' },
  { id: 'strings', label: '弦楽器奏法・弓使い', description: 'Vn / Va / Vc / Cb 頻出' },
  { id: 'mahler_german', label: 'マーラー・独語頻出', description: 'ベートーヴェン・ブラームス・マーラー' },
  { id: 'debussy_french', label: 'ドビュッシー・仏語頻出', description: 'ラヴェル・フォーレ・印象派' },
  { id: 'ensemble', label: 'アンサンブル必須略語', description: 'オケ・室内楽・進行記号' },
  { id: 'wind_brass', label: '管楽器・吹奏楽', description: '木管・金管セクション' },
  { id: 'keyboard', label: 'ピアノ・鍵盤', description: 'ペダル・タッチ・装飾音' },
];

export const TERM_LANG_LABELS: Record<TermLanguage, { label: string; badgeClass: string }> = {
  It: { label: '伊語 (It.)', badgeClass: 'border-amber-500/30 text-amber-300 bg-amber-950/30' },
  De: { label: '独語 (De.)', badgeClass: 'border-sky-500/30 text-sky-300 bg-sky-950/30' },
  Fr: { label: '仏語 (Fr.)', badgeClass: 'border-rose-500/30 text-rose-300 bg-rose-950/30' },
  En: { label: '英語 (En.)', badgeClass: 'border-emerald-500/30 text-emerald-300 bg-emerald-950/30' },
  Lat: { label: '羅語 (Lat.)', badgeClass: 'border-purple-400/30 text-purple-300 bg-purple-950/30' },
  Gr: { label: '希語 (Gr.)', badgeClass: 'border-stone-400/30 text-stone-300 bg-stone-900/50' },
};

export const KANA_ROWS: { id: string; label: string; prefixes: string[] }[] = [
  { id: 'all', label: '全行', prefixes: [] },
  { id: 'a', label: 'あ行', prefixes: ['あ', 'い', 'う', 'え', 'お', 'ア', 'イ', 'ウ', 'エ', 'オ', 'ヴ'] },
  { id: 'ka', label: 'か行', prefixes: ['か', 'き', 'く', 'け', 'こ', 'が', 'ぎ', 'ぐ', 'げ', 'ご', 'カ', 'キ', 'ク', 'ケ', 'コ', 'ガ', 'ギ', 'グ', 'ゲ', 'ゴ'] },
  { id: 'sa', label: 'さ行', prefixes: ['さ', 'し', 'す', 'せ', 'そ', 'ざ', 'じ', 'ず', 'ぜ', 'ぞ', 'サ', 'シ', 'ス', 'セ', 'ソ', 'ザ', 'ジ', 'ズ', 'ゼ', 'ゾ'] },
  { id: 'ta', label: 'た行', prefixes: ['た', 'ち', 'つ', 'て', 'と', 'だ', 'ぢ', 'づ', 'で', 'ど', 'タ', 'チ', 'ツ', 'テ', 'ト', 'ダ', 'ヂ', 'ヅ', 'デ', 'ド'] },
  { id: 'na', label: 'な行', prefixes: ['な', 'に', 'ぬ', 'ね', 'の', 'ナ', 'ニ', 'ヌ', 'ネ', 'ノ'] },
  { id: 'ha', label: 'は行', prefixes: ['は', 'ひ', 'ふ', 'へ', 'ほ', 'ば', 'び', 'ぶ', 'べ', 'ぼ', 'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ', 'ハ', 'ヒ', 'フ', 'ヘ', 'ホ', 'バ', 'ビ', 'ブ', 'ベ', 'ボ', 'パ', 'ピ', 'プ', 'ペ', 'ポ'] },
  { id: 'ma', label: 'ま行', prefixes: ['ま', 'み', 'む', 'め', 'も', 'マ', 'ミ', 'ム', 'メ', 'モ'] },
  { id: 'ya', label: 'や行', prefixes: ['や', 'ゆ', 'よ', 'ヤ', 'ユ', 'ヨ'] },
  { id: 'ra', label: 'ら行', prefixes: ['ら', 'り', 'る', 'れ', 'ろ', 'ラ', 'リ', 'ル', 'レ', 'ロ'] },
  { id: 'wa', label: 'わ行', prefixes: ['わ', 'を', 'ん', 'ワ', 'ヲ', 'ン'] },
];

export interface ConfusingTermComparison {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  items: {
    slug: string;
    term: string;
    keyPoint: string;
    agogicOrTechnique: string;
  }[];
}

export const CONFUSING_TERM_COMPARISONS: ConfusingTermComparison[] = [
  {
    id: 'rit-rall-riten',
    title: 'ritardando / rallentando / ritenuto の違い',
    subtitle: '減速の3大用語 — ブレーキの踏み方と張力の保ち方',
    summary: 'どれも「遅くする」と訳されますが、エネルギーの方向性と減速のカーブが明確に異なります。',
    items: [
      {
        slug: 'ritardando',
        term: 'ritardando (rit.)',
        keyPoint: '意図的に歩みを引き延ばす（遅らせる）',
        agogicOrTechnique: '音楽の緊張感と声部の密度を保ったまま、計画的に一歩ずつテンポを引き延ばす。',
      },
      {
        slug: 'rallentando',
        term: 'rallentando (rall.)',
        keyPoint: '車輪の回転が自然に落ちていくように緩める',
        agogicOrTechnique: 'フレーズの終わりに向けて、張り詰めていた推進力を自然に解きほぐしながら減速する（仏: Cédez に近い）。',
      },
      {
        slug: 'ritenuto',
        term: 'ritenuto (riten.)',
        keyPoint: '手綱をグッと引いて「その瞬間から」すぐ抑える',
        agogicOrTechnique: 'だんだん遅くするのではなく、書かれた箇所で即座に一段遅いテンポへブレーキをかける（独: Zurückhaltend）。',
      },
    ],
  },
  {
    id: 'spiccato-sautille',
    title: 'spiccato / sautillé / staccato の違い',
    subtitle: '弦楽器の短音・跳弓奏法 — 右手のメカニズムと速度域',
    summary: 'パート譜のドット（・）をどう弾き分けるかは、テンポと弓の重心位置によって決まります。',
    items: [
      {
        slug: 'spiccato',
        term: 'Spiccato',
        keyPoint: '奏者が1音ずつ能動的に弓を飛ばして跳ねさせる',
        agogicOrTechnique: '中庸〜やや速いテンポ。弓のバランスポイントより少し元寄りで、手首と指の柔軟なコントロールにより弧を描く。',
      },
      {
        slug: 'sautille',
        term: 'Sautillé',
        keyPoint: '高速テンポで弓のスティックの弾性により自然に跳ねる',
        agogicOrTechnique: '急速な16分音符。弓の中央付近で細かくデタシェを弾くことで、竿のバネが勝手に弦から毛をバウンドさせる。',
      },
      {
        slug: 'staccato',
        term: 'Staccato (On-string)',
        keyPoint: '弓を弦から離さず（または着地した状態から）短く切る',
        agogicOrTechnique: '毛を弦に噛みつかせて発音し、音を短く切り離す。鋭い噛みつきを伴えば Martelé となる。',
      },
    ],
  },
  {
    id: 'calando-morendo-smorzando',
    title: 'calando / morendo / smorzando / perdendosi の違い',
    subtitle: '消え入る終結表現 — 音量・テンポ・残響のコントロール',
    summary: '曲や楽章の最後で音が消えていく際、テンポも遅くするのか、灯火が消えるように切るのかを見極めます。',
    items: [
      {
        slug: 'calando',
        term: 'Calando',
        keyPoint: '潮が引くように「音量低下 ＋ 減速」がセット',
        agogicOrTechnique: 'ディミヌエンドとリタルダンドを同時に行い、エネルギーの水位が静かに下がっていく。',
      },
      {
        slug: 'morendo',
        term: 'Morendo',
        keyPoint: '絶命するように、息が途絶える極限のppへ',
        agogicOrTechnique: '死にゆく（morire）が語源。最後の1音がホールの残響に溶けて無になるまで集中力を保つ（独: Verklingend）。',
      },
      {
        slug: 'smorzando',
        term: 'Smorzando (smorz.)',
        keyPoint: 'ロウソクの火を吹き消すように、急速に力を抜く',
        agogicOrTechnique: 'Morendoより短いスパンでも使われ、フレーズ末の光や熱量をフッと消し去る（ショパン等で頻出）。',
      },
    ],
  },
  {
    id: 'accel-string-drangend',
    title: 'accelerando / stringendo / stretto / drängend の違い',
    subtitle: '加速と切迫のアゴーギク — 客観的な加速か情念の爆発か',
    summary: 'テンポを上げる指示でも、軽やかに加速するのか、密度を凝縮して詰め寄るのかで音色が全く変わります。',
    items: [
      {
        slug: 'accelerando',
        term: 'Accelerando (accel.)',
        keyPoint: '純粋な速度の上昇（だんだん速く）',
        agogicOrTechnique: '必ずしもクレッシェンドや重さを伴わず、軽やかにスピードだけを上げていく場合にも使われる。',
      },
      {
        slug: 'stringendo',
        term: 'Stringendo (string.)',
        keyPoint: '間をギュッと締め上げて緊張感と音量を高めながら加速',
        agogicOrTechnique: 'クライマックスへ向けて拍の密度を凝縮し、熱いクレッシェンドを伴って畳みかける（仏: En serrant）。',
      },
      {
        slug: 'drangend',
        term: 'Drängend',
        keyPoint: '内面的な焦燥感で前へ前へと急き立てる（独語）',
        agogicOrTechnique: 'マーラーやワーグナーで頻出。拍の頭を食い気味に押し進め、切迫した情念を表現する。',
      },
    ],
  },
];

export function katakanaToHiragana(str: string): string {
  return String(str || '').replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

export function normalizeSearchQuery(q: string): string {
  const lower = String(q || '').trim().toLowerCase();
  if (!lower) return '';
  return lower
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export interface DictionaryFilterOptions {
  category?: TermCategory | 'all';
  letter?: string | 'all';
  kanaRow?: string | 'all';
  sceneTag?: string | 'all';
  onlyBookmarked?: boolean;
  bookmarkedIds?: string[];
}

export function searchMusicalTerms(
  query: string,
  options: DictionaryFilterOptions = {},
  terms: MusicalTerm[] = MUSIC_DICTIONARY
): MusicalTerm[] {
  const {
    category = 'all',
    letter = 'all',
    kanaRow = 'all',
    sceneTag = 'all',
    onlyBookmarked = false,
    bookmarkedIds = [],
  } = options;

  const rawTrimmed = String(query || '').trim();
  const lowerRaw = rawTrimmed.toLowerCase();
  const normQuery = normalizeSearchQuery(rawTrimmed);
  const noDotQuery = normQuery.replace(/\./g, '');
  const hiraQuery = katakanaToHiragana(rawTrimmed);

  // Also create NFD-stripped single-letter umlaut variant (e.g. maessig -> massig or vice versa)
  const deCollapsedQuery = normQuery
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u');

  const filtered = terms.filter((item) => {
    if (onlyBookmarked && !bookmarkedIds.includes(item.id)) {
      return false;
    }
    if (category !== 'all' && item.category !== category) {
      return false;
    }
    if (sceneTag !== 'all' && !(item.scene_tags || []).includes(sceneTag)) {
      return false;
    }
    if (letter !== 'all') {
      const firstAscii = item.normalized_term.trim().charAt(0).toUpperCase();
      if (firstAscii !== letter.toUpperCase()) return false;
    }
    if (kanaRow !== 'all') {
      const rowDef = KANA_ROWS.find((r) => r.id === kanaRow);
      if (rowDef && rowDef.prefixes.length > 0) {
        const firstKana = item.reading_kana.trim().charAt(0);
        const firstHira = item.reading_hiragana.trim().charAt(0);
        if (!rowDef.prefixes.includes(firstKana) && !rowDef.prefixes.includes(firstHira)) {
          return false;
        }
      }
    }

    if (!rawTrimmed) return true;

    // Check exact or partial matches across all fields
    const itemNorm = item.normalized_term.toLowerCase();
    const itemTermLower = item.term.toLowerCase();
    const itemAbbrLower = (item.abbreviations || []).map((a) => a.toLowerCase());
    const itemAbbrNoDot = itemAbbrLower.map((a) => a.replace(/\./g, ''));

    if (
      itemTermLower.includes(lowerRaw) ||
      itemNorm.includes(normQuery) ||
      itemNorm.includes(deCollapsedQuery) ||
      (noDotQuery && itemNorm.includes(noDotQuery)) ||
      itemAbbrLower.some((a) => a === lowerRaw || a.includes(lowerRaw)) ||
      (noDotQuery && itemAbbrNoDot.some((a) => a === noDotQuery || a.includes(noDotQuery))) ||
      item.reading_kana.includes(rawTrimmed) ||
      item.reading_hiragana.includes(hiraQuery) ||
      item.short_meaning.toLowerCase().includes(lowerRaw) ||
      item.definition.toLowerCase().includes(lowerRaw) ||
      item.performer_nuance.toLowerCase().includes(lowerRaw)
    ) {
      return true;
    }

    return false;
  });

  if (!rawTrimmed) {
    return filtered;
  }

  // Rank results so exact / prefix / abbreviation matches appear first
  return filtered.sort((a, b) => {
    const score = (item: MusicalTerm): number => {
      let s = 0;
      const tLow = item.term.toLowerCase();
      const abbrLow = (item.abbreviations || []).map((x) => x.toLowerCase());
      const abbrNoDot = abbrLow.map((x) => x.replace(/\./g, ''));
      if (tLow === lowerRaw || item.id === normQuery) s += 100;
      if (abbrLow.includes(lowerRaw) || (noDotQuery && abbrNoDot.includes(noDotQuery))) s += 95;
      if (tLow.startsWith(lowerRaw) || item.normalized_term.startsWith(normQuery)) s += 60;
      if (item.reading_kana === rawTrimmed || item.reading_hiragana === hiraQuery) s += 85;
      if (item.reading_kana.startsWith(rawTrimmed) || item.reading_hiragana.startsWith(hiraQuery)) s += 50;
      if (item.short_meaning.includes(rawTrimmed)) s += 30;
      return s;
    };
    return score(b) - score(a);
  });
}

export function getTermBySlug(slug: string): MusicalTerm | undefined {
  const clean = String(slug || '').trim().toLowerCase();
  return MUSIC_DICTIONARY.find((t) => t.id.toLowerCase() === clean);
}
