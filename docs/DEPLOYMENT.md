# 🚀 Crescendo デプロイ手順書

> Cloudflare Pages + D1 + KV + Workers による完全無料デプロイ

---

## 📋 目次

1. [前提条件](#1-前提条件)
2. [Cloudflareアカウント作成](#2-cloudflareアカウント作成)
3. [APIトークン作成](#3-apiトークン作成)
4. [GitHub Secrets 設定（自動デプロイ用）](#4-github-secrets-設定自動デプロイ用)
5. [Cloudflareリソース作成（D1 / KV）](#5-cloudflareリソース作成d1--kv)
6. [wrangler.toml 設定](#6-wranglertoml-設定)
7. [Secrets（環境変数）設定](#7-secrets環境変数設定)
8. [データベース初期化](#8-データベース初期化)
9. [初回デプロイ](#9-初回デプロイ)
10. [Pages プロジェクトにバインディング追加](#10-pages-プロジェクトにバインディング追加)
11. [Cron ワーカーデプロイ](#11-cron-ワーカーデプロイ)
12. [自動デプロイ確認](#12-自動デプロイ確認)
13. [トラブルシューティング](#13-トラブルシューティング)

---

## 1. 前提条件

| 必須ツール | バージョン | 確認コマンド |
|---|---|---|
| Node.js | 18以上 | `node -v` |
| npm | 9以上 | `npm -v` |
| Git | 任意 | `git --version` |

```bash
# プロジェクトのクローン
git clone https://github.com/AI-Avalon/ken-gei-prelude.git
cd ken-gei-prelude
npm ci
```

---

## 2. Cloudflareアカウント作成

1. [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) にアクセス
2. メールアドレスとパスワードで登録（**無料プランでOK**）
3. メール認証を完了

### アカウントIDの確認

ダッシュボードにログイン後:

1. 左サイドバーの一番下、または任意のドメインページの右サイドバーに **「アカウントID」** が表示されます
2. この ID を控えておいてください（後で使います）

```
例: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4
```

---

## 3. APIトークン作成

GitHub Actions からの自動デプロイに必要です。

1. [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) にアクセス
2. **「トークンを作成」** をクリック
3. **「カスタムトークン」** を選択（テンプレートは使用しません）
4. 以下の権限を設定:

| 権限カテゴリ | リソース | 権限レベル |
|---|---|---|
| アカウント | Cloudflare Pages | 編集 |
| アカウント | D1 | 編集 |
| アカウント | Workers KV Storage | 編集 |
| アカウント | Workers Scripts | 編集 |

5. **「概要に進む」** → **「トークンを作成」**
6. 表示されたトークンを**コピーして安全な場所に保存**（二度と表示されません）

```
例: Xn8Dj3kT9vR2mP5wQ7yL1zA4bC6eF0gH
```

> ⚠️ このトークンは秘密情報です。他人に共有したり、コードにハードコードしないでください。

---

## 4. GitHub Secrets 設定（自動デプロイ用）

GitHub Actions が Cloudflare にデプロイするために必要な設定です。

1. GitHub リポジトリページを開く
2. **Settings** タブ → 左メニュー **Secrets and variables** → **Actions**
3. **「New repository secret」** をクリック
4. 以下の2つを追加:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 手順3で作成したAPIトークン |
| `CLOUDFLARE_ACCOUNT_ID` | 手順2で確認したアカウントID |

### 設定画面の場所

```
リポジトリ → Settings → Secrets and variables → Actions → New repository secret
```

> ✅ この設定だけで、`main` ブランチへの push で自動デプロイされます。

---

## 5. Cloudflareリソース作成（D1 / KV）

ローカルで Wrangler CLI を使ってリソースを作成します。

### 5-1. Wrangler ログイン

```bash
npx wrangler login
```
ブラウザが開くので、Cloudflare アカウントで認証してください。

### 5-2. D1 データベース作成

```bash
npx wrangler d1 create ken-gei-prelude-db
```

出力例:
```
✅ Successfully created DB 'ken-gei-prelude-db'

[[d1_databases]]
binding = "DB"
database_name = "ken-gei-prelude-db"
database_id = "xxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  ← これをメモ!
```

### 5-3. KV Namespace 作成

```bash
npx wrangler kv namespace create ken-gei-prelude-cache
```

出力例:
```
🌀 Creating namespace "ken-gei-prelude-cache"
✅ Success!
Add the following to wrangler.toml:
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  ← これをメモ!
```

---

## 6. wrangler.toml 設定

```bash
cp wrangler.toml.example wrangler.toml
```

`wrangler.toml` を編集し、手順5で取得したIDを入力:

```toml
name = "ken-gei-prelude"
compatibility_date = "2024-09-02"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "ken-gei-prelude-db"
database_id = "ここに手順5-2のdatabase_id"  # ← 変更

[[kv_namespaces]]
binding = "KV"
id = "ここに手順5-3のKV namespace id"  # ← 変更
```

> ⚠️ `wrangler.toml` は `.gitignore` に含まれていません。秘密情報は入れないでください（Secretsは別途設定します）。

---

## 7. Secrets（環境変数）設定

Cloudflare Pages Functions で使う秘密情報を設定します。

### 必須の Secrets

```bash
# 管理画面パスワード（任意の文字列）
npx wrangler secret put ADMIN_PASSWORD
# → プロンプトが出るのでパスワードを入力

# お問い合わせフォームの暗号化キー（32文字以上推奨）
npx wrangler secret put CONTACT_ENCRYPTION_KEY
# → 自動生成する場合: openssl rand -hex 32

# Cronワーカー認証用シークレット
npx wrangler secret put CRON_SECRET
# → 自動生成する場合: openssl rand -hex 32
```

### Secrets 一覧

| Secret名 | 用途 | 設定先 |
|---|---|---|
| `ADMIN_PASSWORD` | 管理画面ログイン | Pages のみ |
| `CONTACT_ENCRYPTION_KEY` | お問い合わせのAES-GCM暗号化 | Pages のみ |
| `CRON_SECRET` | Cronワーカー↔Pages認証 | Pages & Cronワーカー両方 |

---

## 8. データベース初期化

```bash
# テーブル作成
npx wrangler d1 execute ken-gei-prelude-db --remote --file=./migrations/0001_init.sql

# 初期データ（カテゴリマスタ等）
npx wrangler d1 execute ken-gei-prelude-db --remote --file=./migrations/0002_seed.sql
```

確認:
```bash
npx wrangler d1 execute ken-gei-prelude-db --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

---

## 9. 初回デプロイ

```bash
# ビルド
npm run build

# デプロイ
npx wrangler pages deploy dist --project-name=ken-gei-prelude
```

初回実行時に「Create a new project」か聞かれたら **Y** を選択。

成功すると以下のようなURLが表示されます:
```
✨ Deployment complete!
  https://xxxxxxxx.ken-gei-prelude.pages.dev
```

---

## 10. Pages プロジェクトにバインディング追加

> ⚠️ **重要**: `wrangler pages deploy` だけではバインディング（D1/KV）が自動設定されません。Cloudflare ダッシュボードで手動追加が必要です。

1. [Cloudflare ダッシュボード](https://dash.cloudflare.com) → **Workers & Pages**
2. **ken-gei-prelude** プロジェクトを選択
3. **Settings** → **Functions** → **Bindings**
4. 以下を追加:

### D1 Database

| 項目 | 値 |
|---|---|
| Variable name | `DB` |
| D1 database | `ken-gei-prelude-db` |

### KV Namespace

| 項目 | 値 |
|---|---|
| Variable name | `KV` |
| KV namespace | `ken-gei-prelude-cache` |

5. **Save** をクリック
6. **再デプロイ**が必要です（バインディング変更後は次のデプロイから有効）

```bash
npx wrangler pages deploy dist --project-name=ken-gei-prelude
```

### 環境変数（Secrets）もダッシュボードから追加

同じく **Settings** → **Environment variables** で以下を追加:

| Variable name | Type | Value |
|---|---|---|
| `ADMIN_PASSWORD` | Secret | 管理画面パスワード |
| `CONTACT_ENCRYPTION_KEY` | Secret | 暗号化キー |
| `CRON_SECRET` | Secret | Cron認証シークレット |

> Production と Preview 両方に設定してください。

---

## 11. Cron ワーカーデプロイ

スクレイピングと自動メンテナンスは別のWorkerとしてデプロイします。

### 11-1. workers/wrangler.toml の編集

```bash
cd workers
```

`wrangler.toml` 内の ID を手順5で取得した値に置き換え:

```toml
name = "ken-gei-prelude-cron"
main = "cron.ts"

[[d1_databases]]
binding = "DB"
database_name = "ken-gei-prelude-db"
database_id = "ここに手順5-2のdatabase_id"  # ← 変更

[[kv_namespaces]]
binding = "KV"
id = "ここに手順5-4のKV namespace id"  # ← 変更
```

### 11-2. デプロイ

```bash
npx wrangler deploy --config wrangler.toml
```

### 11-3. Secrets 設定

```bash
npx wrangler secret put CRON_SECRET --config wrangler.toml
# → Pages と同じ CRON_SECRET を入力
```

### 11-4. 動作確認

```bash
cd ..
```

Cloudflare ダッシュボードで **Workers & Pages** → **ken-gei-prelude-cron** → **Triggers** で Cron スケジュールが設定されていることを確認:

| Cron | JST | タスク |
|---|---|---|
| `0 21 * * *` | 毎日 06:00 | スクレイピング（大学サイトから演奏会取得） |
| `0 18 1 * *` | 毎月1日 03:00 | メンテナンス（古いデータ削除） |
| `0 19 1 * *` | 毎月1日 04:00 | バックアップ |

---

## 12. 自動デプロイ確認

GitHub Secrets が正しく設定されていれば、`main` ブランチへの push で自動的にデプロイされます。

### 確認手順

1. コードを変更して push:
   ```bash
   git add -A && git commit -m "test: デプロイ確認" && git push
   ```

2. GitHub リポジトリの **Actions** タブでワークフロー実行状況を確認

3. 緑色の ✅ が表示されれば成功

### 手動トリガー

GitHub Actions の画面から **Run workflow** ボタンで手動実行も可能です。

---

## 13. トラブルシューティング

### ❌ CLOUDFLARE_API_TOKEN が未設定

```
In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN...
```

**原因**: GitHub Secrets が設定されていない

**解決**: [手順4](#4-github-secrets-設定自動デプロイ用) に従い、リポジトリの Settings → Secrets に追加

---

### ❌ API が 500 エラーを返す

**原因**: D1/KV のバインディングが Pages に設定されていない

**解決**: [手順10](#10-pages-プロジェクトにバインディング追加) に従い、ダッシュボードでバインディングを追加して再デプロイ

---

### ❌ 管理画面にログインできない

**原因**: `ADMIN_PASSWORD` が Pages の環境変数に設定されていない

**解決**: ダッシュボード → ken-gei-prelude → Settings → Environment variables で `ADMIN_PASSWORD` を追加

---

### ❌ DB テーブルが見つからない

**原因**: マイグレーションが実行されていない

**解決**:
```bash
npx wrangler d1 execute ken-gei-prelude-db --remote --file=./migrations/0001_init.sql
npx wrangler d1 execute ken-gei-prelude-db --remote --file=./migrations/0002_seed.sql
```

---

### ❌ チラシ画像がアップロードできない

**原因**: KV バインディングが未設定、または画像キーが未保存

**解決**: [手順10](#10-pages-プロジェクトにバインディング追加) で KV バインディングを追加

---

### ❌ Cron が実行されない

**原因**: Cron ワーカー未デプロイ、または CRON_SECRET が不一致

**解決**:
1. [手順11](#11-cron-ワーカーデプロイ) でワーカーをデプロイ
2. Pages と Cron ワーカーで同じ `CRON_SECRET` を設定

---

### ❌ カスタムドメインの設定

1. Cloudflare ダッシュボード → **Workers & Pages** → **ken-gei-prelude**
2. **Custom domains** → **Set up a custom domain**
3. ドメインを入力（Cloudflare で管理しているドメインが必要）

---

## 📊 無料枠の制限

| リソース | 無料枠 | 用途 |
|---|---|---|
| Pages | 500回デプロイ/月 | フロント + API |
| D1 | 5GB ストレージ, 5M行読み取り/日 | 演奏会・お問い合わせデータ |
| KV | 100K 読取り/日, 1K 書込み/日 | キャッシュ・チラシ画像 |
| Workers | 100K リクエスト/日 | Cron ワーカー |

通常の大学演奏会サイトの規模であれば、無料枠内で十分に運用できます。

---

## 🔄 アーキテクチャ図

```
┌─────────────────────────────────────────────────┐
│                    GitHub                        │
│  main push → GitHub Actions → wrangler deploy    │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│              Cloudflare Pages                    │
│  ┌──────────┐  ┌──────────────────────────────┐ │
│  │  dist/   │  │  functions/api/*             │ │
│  │  (静的)  │  │  (Pages Functions = Workers) │ │
│  └──────────┘  └──────────┬───────────────────┘ │
│                           │                      │
│              ┌────────────┼────────────┐         │
│              ▼            ▼            ▼         │
│          ┌──────┐    ┌────────┐   ┌────────┐    │
│          │  D1  │            │   KV   │          │
│          │(SQLite)           │(キャッシュ・画像)│
│          └──────┘    └────────┘   └────────┘    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│          Cloudflare Worker (Cron)                 │
│  ken-gei-prelude-cron                            │
│  ┌────────────────────────────────────────────┐  │
│  │ 毎日06:00 JST  → スクレイピング            │  │
│  │ 毎月1日03:00   → メンテナンス              │  │
│  │ 毎月1日04:00   → バックアップ              │  │
│  └────────────────────────────────────────────┘  │
│       ↕ CRON_SECRET で認証                       │
│       ↕ D1/KV 共有                               │
└─────────────────────────────────────────────────┘
```
