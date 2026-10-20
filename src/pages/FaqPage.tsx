import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronDown, BookOpen, Wrench, PlusCircle, Mail } from '../components/EditorialIcons';

export type FaqCategoryId = 'all' | 'visitors' | 'organizers' | 'access_manner' | 'tools_system';

export interface FaqItem {
  id: string;
  category: Exclude<FaqCategoryId, 'all'>;
  question: string;
  answer: string;
  links?: { label: string; to: string }[];
}

export const FAQ_CATEGORIES: { id: FaqCategoryId; label: string; sub: string }[] = [
  { id: 'all', label: 'すべての質問', sub: 'All Questions (18)' },
  { id: 'visitors', label: '① 来場者・一般の方へ', sub: 'For Audience & Visitors' },
  {
    id: 'organizers',
    label: '② 演奏会を企画・掲載したい学生・教職員の方へ',
    sub: 'For Student & Faculty Organizers',
  },
  {
    id: 'access_manner',
    label: '③ 会場アクセス・鑑賞マナーについて',
    sub: 'Access & Concert Hall Etiquette',
  },
  {
    id: 'tools_system',
    label: '④ 楽語辞典・音大生ツール・システム仕様について',
    sub: 'Dictionary, Pro Tools & System',
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  // Category 1: ① 来場者・一般の方へ
  {
    id: 'v-1',
    category: 'visitors',
    question: '学外の一般の方でも、愛知県立芸術大学の演奏会を聴きに行くことはできますか？',
    answer:
      'はい、本サイトに掲載されている定期演奏会・オペラ・室内楽・卒業演奏会・学生有志による自主企画演奏会の多くは、一般の方もご来場いただけます。入場無料（予約不要）の公演から、事前予約制・整理券制・有料チケット制の公演までございますので、各公演詳細ページの「入場料・座席・予約案内」欄をご確認のうえお越しください。',
    links: [{ label: '公演一覧を見る', to: '/concerts' }],
  },
  {
    id: 'v-2',
    category: 'visitors',
    question: '事前予約や整理券は必要ですか？当日直接会場へ行っても入場できますか？',
    answer:
      '公演によって異なります。「入場無料（全席自由・事前予約不要）」と記載されている公演は、当日そのまま開場時刻よりご入場いただけます。一方、「要事前予約」や「整理券配布」の記載がある公演は、公演詳細ページの「予約・チケット申込URL」から事前にお申し込みいただくか、指定の配布開始時刻にお越しください。',
  },
  {
    id: 'v-3',
    category: 'visitors',
    question: '未就学児（小さなお子様）を連れて入場することはできますか？',
    answer:
      '録音・審査を兼ねた学位審査演奏会や定期演奏会などでは、静寂な鑑賞環境を保つため「未就学児の入場はご遠慮ください」と定められている場合がございます。親子向け企画やオープンキャンパス関連公演など入場可能な演奏会もございますので、各公演詳細ページの備考欄または主催者連絡先にてご確認ください。',
  },
  {
    id: 'v-4',
    category: 'visitors',
    question: '開演時刻に遅れてしまった場合、途中からでも入場できますか？',
    answer:
      '演奏中（曲が鳴っている最中）の客席への立ち入りは原則として制限されておりますが、曲間（拍手のタイミング）や楽章間、または休憩時間にホール係員の誘導に従ってご入場いただけます。到着が遅れた際は、扉の近くで係員にお声がけのうえ案内をお待ちください。',
  },
  {
    id: 'v-5',
    category: 'visitors',
    question: '車椅子での来場やバリアフリー対応について教えてください。',
    answer:
      '学内の奏楽堂・室内楽ホール・講堂および県内の主要ホールには車椅子スペースや多目的トイレが設けられております。スムーズなご案内と座席スペース確保のため、車椅子でご来場される場合は、事前に各公演詳細ページ記載の問い合わせ先（または大学芸術情報・広報窓口）までご一報いただけますと幸いです。',
  },

  // Category 2: ② 演奏会を企画・掲載したい学生・教職員の方へ
  {
    id: 'o-1',
    category: 'organizers',
    question: '学生有志の自主企画リサイタルや門下生発表会をこのサイトに掲載するにはどうすればよいですか？',
    answer:
      'アカウント作成や事前審査は不要です。上部メニューの「演奏会登録（/upload）」ページを開き、公演情報を入力して送信すると即座に公開されます。登録時に4文字以上の「編集用パスワード」を設定していただくことで、後からいつでも曲目・出演者の追加やチラシの差し替えが可能です。',
    links: [{ label: '演奏会を登録する', to: '/upload' }],
  },
  {
    id: 'o-2',
    category: 'organizers',
    question: 'チラシの裏面原稿やSNSの告知文から、一括でフォームに入力することはできますか？',
    answer:
      'はい、登録・編集画面の最上部に「スマート原稿パーサー（コピペ一括自動入力）」を搭載しています。Wordやメール、LINE等で作成した告知文をそのまま貼り付けて「自動解析してフォームに反映」ボタンを押すと、開催日・開場/開演時刻・会場（学内ホールや名古屋市内の主要ホール）・入場料・曲目リストを正規表現で自動抽出して各欄にセットします。',
    links: [{ label: 'スマート原稿パーサーを試す', to: '/upload' }],
  },
  {
    id: 'o-3',
    category: 'organizers',
    question: 'PDF形式のチラシ（表面・裏面）をそのままアップロードできますか？文字や画像が崩れませんか？',
    answer:
      'はい、PDFファイルも画像ファイル（JPEG / PNG / WebP）もそのままアップロード可能です。ブラウザ内の高精細レンダラーがPDFの各ページを自動的に高解像度WebP画像へ変換・最適化するため、スマートフォンでもPCでも「空枠」や文字化けを起こすことなく、表裏2ページのチラシを鮮明に閲覧・拡大表示できます。',
  },
  {
    id: 'o-4',
    category: 'organizers',
    question: '荒天や体調不良で公演が「延期」「中止」「曲目変更」になった場合や、「満席（受付終了）」になった場合はどうすればよいですか？',
    answer:
      '該当する公演詳細ページの「編集」ボタンから登録時の編集用パスワードを入力し、「開催ステータス」を「延期」「公演中止」「内容一部変更」「満席・受付終了」に切り替えて保存してください。一覧カードおよび詳細ページの最上部に目立つステータスバッジが即座に反映され、来場者へ正確に告知されます。',
  },
  {
    id: 'o-5',
    category: 'organizers',
    question: '登録時に設定した「編集用パスワード」を忘れてしまった場合はどうすればよいですか？',
    answer:
      'お問い合わせフォーム（/contact）より、対象の「公演タイトル」「開催日」「ご担当者名」を添えてご連絡ください。管理者が本人確認のうえ、パスワードの再設定または修正対応を行います。',
    links: [{ label: 'お問い合わせページへ', to: '/contact' }],
  },

  // Category 3: ③ 会場アクセス・鑑賞マナーについて
  {
    id: 'a-1',
    category: 'access_manner',
    question: '愛知県立芸術大学キャンパスへの公共交通機関でのアクセス方法を教えてください。',
    answer:
      '名古屋市営地下鉄東山線「藤が丘駅」にて愛知高速交通東部丘陵線（リニモ / Linimo）に乗り換え、「芸大通駅（知の拠点あいち前）」で下車してください。芸大通駅から大学正門までは徒歩約10〜12分（奏楽堂・室内楽ホールまでは徒歩約12〜15分、緩やかな上り坂あり）です。',
  },
  {
    id: 'a-2',
    category: 'access_manner',
    question: '学内の演奏会へ自家用車で来場することはできますか？駐車場はありますか？',
    answer:
      '学内演奏会へお越しの際は、公共交通機関（リニモ「芸大通駅」または名鉄バス）のご利用をお願いいたします。大学構内の駐車スペースには限りがございますため、一般来場者の方のお車でのご来場はご遠慮いただいております（公演により特別な案内がある場合は、各公演詳細ページの記載に従ってください）。',
  },
  {
    id: 'a-3',
    category: 'access_manner',
    question: '学内の「奏楽堂」「室内楽ホール」「講堂」はキャンパスのどこにありますか？',
    answer:
      '正門（守衛所）を通過後、ロータリー正面奥に大型ホールである「奏楽堂」がございます。「室内楽ホール」は音楽学部棟エリア側、「講堂」は管理棟・共通講義棟エリアに位置しております。各公演詳細ページの「会場ワンタップ情報」およびGoogleマップリンクから正確な位置座標をご確認いただけます。',
  },
  {
    id: 'a-4',
    category: 'access_manner',
    question: '演奏中の写真撮影・録音・録画や、携帯電話の扱いについて教えてください。',
    answer:
      '著作権・肖像権保護および演奏への集中を妨げないため、主催者の事前許可がない限り、開演中の客席内での写真撮影・録音・録画は固くお断りしております。また、スマートフォンのアラーム音やバイブレーション音もホールの豊かな残響の中では大きく響きますので、開演前に必ず電源をお切りいただくか、アラーム機能を含むすべての通知音が鳴らない機内モードへの切り替えをお願いいたします。',
  },

  // Category 4: ④ 楽語辞典・音大生ツール・システム仕様について
  {
    id: 't-1',
    category: 'tools_system',
    question: '新設された「音楽楽語辞典（/dictionary）」では、ドイツ語のウムラウトやフランス語のアクサンが入力できなくても検索できますか？',
    answer:
      'はい、英語キーボードやスマートフォンの通常のアルファベット入力だけで100%ヒットするよう設計されています。例えばドイツ語の「Mäßig」は「maessig」または「massig」で、「Drängend」は「drangend」で、フランス語の「Cédez」は「cedez」で検索可能です。さらに略記（G.P. / rit. / l.v. / m.d.）やカタカナ読み、日本語のニュアンス（「急き立てる」「駒の近く」「弱音器」など）からの逆引き検索にも0msで対応しています。',
    links: [{ label: '音楽楽語辞典を開く', to: '/dictionary' }],
  },
  {
    id: 't-2',
    category: 'tools_system',
    question: '「音大生・演奏家ツール（/tools）」の純正律ハーモニードローンや高精度メトロノームは、練習室でどのように活用できますか？',
    answer:
      '「純正律ハーモニードローン」では、A=415/430/440/441/442/443/444Hzの基準ピッチ切替に加え、根音に対して純正完全5度（3:2）・純正長3度（5:4）・純正短3度（6:5）・長三和音（4:5:6）を耳が疲れないチェロ/オルガン風倍音で持続再生でき、平均律とのうなり（ビート）の違いを体感しながら重音やアンサンブルの音程練習が行えます。「高精度メトロノーム」はWeb Audio APIのハードウェアクロック先読みスケジューラを採用しており、3小節鳴らして1小節無音にする「サイレント小節（体内テンポ強化）モード」や5/4・7/8拍子の変拍子練習に対応しています。',
    links: [{ label: 'プロ仕様音大生ツールを使う', to: '/tools' }],
  },
  {
    id: 't-3',
    category: 'tools_system',
    question: '実技試験の演奏時間計算や、自主企画の進行表・パート譜製本計算はできますか？',
    answer:
      'はい、「音大生ツール」内の「プログラム尺・進行表シミュレーター（?tool=timer）」では、曲目ごとの分数・秒数を入力すると、純粋な演奏時間合計（実技試験の規定時間オーバー判定付き）と、曲間の出入り・拍手・セッティング転換・休憩時間を加味した「各曲の開始・終了予想時刻」および「終演予定時刻」を秒単位で自動算出します。また「編成・製本計算機（?tool=librarian）」では、弦楽器のプルト人数からの必要パート譜部数・譜面台数算出や、PDFページ数からのA3二つ折り（中綴じ）必要枚数・空白ページ計算が可能です。',
    links: [
      { label: 'プログラム尺・進行表シミュレーター', to: '/tools?tool=timer' },
      { label: '編成・パート譜製本計算機', to: '/tools?tool=librarian' },
    ],
  },
  {
    id: 't-4',
    category: 'tools_system',
    question: '大学公式サイトの演奏会情報はどのように同期されていますか？また自分のスマホのカレンダーに自動連携できますか？',
    answer:
      '毎日06:00（JST）の自動ジョブおよびエッジ側の自律更新機構により、愛知県立芸術大学公式サイトの最新コンサート情報を自動取得・統合しています。また、トップページや各公演詳細ページの「カレンダーに追加」ボタンから、Googleカレンダーへのワンタップ登録や、iPhone/Mac標準カレンダー等へのiCal（.ics）購読連携が可能です。',
  },
];

export function FaqSection({ darkEditorial = false }: { darkEditorial?: boolean }) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FaqCategoryId>('all');

  const filteredFaqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
      );
    });
  }, [query, activeCategory]);

  const cardBg = darkEditorial
    ? 'bg-[#1A1917] border-stone-800 text-stone-100'
    : 'bg-white border-stone-200 text-stone-900';

  const mutedText = darkEditorial ? 'text-stone-400' : 'text-stone-600';

  return (
    <div className="space-y-6" data-testid="faq-section-root">
      {/* Search Bar */}
      <div className="relative">
        <Search
          className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
            darkEditorial ? 'text-[#C5A059]' : 'text-stone-400'
          }`}
          strokeWidth={1.5}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="faq-search-input"
          placeholder="質問やキーワードを検索（例: 駐車場、リニモ、予約、PDF、パスワ―ド、純正律、中止）..."
          className={`w-full pl-10 pr-4 py-3 rounded border text-sm focus:outline-none transition-colors ${
            darkEditorial
              ? 'bg-[#1A1917] border-stone-700 text-stone-100 placeholder:text-stone-500 focus:border-[#C5A059]'
              : 'bg-white border-stone-300 text-stone-900 placeholder:text-stone-400 focus:border-stone-800'
          }`}
        />
      </div>

      {/* Category Filter Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {FAQ_CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              data-testid={`faq-cat-${cat.id}`}
              className={`p-3 rounded border text-left transition-colors ${
                active
                  ? darkEditorial
                    ? 'border-[#C5A059] bg-[#C5A059]/15 text-stone-100'
                    : 'border-stone-900 bg-stone-900 text-white'
                  : darkEditorial
                    ? 'border-stone-800 bg-[#1A1917] text-stone-300 hover:border-stone-700'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <div className="text-xs font-serif font-semibold leading-snug">{cat.label}</div>
              <div
                className={`text-[10px] font-display italic mt-0.5 ${
                  active
                    ? 'text-[#C5A059]'
                    : darkEditorial
                      ? 'text-stone-400'
                      : 'text-stone-500'
                }`}
              >
                {cat.sub}
              </div>
            </button>
          );
        })}
      </div>

      {/* Accordion List using native <details> for Find-in-Page (search-hidden-content) */}
      <div className="space-y-3" data-testid="faq-accordion-list">
        {filteredFaqs.length === 0 ? (
          <div className={`p-8 rounded border text-center ${cardBg}`}>
            <p className="text-sm font-serif">該当する質問が見つかりませんでした。</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setActiveCategory('all');
              }}
              className="mt-3 px-4 py-1.5 rounded bg-[#C5A059] text-stone-950 text-xs font-semibold"
            >
              すべての質問を表示
            </button>
          </div>
        ) : (
          filteredFaqs.map((item, idx) => {
            const catMeta = FAQ_CATEGORIES.find((c) => c.id === item.category);
            return (
              <details
                key={item.id}
                open={idx < 2 || query.trim().length > 0}
                data-testid="faq-accordion-item"
                className={`group rounded border transition-colors ${cardBg}`}
              >
                <summary className="cursor-pointer list-none p-4 sm:p-5 flex items-start justify-between gap-4 select-none">
                  <div className="space-y-1">
                    {catMeta && (
                      <span className="inline-block text-[11px] font-medium text-[#C5A059]">
                        {catMeta.label}
                      </span>
                    )}
                    <h3 className="text-sm sm:text-base font-serif font-semibold leading-relaxed">
                      Q. {item.question}
                    </h3>
                  </div>
                  <ChevronDown
                    className="w-4 h-4 shrink-0 mt-1 text-[#C5A059] transition-transform group-open:rotate-180"
                    strokeWidth={1.5}
                  />
                </summary>
                <div
                  className={`px-4 sm:px-5 pb-5 pt-2 border-t text-xs sm:text-sm leading-relaxed space-y-3 ${
                    darkEditorial ? 'border-stone-800/80 text-stone-300' : 'border-stone-100 text-stone-700'
                  }`}
                >
                  <p>{item.answer}</p>
                  {item.links && item.links.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {item.links.map((lnk) => (
                        <Link
                          key={lnk.to}
                          to={lnk.to}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium bg-[#C5A059]/15 border border-[#C5A059]/50 text-[#C5A059] hover:bg-[#C5A059] hover:text-stone-950 transition-colors"
                        >
                          <span>{lnk.label}</span>
                          <span>→</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            );
          })
        )}
      </div>

      {/* Quick Navigation Footer */}
      <div
        className={`rounded border p-5 flex flex-wrap items-center justify-between gap-4 ${cardBg}`}
      >
        <div>
          <h3 className="text-sm font-serif font-semibold">
            解決しない場合や、掲載内容の修正依頼について
          </h3>
          <p className={`text-xs mt-0.5 ${mutedText}`}>
            ご不明な点がございましたら、お問い合わせフォームよりお気軽にお知らせください。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/dictionary"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-stone-700 text-xs font-medium hover:border-[#C5A059]"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
            <span>楽語辞典</span>
          </Link>
          <Link
            to="/tools"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-stone-700 text-xs font-medium hover:border-[#C5A059]"
          >
            <Wrench className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
            <span>音大生ツール</span>
          </Link>
          <Link
            to="/upload"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-stone-700 text-xs font-medium hover:border-[#C5A059]"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#C5A059]" strokeWidth={1.5} />
            <span>公演登録</span>
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#C5A059] text-stone-950 text-xs font-semibold"
          >
            <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>お問い合わせ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-[#121211] text-stone-100 pb-24">
      <header className="border-b border-stone-800/80 bg-[#161514] pt-10 pb-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-xs tracking-[0.22em] uppercase text-[#C5A059] font-display mb-2">
            § Visitor &amp; Organizer Guide / FAQ
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-semibold text-stone-100 tracking-tight">
            よくある質問・ご利用案内 (Q&amp;A)
            <span className="block sm:inline sm:ml-4 text-base sm:text-xl font-display italic font-normal text-[#C5A059]">
              Frequently Asked Questions
            </span>
          </h1>
          <p className="mt-2.5 text-sm text-stone-400 max-w-3xl leading-relaxed">
            ご来場される一般の方へのご案内、演奏会を企画・登録される学生・教職員の方への手順、会場アクセス（公共交通機関のご案内）と鑑賞マナー、楽語辞典・音大生ツールの活用法をまとめています。
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        <FaqSection darkEditorial />
      </div>
    </div>
  );
}
