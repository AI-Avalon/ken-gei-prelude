# 🎵 Ken-Gei Prelude 完全仕様書 v4.0（最終確定版）

## AIへの指示: この文書に基づき Ken-Gei Prelude を実装せよ

> **重要**: この文書は曖昧さゼロを目指した最終仕様書です。
> 「どうするか」が不明な箇所は存在しません。すべてこの文書に従ってください。
> 全自動セットアップスクリプト・ドキュメントページ・ヘルプページもこの仕様に含まれます。

---

## 第1章 プロジェクト定義

### 1.1 名称・コンセプト

| 項目 | 値 |
|---|---|
| システム名 | Ken-Gei Prelude（県芸プレリュード） |
| コンセプト | 若き才能の「前奏曲」を、手のひらの中に |
| ドメイン | `ken-gei-prelude.pages.dev`（Cloudflare Pages 無料サブドメイン） |
| リポジトリ | `github.com/AI-Avalon/ken-gei-prelude`（パブリック） |
| ライセンス | MIT |

### 1.2 このシステムの目的

愛知県立芸術大学 音楽学部のすべての演奏会情報を **掲載・閲覧・検索・共有** するポータルサイト。
**チケット販売・決済・座席予約は一切行わない。宣伝のみ。**

### 1.3 絶対条件

1. **完全無料**（月額¥0。Cloudflare無料枠+GitHub無料枠のみ）
2. **サーバーレス**（自前サーバーなし）
3. **スマホ・PC両対応**
4. **パブリックリポジトリ**で運用（秘密情報はCloudflare Secretsに格納）
5. **GitHub Actionsストレージを消費しない**（Direct Upload方式）
6. **未来永劫動く**（自動メンテナンス機構搭載）

### 1.4 ユーザー種別と権限

| 種別 | できること | 認証 |
|---|---|---|
| **閲覧者**（誰でも） | 演奏会一覧閲覧、詳細閲覧、検索、フィルター、カレンダー追加、SNS共有、お問い合わせ送信 | 不要 |
| **投稿者**（誰でも） | 演奏会の新規登録、チラシアップロード | 不要。ただし登録時に**編集用パスワード**を設定する |
| **投稿者（自分の投稿のみ）** | 自分が登録した演奏会の編集・削除 | 登録時に設定した**編集用パスワード**が必要 |
| **管理者** | 全演奏会の編集・削除、お問い合わせ閲覧、統計閲覧、設定変更 | **管理者パスワード**（Cloudflare Secretsに保存） |

---

## 第2章 インフラストラクチャ

### 2.1 技術スタック（確定）

| 層 | 技術 | 理由 |
|---|---|---|
| フロントエンド | **React 18 + Vite 5 + TypeScript** | 軽量・高速ビルド |
| スタイリング | **Tailwind CSS 3 + shadcn/ui** | ユーティリティCSS |
| ルーティング | **React Router v6** | SPA |
| ホスティング | **Cloudflare Pages** | 無料・CDN・自動HTTPS |
| API | **Cloudflare Pages Functions** (= Workers) | サーバーレス |
| データベース | **Cloudflare D1** (SQLite) | 5GB無料 |
| ファイルストレージ | **Cloudflare R2** | 10GB無料・エグレス無料 |
| キャッシュ | **Cloudflare KV** | 閲覧数キャッシュ等 |
| 定時実行 | **Cloudflare Workers Cron Triggers** | スクレイピング・自動メンテ |
| 検索 | **fuse.js** | クライアントサイド曖昧検索 |
| QRコード | **qrcode.react** | |
| 地図 | **Leaflet + OpenStreetMap** | 完全無料・APIキー不要 |
| バックアップ | **GitHub Releases** | 無制限・無料 |

### 2.2 GitHub Actions 方針

```
方式: Direct Upload
仕組み: ビルド後に wrangler pages deploy で直接Cloudflareへ転送
        actions/upload-artifact を使わない → Storage消費ゼロ
パブリックリポジトリの場合: minutes も無制限・無料
```

### 2.3 容量試算

| データ | 1件あたり | 年100件 | 10年 | 無料枠 | 満タンまで |
|---|---|---|---|---|---|
| D1（テキストデータ） | 3KB | 300KB | 3MB | 5GB | ~1,600年 |
| R2（画像） | 200KB | 20MB | 200MB | 10GB | ~500年 |

### 2.4 秘密情報の管理場所

| 情報 | 保存場所 | コードに含めるか |
|---|---|---|
| `ADMIN_PASSWORD` | `wrangler secret put ADMIN_PASSWORD` | **絶対に含めない** |
| `CONTACT_ENCRYPTION_KEY` | `wrangler secret put CONTACT_ENCRYPTION_KEY` | **絶対に含めない** |
| `CLOUDFLARE_API_TOKEN` | GitHub Repository Secrets | **絶対に含めない** |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Repository Secrets | **絶対に含めない** |
| `wrangler.toml`（IDを含む） | `.gitignore`で除外。テンプレートのみ公開 | **含めない** |

---

## 第3章 全ページ一覧とURL設計

### 3.1 ページ一覧（確定・全12ページ）

| # | URL | ページ名 | 概要 | 認証 |
|---|---|---|---|---|
| 1 | `/` | トップページ | 今日の演奏会、今後の一覧、統計 | 不要 |
| 2 | `/concerts` | 演奏会一覧 | 全演奏会をカード表示。日付と会場が見え、タップで詳細へ | 不要 |
| 3 | `/concerts/:slug` | 演奏会詳細 | 1件の全情報。地図・カレンダー・共有 | 不要 |
| 4 | `/calendar` | カレンダー | 月表示。過去にも遡れる | 不要 |
| 5 | `/archive` | アーカイブ検索 | 全件フィルター・並び替え・検索 | 不要 |
| 6 | `/upload` | 演奏会登録 | 誰でも登録可。かんたん/詳細の2モード | 不要 |
| 7 | `/concerts/:slug/edit` | 演奏会編集 | 登録時パスワード入力で編集 | **投稿パスワード** |
| 8 | `/admin` | 管理ダッシュボード | 統計・全件管理・お問い合わせ閲覧 | **管理者パスワード** |
| 9 | `/contact` | お問い合わせ | フォーム送信 | 不要 |
| 10 | `/docs` | ドキュメント・使い方 | サイトの使い方説明 | 不要 |
| 11 | `/docs/api` | API仕様 | 開発者向けAPI説明 | 不要 |
| 12 | `/about` | このサイトについて | コンセプト・運営情報 | 不要 |

### 3.2 演奏会のURL（slug）生成ルール

各演奏会には **一意のslug** を割り当てる。URLの衝突を絶対に防ぐ。

```
生成方式:
1. 日付（YYYYMMDD）+ ハイフン + タイトルのローマ字/英語部分の先頭20文字をslugify
2. 末尾に nanoid 6文字を付与（衝突防止の保険）

例:
  タイトル: "Ensemble Celliberta 18th Concert"
  日付: 2025-02-19
  → slug: "20250219-ensemble-celliberta-18th-a3xk9m"

  タイトル: "第58回 定期演奏会"
  日付: 2025-03-15
  → slug: "20250315-teiki-ensoukai-58-b7yn2p"

slugify関数:
  - 英数字・ハイフンのみ残す
  - 日本語タイトルはカテゴリIDで代替（例: "teiki-ensoukai"）
  - 空白→ハイフン
  - 小文字化
  - 末尾に nanoid(6) を追加
  - 最大60文字

DB上の一意性:
  - slugカラムに UNIQUE制約
  - INSERT時にUNIQUE違反→nanoid部分を再生成して再試行（最大3回）
```

---

## 第4章 データモデル（確定）

### 4.1 concerts テーブル

```sql
CREATE TABLE concerts (
  -- 識別子
  id              TEXT PRIMARY KEY,           -- nanoid(12)。内部ID
  slug            TEXT NOT NULL UNIQUE,       -- URL用。上記ルールで生成
  fingerprint     TEXT UNIQUE,                -- 重複検知用SHA-256

  -- 基本情報
  title           TEXT NOT NULL,              -- 演奏会名
  subtitle        TEXT DEFAULT '',            -- サブタイトル
  description     TEXT DEFAULT '',            -- 説明文（Markdown不可。プレーンテキスト）

  -- 日時
  date            TEXT NOT NULL,              -- ISO: "2025-02-19"
  time_open       TEXT DEFAULT '',            -- "17:30"
  time_start      TEXT NOT NULL,              -- "18:00"
  time_end        TEXT DEFAULT '',            -- "20:00"（空欄可。空欄時は開演+2時間で計算）

  -- 会場（JSON文字列）
  venue_json      TEXT NOT NULL DEFAULT '{"name":""}',
  -- 構造: {"name":"緑文化小劇場","address":"...","postal":"458-0044",
  --         "lat":35.0691,"lng":136.9658,"tel":"052-879-6006",
  --         "access":["地下鉄桜通線「徳重」下車 2番出口すぐ"],
  --         "parking":"48台(300円)"}

  -- 分類
  category        TEXT NOT NULL DEFAULT 'other',   -- カテゴリID
  departments_json TEXT DEFAULT '[]',              -- JSON: ["strings","ensemble"]
  instruments_json TEXT DEFAULT '[]',              -- JSON: ["チェロ"]
  tags_json        TEXT DEFAULT '[]',              -- JSON: ["室内楽"]

  -- 料金（JSON配列）
  pricing_json    TEXT DEFAULT '[{"label":"入場料","amount":0}]',
  -- 構造: [{"label":"一般","amount":2000},{"label":"学生","amount":1000,"note":"要学生証"}]
  pricing_note    TEXT DEFAULT '',              -- 全体備考: "未就学児入場不可"

  -- 座席・チケット
  seating         TEXT DEFAULT '',              -- "全席自由" / "全席指定" / "自由席"
  ticket_url      TEXT DEFAULT '',              -- 外部チケットサイトURL（販売はしない）
  ticket_note     TEXT DEFAULT '',              -- "○○にて整理券配布"

  -- プログラム（JSON配列）
  program_json    TEXT DEFAULT '[]',
  -- 構造: [{"composer":"David Popper","piece":"Polonaise de Concert"}]

  -- 出演者（JSON配列）
  performers_json TEXT DEFAULT '[]',
  -- 構造: [{"name":"窪田翔那","year":"大学院博士前期1年","instrument":"チェロ"}]
  supervisors_json TEXT DEFAULT '[]',
  -- 構造: ["西谷牧人（准教授）"]
  guest_artists_json TEXT DEFAULT '[]',

  -- 連絡先
  contact_email   TEXT DEFAULT '',
  contact_tel     TEXT DEFAULT '',
  contact_person  TEXT DEFAULT '',
  contact_url     TEXT DEFAULT '',

  -- チラシ画像
  flyer_r2_keys   TEXT DEFAULT '[]',           -- R2に保存した画像のキー配列
  -- 構造: ["flyers/20250219-ensemble-a3xk9m/1.webp","flyers/.../2.webp"]
  flyer_thumbnail_key TEXT DEFAULT '',          -- サムネイル（R2キー）

  -- 統計
  views           INTEGER DEFAULT 0,

  -- 登録元
  source          TEXT DEFAULT 'manual',       -- "manual" / "quick" / "auto_scrape"
  source_url      TEXT DEFAULT '',

  -- 公開制御
  is_published    INTEGER DEFAULT 1,           -- 0=非公開, 1=公開
  is_featured     INTEGER DEFAULT 0,           -- 1=おすすめ
  is_deleted      INTEGER DEFAULT 0,           -- 1=論理削除（ゴミ箱）
  deleted_at      TEXT DEFAULT '',             -- 論理削除日時（30日後に物理削除）

  -- 編集用パスワード（bcryptハッシュ）
  edit_password_hash TEXT NOT NULL,             -- 投稿者が設定。編集・削除時に要求

  -- タイムスタンプ
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  created_by      TEXT DEFAULT 'public'
);

-- インデックス
CREATE INDEX idx_concerts_slug ON concerts(slug);
CREATE INDEX idx_concerts_date ON concerts(date);
CREATE INDEX idx_concerts_category ON concerts(category);
CREATE INDEX idx_concerts_published ON concerts(is_published, is_deleted);
CREATE INDEX idx_concerts_views ON concerts(views DESC);
```

### 4.2 その他テーブル

```sql
-- 閲覧ログ
CREATE TABLE analytics (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  concert_id  TEXT NOT NULL,
  viewed_at   TEXT DEFAULT (datetime('now')),
  referrer    TEXT DEFAULT '',
  user_agent  TEXT DEFAULT ''
);
CREATE INDEX idx_analytics_concert ON analytics(concert_id);
CREATE INDEX idx_analytics_date ON analytics(viewed_at);

-- お問い合わせ（name/emailはAES-256-GCM暗号化保存）
CREATE TABLE inquiries (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name_encrypted  TEXT NOT NULL,
  email_encrypted TEXT NOT NULL,
  subject         TEXT NOT NULL,
  message         TEXT NOT NULL,
  concert_id      TEXT DEFAULT '',    -- 関連演奏会のslug（任意）
  status          TEXT DEFAULT 'unread', -- "unread" / "read" / "replied"
  admin_note      TEXT DEFAULT '',       -- 管理者メモ
  created_at      TEXT DEFAULT (datetime('now'))
);

-- 会場マスター（サジェスト用。過去の入力から自動蓄積）
CREATE TABLE venues (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  data_json TEXT NOT NULL DEFAULT '{}'
);

-- レート制限
CREATE TABLE rate_limits (
  ip          TEXT NOT NULL,
  endpoint    TEXT NOT NULL,
  attempts    INTEGER DEFAULT 1,
  last_attempt TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (ip, endpoint)
);

-- 自動メンテナンスログ
CREATE TABLE maintenance_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task        TEXT NOT NULL,
  result      TEXT NOT NULL,
  details     TEXT DEFAULT '',
  executed_at TEXT DEFAULT (datetime('now'))
);
```

---

## 第5章 各ページの詳細仕様

### 5.1 演奏会一覧ページ (`/concerts`)

**目的**: 全演奏会を「日付と会場だけ見えるカード」で一覧表示。気になったらタップして詳細へ。

**レイアウト**:
```
┌─────────────────────────────────────────┐
│ 🔍 検索...               [絞り込み ▼]   │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐ ┌──────────────┐      │
│  │ 2/19(水)      │ │ 3/15(土)      │      │
│  │ 緑文化小劇場   │ │ 芸術劇場      │      │
│  │               │ │               │      │
│  │ Ensemble      │ │ 第58回        │      │
│  │ Celliberta    │ │ 定期演奏会    │      │
│  │ 18th Concert  │ │               │      │
│  │               │ │               │      │
│  │ 🎻 弦楽器     │ │ 🎵 オケ       │      │
│  │ ¥1,000       │ │ 無料          │      │
│  │ あと5日 👁342 │ │ あと29日 👁1.2K│      │
│  └──────────────┘ └──────────────┘      │
│                                         │
│  ┌──────────────┐ ┌──────────────┐      │
│  │ ...           │ │ ...           │      │
│  └──────────────┘ └──────────────┘      │
│                                         │
│  [もっと見る（20件ずつ読み込み）]          │
└─────────────────────────────────────────┘
```

**カード1枚に表示する情報（これだけ）**:
- 日付（大きく。「2/19(水)」形式）
- 会場名
- タイトル（2行まで。超過は...）
- カテゴリバッジ（色付き小ラベル）
- 専攻アイコン（最大2個）
- 料金（「¥1,000」「無料」等）
- あと○日 / 本日！ / 終了
- 閲覧数

**タップ時**: `/concerts/:slug` へ遷移

**ページネーション**: 最初20件表示。下部に「もっと見る」ボタンで20件ずつ追加読み込み（Infinite Scroll ではない。明示的ボタン）

**並び替え**: デフォルト=日付新しい順。ドロップダウンで切り替え可能（日付昇順/降順、閲覧数、タイトル）

**簡易フィルター**: ページ上部にカテゴリチップ。タップでその種類のみ表示

### 5.2 演奏会詳細ページ (`/concerts/:slug`)

**URL例**: `/concerts/20250219-ensemble-celliberta-18th-a3xk9m`

**このURLの一意性保証**:
- slug は DB で UNIQUE 制約
- 生成時に nanoid(6) サフィックスで衝突を事実上排除
- 万一衝突した場合は nanoid を再生成して再試行

**表示情報（上から順に）**:

1. **パンくずリスト**: ホーム > 演奏会一覧 > {タイトル}
2. **カテゴリバッジ**（色付き）
3. **タイトル**（大見出し、font-serif）
4. **サブタイトル**
5. **基本情報テーブル**:

| 項目 | 表示例 |
|---|---|
| 日時 | 2025年2月19日（水）18:00開演（17:30開場） |
| 会場 | 緑文化小劇場 |
| 座席 | 全席自由 |

6. **料金表**（pricing_json から生成）:
```
┌──────────────────────────┐
│ 料金                      │
│  一般      ¥2,000         │
│  学生      ¥1,000 要学生証│
│  高校生以下   無料         │
│                          │
│  ⚠ 未就学児入場不可       │
└──────────────────────────┘
```

7. **チラシ画像**（あれば。WebP表示。タップで拡大モーダル。スワイプで複数枚切替）
8. **プログラム**（作曲者 | 曲名 の表）
9. **出演者一覧**（名前、学年、楽器 のグリッド）
10. **指導者一覧**
11. **説明文**（プレーンテキスト、改行保持）
12. **連絡先**（メール、電話、代表者名、URL）
13. **地図・ルート案内セクション**（後述第9章）
14. **カレンダー追加ドロップダウン**（後述第10章）
15. **共有ボタン群**（後述第11章）
16. **関連演奏会**（同カテゴリまたは同専攻の他の演奏会3件）
17. **閲覧数**（「👁 342 回閲覧」）
18. **「✏️ この演奏会を編集」リンク** → `/concerts/:slug/edit`

### 5.3 演奏会編集ページ (`/concerts/:slug/edit`)

1. まず**パスワード入力画面**を表示:
```
┌──────────────────────────┐
│ 🔒 編集パスワード         │
│                          │
│ この演奏会を登録した際に  │
│ 設定したパスワードを      │
│ 入力してください          │
│                          │
│ [________パスワード______]│
│                          │
│ [認証する]                │
└──────────────────────────┘
```

2. パスワードが合致したら（edit_password_hash と照合）、登録時と同じフォームに既存データを入力した状態で表示
3. 編集保存 or 削除ボタンを表示
4. 削除時: 「本当に削除しますか？」確認ダイアログ → 論理削除（is_deleted=1）

**パスワード照合方法**:
- 登録時: パスワードをSHA-256ハッシュ化して `edit_password_hash` に保存
- 編集時: 入力されたパスワードをSHA-256して比較
- 5回失敗 → 15分ロック（rate_limits テーブルで管理）

### 5.4 管理ダッシュボード (`/admin`)

**管理者パスワード**による認証必須（Cloudflare Secretsの `ADMIN_PASSWORD` と比較）。

**タブ構成**:

| タブ | 内容 |
|---|---|
| 概要 | 統計カード（総登録数、今後の公演数、終了済み、総閲覧数、今月の閲覧数）+ 直近10件テーブル + アラート |
| 演奏会管理 | 全件テーブル（タイトル/日付/会場/カテゴリ/閲覧数/ステータス/操作）。編集・削除・公開切替。管理者は投稿パスワード不要で操作可能 |
| **お問い合わせ** | inquiriesテーブルの全件表示。復号して名前・メール・件名・メッセージ・送信日時を表示。ステータス切替（未読→既読→返信済）。管理者メモ欄 |
| チラシ管理 | R2に保存された画像一覧。未紐付けファイル・孤立ファイルの検出 |
| 分析 | 閲覧数上位ランキング、カテゴリ別分布、日別閲覧数推移 |
| 設定 | 大学サイトスクレイピングURL、バックアップ手動実行 |
| メンテナンスログ | maintenance_log テーブルの表示。自動メンテの実行履歴 |

**お問い合わせ閲覧の詳細**:
```
┌───────────────────────────────────────────────────┐
│ お問い合わせ一覧                        [未読のみ ▼]│
├───┬──────┬──────────┬──────┬────────┬──────────────┤
│ # │ 状態 │ 名前      │ 件名 │ 日時    │ 操作         │
├───┼──────┼──────────┼──────┼────────┼──────────────┤
│ 1 │ 🔴   │ 田中太郎  │ 掲載 │ 3/11   │ [詳細] [既読]│
│ 2 │ 🟢   │ 佐藤花子  │ 修正 │ 3/10   │ [詳細]       │
└───┴──────┴──────────┴──────┴────────┴──────────────┘
```

「詳細」クリック → モーダルで全文表示（復号されたメール、メッセージ全文、関連演奏会リンク）

### 5.5 ドキュメント・使い方ページ (`/docs`)

**静的ページ（Reactコンポーネントとして記述）** に以下のセクションを含める:

1. **Ken-Gei Prelude とは**: サイトの目的・対象者
2. **演奏会を見る**: 一覧の見方、フィルターの使い方、カレンダーの使い方
3. **演奏会を登録する**: かんたん登録と詳細登録の使い分け。編集用パスワードの重要性。チラシアップロードの対応形式
4. **カレンダーに追加する**: 各サービスへの追加方法（Google/Apple/TimeTree/Outlook）。Webcal購読の設定方法
5. **共有する**: SNS共有、QRコード、LINE/X/Instagram
6. **登録した演奏会を編集・削除する**: 編集用パスワードの入力方法
7. **お問い合わせ**: 掲載依頼、情報修正依頼の手順
8. **管理者向け**: 管理画面の使い方（管理者のみ対象）
9. **API仕様** → `/docs/api` へリンク
10. **よくある質問（FAQ）**:
    - Q: 無料ですか？ → A: 完全無料
    - Q: 誰でも登録できますか？ → A: はい
    - Q: 登録を削除したい → A: 登録時のパスワードで削除可能
    - Q: チケットは買えますか？ → A: チケット販売は行っていません

### 5.6 このサイトについてページ (`/about`)

- Ken-Gei Prelude のコンセプト
- 愛知県立芸術大学の紹介（住所、最寄り駅、公式サイトリンク）
- 技術スタック（オープンソース。MITライセンス）
- GitHubリポジトリリンク
- お問い合わせフォームへのリンク

---

## 第6章 ファイルアップロード仕様（確定）

### 6.1 対応形式・サイズ制限

| 形式 | MIME type | アップロード上限 | 変換先 | 変換後上限 |
|---|---|---|---|---|
| **PDF** | `application/pdf` | **10MB** | WebP（各ページ） | 2MB/ページ |
| **JPEG** | `image/jpeg` | **5MB** | WebP | 2MB |
| **PNG** | `image/png` | **5MB** | WebP | 2MB |
| **WebP** | `image/webp` | **5MB** | そのまま保存 | 2MB |
| **GIF** | `image/gif` | **5MB** | WebP（最初のフレーム） | 2MB |
| その他 | — | — | **拒否** | — |

### 6.2 アップロード→保存フロー

```
1. ユーザーがファイルをドラッグ&ドロップまたはファイル選択
   ↓
2. クライアントサイドチェック:
   - MIME typeチェック（上記以外→エラー「対応していない形式です」）
   - ファイルサイズチェック（PDF: 10MB超→エラー / 画像: 5MB超→エラー）
   ↓
3. クライアントサイド変換:
   - PDF → pdf.js でページごとにCanvas描画 → Canvas.toBlob('image/webp', 0.85)
     → 最大2ページまで変換（チラシ表裏を想定）
     → 3ページ以上の場合は「最初の2ページのみ変換しました」と通知
   - JPEG/PNG/GIF → new Image() → Canvas → Canvas.toBlob('image/webp', 0.85)
   - WebP → そのまま
   - 長辺が 2000px を超える場合 → 2000px にリサイズ
   - 変換後 2MB を超える場合 → quality を 0.7 に下げて再変換
   ↓
4. サムネイル生成（クライアントサイド）:
   - 幅 400px にリサイズした WebP（quality: 0.7）
   ↓
5. API にアップロード（POST /api/upload）:
   - FormData: { file: Blob, thumbnail: Blob, concert_slug: string }
   ↓
6. Cloudflare Worker:
   - R2に保存:
     本体:   flyers/{concert_slug}/{timestamp}.webp
     サムネ: flyers/{concert_slug}/{timestamp}_thumb.webp
   - D1の concerts テーブルの flyer_r2_keys, flyer_thumbnail_key を更新
   ↓
7. レスポンス: { ok: true, key: "flyers/...", thumbnail_key: "flyers/..._thumb" }
   ↓
8. フロントエンド: プレビュー表示
```

### 6.3 R2の公開設定

R2バケットはデフォルト非公開。画像配信は **Cloudflare Worker 経由** で行う。

```
GET /api/image/:key → Worker が R2 から取得して返す
  Content-Type: image/webp
  Cache-Control: public, max-age=604800 (7日間)
```

### 6.4 エラーケース

| ケース | エラーメッセージ |
|---|---|
| 非対応形式 | 「対応していないファイル形式です。PDF、JPEG、PNG、WebPをアップロードしてください」 |
| サイズ超過（画像） | 「ファイルサイズが5MBを超えています。圧縮してから再度お試しください」 |
| サイズ超過（PDF） | 「PDFのサイズが10MBを超えています」 |
| PDF暗号化 | 「パスワード保護されたPDFには対応していません」 |
| 変換失敗 | 「ファイルの変換に失敗しました。別のファイルをお試しください」 |
| アップロード失敗 | 「アップロードに失敗しました。通信環境を確認して再度お試しください」（リトライ3回後に表示） |

---

## 第7章 登録フォーム仕様（確定）

### 7.1 共通: 編集用パスワード

**すべての登録フォームに必須項目として「編集用パスワード」を設ける。**

```
┌─────────────────────────────────┐
│ 🔑 編集用パスワード *           │
│ [________________________________]│
│                                 │
│ 💡 あとからこの演奏会を         │
│    編集・削除する際に必要です。  │
│    忘れないようにメモして        │
│    ください。                   │
└─────────────────────────────────┘
```

- 4文字以上必須
- SHA-256ハッシュ化して `edit_password_hash` に保存
- 平文はサーバーに保存しない

### 7.2 ⚡ かんたん登録モード

| # | フィールド | 必須 | 入力タイプ | 備考 |
|---|---|---|---|---|
| 1 | タイトル | ✅ | テキスト（max 100文字） | |
| 2 | 日付 | ✅ | date picker | |
| 3 | 開演時刻 | ✅ | time picker | |
| 4 | 会場名 | ✅ | テキスト（サジェスト付き） | 過去の会場名を候補表示。選択→住所等自動入力 |
| 5 | カテゴリ | ✅ | ドロップダウン | |
| 6 | 編集用パスワード | ✅ | パスワード（4文字以上） | |
| 7 | 専攻 | — | チップ複数選択 | |
| 8 | 料金（テキスト） | — | テキスト | 「無料」「1000円」→自動でpricing_json生成 |
| 9 | チラシ | — | ファイルアップロード | |

### 7.3 🔧 詳細登録モード

かんたん登録の全フィールド + 以下:

| # | フィールド | 入力タイプ | 備考 |
|---|---|---|---|
| 10 | サブタイトル | テキスト | |
| 11 | 開場時刻 | time picker | |
| 12 | 終演予定 | time picker | |
| 13 | 住所 | テキスト | 会場名サジェスト時に自動入力 |
| 14 | アクセス | テキストエリア（1行1項目） | |
| 15 | 駐車場 | テキスト | |
| 16 | 料金区分（動的） | 行を追加/削除するUI | [区分名][金額][備考][🗑] + [+追加] |
| 17 | 料金全体備考 | テキスト | 「未就学児入場不可」等 |
| 18 | 座席種別 | セレクト | 全席自由/全席指定/自由席 |
| 19 | プログラム（動的） | 行を追加/削除 | [作曲者][曲名][🗑] + [+追加] |
| 20 | 出演者（動的） | 行を追加/削除 | [名前][学年][楽器][🗑] + [+追加] |
| 21 | 指導者（動的） | 行を追加/削除 | [名前（肩書）][🗑] |
| 22 | 説明文 | テキストエリア | |
| 23 | 連絡先メール | email | |
| 24 | 連絡先電話 | tel | |
| 25 | 代表者名 | テキスト | |
| 26 | 公式URL/SNS | URL | |

---

## 第8章 大学公式サイト解析（確定）

### 8.1 対象URL

```
https://www.aichi-fam-u.ac.jp/event/music/
```

### 8.2 スクレイピング方法

**Cloudflare Workers Cron Trigger** で毎朝6:00 JST に実行。

```toml
# wrangler.toml
[triggers]
crons = ["0 21 * * *"]  # UTC 21:00 = JST 06:00
```

### 8.3 解析ロジック（擬似コード）

```typescript
// /functions/cron/scrape.ts

export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    try {
      // 1. 大学サイトを fetch
      const res = await fetch('https://www.aichi-fam-u.ac.jp/event/music/');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      // 2. HTMLからイベントリストを抽出
      //    大学サイトの構造: <div class="event-list"> の中に
      //    <article> or <li> で各イベントが並ぶ想定
      //    構造が変わったらパース失敗→エラーログ
      const events = parseEventList(html);

      // 3. 各イベントの詳細ページをfetch（あれば）
      for (const ev of events) {
        if (ev.detailUrl) {
          const detailHtml = await fetch(ev.detailUrl).then(r => r.text());
          Object.assign(ev, parseDetailPage(detailHtml));
        }
      }

      // 4. 既存データとの差分検知
      for (const ev of events) {
        const fingerprint = await generateFingerprint(ev.date, ev.venue, ev.title);
        const existing = await env.DB.prepare(
          'SELECT id FROM concerts WHERE fingerprint = ?'
        ).bind(fingerprint).first();

        if (!existing) {
          // 新規 → 下書き状態で保存
          await env.DB.prepare(
            `INSERT INTO concerts (id, slug, fingerprint, title, date, time_start,
             venue_json, category, source, source_url, is_published, edit_password_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'auto_scrape', ?, 0, 'auto_generated')`
          ).bind(
            nanoid(12), generateSlug(ev.date, ev.title),
            fingerprint, ev.title, ev.date, ev.timeStart,
            JSON.stringify({ name: ev.venue }), 'daigaku', ev.sourceUrl
          ).run();
        }
      }

      // 5. メンテナンスログ記録
      await env.DB.prepare(
        "INSERT INTO maintenance_log (task, result, details) VALUES ('scrape', 'success', ?)"
      ).bind(`${events.length} events found`).run();

    } catch (e: any) {
      // エラーログ
      await env.DB.prepare(
        "INSERT INTO maintenance_log (task, result, details) VALUES ('scrape', 'error', ?)"
      ).bind(e.message).run();
    }
  }
};

function parseEventList(html: string): Event[] {
  // 正規表現またはDOMParser的な手法でリスト抽出
  // 大学サイトの構造が変わった場合は空配列を返す（エラーにはしない）
  const events: Event[] = [];
  
  // パターン1: <a href="...">タイトル</a> + 日付テキスト
  // パターン2: <article>...</article>
  // ※大学サイトの実際の構造に合わせて調整必要
  
  // 日付の抽出: "2025年3月15日" → "2025-03-15"
  // 会場の抽出: テキストから会場名を探す
  // タイトルの抽出: リンクテキストまたは見出し要素
  
  return events;
}
```

### 8.4 自動取得データの扱い

- `source = "auto_scrape"` で保存
- `is_published = 0`（非公開。管理者が確認後に公開）
- `edit_password_hash = "auto_generated"`（管理者のみ編集可能。投稿者パスワードは設定されない）
- 管理ダッシュボードに「自動取得 未公開」バッジで表示

### 8.5 サイト構造変更への対処

- パース結果が0件 → 「異常」と判断し maintenance_log に記録
- 3日連続0件 → 管理者にメール通知（Resend APIまたはD1の問い合わせテーブル経由で把握）
- 管理者が手動でパーサーを修正（HTMLの構造に合わせてコード更新）

---

## 第9章 地図・ルート案内（確定）

### 9.1 地図表示

**Leaflet + OpenStreetMap**。APIキー不要・完全無料。

会場の latitude/longitude が venue_json に入っていれば地図を表示。入っていなければ「地図情報がありません」と表示。

### 9.2 ルートボタン

| ボタンラベル | 出発地 | 移動手段 | URL |
|---|---|---|---|
| 🚃 県芸からのルート | 愛知県立芸術大学（固定） | 公共交通機関 | `google.com/maps/dir/?api=1&origin=愛知県立芸術大学&destination={住所}&travelmode=transit` |
| 📍 現在地からのルート | ブラウザ Geolocation API | 公共交通機関 | Geolocation → Google Maps URL |
| 🚗 車で行く | ブラウザ Geolocation API | 車 | `travelmode=driving` |

---

## 第10章 カレンダー連携（確定）

### 10.1 対応サービスとURL

| サービス | 方式 |
|---|---|
| Google カレンダー | `calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&location=...&ctz=Asia/Tokyo` |
| Apple / iCal | `.ics` ファイルダウンロード |
| TimeTree | `.ics` ファイルダウンロード（TimeTree API は終了済み） |
| Outlook | `outlook.office.com/calendar/deeplink/compose?subject=...&startdt=...&location=...` |
| Yahoo! | `calendar.yahoo.co.jp/?v=60&TITLE=...&ST=...&in_loc=...` |
| ICSダウンロード | `.ics` ファイル直接ダウンロード |

### 10.2 Webcal購読

```
URL: webcal://ken-gei-prelude.pages.dev/api/feed/ics
```

Worker が全公開演奏会を含む ICS フィードを返す。カレンダーアプリが定期的にこのURLを読み込み、新しい演奏会が自動で同期される。

---

## 第11章 共有・SNS連携（確定）

| ボタン | 動作 |
|---|---|
| 📋 リンクコピー | `navigator.clipboard.writeText(url)` → トースト「コピーしました」 |
| X(Twitter) | `twitter.com/intent/tweet?text={タイトル} {日時} @{会場} #愛知県芸 #演奏会&url={url}` |
| LINE | `social-plugins.line.me/lineit/share?url={url}` |
| Instagram | Web Share API（モバイル） / QRコード表示（PC） |
| Facebook | `facebook.com/sharer/sharer.php?u={url}` |
| QR | react-qr-code でモーダル表示 |

---

## 第12章 お問い合わせ（確定）

### 12.1 フォーム

| フィールド | 必須 | バリデーション |
|---|---|---|
| お名前 | ✅ | 1〜50文字 |
| メール | ✅ | メール形式チェック |
| 件名 | ✅ | セレクト: 掲載依頼/情報修正/バグ報告/その他 |
| 関連する演奏会 | — | セレクト（登録済みリスト） |
| メッセージ | ✅ | 10〜2000文字 |

### 12.2 保存

- `name` と `email` は AES-256-GCM 暗号化して D1 に保存
- 暗号化キー: `CONTACT_ENCRYPTION_KEY`（Cloudflare Secrets）
- `message` と `subject` はプレーンテキストで保存（個人情報ではないため）

### 12.3 管理者での閲覧

管理ダッシュボードの「お問い合わせ」タブで、暗号化された name/email を復号して表示。ステータス管理（未読/既読/返信済）。

---

## 第13章 自動メンテナンス機構（確定）

### 13.1 Cron Trigger 一覧

| Cron式 | JST | タスク |
|---|---|---|
| `0 21 * * *` | 毎朝6:00 | 大学サイトスクレイピング |
| `0 18 1 * *` | 毎月1日 3:00 | 古い閲覧ログ削除（6ヶ月超） |
| `0 18 1 * *` | 毎月1日 3:00 | 論理削除から30日超の物理削除 |
| `0 18 1 * *` | 毎月1日 3:00 | レート制限テーブルのクリア |
| `0 19 1 * *` | 毎月1日 4:00 | D1データのJSONバックアップ → GitHub Releases |

### 13.2 各タスクの詳細

**古い閲覧ログ削除**:
```sql
DELETE FROM analytics WHERE viewed_at < datetime('now', '-180 days');
```

**論理削除の物理削除**:
```sql
-- 30日以上前に論理削除された演奏会を物理削除
DELETE FROM concerts WHERE is_deleted = 1 AND deleted_at < datetime('now', '-30 days');
-- 関連する analytics も削除
DELETE FROM analytics WHERE concert_id NOT IN (SELECT id FROM concerts);
```

**レート制限クリア**:
```sql
DELETE FROM rate_limits WHERE last_attempt < datetime('now', '-1 day');
```

**全タスクの結果を maintenance_log に記録。**

---

## 第14章 全自動セットアップスクリプト（確定）

### 14.1 `setup.sh` の仕様

プロジェクトに `setup.sh` を含める。実行すると対話的にすべてのセットアップを完了する。

```bash
#!/bin/bash
set -e

echo "🎵 Ken-Gei Prelude — 全自動セットアップ"
echo "========================================="
echo ""

# 1. 前提チェック
command -v node >/dev/null 2>&1 || { echo "❌ Node.js が必要です。https://nodejs.org/ からインストールしてください"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm が必要です"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ git が必要です"; exit 1; }

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then echo "❌ Node.js 18以上が必要です（現在: $(node -v)）"; exit 1; fi

echo "✅ 前提条件OK (Node $(node -v), npm $(npm -v))"

# 2. 依存関係インストール
echo ""
echo "📦 依存関係をインストール中..."
npm ci

# 3. Wrangler ログイン
echo ""
echo "☁️ Cloudflare にログインします（ブラウザが開きます）"
npx wrangler login

# 4. D1 データベース作成
echo ""
echo "🗄️ D1 データベースを作成中..."
D1_OUTPUT=$(npx wrangler d1 create ken-gei-prelude-db 2>&1)
D1_ID=$(echo "$D1_OUTPUT" | grep -oP 'database_id = "\K[^"]+' || echo "")

if [ -z "$D1_ID" ]; then
  echo "⚠️ D1の自動取得に失敗しました。出力を確認してください:"
  echo "$D1_OUTPUT"
  echo ""
  read -p "database_id を手動で入力してください: " D1_ID
fi
echo "  → database_id: $D1_ID"

# 5. R2 バケット作成
echo ""
echo "📁 R2 バケットを作成中..."
npx wrangler r2 bucket create ken-gei-prelude-flyers 2>/dev/null || echo "  (既に存在する場合はスキップ)"

# 6. KV namespace 作成
echo ""
echo "💾 KV namespace を作成中..."
KV_OUTPUT=$(npx wrangler kv namespace create ken-gei-prelude-cache 2>&1)
KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+' || echo "")

if [ -z "$KV_ID" ]; then
  echo "⚠️ KVの自動取得に失敗しました。"
  read -p "KV namespace id を手動で入力してください: " KV_ID
fi
echo "  → kv namespace id: $KV_ID"

# 7. wrangler.toml 生成
echo ""
echo "📝 wrangler.toml を生成中..."
cat > wrangler.toml << EOF
name = "ken-gei-prelude"
compatibility_date = "2024-09-02"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "ken-gei-prelude-db"
database_id = "$D1_ID"

[[r2_buckets]]
binding = "R2"
bucket_name = "ken-gei-prelude-flyers"

[[kv_namespaces]]
binding = "KV"
id = "$KV_ID"

[triggers]
crons = ["0 21 * * *", "0 18 1 * *", "0 19 1 * *"]
EOF
echo "  → wrangler.toml 生成完了"

# 8. Secrets 設定
echo ""
echo "🔒 秘密情報を設定します"
echo ""
read -sp "管理画面パスワードを入力: " ADMIN_PW
echo ""
echo "$ADMIN_PW" | npx wrangler secret put ADMIN_PASSWORD 2>/dev/null
echo "  → ADMIN_PASSWORD 設定完了"

read -sp "暗号化キーを入力（32文字以上推奨。空欄で自動生成）: " ENC_KEY
echo ""
if [ -z "$ENC_KEY" ]; then
  ENC_KEY=$(openssl rand -hex 32)
  echo "  → 自動生成: $ENC_KEY"
  echo "  ⚠️ このキーをメモしてください！お問い合わせの復号に必要です"
fi
echo "$ENC_KEY" | npx wrangler secret put CONTACT_ENCRYPTION_KEY 2>/dev/null
echo "  → CONTACT_ENCRYPTION_KEY 設定完了"

# 9. DB マイグレーション
echo ""
echo "🗄️ データベースを初期化中..."
npx wrangler d1 execute ken-gei-prelude-db --remote --file=./migrations/0001_init.sql
echo "  → テーブル作成完了"
npx wrangler d1 execute ken-gei-prelude-db --remote --file=./migrations/0002_seed.sql
echo "  → 初期データ投入完了"

# 10. ビルド＆デプロイ
echo ""
echo "🔨 ビルド中..."
npm run build
echo ""
echo "🚀 デプロイ中..."
npx wrangler pages deploy dist --project-name=ken-gei-prelude

echo ""
echo "========================================="
echo "✅ セットアップ完了！"
echo ""
echo "🌐 サイトURL: https://ken-gei-prelude.pages.dev"
echo "🔒 管理画面:  https://ken-gei-prelude.pages.dev/admin"
echo "📖 ドキュメント: https://ken-gei-prelude.pages.dev/docs"
echo ""
echo "📌 次のステップ:"
echo "  1. GitHubリポジトリを作成"
echo "  2. GitHub Secrets に CLOUDFLARE_API_TOKEN と CLOUDFLARE_ACCOUNT_ID を設定"
echo "  3. git push すれば以降は自動デプロイ"
echo ""
echo "🎵 Ken-Gei Prelude を楽しんでください！"
```

---

## 第15章 バリデーション・重複チェック（確定）

### 15.1 Fingerprinting

```
fingerprint = SHA-256( date + "|" + normalize(venue_name) + "|" + normalize(title).slice(0,10) )

normalize = 全角→半角、空白除去、小文字化
```

- fingerprint カラムに UNIQUE 制約
- INSERT 時に UNIQUE 違反 → 「同じ演奏会が既に登録されています」エラー

### 15.2 同日チェック

- 同日に別のfingerprintの演奏会がある場合 → **確認ダイアログ**（登録はブロックしない）
- 「同じ日に『〇〇演奏会』が既に登録されています。これは別の公演ですか？」→「はい」で登録

### 15.3 slug衝突チェック

- slug生成後、DBにSELECTで存在チェック
- 存在する場合 → nanoidサフィックスを再生成（最大3回）
- 3回すべて衝突（ほぼありえない）→ タイムスタンプミリ秒を追加

---

## 第16章 エラー対策一覧（確定・網羅）

| # | カテゴリ | エラー | 対策 |
|---|---|---|---|
| 1 | DB | D1日次上限到達 | 503返却+KVキャッシュからフォールバック |
| 2 | DB | D1書き込み失敗 | リトライ2回。失敗→localStorageに保存→再送信UI |
| 3 | DB | 不正JSONパース | try-catch。デフォルト値表示+管理画面に警告 |
| 4 | DB | fingerprint衝突 | 「既に登録されています」メッセージ |
| 5 | DB | slug衝突 | nanoid再生成（最大3回） |
| 6 | API | Workers日次上限 | SSGでフォールバック |
| 7 | ストレージ | R2アップロード失敗 | リトライ3回（1s→2s→4s）|
| 8 | ストレージ | R2から画像取得失敗 | プレースホルダー画像表示 |
| 9 | ネット | fetch失敗 | エラーメッセージ+リトライボタン |
| 10 | スクレイピング | 大学サイトダウン | 次回Cronで再試行 |
| 11 | スクレイピング | HTML構造変更 | パース結果0件→ログ記録 |
| 12 | スクレイピング | 3日連続失敗 | maintenance_logに記録 |
| 13 | 地図 | OSMタイル障害 | 「地図を読み込めません」+Google Mapsリンク |
| 14 | 認証 | 管理PWミス5回 | 15分ロック |
| 15 | 認証 | 編集PWミス5回 | 15分ロック |
| 16 | セキュリティ | XSS | Reactエスケープ+DOMPurify |
| 17 | セキュリティ | SQLインジェクション | D1 Prepared Statements |
| 18 | セキュリティ | DDoS | Cloudflare無料DDoS保護 |
| 19 | セキュリティ | フォームスパム | Turnstile+ハニーポット+Rate limit |
| 20 | ユーザー操作 | 必須未入力 | リアルタイムバリデーション |
| 21 | ユーザー操作 | 巨大ファイル | クライアント即拒否 |
| 22 | ユーザー操作 | 非対応形式 | MIMEチェック→拒否 |
| 23 | ユーザー操作 | 古いブラウザ | モダンブラウザ必須表示 |
| 24 | ユーザー操作 | JS無効 | noscriptメッセージ |
| 25 | ユーザー操作 | ページ離脱 | beforeunload確認 |
| 26 | ユーザー操作 | ダブルクリック | ボタンdisable |
| 27 | 画像 | PDFパスワード保護 | エラーメッセージ |
| 28 | 画像 | 破損ファイル | エラーメッセージ |
| 29 | 画像 | PDF100ページ超 | 最初2ページのみ |
| 30 | 画像 | WebP非対応ブラウザ | picture+JPEGフォールバック |
| 31 | バックアップ | D1データ消失 | Time Travel（7日間PiTR） |
| 32 | バックアップ | 誤削除 | 論理削除30日間復元可能 |
| 33 | 外部 | OGP生成失敗 | デフォルトロゴ画像 |
| 34 | 外部 | Resendメール失敗 | D1には保存済→管理画面で確認 |

---

## 第17章 ディレクトリ構成（確定）

```
ken-gei-prelude/
├── index.html                      # エントリHTML
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── wrangler.toml.example           # テンプレート（.gitignoreで実ファイル除外）
├── setup.sh                        # 全自動セットアップスクリプト
├── .gitignore
├── README.md                       # プロジェクト説明・セットアップ手順
├── LICENSE                         # MIT
│
├── .github/
│   └── workflows/
│       └── deploy.yml              # Direct Upload デプロイ
│
├── migrations/
│   ├── 0001_init.sql               # テーブル作成
│   └── 0002_seed.sql               # 初期データ（会場マスター+サンプル）
│
├── public/
│   ├── manifest.json               # PWA
│   ├── _redirects                  # SPA ルーティング
│   ├── icon-192.png
│   ├── icon-512.png
│   └── robots.txt
│
├── functions/                      # Cloudflare Pages Functions (API)
│   └── api/
│       ├── concerts/
│       │   └── [[path]].ts         # CRUD: GET/POST/PUT/DELETE
│       ├── upload.ts               # チラシアップロード→R2保存
│       ├── image/
│       │   └── [[key]].ts          # R2画像配信
│       ├── admin/
│       │   └── auth.ts             # 管理者認証
│       ├── contact.ts              # お問い合わせ（暗号化保存）
│       ├── inquiries.ts            # お問い合わせ一覧取得（管理者用・復号）
│       └── feed/
│           └── ics.ts              # Webcal購読フィード
│
└── src/
    ├── main.tsx                    # React エントリ
    ├── App.tsx                     # ルーティング定義
    ├── index.css                   # Tailwind + カスタムCSS
    │
    ├── pages/
    │   ├── HomePage.tsx            # トップページ
    │   ├── ConcertListPage.tsx     # 演奏会一覧（/concerts）
    │   ├── ConcertDetailPage.tsx   # 演奏会詳細（/concerts/:slug）
    │   ├── ConcertEditPage.tsx     # 演奏会編集（/concerts/:slug/edit）
    │   ├── CalendarPage.tsx        # カレンダー
    │   ├── ArchivePage.tsx         # アーカイブ検索
    │   ├── UploadPage.tsx          # 演奏会登録
    │   ├── AdminPage.tsx           # 管理ダッシュボード
    │   ├── ContactPage.tsx         # お問い合わせ
    │   ├── DocsPage.tsx            # ドキュメント・使い方
    │   ├── ApiDocsPage.tsx         # API仕様
    │   └── AboutPage.tsx           # このサイトについて
    │
    ├── components/
    │   ├── NavBar.tsx
    │   ├── Footer.tsx
    │   ├── ConcertCard.tsx         # 一覧用カード（日付+会場+タイトル）
    │   ├── ConcertForm.tsx         # 登録/編集フォーム（Quick/Full切替）
    │   ├── PricingEditor.tsx       # 料金区分の動的追加/削除UI
    │   ├── ProgramEditor.tsx       # プログラムの動的追加/削除UI
    │   ├── PerformerEditor.tsx     # 出演者の動的追加/削除UI
    │   ├── FlyerUploader.tsx       # ファイルアップロード（D&D + プレビュー）
    │   ├── MapSection.tsx          # Leaflet地図 + ルートボタン
    │   ├── CalendarAddDropdown.tsx  # カレンダー追加ドロップダウン
    │   ├── ShareButtons.tsx        # SNS共有 + QRコード
    │   ├── FilterBar.tsx           # フィルターバー
    │   ├── Toast.tsx               # 通知トースト
    │   ├── Modal.tsx               # 汎用モーダル
    │   ├── PasswordGate.tsx        # パスワード入力ゲート
    │   └── Calendar.tsx            # 月表示カレンダーグリッド
    │
    ├── lib/
    │   ├── constants.ts            # カテゴリ・専攻・大学情報
    │   ├── utils.ts                # 日付フォーマット・URL生成・ICS生成・共有URL
    │   ├── api.ts                  # fetch ラッパー（エラーハンドリング込み）
    │   ├── slug.ts                 # slug生成関数
    │   └── fingerprint.ts          # fingerprint生成関数
    │
    └── types/
        └── index.ts                # TypeScript型定義
```

---

## 第18章 実装フェーズ

### Phase 1（2週間）: MVP

- [ ] プロジェクトスキャフォールド + setup.sh
- [ ] DB スキーマ（全テーブル）
- [ ] トップページ（Today's Stage、今後一覧）
- [ ] **演奏会一覧ページ**（/concerts）— カードタップで詳細へ
- [ ] **演奏会詳細ページ**（/concerts/:slug）— 全情報表示
- [ ] 登録ページ（かんたん/詳細、**編集用パスワード**設定）
- [ ] **編集ページ**（/concerts/:slug/edit）— パスワード認証
- [ ] 管理ダッシュボード（パスワード必須、**お問い合わせ閲覧**）
- [ ] お問い合わせフォーム（暗号化保存）
- [ ] slug生成 + fingerprint重複検知
- [ ] Direct Upload デプロイ設定

### Phase 2（+2週間）: 主要機能

- [ ] カレンダーページ
- [ ] アーカイブ検索（fuse.js）
- [ ] **チラシアップロード**（PDF/JPEG/PNG/WebP/GIF 全対応、R2保存）
- [ ] 地図 + ルート案内
- [ ] カレンダー追加（Google/Apple/Outlook/TimeTree） + Webcal
- [ ] 共有ボタン + QRコード
- [ ] **ドキュメントページ** + **Aboutページ**

### Phase 3（+2週間）: 応用機能

- [ ] 大学サイト自動スクレイピング（Cron）
- [ ] 自動メンテナンス（ログ削除、物理削除GC）
- [ ] 月次バックアップ（GitHub Releases）
- [ ] OGP動的生成
- [ ] PWA対応
- [ ] 分析ダッシュボード

### Phase 4（+2週間）: 追加

- [ ] ダーク/ライトモード切替
- [ ] 印刷表示
- [ ] RSS
- [ ] 埋め込みウィジェット
- [ ] お気に入り（IndexedDB）
- [ ] 「近くで開催」（Geolocation）
- [ ] R2ライフサイクル（2年超画像の自動削除）

---

*以上。この仕様書の通りに実装してください。曖昧な箇所はありません。*
