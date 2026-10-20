import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PART1_TERMS } from './dict-data/part1.mjs';
import { PART2_TERMS } from './dict-data/part2.mjs';
import { PART3_TERMS } from './dict-data/part3.mjs';
import { PART4_TERMS } from './dict-data/part4.mjs';
import { PART5_TERMS } from './dict-data/part5.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

/**
 * Convert Katakana to Hiragana
 */
function katakanaToHiragana(str) {
  return String(str || '').replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

/**
 * Build comprehensive search-normalized string supporting:
 * - German umlaut expansion (ä -> ae & a, ö -> oe & o, ü -> ue & u, ß -> ss)
 * - French / Italian diacritic stripping via NFD
 * - Abbreviations with and without periods
 */
function buildNormalizedTerm(term, abbreviations = [], id = '') {
  const rawSources = [term, id, ...(abbreviations || [])].filter(Boolean).join(' ');
  const lower = rawSources.toLowerCase();

  // German umlaut explicit expansion (ae, oe, ue, ss)
  const germanExpanded = lower
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');

  // NFD diacritic stripped (a, o, u, e, c, etc.)
  const nfdStripped = lower
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Abbreviation period-stripped forms
  const noDots = nfdStripped.replace(/\./g, '');
  const germanNoDots = germanExpanded.replace(/\./g, '');

  return Array.from(new Set([
    lower,
    germanExpanded,
    nfdStripped,
    noDots,
    germanNoDots,
  ])).join(' ');
}

// Additional core terms to guarantee 330+ entries across all categories
const EXTRA_TERMS = [
  {
    id: 'fifth-interval',
    term: 'Fifth / Quinte (五度・完全五度)',
    reading_kana: 'フィフス / クインテ（五度）',
    abbreviations: ['P5', '5th'],
    lang: 'En',
    category: 'theory_form',
    short_meaning: '周波数比 3:2 を持つ最も安定した協和音程。ヴァイオリン・ヴィオラ・チェロの開放弦の調弦音程',
    definition: '主音と属音を結ぶ西洋音楽の骨格となる音程。弦楽器（コントラバスを除く）は隣り合う弦がすべて完全5度で調弦される。',
    performer_nuance: '平均律の完全5度（700セント）は純正律の完全5度（約701.955セント、周波数比 3:2）より約2セント狭い。弦楽器の開放弦を純正5度で調弦すると、低い弦ほど平均律のピアノより少しずつ低くなるため、ピアノとの室内楽ではG線・C線をほんのわずか高めに妥協して調弦する知恵が使われる。',
    related_terms: ['tonic', 'dominant', 'picardy-third'],
    scene_tags: ['theory_form', 'strings', 'ensemble'],
  },
  {
    id: 'pianissimo-possibile',
    term: 'Pianissimo possibile',
    reading_kana: 'ピアニッシモ・ポッシビレ',
    abbreviations: ['ppp'],
    lang: 'It',
    category: 'dynamics',
    short_meaning: '可能な限り最も弱く',
    definition: '楽器が発音できる限界の極小音量を示す指示。チャイコフスキー《悲愴》第1楽章のファゴット（pppppp）など極限表現で使われる。',
    performer_nuance: '音が裏返ったり途切れたりしないよう、息のスピードや弓の毛の密着度を極限まで精密にコントロールする。',
    related_terms: ['pianissimo', 'presque-rien', 'estinto'],
    scene_tags: ['strings', 'wind_brass', 'keyboard'],
  },
  {
    id: 'fortissimo-possibile',
    term: 'Fortissimo possibile',
    reading_kana: 'フォルティッシモ・ポッシビレ',
    abbreviations: ['fff', 'ffff'],
    lang: 'It',
    category: 'dynamics',
    short_meaning: '可能な限り最も強く、最大の音量で',
    definition: '楽器と奏者が出し得る最大限のエネルギーと音量を求める指示。マーラーやチャイコフスキーの頂点で現れる。',
    performer_nuance: '音が割れてノイズにならない範囲で、ホールの空間全体を共鳴させる最大の倍音を引き出す。',
    related_terms: ['fortissimo', 'con-forza', 'wuchtig'],
    scene_tags: ['strings', 'wind_brass', 'keyboard', 'ensemble'],
  },
  {
    id: 'non-legato',
    term: 'Non legato',
    reading_kana: 'ノン・レガート',
    abbreviations: ['non leg.'],
    lang: 'It',
    category: 'technique',
    short_meaning: 'レガートにせず、1音1音を適度に切り離して粒立ちよく',
    definition: 'Legato（滑らかにつなげる）とStaccato（短く切る）の中間に位置する極めて重要な基本アーティキュレーション。',
    performer_nuance: 'バッハの鍵盤作品や古典派の急速パッセージで、スラーが書かれていない音符に適用すると、見通しのよい明晰なポリフォニーが浮かび上がる。',
    related_terms: ['legato', 'staccato', 'detache', 'portato'],
    scene_tags: ['keyboard', 'strings', 'wind_brass'],
  },
  {
    id: 'colla-ottava',
    term: 'Coll\'ottava / Ottava alta (8va) / Ottava bassa (8vb)',
    reading_kana: 'コッロッターヴァ / オッターヴァ・アルタ',
    abbreviations: ['8va', '8vb', 'c. 8va'],
    lang: 'It',
    category: 'technique',
    short_meaning: '1オクターブ高く（8va） / 1オクターブ低く（8vb） / オクターブを重ねて（Coll\'ottava）',
    definition: '加線が多くなって譜面が読みにくくなるのを防ぐためのオクターブ移動記譜。元の実音表記に戻る際は「loco（ローコ＝その場所で）」と書かれる。',
    performer_nuance: '高音域のパッセージで8vaが終わる箇所の「loco」を見落とさないよう注意。',
    related_terms: ['loco'],
    scene_tags: ['keyboard', 'strings', 'wind_brass'],
  },
  {
    id: 'loco',
    term: 'Loco / Al loco',
    reading_kana: 'ローコ',
    abbreviations: ['loco'],
    lang: 'It',
    category: 'technique',
    short_meaning: '書かれた通りの音高（実音位置）に戻して（8vaの解除）',
    definition: 'イタリア語で「場所（place）」の意。8va（1オクターブ上）や8vb（1オクターブ下）の区間が終わり、記譜通りの音域に戻ることを示す。',
    performer_nuance: 'フルートや第1ヴァイオリン、ピアノの超高音域で8vaの点線が切れた直後の「loco」は、読み間違い事故が起きやすいため印をつけておく。',
    related_terms: ['colla-ottava'],
    scene_tags: ['strings', 'wind_brass', 'keyboard'],
  },
  {
    id: 'senza-replica',
    term: 'Senza replica / Senza ripetizione',
    reading_kana: 'センツァ・レプリカ / センツァ・リペティツィオーネ',
    abbreviations: ['s.r.'],
    lang: 'It',
    category: 'technique',
    short_meaning: '繰り返し（リピート）を省略して',
    definition: 'Da Capo（D.C.）で最初に戻った際、途中の反復記号を無視して1回通りで進む指示。反対に「繰り返しありで」と明示する場合は「Con replica」。',
    performer_nuance: 'メヌエットやスケルツォのD.C.では、特に指示がなくても慣習としてSenza replicaで演奏するが、ベートーヴェン後期等で「Con replica」と特記されている場合は必ずリピートする。',
    related_terms: ['da-capo', 'dal-segno', 'menuetto', 'scherzo'],
    scene_tags: ['ensemble', 'strings', 'wind_brass', 'keyboard'],
  },
  {
    id: 'lusingando-2',
    term: 'A capriccio',
    reading_kana: 'ア・カプリッチョ',
    abbreviations: [],
    lang: 'It',
    category: 'tempo_change',
    short_meaning: '気ままに、奇想的に、自由なテンポとひらめきで (Ad libitum / Capriccioso)',
    definition: 'capriccio（気まぐれ・奇想）に従い、拍節の束縛を離れて奏者の自由な感興に委ねる指示。',
    performer_nuance: 'カデンツァや即興的導入部で、聴き手の予想を心地よく裏切るような緩急の遊び心を見せる。',
    related_terms: ['capriccioso', 'ad-libitum', 'rubato'],
    scene_tags: ['keyboard', 'strings', 'wind_brass'],
  },
  {
    id: 'tempo-di-valse',
    term: 'Tempo di Valse / Tempo di Minuetto',
    reading_kana: 'テンポ・ディ・ヴァルツ / テンポ・ディ・メヌエット',
    abbreviations: [],
    lang: 'It',
    category: 'tempo',
    short_meaning: 'ワルツのテンポと様式感で / メヌエットのテンポと優雅な歩みで',
    definition: '特定の舞曲の標準的なテンポとステップの重心を求める速度標語。',
    performer_nuance: 'Tempo di Valseでは1小節を1拍（One-in-a-bar）の大きな円運動で捉え、2拍目をほんのわずか早めたり3拍目を軽く抜いたりする舞踏の呼吸を取り入れる。',
    bpm_range: [132, 168],
    related_terms: ['menuetto', 'grazioso', 'schwungvoll'],
    scene_tags: ['ensemble', 'strings', 'wind_brass', 'keyboard'],
  },
  {
    id: 'a-due',
    term: 'a 2 / a due (ア・ドゥエ)',
    reading_kana: 'ア・ドゥエ',
    abbreviations: ['a 2', 'a2'],
    lang: 'It',
    category: 'technique',
    short_meaning: '（管楽器の1番・2番が）2人とも同じ音を一緒に吹く（ユニゾン）、または弦の分割を2声にする',
    definition: 'オーケストラの管楽器スコアやパート譜（1段に1番・2番が併記されている場合）で、ソロ（1. または I）の後から「2人全員で同じ旋律を吹く」ことを示す最重要記号。',
    performer_nuance: '【要注意】管楽器では「a 2 ＝ 2人でユニゾン」を意味するが、弦楽器パート譜では稀に「2つに分かれて（divisi a 2）」の意味で使われることがある。管楽器の「a 2」では2人の音程と音色を1本の太い楽器のように溶け合わせる。',
    related_terms: ['divisi', 'tutti-alle'],
    scene_tags: ['wind_brass', 'ensemble', 'strings'],
  },
  {
    id: 'secco',
    term: 'Secco',
    reading_kana: 'セッコ',
    abbreviations: ['sec.'],
    lang: 'It',
    category: 'technique',
    short_meaning: '乾いた音で、余韻を残さずスパッと切って (Sec / Trockenと同義)',
    definition: 'イタリア語で「乾いた（dry）」。交響曲や協奏曲の最後の和音に「secco」と書かれている場合、フェルマータで伸ばさず一瞬で鋭く音を止める。',
    performer_nuance: 'アンサンブル全員の「音の止め際（リリース）」をミリ秒単位で揃えることで、ホールに劇的な残響の輪が生まれる。',
    related_terms: ['sec', 'trocken', 'staccato', 'laissez-vibrer'],
    scene_tags: ['ensemble', 'strings', 'wind_brass', 'keyboard'],
  },
];

const rawTerms = [
  ...PART1_TERMS,
  ...PART2_TERMS,
  ...PART3_TERMS,
  ...PART4_TERMS,
  ...PART5_TERMS,
  ...EXTRA_TERMS,
];

// Deduplicate by id while preserving order
const seenIds = new Set();
const uniqueTerms = [];
for (const item of rawTerms) {
  if (seenIds.has(item.id)) continue;
  seenIds.add(item.id);

  const reading_hiragana = item.reading_hiragana || katakanaToHiragana(item.reading_kana);
  const normalized_term = buildNormalizedTerm(item.term, item.abbreviations, item.id);

  uniqueTerms.push({
    id: item.id,
    term: item.term,
    normalized_term,
    reading_kana: item.reading_kana,
    reading_hiragana,
    abbreviations: item.abbreviations || [],
    lang: item.lang || 'It',
    category: item.category || 'expression',
    short_meaning: item.short_meaning,
    definition: item.definition,
    performer_nuance: item.performer_nuance,
    ...(item.bpm_range ? { bpm_range: item.bpm_range } : {}),
    related_terms: item.related_terms || [],
    scene_tags: item.scene_tags || ['ensemble'],
  });
}

const outJsonPath = path.join(rootDir, 'src', 'data', 'musicDictionary.json');
fs.mkdirSync(path.dirname(outJsonPath), { recursive: true });
fs.writeFileSync(outJsonPath, JSON.stringify(uniqueTerms, null, 2) + '\n', 'utf-8');

console.log(`Generated ${uniqueTerms.length} musical terms in ${outJsonPath}`);
