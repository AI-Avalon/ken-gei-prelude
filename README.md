# 🎵 Ken-Gei Prelude（県芸プレリュード）

> 若き才能の「前奏曲」を、手のひらの中に

愛知県立芸術大学 音楽学部の演奏会情報ポータルサイト。
演奏会の掲載・閲覧・検索・共有を誰でも無料で利用できます。

🌐 **サイト**: https://ken-gei-prelude.pages.dev

## ✨ 特徴

- **完全無料** — Cloudflare無料枠のみで運用
- **誰でも登録** — アカウント不要。パスワードを設定するだけ
- **スマホ対応** — レスポンシブデザイン
- **カレンダー連携** — Google / Apple / Outlook / TimeTree / Webcal購読
- **SNS共有** — X, LINE, Facebook, QRコード
- **地図・ルート案内** — Leaflet + OpenStreetMap（無料）
- **自動メンテナンス** — Cron Trigger で定期メンテ・スクレイピング

## 🛠️ 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | React 18 + Vite 5 + TypeScript |
| スタイリング | Tailwind CSS 3 |
| ルーティング | React Router v6 |
| ホスティング | Cloudflare Pages |
| API | Cloudflare Pages Functions (Workers) |
| データベース | Cloudflare D1 (SQLite) |
| ストレージ/キャッシュ | Cloudflare KV |
| 地図 | Leaflet + OpenStreetMap |
| 検索 | fuse.js |
| QRコード | qrcode.react |

## 🚀 セットアップ

> 📖 **詳細なデプロイ手順は [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) を参照してください**
> （Cloudflareアカウント作成 → APIトークン → GitHub Secrets → D1/KV → Cron まで完全網羅）

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

2. **wrangler.toml の作成**
   ```bash
   cp wrangler.toml.example wrangler.toml
   # wrangler.toml 内の ID をあなたの環境に合わせて編集
   ```

3. **Cloudflare リソースの作成**
   ```bash
   npx wrangler d1 create ken-gei-prelude-db
   npx wrangler kv namespace create ken-gei-prelude-cache
   ```

4. **Secrets の設定**
   ```bash
   npx wrangler secret put ADMIN_PASSWORD
   npx wrangler secret put CONTACT_ENCRYPTION_KEY
   ```

5. **データベースの初期化**
   ```bash
   npx wrangler d1 execute ken-gei-prelude-db --remote --file=./migrations/0001_init.sql
   npx wrangler d1 execute ken-gei-prelude-db --remote --file=./migrations/0002_seed.sql
   ```

6. **ビルド & デプロイ**
   ```bash
   npm run build
   npx wrangler pages deploy dist --project-name=ken-gei-prelude
   ```

## 💻 開発

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview
```

## 📁 ディレクトリ構成

```
ken-gei-prelude/
├── functions/api/        # Cloudflare Pages Functions (API)
├── migrations/           # D1 マイグレーション
├── public/               # 静的ファイル
├── src/
│   ├── components/       # React コンポーネント
│   ├── pages/            # ページコンポーネント (12ページ)
│   ├── lib/              # ユーティリティ・定数・API クライアント
│   └── types/            # TypeScript 型定義
├── workers/              # Cron ワーカー（スクレイピング・メンテナンス）
├── setup.sh              # 全自動セットアップスクリプト
└── wrangler.toml.example # Cloudflare設定テンプレート
```

## ⏰ Cron ワーカー

スクレイピングと自動メンテナンスは、別途 Cloudflare Worker として `workers/` ディレクトリからデプロイされます。

| スケジュール | タスク | 説明 |
|---|---|---|
| 毎日 21:00 (JST) | スクレイピング | 愛知県立芸術大学のイベントページから新規演奏会を自動取得 |
| 毎月1日 18:00 | メンテナンス | 古いアナリティクス削除・論理削除データのパージ・レート制限クリア |
| 毎月1日 19:00 | バックアップ | D1データベースのバックアップ（プレースホルダ） |

管理画面（`/admin` → 設定タブ）からも手動実行できます。

## 📄 ライセンス

MIT License — 詳しくは [LICENSE](LICENSE) をご覧ください。
