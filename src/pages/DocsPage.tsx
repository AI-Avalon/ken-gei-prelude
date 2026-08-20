import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useIsMobile } from '../hooks/useDevice';

type Tab = 'user' | 'tech';

export default function DocsPage() {
  const [tab, setTab] = useState<Tab>('user');
  const isMobile = useIsMobile();
  const location = useLocation();

  // Hash-based scrolling for anchor links
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [location.hash, tab]);

  return (
    <div className={`${isMobile ? 'px-4 py-4' : 'max-w-4xl mx-auto px-4 py-8'}`}>
      <div className="text-center mb-6">
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-serif font-bold text-stone-900`}>Documentation</h1>
        <p className="text-stone-500 mt-1 text-sm">Crescendo ドキュメント</p>
      </div>

      {/* Tab switcher */}
      <div className="flex justify-center gap-2 mb-8">
        <button onClick={() => setTab('user')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'user' ? 'bg-primary-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
          📖 使い方ガイド
        </button>
        <button onClick={() => setTab('tech')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'tech' ? 'bg-primary-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
          ⚙️ 技術仕様
        </button>
      </div>

      {tab === 'user' ? <UserDocs /> : <TechDocs />}
    </div>
  );
}

/* ========================= User-facing Documentation ========================= */
function UserDocs() {
  return (
    <div className="space-y-10">
      {/* Table of contents */}
      <nav className="bg-stone-50 rounded-xl border border-stone-200 p-4 sm:p-6">
        <h2 className="font-bold text-base mb-3 flex items-center gap-2">📑 目次</h2>
        <div className="grid gap-1 sm:grid-cols-2 text-sm">
          <TOCLink href="#quickstart" label="0. Crescendo とは？" />
          <TOCLink href="#for-visitors" label="1. 演奏会を探す" />
          <TOCLink href="#register" label="2. 演奏会を登録する" />
          <TOCLink href="#register-steps" label="3. 登録の手順（ステップバイステップ）" />
          <TOCLink href="#edit" label="4. 演奏会を編集・削除する" />
          <TOCLink href="#flyer" label="5. チラシ画像をアップロードする" />
          <TOCLink href="#promote" label="6. 宣伝・SNS共有" />
          <TOCLink href="#calendar" label="7. カレンダーに追加する" />
          <TOCLink href="#student-tools" label="8. 音大生ツール" />
          <TOCLink href="#admin" label="9. 管理者向け操作ガイド" />
          <TOCLink href="#faq" label="10. よくある質問" />
        </div>
      </nav>

      <div className="prose prose-primary max-w-none space-y-10">
        <Section id="quickstart" title="0. Crescendo とは？">
          <p>
            Crescendo は、愛知県立芸術大学の演奏会を「探す・登録する・共有する・カレンダーに入れる」ためのポータルサイトです。
            チラシ画像、QRコード、SNS共有、カレンダー同期まで、演奏会の告知に必要な導線をまとめて使えます。
          </p>
          <div className="not-prose grid gap-3 sm:grid-cols-3 mt-4">
            <FeatureCard icon="🔍" title="演奏会を探す" desc="一覧・カレンダー・検索で今後の演奏会を見つけられます" />
            <FeatureCard icon="✏️" title="誰でも登録" desc="アカウント不要。パスワードを設定すれば後から編集も可能" />
            <FeatureCard icon="📤" title="かんたん共有" desc="URL・QRコード・SNS共有・カレンダー追加がワンタップ" />
          </div>
        </Section>

        <Section id="for-visitors" title="1. 演奏会を探す">
          <StepList steps={[
            { icon: '🎵', text: <>トップページまたは<Link to="/concerts" className="text-primary-600 hover:underline">演奏会一覧</Link>を開きます</> },
            { icon: '🔍', text: '検索バーでタイトル、会場名、出演者名を検索できます' },
            { icon: '🏷️', text: 'カテゴリ（定期演奏会、自主企画、リサイタルなど）で絞り込めます' },
            { icon: '📅', text: '日付での絞り込みや、カレンダー表示も可能です' },
            { icon: '📄', text: '演奏会をタップすると、日時・会場・料金・チラシ・出演者・地図などの詳細が見られます' },
          ]} />
        </Section>

        <Section id="register" title="2. 演奏会を登録する">
          <p>
            <Link to="/upload" className="text-primary-600 hover:underline font-medium">演奏会登録ページ</Link>から、
            誰でもアカウント不要で演奏会を登録できます。
          </p>
          <div className="not-prose bg-amber-50 border border-amber-200 rounded-lg p-4 mt-3">
            <p className="text-sm text-amber-800 font-medium mb-1">🔑 編集用パスワードについて</p>
            <p className="text-sm text-amber-700">
              登録時に設定する「編集用パスワード」は、後から演奏会情報を修正・削除するために必要です。
              <strong>忘れないようメモしてください。</strong>パスワードを忘れた場合は管理者に連絡してください。
            </p>
          </div>
        </Section>

        <Section id="register-steps" title="3. 登録の手順（ステップバイステップ）">
          <NumberedSteps steps={[
            {
              title: '基本情報を入力',
              detail: 'タイトル（必須）、日付（必須）、開演時刻（必須）、会場名（必須）、カテゴリ（必須）を入力します。会場名は学内会場のプリセットボタンから選ぶと、住所・地図座標・アクセス情報が自動入力されます。',
            },
            {
              title: 'Google Maps URLで会場を設定（任意）',
              detail: 'Google Mapsで会場を検索 →「共有」→ URLをコピーして「Google Maps URL」欄に貼り付けると、会場名と地図座標が自動取得されます。短縮URL（maps.app.goo.gl）にも対応しています。',
            },
            {
              title: '料金を設定',
              detail: 'テンプレート（無料、一般/学生、前売/当日など）から選ぶか、料金区分を手動で追加できます。「テキストから一括入力」で自由記述からも変換できます。',
            },
            {
              title: 'プログラム・出演者を追加（任意）',
              detail: '「詳細登録」モードでは、曲目（作曲者＋曲名）、出演者（名前・楽器・学年）、指導者、ゲストアーティストを追加できます。',
            },
            {
              title: 'チラシ画像をアップロード（任意）',
              detail: 'JPEG/PNG/WebP/GIF（5MB以下）またはPDF（50MB以下）をアップロードできます。PDFはスマホ・PC内で自動的にページごとの画像に変換されます。',
            },
            {
              title: '連絡先を入力（任意）',
              detail: '連絡先メール、電話番号、代表者名、公式URL/SNSを入力できます。',
            },
            {
              title: '編集用パスワードを設定',
              detail: '4文字以上のパスワードを設定します。このパスワードで後から編集・削除ができます。',
            },
            {
              title: '登録ボタンを押す',
              detail: '内容を確認したら「🎵 登録する」ボタンを押します。登録後、演奏会の詳細ページに自動的に遷移します。',
            },
          ]} />

          <div className="not-prose bg-primary-50 border border-primary-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-primary-800 font-medium mb-1">💡 「かんたん登録」モードもあります</p>
            <p className="text-sm text-primary-700">
              フォーム上部の「⚡ かんたん登録」を選ぶと、必要最小限の項目だけで素早く登録できます。
              詳細は後から編集ページで追加できます。
            </p>
          </div>
        </Section>

        <Section id="edit" title="4. 演奏会を編集・削除する">
          <h4 className="font-medium">編集の手順</h4>
          <NumberedSteps steps={[
            {
              title: '編集ページにアクセス',
              detail: '演奏会詳細ページの「✏️ この演奏会を編集する」リンクをタップします。またはURLに /edit を追加します（例: /concerts/xxx/edit）。',
            },
            {
              title: 'パスワードを入力',
              detail: '登録時に設定した編集用パスワード、または管理者パスワードを入力します。認証に成功すると編集フォームが表示されます。',
            },
            {
              title: '情報を修正',
              detail: '日付、時刻、料金、出演者、プログラムなど、すべての項目を自由に変更できます。',
            },
            {
              title: 'チラシの変更',
              detail: '編集ページの下部「チラシ画像を変更」セクションから、新しいチラシをアップロードできます。',
            },
            {
              title: '更新ボタンを押す',
              detail: '「✅ 更新する」ボタンを押すと、変更が即座に反映されます。一覧、カレンダー、ICSフィードにも更新が反映されます。',
            },
          ]} />

          <h4 className="font-medium mt-6">削除の手順</h4>
          <p>
            編集ページの最下部「危険な操作」セクションで「🗑️ この演奏会を削除」をタップし、確認ダイアログで「本当に削除する」を押します。
          </p>
          <div className="not-prose bg-stone-50 border border-stone-200 rounded-lg p-4 mt-3">
            <p className="text-sm text-stone-600">
              削除された演奏会は90日間ゴミ箱に保管されます。管理者に連絡すれば復元できる場合があります。
              90日後に自動的に完全削除されます。
            </p>
          </div>
        </Section>

        <Section id="flyer" title="5. チラシ画像をアップロードする">
          <p>チラシのアップロードは登録時・編集時のどちらでも行えます。</p>
          <h4 className="font-medium">対応ファイル形式</h4>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>画像</strong>: JPEG, PNG, WebP, GIF（5MB以下）→ 自動的にWebP形式に変換・最適化されます</li>
            <li><strong>PDF</strong>: 50MB以下 → スマホ・PC上でページごとにWebP画像に変換されます（サーバーに送信するのは変換後の画像のみ）</li>
          </ul>

          <h4 className="font-medium mt-4">PDFアップロードの便利機能</h4>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>回転</strong>: ↻ ボタンでページを90度回転できます</li>
            <li><strong>並べ替え</strong>: ← → ボタンでページの順序を入れ替えられます</li>
            <li><strong>削除</strong>: × ボタンで不要なページを削除できます</li>
            <li><strong>サムネイル選択</strong>: タップして一覧表示用のサムネイルに使うページを選べます</li>
            <li><strong>画像保存</strong>: PNG/WebP形式で個別ページを保存できます（SNS投稿用に便利）</li>
          </ul>
        </Section>

        <Section id="promote" title="6. 宣伝・SNS共有">
          <p>
            演奏会詳細ページには、各種SNSへの共有ボタンが用意されています。
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>URL共有</strong>: 演奏会ページのURLをコピーして、どこにでも貼り付けられます</li>
            <li><strong>X (Twitter)</strong>: ハッシュタグ付きで自動的に投稿文が生成されます</li>
            <li><strong>LINE</strong>: 友だちやグループに直接共有できます</li>
            <li><strong>Threads / Bluesky</strong>: 投稿文とURLが自動生成されます</li>
            <li><strong>メール</strong>: 件名と本文にイベント情報が入ったメールを作成します</li>
          </ul>
        </Section>

        <Section id="calendar" title="7. カレンダーに追加する">
          <p>演奏会詳細ページの「カレンダーに追加」から、予定をカレンダーに追加できます。</p>

          <h4 className="font-medium">この予定だけ追加</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Google Calendar、Apple Calendar、Outlook、Yahoo!カレンダー、TimeTree に対応</li>
            <li>ICSファイルダウンロードにも対応（その他のカレンダーアプリ用）</li>
          </ul>

          <h4 className="font-medium mt-4">カテゴリ別に同期（ICSフィード）</h4>
          <p>
            ICSフィードURLをカレンダーアプリに登録すると、新しい演奏会が追加されるたびに自動的にカレンダーに反映されます。
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>すべて</strong>: 全カテゴリの演奏会を含むフィード</li>
            <li><strong>自主企画のみ</strong>: 自主企画に限定したフィード</li>
            <li><strong>大学主催のみ</strong>: 大学主催イベントに限定したフィード</li>
            <li>カレンダーURLをコピーして、Google Calendar / Apple Calendar / Outlookの「URLで購読」機能を使います</li>
          </ul>
        </Section>

        <Section id="student-tools" title="8. 音大生ツール">
          <p>
            <Link to="/student-tools" className="text-primary-600 hover:underline font-medium">音大生ツール</Link>では、
            練習や本番に役立つ無料ツールが使えます。
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>メトロノーム</strong>: BPM設定・タップテンポ対応の爆速メトロノーム</li>
            <li><strong>チューナー</strong>: マイク入力でリアルタイムにピッチを表示</li>
            <li><strong>移調メモ</strong>: 移調楽器のキー変換をサポート</li>
            <li><strong>PDF/画像変換</strong>: 楽譜PDFをページごとの画像に変換（印刷・共有用）</li>
          </ul>
        </Section>

        <Section id="admin" title="9. 管理者向け操作ガイド">
          <div className="not-prose bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800 font-medium">🔒 管理者パスワードが必要です</p>
            <p className="text-sm text-red-700 mt-1">
              <Link to="/admin" className="text-red-600 hover:underline">管理画面</Link>へのアクセスには管理者パスワードが必要です。
              パスワードはサイト管理者から取得してください。
            </p>
          </div>

          <h4 className="font-medium">管理画面の機能一覧</h4>
          <div className="not-prose grid gap-3 sm:grid-cols-2 mt-3">
            <AdminFeature icon="📊" title="概要" desc="演奏会数、閲覧数、カテゴリ別統計を確認" />
            <AdminFeature icon="🎵" title="演奏会管理" desc="公開/非公開の切り替え、削除、パスワード再設定" />
            <AdminFeature icon="📩" title="お問い合わせ" desc="お問い合わせの確認・返信管理" />
            <AdminFeature icon="🖼️" title="チラシ管理" desc="チラシの有無確認、サムネイル状態の確認" />
            <AdminFeature icon="📈" title="分析" desc="アクセス統計、人気の演奏会ランキング" />
            <AdminFeature icon="👤" title="登録者情報" desc="登録者の名前・メールアドレスの確認（暗号化保存）" />
            <AdminFeature icon="⚙️" title="設定" desc="位置制限、スクレイピング実行、メンテナンス、データバックアップ" />
            <AdminFeature icon="📋" title="ログ" desc="スクレイピング・メンテナンスの実行履歴" />
          </div>

          <h4 className="font-medium mt-6">管理者ができること</h4>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>演奏会の公開/非公開切り替え</strong>: 不適切な登録を非公開にできます</li>
            <li><strong>編集用パスワードの再設定</strong>: 登録者がパスワードを忘れた場合に新しいパスワードを設定できます</li>
            <li><strong>スクレイピング実行</strong>: 大学公式サイトからイベント情報を手動で取得できます（通常は毎日06:00に自動実行）</li>
            <li><strong>メンテナンス実行</strong>: 重複削除、カテゴリ再分類、料金修正などのメンテナンスタスクを実行できます</li>
            <li><strong>データバックアップ</strong>: 全データをJSON形式でエクスポートできます</li>
            <li><strong>位置制限</strong>: 演奏会の登録を大学周辺からのみに制限する機能を ON/OFF できます</li>
          </ul>
        </Section>

        <Section id="faq" title="10. よくある質問">
          <FAQ q="利用料金はかかりますか？" a="いいえ、完全無料です。アカウント登録も不要です。" />
          <FAQ q="誰でも演奏会を登録できますか？" a="はい。学内関係者でなくても、誰でも登録できます。ただし管理者が位置制限を有効にしている場合は、大学周辺からのみ登録できます。" />
          <FAQ q="編集用パスワードを忘れました" a="管理者パスワードでも編集画面にログインできます。管理画面から新しい編集用パスワードを再設定することもできます。管理者にお問い合わせください。" />
          <FAQ q="チラシのPDFをアップロードしたらどうなりますか？" a="PDFはスマホ・PC上でページごとにWebP画像に変換されます。サーバーに送られるのは変換後の画像のみです。回転・削除・並べ替え・PNG/WebP保存もできます。元のPDFは送信されませんので、50MBまでのファイルも高速にアップロードできます。" />
          <FAQ q="カレンダーに追加した予定は自動更新されますか？" a="ICSフィード（カテゴリ別同期）を使えば、新しい演奏会や変更が自動的にカレンダーに反映されます。個別に追加した予定は更新されません。" />
          <FAQ q="登録した演奏会が一覧に表示されません" a="管理者により非公開にされた可能性があります。お問い合わせページから管理者にご連絡ください。" />
          <FAQ q="大学公式サイトの演奏会が自動で追加されていますが、情報を修正したい" a="自動取得された演奏会は、管理者パスワードで編集できます。管理画面からパスワードを再設定することも可能です。" />
          <FAQ q="スマホとPCで表示が違います" a="CrescendoはスマホとPC向けに最適化された専用レイアウトを使い分けています。どちらでも同じ情報にアクセスできます。" />
          <FAQ q="バグを見つけたり、機能リクエストがあります" a={<>お手数ですが<Link to="/contact" className="text-primary-600 hover:underline">お問い合わせページ</Link>からご連絡ください。</>} />
        </Section>
      </div>
    </div>
  );
}

/* ========================= Technical Documentation ========================= */
function TechDocs() {
  return (
    <div className="prose prose-primary max-w-none space-y-10">
      <Section id="arch" title="1. アーキテクチャ概要">
        <p>Crescendo は Cloudflare Pages 上で動作するフルスタックWebアプリケーションです。</p>
        <Pre>{`
Frontend: React 18 + TypeScript + Vite 5 + Tailwind CSS 3
Backend:  Cloudflare Pages Functions (Edge Workers)
Database: Cloudflare D1 (SQLite)
Storage:  Cloudflare KV (画像バイナリ)
Routing:  React Router v6 (SPA)
Map:      Leaflet + OpenStreetMap
Deploy:   GitHub → Cloudflare Pages (自動デプロイ)
URL:      https://ken-gei-prelude.pages.dev`}</Pre>
      </Section>

      <Section id="project" title="2. プロジェクト構成">
        <Pre>{`
ken-gei-prelude/
├── src/
│   ├── App.tsx              # ルーティング・レイアウト
│   ├── main.tsx             # エントリポイント
│   ├── index.css            # Tailwind + カスタムCSS
│   ├── pages/               # ページコンポーネント
│   ├── components/          # UIコンポーネント
│   ├── hooks/               # カスタムフック
│   ├── lib/                 # ユーティリティ・API・定数
│   └── types/               # TypeScript型定義
├── functions/api/           # Cloudflare Pages Functions
├── migrations/              # D1マイグレーション
├── wrangler.toml            # Cloudflare設定
├── tailwind.config.js       # Tailwind設定
├── vite.config.ts           # Vite設定
└── package.json`}</Pre>
      </Section>

      <Section id="data" title="3. データモデル（D1 SQLite）">
        <h4>concerts テーブル</h4>
        <Pre>{`
id              TEXT PRIMARY KEY (UUID)
slug            TEXT UNIQUE     (タイトル-nanoid6)
title           TEXT NOT NULL
subtitle        TEXT
description     TEXT
date            TEXT NOT NULL   (YYYY-MM-DD)
time_start      TEXT NOT NULL   (HH:MM)
time_open       TEXT            (HH:MM)
time_end        TEXT            (HH:MM)
venue_json      TEXT            (Venue JSON)
category        TEXT NOT NULL
pricing_json    TEXT            (PricingItem[] JSON)
pricing_note    TEXT
program_json    TEXT            (ProgramItem[] JSON)
performers_json TEXT            (Performer[] JSON)
flyer_r2_keys   TEXT            (string[] JSON — KVキー配列)
views           INTEGER DEFAULT 0
source          TEXT DEFAULT 'manual'
is_published    INTEGER DEFAULT 1
is_deleted      INTEGER DEFAULT 0
edit_password_hash TEXT         (SHA-256)`}</Pre>
      </Section>

      <Section id="api-ref" title="4. API リファレンス">
        <h4>演奏会 CRUD</h4>
        <Pre>{`
GET    /api/concerts         一覧取得
  ?page=1&limit=20          ページネーション
  ?category=recital          カテゴリフィルター
  ?search=キーワード          全文検索
  ?sort=date_asc|date_desc|views_desc

GET    /api/concerts/:slug   詳細取得
POST   /api/concerts         新規作成（edit_password必須）
PUT    /api/concerts/:slug   更新（edit_password or admin_token必須）
DELETE /api/concerts/:slug   削除（soft delete, 90日後自動削除）`}</Pre>

        <h4>画像API</h4>
        <Pre>{`
GET    /api/image/:key       KVから画像取得（エッジキャッシュ付き）
POST   /api/upload           チラシアップロード`}</Pre>

        <h4>その他</h4>
        <Pre>{`
POST   /api/admin/auth       管理者認証 → token
POST   /api/contact          お問い合わせ送信
GET    /api/feed/ics          ICSカレンダーフィード`}</Pre>
      </Section>

      <Section id="storage" title="5. ストレージ設計">
        <Pre>{`
KV Key Format:
  flyer/{concertSlug}/{timestamp}.webp          フルサイズ画像
  flyer/{concertSlug}/{timestamp}_thumb.webp    サムネイル

Cache Strategy:
  Browser: Cache-Control 30日
  Edge: Cloudflare Cache API (caches.default)
  → KV読取を大幅削減`}</Pre>
      </Section>

      <Section id="mobile-pc" title="6. モバイル/PC独立UI">
        <Pre>{`
判定: useIsMobile() フック（MediaQuery: max-width 639px）

モバイル: MobileTabBar（下部タブ）、横型カード、コンパクトレイアウト
PC:       NavBar（トップ固定）、縦型カード、フルサイズレイアウト`}</Pre>
      </Section>

      <Section id="auth" title="7. 認証・セキュリティ">
        <Pre>{`
管理者: HMAC-SHA256 → トークン発行 → X-Admin-Token
編集者: SHA-256ハッシュ比較 → sessionStorage一時保存
レート制限: アップロード10回/時/IP`}</Pre>
      </Section>

      <Section id="deploy" title="8. デプロイ・運用">
        <Pre>{`
ビルド:   npm run build (tsc && vite build)
デプロイ: git push origin main → Cloudflare Pages自動デプロイ
開発:     npm run dev (フロント) / npx wrangler dev (バックエンド)`}</Pre>
      </Section>
    </div>
  );
}

/* ========================= Shared Components ========================= */
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-xl font-bold mb-4 pb-2 border-b">{title}</h2>
      <div className="space-y-3 text-stone-700 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function TOCLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-stone-600 hover:bg-primary-50 hover:text-primary-700 transition-colors"
    >
      <span className="text-stone-400">›</span>
      <span>{label}</span>
    </a>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="font-bold text-sm text-stone-800 mb-1">{title}</h3>
      <p className="text-xs text-stone-500">{desc}</p>
    </div>
  );
}

function AdminFeature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-3 flex items-start gap-3">
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div>
        <p className="font-medium text-sm text-stone-800">{title}</p>
        <p className="text-xs text-stone-500">{desc}</p>
      </div>
    </div>
  );
}

function StepList({ steps }: { steps: { icon: string; text: React.ReactNode }[] }) {
  return (
    <div className="not-prose space-y-2 mt-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3 bg-white border border-stone-100 rounded-lg p-3">
          <span className="text-lg flex-shrink-0">{step.icon}</span>
          <p className="text-sm text-stone-700 leading-relaxed">{step.text}</p>
        </div>
      ))}
    </div>
  );
}

function NumberedSteps({ steps }: { steps: { title: string; detail: string }[] }) {
  return (
    <div className="not-prose space-y-3 mt-3">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">
            {i + 1}
          </div>
          <div>
            <p className="font-medium text-sm text-stone-800">{step.title}</p>
            <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{step.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <div className="bg-stone-50 rounded p-4 border border-stone-100">
      <p className="font-medium text-stone-800">Q: {q}</p>
      <p className="text-stone-600 mt-1">A: {a}</p>
    </div>
  );
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-navy-900 text-stone-300 p-4 rounded-lg text-xs overflow-x-auto leading-relaxed whitespace-pre">
      {children}
    </pre>
  );
}
