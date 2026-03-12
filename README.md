# 🎵 Crescendo（クレッシェンド）

> 若き音楽家たちの響きを、あなたの手のひらに。

愛知県立芸術大学 音楽学部の演奏会情報ポータルサイト。
演奏会の掲載・閲覧・検索・共有を誰でも無料で利用できます。

🌐 **サイト**: https://ken-gei-prelude.pages.dev

---

## ✨ 特徴

- **完全無料** — Cloudflare無料枠のみで運用（月間費用 ¥0）
- **誰でも登録** — アカウント不要。パスワードを設定するだけで演奏会登録
- **Google Maps連携** — URLを貼り付けるだけで会場情報を自動入力
- **柔軟な料金設定** — 大人/子供/学生などの料金区分をプリセットから簡単設定
- **スマホ対応** — Apple風のプレミアムデザイン、レスポンシブ対応
- **ページアニメーション** — 滑らかなトランジションと高級感のある演出
- **カレンダー連携** — Google / Apple / Outlook / TimeTree / Webcal購読
- **SNS共有** — X, LINE, Facebook, QRコード
- **地図・ルート案内** — Leaflet + OpenStreetMap（無料）
- **自動スクレイピング** — 大学公式サイトから演奏会情報を自動取得
- **過去歴演奏会アーカイブ** — 2022年から現在までの全公演を収録

---

## 🏗️ システムアーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│                   Client (Browser)                   │
│  React 18 + TypeScript + Tailwind CSS + React Router │
│  ┌──────────┐ ┌───────────┐ ┌──────────────────────┐ │
│  │ HomePage │ │ ConcertLst│ │ ConcertForm          │ │
│  │ (Hero +  │ │ (検索+ﾌｨﾙﾀ)│ │ (GoogleMaps URL自動) │ │
│  │ Upcoming)│ │           │ │ (料金プリセット)      │ │
│  └──────────┘ └───────────┘ └──────────────────────┘ │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS (REST API)
┌────────────────────▼────────────────────────────────┐
│          Cloudflare Pages Functions (Edge)            │
│  ┌────────────────┐  ┌────────────────────────────┐  │
│  │ /api/concerts/* │  │ /api/cron/scrape           │  │
│  │ CRUD + 検索     │  │ 大学サイト自動取得         │  │
│  │ バリデーション   │  │ ページネーション対応       │  │
│  │ フィンガープリント│  │ 詳細ページパース          │  │
│  └────────┬───────┘  └────────┬───────────────────┘  │
│           │                   │                      │
│  ┌────────▼───────────────────▼───────────────────┐  │
│  │                 Cloudflare D1                   │  │
│  │  concerts / venues / analytics / maintenance    │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │                 Cloudflare KV                   │  │
│  │  レート制限 / キャッシュ / セッション            │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│           GitHub Actions (Automation)                 │
│  ┌──────────────────┐  ┌───────────────────────────┐ │
│  │ deploy.yml       │  │ cron.yml                  │ │
│  │ push → build →   │  │ 毎日21:00 UTC → scrape   │ │
│  │ Cloudflare Pages │  │ → maintenance              │ │
│  └──────────────────┘  └───────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

---

## 🎨 デザインシステム

### カラーパレット

| 用途 | カラー | 例 |
|---|---|---|
| Primary (Gold) | `#c4ab6e` ~ `#876339` | ボタン、アクセント、タイトル |
| Accent (Burgundy) | `#c92e62` ~ `#a82150` | 強調、アラート |
| Navy (Background) | `#0f1225` ~ `#1a1f36` | ヒーロー、ナビ、フッター |
| Stone (Text) | `stone-100` ~ `stone-900` | 本文テキスト |

### タイポグラフィ

| フォント | 用途 |
|---|---|
| Cormorant Garamond | 見出し、ブランド名 |
| Noto Serif JP | 日本語見出し |
| Noto Sans JP | 本文テキスト |

### アニメーション

- **page-enter** — ルート遷移時のフェードイン+スライドアップ
- **blur-in** — ヒーローテキストのブラー解除エフェクト
- **scale-in** — カード出現時のスケールアニメーション
- **slide-up** — セクション出現時のスライドアップ

---

## 📱 ページ構成（12ページ）

| パス | ページ | 説明 |
|---|---|---|
| `/` | ホーム | ヒーロー、本日の公演、Upcoming、カテゴリ |
| `/concerts` | 演奏会一覧 | 検索・フィルタ・ソート対応の一覧表示 |
| `/concerts/:slug` | 演奏会詳細 | 地図・共有・カレンダー追加・QRコード |
| `/concerts/:slug/edit` | 編集 | パスワード認証付き編集 |
| `/calendar` | カレンダー | 月間ビューでの演奏会表示 |
| `/archive` | アーカイブ | 過去の演奏会を年度別に閲覧 |
| `/upload` | 演奏会登録 | かんたん/詳細モード切替対応 |
| `/admin` | 管理画面 | CRUD操作・スクレイピング実行・統計 |
| `/contact` | お問い合わせ | 暗号化されたメッセージ送信 |
| `/docs` | 使い方 | ユーザーガイド |
| `/docs/api` | API仕様 | 開発者向けAPIドキュメント |
| `/about` | サイト情報 | コンセプト・制作者・技術スタック |

---

## 🔧 主要機能の実装

### 📍 Google Maps URL自動入力

演奏会登録フォームで Google Maps の URL を貼り付けると、会場名と座標を自動抽出。対応フォーマット:
- `https://www.google.com/maps/place/会場名/@lat,lng,...`
- `https://maps.google.com/?q=lat,lng`
- `https://maps.app.goo.gl/...`（リダイレクト後解析）

### 💰 料金区分プリセット

| プリセット | 区分 |
|---|---|
| 無料 | 入場料: ¥0 |
| 一般/学生 | 一般: ¥1,000 / 学生: ¥500 |
| 大人/子供 | 大人: ¥1,000 / 子供: ¥500 |
| 一般/学生/子供 | 一般: ¥2,000 / 学生: ¥1,000 / 子供（中学生以下）: 無料 |

### 🔍 大学サイト自動スクレイピング

```
愛知県立芸術大学 イベントページ
  https://www.aichi-fam-u.ac.jp/event/music/
  ├── ページ1（最新） → 10件
  ├── ページ2 (/index_2.html) → 10件
  ├── ...
  └── ページ16 (/index_16.html) → 10件 (2022年7月まで)
  合計: 約160件のイベント

パース処理:
  1. <a class="eventList_item event"> を抽出
  2. event_date → YYYY-MM-DD に変換
  3. event_title → タイトル
  4. 詳細ページ → 日時/場所/出演者/プログラムを追加取得
  5. SHA-256フィンガープリントで重複排除
  6. D1に INSERT (is_published=1)
```

### 🔐 セキュリティ

- **パスワードハッシュ** — SHA-256 でハッシュ保存（平文保存なし）
- **レート制限** — KV ベースの IP レート制御
- **HMAC認証** — 管理者トークンは HMAC-SHA256 で検証
- **入力サニタイズ** — DOMPurify でXSS防止
- **暗号化お問い合わせ** — AES-GCM で問い合わせ内容を暗号化保存

---

## 🛠️ 技術スタック

| 層 | 技術 | 詳細 |
|---|---|---|
| フロントエンド | React 18 + TypeScript | SPA、コンポーネントベース |
| ビルド | Vite 5 | HMR、高速ビルド |
| スタイリング | Tailwind CSS 3 | カスタムカラーパレット、@layer |
| ルーティング | React Router v6 | 12ルート、ページトランジション |
| ホスティング | Cloudflare Pages | エッジデプロイ、無料SSL |
| API | Pages Functions | RESTful、Workers Runtime |
| データベース | Cloudflare D1 | SQLite互換、エッジDB |
| KV | Cloudflare KV | キャッシュ・レート制限 |
| 地図 | Leaflet + OpenStreetMap | 無料、OSS |
| 検索 | fuse.js | ファジー検索 |
| QRコード | qrcode.react | 演奏会共有用 |
| CI/CD | GitHub Actions | 自動ビルド・デプロイ・cron |

---

## 🚀 セットアップ

> 📖 **詳細なデプロイ手順は [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) を参照してください**

### 全自動セットアップ

```bash
git clone https://github.com/AI-Avalon/ken-gei-prelude.git
cd ken-gei-prelude
bash setup.sh
```

### 手動セットアップ

1. **依存関係のインストール**
   ```bash
   npm ci
   ```

2. **Cloudflare リソースの作成**
   ```bash
   npx wrangler d1 create ken-gei-prelude-db
   npx wrangler kv namespace create ken-gei-prelude-cache
   ```

3. **データベースの初期化**
   ```bash
   npx wrangler d1 execute ken-gei-prelude-db --remote --file=./migrations/0001_init.sql
   npx wrangler d1 execute ken-gei-prelude-db --remote --file=./migrations/0002_seed.sql
   ```

4. **Secrets の設定**
   ```bash
   npx wrangler secret put ADMIN_PASSWORD
   npx wrangler secret put CONTACT_ENCRYPTION_KEY
   npx wrangler secret put CRON_SECRET
   ```

5. **ビルド & デプロイ**
   ```bash
   npm run build
   npx wrangler pages deploy dist --project-name=ken-gei-prelude
   ```

6. **過去の演奏会を一括取得（オプション）**
   ```bash
   bash scripts/scrape-historical.sh
   ```

---

## 💻 開発

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview
```

---

## 📁 ディレクトリ構成

```
ken-gei-prelude/
├── .github/workflows/
│   ├── deploy.yml           # push → Cloudflare Pages デプロイ
│   └── cron.yml             # 毎日スクレイピング＋メンテナンス
├── functions/api/
│   ├── concerts/[[path]].ts # 演奏会 CRUD API (850行)
│   ├── cron/
│   │   ├── scrape.ts        # 大学サイトスクレイパー (380行)
│   │   └── maintenance.ts   # 自動メンテナンス
│   ├── feed/                # iCal / RSS フィード
│   └── contact/             # 暗号化お問い合わせ
├── migrations/
│   ├── 0001_init.sql        # テーブル定義
│   └── 0002_seed.sql        # 初期データ
├── scripts/
│   └── scrape-historical.sh # 過去イベント一括取得スクリプト
├── src/
│   ├── components/          # React コンポーネント (14個)
│   │   ├── NavBar.tsx       # グラスモーフィズムナビ
│   │   ├── Footer.tsx       # サイトフッター（管理者リンク含む）
│   │   ├── ConcertForm.tsx  # 演奏会登録（GoogleMaps連携）
│   │   ├── PricingEditor.tsx# 料金区分エディタ（プリセット付き）
│   │   ├── ConcertCard.tsx  # 演奏会カード
│   │   └── ...
│   ├── pages/               # 12 ページコンポーネント
│   │   ├── HomePage.tsx     # ヒーロー + Upcoming
│   │   ├── AdminPage.tsx    # 管理画面
│   │   └── ...
│   ├── lib/
│   │   ├── constants.ts     # サイト設定・カテゴリ・専攻
│   │   ├── api.ts           # API クライアント
│   │   └── utils.ts         # ユーティリティ関数
│   └── types/               # TypeScript 型定義
├── package.json
├── tailwind.config.js       # カスタムデザインシステム
└── KenGeiPrelude_完全仕様書_v4.0_FINAL.md  # 完全仕様書
```

---

## ⏰ 自動化スケジュール

| スケジュール | ワークフロー | タスク |
|---|---|---|
| push to main | deploy.yml | ビルド → Cloudflare Pages デプロイ |
| 毎日 06:00 JST | cron.yml | スクレイピング → メンテナンス |

### スクレイピング対象

- **通常実行**: 最新ページのみ（新規イベント取得）
- **一括実行**: 全16ページ（2022年〜現在の約160件）

---

## 📄 ライセンス

MIT License — 詳しくは [LICENSE](LICENSE) をご覧ください。
