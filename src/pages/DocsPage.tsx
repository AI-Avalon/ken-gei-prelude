import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useIsMobile } from '../hooks/useDevice';

type Tab = 'user' | 'tech';

export default function DocsPage() {
  const [tab, setTab] = useState<Tab>('user');
  const isMobile = useIsMobile();

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
    <div className="prose prose-primary max-w-none space-y-10">
      <Section id="about" title="1. Crescendo とは">
        <p>
          Crescendo（クレッシェンド）は、愛知県立芸術大学の演奏会情報ポータルサイトです。
          学生・教職員の演奏会を「掲載・閲覧・検索・共有」できます。
        </p>
        <p>
          チケット販売や座席予約は行いません。演奏会の宣伝と情報共有を目的としています。
          完全無料で利用できます。
        </p>
      </Section>

      <Section id="browse" title="2. 演奏会を見る">
        <h4>一覧ページ</h4>
        <p>
          <Link to="/concerts" className="text-primary-600 hover:underline">演奏会一覧</Link>では、
          今後開催される演奏会をカード形式で表示しています。
        </p>
        <h4>フィルター・検索</h4>
        <p>
          カテゴリチップでフィルター、キーワード検索ボックスで演奏会名・会場名・出演者名などで検索できます。
        </p>
        <h4>カレンダー</h4>
        <p>
          <Link to="/calendar" className="text-primary-600 hover:underline">カレンダーページ</Link>で月ごとのスケジュールを確認できます。
        </p>
      </Section>

      <Section id="register" title="3. 演奏会を登録する">
        <p>
          <Link to="/upload" className="text-primary-600 hover:underline">演奏会登録ページ</Link>から誰でも登録可能（アカウント不要）。
        </p>
        <h4>🔧 詳細登録（デフォルト）</h4>
        <p>プログラム、出演者、料金区分、説明文など全情報を入力できます。</p>
        <h4>⚡ かんたん登録</h4>
        <p>最低限の情報（タイトル、日付、開演時刻、会場、カテゴリ、パスワード）だけで登録。</p>
        <h4>🔑 編集用パスワード</h4>
        <p className="text-amber-700 font-medium">
          登録時に設定したパスワードは必ずメモしてください。再発行はできません。
        </p>
        <h4>チラシアップロード</h4>
        <p>
          PDF, JPEG, PNG, WebP, GIF対応。PDFは自動的にWebP画像に変換されます（最大4ページ）。
          1ページ目がサムネイルとして使用されます。
        </p>
        <h4>大学会場のクイック入力</h4>
        <p>
          会場入力欄の上部にある「奏楽堂」「講義棟ホール」等のボタンをタップすると、
          住所・座標・アクセス情報が自動入力されます。
        </p>
      </Section>

      <Section id="calendar" title="4. カレンダーに追加する">
        <p>演奏会詳細ページから各種カレンダーに追加できます。</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Google カレンダー / Outlook / Yahoo! カレンダー</li>
          <li>Apple カレンダー（ICSダウンロード）</li>
        </ul>
        <h4>📅 カレンダーの自動同期</h4>
        <p className="text-sm text-stone-600 mb-2">
          お使いのカレンダーアプリ（Google カレンダー・Apple カレンダー等）に、
          新しい演奏会が自動で追加されるようになります。
          演奏会詳細ページの「カレンダーに追加」ボタンから設定できます。
        </p>
      </Section>

      <Section id="share" title="5. 共有する">
        <ul className="list-disc list-inside space-y-1">
          <li>📋 リンクコピー / X (Twitter) / LINE / Facebook / QRコード</li>
        </ul>
      </Section>

      <Section id="edit" title="6. 編集・削除">
        <p>
          演奏会詳細ページの「✏️ この演奏会を編集」から編集可能。削除後90日間はゴミ箱保管。
        </p>
      </Section>

      <Section id="faq" title="7. よくある質問">
        <FAQ q="無料ですか？" a="はい、完全無料です。" />
        <FAQ q="誰でも登録できますか？" a="はい、アカウント不要で登録できます。" />
        <FAQ q="パスワードを忘れました" a="再発行不可。お問い合わせフォームからご連絡ください。" />
        <FAQ q="PDFをアップロードできますか？" a="はい。PDFは自動的に高品質なWebP画像に変換されます。" />
      </Section>
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
│   │   ├── HomePage.tsx     # トップ（モバイル/PC独立レイアウト）
│   │   ├── ConcertListPage.tsx  # 一覧ページ
│   │   ├── ConcertDetailPage.tsx # 詳細ページ
│   │   ├── ConcertEditPage.tsx   # 編集ページ
│   │   ├── UploadPage.tsx        # 登録ページ
│   │   ├── CalendarPage.tsx      # カレンダー
│   │   ├── ArchivePage.tsx       # アーカイブ
│   │   ├── AdminPage.tsx         # 管理ダッシュボード
│   │   ├── ContactPage.tsx       # お問い合わせ
│   │   ├── DocsPage.tsx          # ドキュメント
│   │   ├── ApiDocsPage.tsx       # API仕様
│   │   └── AboutPage.tsx         # サイトについて
│   ├── components/
│   │   ├── NavBar.tsx       # デスクトップナビゲーション
│   │   ├── MobileTabBar.tsx # モバイル下タブバー
│   │   ├── ConcertCard.tsx  # 演奏会カード（モバイル横型/PC縦型）
│   │   ├── ConcertForm.tsx  # 登録・編集フォーム
│   │   ├── FlyerUploader.tsx # チラシアップロード（PDF→WebP変換）
│   │   ├── MapSection.tsx   # 地図（Leaflet + Google Maps連携）
│   │   ├── ShareButtons.tsx # SNS共有ボタン
│   │   ├── CalendarAddDropdown.tsx # カレンダー追加
│   │   ├── Calendar.tsx     # カレンダーUI
│   │   ├── FilterBar.tsx    # フィルターバー
│   │   ├── PricingEditor.tsx # 料金エディタ
│   │   ├── ProgramEditor.tsx # プログラムエディタ
│   │   ├── PerformerEditor.tsx # 出演者エディタ
│   │   ├── Modal.tsx / Toast.tsx / Footer.tsx
│   │   └── PasswordGate.tsx # パスワード認証
│   ├── hooks/
│   │   └── useDevice.ts    # モバイル/PC判定フック
│   ├── lib/
│   │   ├── api.ts          # APIクライアント
│   │   ├── constants.ts    # 定数（カテゴリ、専攻、大学会場等）
│   │   ├── utils.ts        # ユーティリティ関数
│   │   ├── slug.ts         # スラッグ生成
│   │   └── fingerprint.ts  # ブラウザフィンガープリント
│   └── types/
│       └── index.ts        # TypeScript型定義
├── functions/
│   └── api/
│       ├── concerts/[[path]].ts  # 演奏会CRUD API
│       ├── upload.ts             # チラシアップロードAPI
│       ├── image/[[key]].ts      # 画像配信（KV + エッジキャッシュ）
│       ├── admin/auth.ts         # 管理者認証
│       ├── contact.ts            # お問い合わせ
│       ├── feed/ics.ts           # ICSフィード
│       └── inquiries/[[path]].ts # お問い合わせ管理
├── wrangler.toml           # Cloudflare設定
├── tailwind.config.js      # Tailwind設定
├── vite.config.ts          # Vite設定
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
venue_name      TEXT
venue_json      TEXT            (Venue JSON)
category        TEXT NOT NULL
departments_json TEXT           (string[] JSON)
pricing_json    TEXT            (PricingItem[] JSON)
pricing_note    TEXT
seating         TEXT
ticket_url      TEXT
ticket_note     TEXT
program_json    TEXT            (ProgramItem[] JSON)
performers_json TEXT            (Performer[] JSON)
supervisors_json TEXT           (string[] JSON)
guest_artists_json TEXT         (string[] JSON)
contact_email   TEXT
contact_tel     TEXT
contact_person  TEXT
contact_url     TEXT
flyer_r2_keys   TEXT            (string[] JSON — KVキー配列)
flyer_thumbnail_key TEXT        (KVサムネイルキー)
views           INTEGER DEFAULT 0
source          TEXT DEFAULT 'manual'
source_url      TEXT
is_published    INTEGER DEFAULT 1
is_featured     INTEGER DEFAULT 0
is_deleted      INTEGER DEFAULT 0
deleted_at      TEXT
edit_password_hash TEXT         (SHA-256)
fingerprint     TEXT
created_at      TEXT
updated_at      TEXT
created_by      TEXT`}</Pre>

        <h4>主要な型定義（TypeScript）</h4>
        <Pre>{`
interface Concert {
  id: string; slug: string; title: string; subtitle: string;
  date: string; time_start: string; time_open: string; time_end: string;
  venue: Venue; category: string; departments: string[];
  pricing: PricingItem[]; pricing_note: string;
  seating: string; ticket_url: string; ticket_note: string;
  program: ProgramItem[]; performers: Performer[];
  supervisors: string[]; guest_artists: string[];
  contact_email: string; contact_tel: string;
  contact_person: string; contact_url: string;
  flyer_r2_keys: string[]; flyer_thumbnail_key: string;
  views: number; source: 'manual' | 'quick' | 'auto_scrape';
  is_published: number; is_featured: number; is_deleted: number;
  created_at: string; updated_at: string;
}

interface Venue {
  name: string; address?: string; lat?: number; lng?: number;
  access?: string[]; parking?: string;
}

interface PricingItem { label: string; amount: number; note?: string; }
interface ProgramItem { composer: string; piece: string; }
interface Performer { name: string; year?: string; instrument?: string; }`}</Pre>
      </Section>

      <Section id="api-ref" title="4. API リファレンス">
        <h4>演奏会 CRUD</h4>
        <Pre>{`
GET    /api/concerts         一覧取得
  ?page=1&limit=20          ページネーション
  ?category=recital          カテゴリフィルター
  ?search=キーワード          全文検索
  ?dateFrom=2025-01-01       日付範囲
  ?dateTo=2025-12-31
  ?sort=date_asc|date_desc|views_desc
  ?includeUnpublished=1      管理者用

GET    /api/concerts/:slug   詳細取得（閲覧数+1、分析レコード挿入）
POST   /api/concerts         新規作成（edit_password必須）
PUT    /api/concerts/:slug   更新（edit_password or admin_token必須）
DELETE /api/concerts/:slug   削除（soft delete, 90日後自動削除）

GET    /api/concerts/venues  会場一覧（過去の登録会場サジェスト用）`}</Pre>

        <h4>画像API</h4>
        <Pre>{`
GET    /api/image/:key       KVから画像取得（エッジキャッシュ付き）
                             Cache-Control: 30日
                             Cloudflare Cache APIでエッジキャッシュ

POST   /api/upload           チラシアップロード
  FormData: file (WebP), thumbnail (WebP), concert_slug
  Rate limit: 10回/時/IP`}</Pre>

        <h4>その他</h4>
        <Pre>{`
POST   /api/admin/auth       管理者認証 → token
POST   /api/contact          お問い合わせ送信
GET    /api/feed/ics          ICSカレンダーフィード
GET/PUT /api/inquiries        管理者用お問い合わせ管理`}</Pre>
      </Section>

      <Section id="storage" title="5. ストレージ設計">
        <h4>Cloudflare KV（画像ストレージ）</h4>
        <p>
          画像はすべて Cloudflare KV に保存されます（R2は使用していません）。
          KVの日次クォータを節約するため、画像配信にはCloudflare Cache APIによるエッジキャッシュを実装しています。
        </p>
        <Pre>{`
KV Key Format:
  flyer/{concertSlug}/{timestamp}.webp          フルサイズ画像
  flyer/{concertSlug}/{timestamp}_thumb.webp    サムネイル

KV Metadata: { contentType: 'image/webp' }

Cache Strategy:
  Browser: Cache-Control 30日
  Edge: Cloudflare Cache API (caches.default)
  → KV読取を大幅削減（同一画像は初回のみKV読取）`}</Pre>

        <h4>Cloudflare D1（SQLite）</h4>
        <p>
          全構造化データはD1に保存。JSONカラムでネスト構造を格納（venue_json, pricing_json等）。
        </p>
      </Section>

      <Section id="mobile-pc" title="6. モバイル/PC独立UI">
        <p>モバイルとPCでは完全に独立したUIを提供しています。</p>
        <Pre>{`
判定: useIsMobile() フック（MediaQuery: max-width 639px）

モバイル専用:
  - MobileTabBar: 下部固定タブバー（ホーム/一覧/カレンダー/登録/その他）
  - ConcertCard: 横型カードレイアウト（サムネ左＋情報右）
  - HomePage: コンパクトヒーロー、横スクロールカード、リスト表示
  - ConcertDetailPage: パンくずなし、コンパクトレイアウト
  - ヘッダー: ロゴのみのシンプルな上部バー

PC専用:
  - NavBar: トップ固定ナビゲーション
  - ConcertCard: 縦型カード（サムネ上＋情報下）
  - HomePage: フルサイズヒーロー、グリッドレイアウト
  - Footer: 3カラムフッター`}</Pre>
      </Section>

      <Section id="flyer" title="7. チラシ処理フロー">
        <Pre>{`
1. ユーザーがファイル選択（JPEG/PNG/WebP/GIF/PDF）
2. クライアントサイドで処理:
   - 画像: Canvas描画 → WebP変換（フル: 2000px/0.85品質, サムネ: 400px/0.7品質）
   - PDF: pdfjs-dist で各ページをCanvas描画 → WebP変換（最大4ページ）
         1ページ目 → サムネイル生成
         各ページ → 個別WebP画像として保存
3. FormData でサーバーにアップロード
4. サーバー: KVに保存、D1のflyer_r2_keys/flyer_thumbnail_keyを更新`}</Pre>
      </Section>

      <Section id="auth" title="8. 認証・セキュリティ">
        <Pre>{`
管理者認証:
  - パスワード → HMAC-SHA256比較 → JWTライクなトークン発行
  - X-Admin-Token ヘッダーで認証

編集認証:
  - 登録時パスワード → SHA-256ハッシュ化して保存
  - 編集時にパスワード送信 → ハッシュ比較

レート制限:
  - アップロード: 10回/時/IP (D1カウント)
  - 登録: 同一フィンガープリントで短時間重複防止

入力検証:
  - ReactデフォルトのXSSエスケープ
  - URLバリデーション（Google Maps URL解析時）
  - ファイルサイズ・MIME制限`}</Pre>
      </Section>

      <Section id="venues" title="9. 大学会場データ">
        <p>
          愛知県立芸術大学の学内会場はプリセットとして登録済みです。
          フォーム入力時にワンタップで住所・座標・アクセス情報が自動入力されます。
        </p>
        <Pre>{`
UNIVERSITY_VENUES:
  - 奏楽堂            (35.18392, 137.05519)
  - 講義棟ホール      (35.18350, 137.05480)
  - 新講義棟          (35.18370, 137.05500)
  - 音楽学部棟        (35.18360, 137.05460)

地図表示: Leaflet + OpenStreetMap
ルート: Google Maps Directions API
  - 県芸からのルート
  - 現在地からのルート
  - 車でのルート`}</Pre>
      </Section>

      <Section id="spec-diff" title="10. 仕様書との差異">
        <p>現在の実装と当初の仕様書で異なる点：</p>
        <Pre>{`
1. ストレージ: 仕様書はR2を想定 → 実際はKV使用（エッジキャッシュで補完）
2. PDF表示: 仕様書はiframe表示 → クライアントでWebP変換して画像表示
3. 登録モード: 仕様書は「かんたん登録」デフォルト → 「詳細登録」デフォルト
4. モバイルUI: 仕様書はレスポンシブCSS → 独立コンポーネント分岐
5. 大学スクレイピング: 仕様書はCRONで自動取得 → 現在手動登録のみ
6. Webhook通知: 仕様書はLINE/Discord通知 → 未実装
7. OGP画像: 仕様書は動的生成 → 静的OGPのみ
8. 管理者ログ: 仕様書は詳細な監査ログ → 基本的なアクセス統計のみ`}</Pre>
      </Section>

      <Section id="deploy" title="11. デプロイ・運用">
        <Pre>{`
ビルド:   npm run build (tsc && vite build)
デプロイ: git push origin main → Cloudflare Pages自動デプロイ
          wrangler pages deploy dist/ (手動デプロイ)

環境変数 (wrangler.toml):
  D1: ken-gei-prelude-db (binding: DB)
  KV: ken-gei-prelude-kv (binding: KV)

開発:
  npm run dev            フロントエンド開発サーバー
  npx wrangler dev       Workers開発サーバー`}</Pre>
      </Section>

      <Section id="ai-guide" title="12. AI向け実装ガイド">
        <p>別のAIがこのプロジェクトを理解・改変するためのガイドです。</p>
        <Pre>{`
重要な設計方針:
  - フロントエンドとバックエンドは同一リポジトリ
  - バックエンドは functions/ ディレクトリのCloudflare Pages Functions
  - JSON型カラムは _json サフィックス（venue_json, pricing_json等）
  - APIレスポンスは { ok: boolean, data?: T, error?: string } 形式
  - 画像キーは flyer_r2_keys だが実際はKVに保存（歴史的命名）
  - モバイル判定は useIsMobile() フックを使用（640px境界）
  - CSS はTailwind + index.css のカスタムクラス（.card, .btn-primary等）

変更時の注意:
  - KVクォータに注意（エッジキャッシュを必ず維持）
  - D1のスキーマ変更は wrangler d1 migrations で管理
  - フロントのビルドは tsc → vite build
  - 型定義は src/types/index.ts を更新
  - 新ページ追加時は App.tsx の Routes に追加

頻出パターン:
  - ページ追加: pages/ にコンポーネント作成 → App.tsx にRoute追加
  - API追加: functions/api/ にファイル作成 → api.ts にクライアント追加
  - カテゴリ追加: constants.ts の CATEGORIES に追加
  - 会場追加: constants.ts の UNIVERSITY_VENUES に追加`}</Pre>
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

function FAQ({ q, a }: { q: string; a: string }) {
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
