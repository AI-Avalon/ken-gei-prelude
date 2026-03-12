# 🔍 Ken-Gei Prelude 監査レポート

**対象**: `KenGeiPrelude_完全仕様書_v4.0_FINAL.md` vs 実装コードベース  
**日付**: 2025年  
**カバー範囲**: 全18章 × 全ソースファイル（フロント12ページ/12コンポーネント/5ライブラリ/バックエンド7+API/マイグレーション/設定ファイル）

---

## 1. 🚨 CRITICAL BUGS（致命的バグ）

### 1-1. 管理者パスワードがトークンとしてクライアントに返却される

- **箇所**: `functions/api/admin/auth.ts` L73
- **内容**: ログイン成功時に `{ token: env.ADMIN_PASSWORD }` を返しており、**生のパスワードがそのままクライアントに送信**される。フロントエンドは `sessionStorage` にこの値を保存し、以後 `X-Admin-Token` ヘッダーとして送信する。
- **影響**: DevTools → Application → Session Storage で管理者パスワードが平文で閲覧可能。XSS攻撃でも即座に漏洩する。
- **修正案**: ログイン成功時に HMAC-SHA256 などで一時トークンを生成し、KV に TTL 付きで保存。トークンとパスワードを分離する。

### 1-2. FilterBar カテゴリチップの背景色が壊れている

- **箇所**: `src/components/FilterBar.tsx` L90
- **内容**: `style={selected.includes(key) ? { backgroundColor: cat.color } : undefined}` とあるが、`cat.color` は `"bg-blue-100 text-blue-800"` のような **Tailwind のクラス文字列**であり、CSS の `backgroundColor` に渡せる値ではない。
- **結果**: 選択中のカテゴリチップの背景色が一切適用されない（ブラウザは無効な CSS 値を無視する）。
- **対比**: `src/components/ConcertCard.tsx` L37 や `src/pages/ConcertDetailPage.tsx` L65 では `className={badge ${cat.color}}` で正しく使用。
- **修正案**: `style` を除去し、`className` で Tailwind クラスを直接適用する。

### 1-3. DOMPurify がインストール済みだがどこにも使われていない

- **箇所**: `package.json` L21 で `"dompurify": "^3.2.3"` 依存。`src/` 配下で `import` なし。
- **仕様**: 第16章 L1032「XSS → Reactエスケープ+DOMPurify」
- **影響**: `description`, `pricing_note`, `ticket_note` 等のユーザー入力テキストが `dangerouslySetInnerHTML` で使われた場合にXSS脆弱性の可能性。現時点では React の自動エスケープに依存しているため即座の危険は低いが、仕様に反しており、将来の機能追加でリスクがある。
- **修正案**: `description` 等の表示箇所で `DOMPurify.sanitize()` を適用する。

### 1-4. PDF アップロードが未実装（「準備中」エラー）

- **箇所**: `src/components/FlyerUploader.tsx` L95 付近
- **仕様**: 第6章「PDF → WebP変換（pdf.js利用）」
- **内容**: PDF ファイルを選択すると `"PDFの処理は現在準備中です"` というエラーメッセージが表示され、処理されない。
- **影響**: 演奏会チラシが PDF でしか用意されていないユーザーはチラシをアップロードできない。

### 1-5. Cron Secret の認証に ADMIN_PASSWORD を流用

- **箇所**: `functions/api/cron/scrape.ts` L334–335, `workers/cron.ts` L51–54
- **内容**: Cron ワーカーが `X-Cron-Secret: env.ADMIN_PASSWORD` を送信し、API 側も `cronSecret === env.ADMIN_PASSWORD` で検証。`CRON_SECRET` は `setup.sh` で生成・設定されるが、**API 側は `env.CRON_SECRET` を参照せず `env.ADMIN_PASSWORD` と比較**している。
- **結果**: `setup.sh` で別の CRON_SECRET を設定すると、Cron が認証に失敗して全スクレイピング・メンテナンスが動かなくなる。
- **修正案**: `scrape.ts` と `maintenance.ts` の Env に `CRON_SECRET` を追加し、`cronSecret === env.CRON_SECRET` で検証する。

### 1-6. 演奏会作成 API にレート制限がない

- **箇所**: `functions/api/concerts/[[path]].ts` — POST ハンドラ
- **内容**: `contact.ts` や `admin/auth.ts` にはレート制限があるが、**演奏会の新規作成にはレート制限が一切ない**。誰でも認証なしで無限にPOSTできる。
- **影響**: 悪意あるスクリプトで大量のスパム演奏会データを登録される可能性。
- **修正案**: IP ベースのレート制限（例: 10件/時間）を追加する。

---

## 2. ⚠️ MISSING FEATURES（未実装機能）

### 2-1. fuse.js が未使用（クライアントサイド曖昧検索なし）

- **仕様**: 第2章 L60「検索: fuse.js — クライアントサイド曖昧検索」
- **現状**: `package.json` に `fuse.js` 依存あり。`src/pages/ArchivePage.tsx` L38 にコメント `// Client-side fuzzy search with fuse.js` はあるが、**Fuse クラスのインポートも初期化もない**。検索は FilterBar の `searchQuery` をバックエンド API の `q` パラメータに渡してサーバーサイド LIKE 検索で処理。
- **影響**: オフラインや低レイテンシの曖昧マッチ検索ができない。

### 2-2. shadcn/ui が未使用

- **仕様**: 第2章 L55「スタイリング: Tailwind CSS 3 + shadcn/ui」
- **現状**: `package.json` に shadcn/ui 関連の依存なし。`@radix-ui` も未使用。全コンポーネントが素の Tailwind CSS で構築。
- **影響**: 仕様からの逸脱だが、カスタム Tailwind コンポーネント（`btn-primary`, `card`, `input` 等）で同等の UI を実現しており、機能的な欠損は少ない。

### 2-3. 同日重複チェックのフロントエンド警告なし

- **仕様**: 第15章「同日・同会場の演奏会が既に登録されている場合、確認ダイアログを表示（ブロックはしない）」
- **現状**: バックエンド API に `GET /api/concerts/same-day?date=...` エンドポイントは存在する（`concerts/[[path]].ts`）。しかし `UploadPage.tsx` や `ConcertForm.tsx` で **このエンドポイントを呼び出す処理がない**。
- **影響**: ユーザーが重複登録しても何の警告も表示されない。

### 2-4. OGP 動的生成なし

- **仕様**: 第18章 Phase 3「OGP動的生成」
- **現状**: `index.html` に静的な `<meta>` タグのみ。演奏会詳細ページごとの動的 OGP（`og:title`, `og:image` 等）を生成する Workers や SSR 処理がない。
- **影響**: SNS共有時に演奏会固有のプレビューが表示されず、全ページ同じタイトル・画像になる。

### 2-5. サイトマップ（sitemap.xml）が存在しない

- **箇所**: `public/robots.txt` L3 で `Sitemap: https://ken-gei-prelude.pages.dev/sitemap.xml` を宣言。
- **現状**: `public/sitemap.xml` ファイルも、動的生成エンドポイントも存在しない。
- **影響**: 検索エンジンが sitemap を取得できず 404 になる。SEO に悪影響。

### 2-6. PWA アイコンファイルが存在しない

- **箇所**: `index.html` L5 で `<link rel="icon" href="/icon-192.png">`、`public/manifest.json` L10–11 で `icon-192.png` / `icon-512.png` 参照。
- **現状**: `public/` ディレクトリに該当ファイルなし。
- **影響**: ファビコン表示なし、PWA インストール時にアイコンなし。

### 2-7. Cloudflare Turnstile 未実装

- **仕様**: 第16章 L1035「フォームスパム → Turnstile+ハニーポット+Rate limit」
- **現状**: ハニーポット（`ContactPage.tsx`）とレート制限（`contact.ts`）は実装済みだが、**Turnstile の CAPTCHA 検証は未実装**。
- **影響**: bot によるフォーム送信を防ぐ層が1つ欠けている。

### 2-8. GitHub Releases バックアップ機構なし

- **仕様**: 第2章 L64「バックアップ: GitHub Releases — 無制限・無料」、第18章 Phase 3「Releases によるDBバックアップ」
- **現状**: `workers/cron.ts` L35–37 に `'0 19 1 * *'` のスケジュールがあるが `logTask(env, 'backup', 'skipped', 'バックアップは将来実装予定')` とだけ記載。
- **影響**: D1 データベースの自動バックアップが行われない。

### 2-9. `instruments_json` / `tags_json` のフォーム入力なし

- **仕様**: 第4章 — concerts テーブルに `instruments_json` と `tags_json` カラムあり
- **現状**: DB スキーマとTypeScriptの型定義には存在するが、`ConcertForm.tsx` に **楽器タグ・フリータグの入力フィールドがない**。API にデータが送信されず、常に空配列 `[]` のまま。
- **影響**: 楽器やタグによるフィルタリングができない。

### 2-10. アップロード API に認証なし

- **箇所**: `functions/api/upload.ts`
- **現状**: R2 への画像アップロード API に**認証チェックもレート制限もない**。`concertId` パラメータで紐付けるが、任意の concert に対してファイルを上書き可能。
- **影響**: 悪意あるユーザーが他人の演奏会チラシを差し替えられる。R2 ストレージの枯渇攻撃も可能。

---

## 3. 📱 RESPONSIVE / UI ISSUES（レスポンシブ・UI問題）

### 3-1. PerformerEditor の固定幅がモバイルで溢れる

- **箇所**: `src/components/PerformerEditor.tsx`
- **内容**: 各行に `w-40`, `w-32` の固定幅 input が横に3つ並ぶ。モバイル幅（320px〜）では横スクロールまたはレイアウト崩れが発生する。
- **修正案**: `sm:w-40 w-full` のようにブレークポイント対応、またはモバイルでは縦積みレイアウトにする。

### 3-2. AdminPage テーブルのモバイル対応不足

- **箇所**: `src/pages/AdminPage.tsx` — 演奏会一覧テーブル、お問い合わせテーブル
- **内容**: `<table>` を使用しているが `overflow-x-auto` のラッパーがない箇所がある。多数のカラムがモバイル画面で溢れる。
- **修正案**: テーブルを `<div className="overflow-x-auto">` でラップするか、モバイルではカードレイアウトに切り替え。

### 3-3. ConcertForm の「かんたん/詳細」モード切替ボタンが小さい

- **箇所**: `src/components/ConcertForm.tsx` — モード切替トグル
- **内容**: モバイルでタップしにくいサイズ。タッチターゲット 44px 推奨（WCAG）を満たしていない可能性。

### 3-4. CalendarPage の日付セル内コンテンツが溢れる可能性

- **箇所**: `src/components/Calendar.tsx`
- **内容**: `min-h-[4rem] sm:min-h-[5rem]` の固定高さだが、同日に複数演奏会がある場合にドットが溢れる可能性。
- **修正案**: `overflow-hidden` を確認し、溢れた場合に「+N」表示にするなど。

### 3-5. ShareButtons の QR コードモーダルがモバイルで大きすぎる可能性

- **箇所**: `src/components/ShareButtons.tsx` — QR コード表示
- **内容**: `size={200}` の固定サイズ QR コード。小さいモバイル端末では周囲のパディングと合わせてモーダルが画面に収まらない可能性。

---

## 4. 💡 UX IMPROVEMENTS（UX改善提案）

### 4-1. ShareButtons と CalendarAddDropdown の機能重複

- **箇所**: `src/components/ShareButtons.tsx` + `src/components/CalendarAddDropdown.tsx`
- **内容**: `ShareButtons` 内にカレンダー追加ボタン（Google, Apple, Outlook, Yahoo, ICS, TimeTree）が含まれている。一方で `CalendarAddDropdown` も同じ機能を提供。`ConcertDetailPage.tsx` で**両方が別セクションに表示**されている。
- **影響**: ユーザーが同じ機能を2箇所で見ることになり混乱する。
- **改善案**: ShareButtons からカレンダー関連を削除し、CalendarAddDropdown に統一する。

### 4-2. ArchivePage と ConcertListPage がほぼ同一コード

- **箇所**: `src/pages/ArchivePage.tsx` vs `src/pages/ConcertListPage.tsx`
- **内容**: 両ページのロジック・UI がほぼ同じ（唯一の違いは `dateFrom=today` パラメータの有無）。
- **改善案**: 共通コンポーネントに統合し、props で「過去含む」フラグを渡す。

### 4-3. 登録完了後のフィードバックが不十分

- **箇所**: `src/pages/UploadPage.tsx`
- **内容**: 演奏会登録成功後に `toast()` と `navigate()` で一覧にリダイレクトするが、登録した演奏会の詳細ページへのリンクが表示されない。
- **改善案**: 成功時に演奏会詳細ページへ直接遷移するか、トーストに詳細ページへのリンクを含める。

### 4-4. 検索 UX の改善余地

- **箇所**: `src/components/FilterBar.tsx`
- **内容**: 検索は入力文字列をそのまま API に送信（`onSearchChange` → 即座に API 呼び出し）。デバウンスなし。
- **影響**: 文字入力のたびに API リクエストが発生し、サーバー負荷・ネットワーク帯域の無駄。
- **改善案**: 300ms 程度のデバウンスを追加。

### 4-5. 演奏会カードの「あとN日」表示がマイナスになる

- **箇所**: `src/components/ConcertCard.tsx`
- **内容**: 過去の演奏会に対して `daysUntil` が負の値で表示される（「あと-30日」など）可能性。ArchivePage で過去の演奏会が表示される場合に発生。
- **改善案**: 過去の演奏会では「N日前」や「終了」と表示する。

### 4-6. 管理画面のログアウトが sessionStorage クリアのみ

- **箇所**: `src/pages/AdminPage.tsx`
- **内容**: ログアウトは `sessionStorage.removeItem('admin_token')` のみ。サーバーサイドでトークンを無効化する仕組みがない（そもそもトークンがパスワード自体であるため）。
- **影響**: 1-1 で述べたトークン設計の問題と合わせ、セキュリティリスク。

### 4-7. エラーメッセージが日本語・英語混在

- **箇所**: バックエンドの各 API ファイル
- **内容**: ユーザー向けエラーメッセージは日本語（`"パスワードが違います"`）だが、一部システムエラーは英語（`"Method not allowed"`, `"Not found"`）。
- **改善案**: ユーザーに表示されるメッセージを統一（全て日本語化）。

---

## 5. 🔒 SECURITY CONCERNS（セキュリティ懸念）

### 5-1. 管理者認証がパスワード平文比較・平文返却

- **箇所**: `functions/api/admin/auth.ts` L62, L73
- **詳細**:
  1. `body.password !== env.ADMIN_PASSWORD` で平文比較（タイミング攻撃に脆弱）
  2. 成功時に `{ token: env.ADMIN_PASSWORD }` としてパスワードをクライアントに返す
  3. クライアントは `sessionStorage` に保存し、全リクエストで `X-Admin-Token` ヘッダーに設定
- **リスク**: パスワードがブラウザ内に平文で存在し、XSS・物理アクセス・DevTools での漏洩が容易。
- **修正案**: 
  - ランダムセッショントークンを生成し KV に TTL 付きで保存
  - `crypto.subtle.timingSafeEqual()` でタイミングセーフ比較
  - Set-Cookie (HttpOnly, Secure, SameSite=Strict) の利用を検討

### 5-2. CSRF 対策なし

- **箇所**: 全 API エンドポイント
- **内容**: `Access-Control-Allow-Origin: '*'` が全レスポンスに設定されており、CORS が完全にオープン。CSRF トークン検証も未実装。
- **リスク**: 悪意のあるサイトから API を直接呼び出して演奏会データを操作可能。
- **修正案**: 
  - `Access-Control-Allow-Origin` を本番ドメインに制限
  - 書き込み系 API に CSRF トークン or Origin ヘッダー検証を追加

### 5-3. edit_password のハッシュ方式が仕様と不一致

- **仕様**: 第4章 L228「`-- 編集用パスワード（bcryptハッシュ）`」
- **実装**: `functions/api/concerts/[[path]].ts` で `SHA-256` ハッシュを使用（`src/lib/utils.ts` の `sha256` 関数）
- **補足**: 仕様の別箇所（L421, L574）では「SHA-256ハッシュ化」と記述しており、仕様内に矛盾がある。SHA-256 はパスワードハッシュに不適切（ソルトなし・高速すぎる）だが、Workers 環境で bcrypt が使えないため、実用上は PBKDF2 等への移行が望ましい。

### 5-4. R2 アップロード API が認証不要

- **箇所**: `functions/api/upload.ts`
- **内容**: ファイルアップロード API に認証・認可チェックがない。`concertId` を知っていれば誰でもチラシ画像を上書きできる。
- **リスク**: 不正なコンテンツの添付、R2 ストレージの枯渇。
- **修正案**: 編集パスワードまたは管理者トークンの検証を追加。

### 5-5. Contact API の暗号化キーがハードコードリスク

- **箇所**: `functions/api/contact.ts`
- **内容**: AES-256-GCM で name/email を暗号化。鍵は `env.CONTACT_ENCRYPTION_KEY` から取得（Cloudflare Secrets に保存）。実装自体は適切。
- **リスク（低）**: 鍵ローテーションの仕組みがないため、漏洩時に過去の全お問い合わせデータが復号される。

### 5-6. X-Admin-Token がすべてのリクエストに含まれる

- **箇所**: `src/lib/api.ts` — `apiFetch()` 関数
- **内容**: `sessionStorage.getItem('admin_token')` があれば**全 API リクエスト**に `X-Admin-Token` ヘッダーを付与する。
- **リスク**: 管理者でログイン中に、管理者権限が不要な API（一覧取得など）にもパスワードが送信される。最小権限の原則に反する。

---

## 📊 サマリー

| カテゴリ | 件数 | 最重要項目 |
|---|---|---|
| 🚨 CRITICAL BUGS | **6件** | 管理者パスワード漏洩、FilterBar表示バグ |
| ⚠️ MISSING FEATURES | **10件** | fuse.js 未使用、同日チェック UI なし |
| 📱 RESPONSIVE/UI | **5件** | PerformerEditor モバイル溢れ |
| 💡 UX IMPROVEMENTS | **7件** | 検索デバウンス、機能重複 |
| 🔒 SECURITY | **6件** | CSRF 対策なし、アップロード認証なし |
| **合計** | **34件** | |

---

## ✅ 仕様通り正しく実装されている点

以下は仕様と一致しており、適切に機能する主要な実装項目：

- 全12ページのルーティング（`App.tsx`）— 仕様 §3.1 に完全一致
- D1 スキーマ（`0001_init.sql`）— 全テーブル・カラム・制約が仕様 §4.1–4.4 に一致
- Slug 生成（`src/lib/slug.ts`）— nanoid(6) 付与、カテゴリフォールバックマップ
- Fingerprint 重複検知（`src/lib/fingerprint.ts`）— date|venue|title の SHA-256
- 演奏会 CRUD API（`concerts/[[path]].ts`）— 一覧・詳細・作成・更新・削除・パスワード検証
- Contact フォーム暗号化（`contact.ts`）— AES-256-GCM、ハニーポット、レート制限
- ICS カレンダーフィード（`feed/ics.ts`）
- Cron Worker（`workers/cron.ts`）— scheduled() ハンドラ、スクレイピング・メンテナンス・バックアップ
- R2 画像配信（`image/[[key]].ts`）— 7日キャッシュ
- 大学サイトスクレイパー（`cron/scrape.ts`）— HTML 解析、fingerprint 重複排除
- メンテナンスタスク（`cron/maintenance.ts`）— 4タスク実行
- GitHub Actions デプロイ（`.github/workflows/deploy.yml`）— Direct Upload 方式
- セットアップスクリプト（`setup.sh`）— D1/R2/KV 作成、Secrets 設定、マイグレーション実行
- wrangler.toml テンプレート（`wrangler.toml.example`）
- 会場マスター（`0002_seed.sql`）— 愛知県主要ホール10件
- MapSection（Leaflet + OpenStreetMap）— ルート案内3種
- CalendarAddDropdown — 6種カレンダー追加 + Webcal 定期購読
- Toast 通知システム — グローバルリスナーパターン
- PasswordGate — レート制限対応
