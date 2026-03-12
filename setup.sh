#!/bin/bash
set -e

echo "🎵 Crescendo — 全自動セットアップ"
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
D1_ID=$(echo "$D1_OUTPUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1 || echo "")

if [ -z "$D1_ID" ]; then
  echo "⚠️ D1の自動取得に失敗しました。出力を確認してください:"
  echo "$D1_OUTPUT"
  echo ""
  read -rp "database_id を手動で入力してください: " D1_ID
fi
echo "  → database_id: $D1_ID"

# 5. KV namespace 作成
echo ""
echo "💾 KV namespace を作成中..."
KV_OUTPUT=$(npx wrangler kv namespace create ken-gei-prelude-cache 2>&1)
KV_ID=$(echo "$KV_OUTPUT" | grep -oE '[0-9a-f]{32}' | head -1 || echo "")

if [ -z "$KV_ID" ]; then
  echo "⚠️ KVの自動取得に失敗しました。"
  read -rp "KV namespace id を手動で入力してください: " KV_ID
fi
echo "  → kv namespace id: $KV_ID"

# 6. wrangler.toml 生成
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

[[kv_namespaces]]
binding = "KV"
id = "$KV_ID"
EOF
echo "  → wrangler.toml 生成完了"

# 7. Secrets 設定
echo ""
echo "🔒 秘密情報を設定します"
echo ""
read -rsp "管理画面パスワードを入力: " ADMIN_PW
echo ""
echo "$ADMIN_PW" | npx wrangler pages secret put ADMIN_PASSWORD --project-name=ken-gei-prelude 2>/dev/null || true
echo "  → ADMIN_PASSWORD 設定完了"

CRON_SECRET=$(openssl rand -hex 32)
echo "$CRON_SECRET" | npx wrangler pages secret put CRON_SECRET --project-name=ken-gei-prelude 2>/dev/null || true
echo "  → CRON_SECRET 設定完了（自動生成）"
echo "  ⚠️ Cronワーカーにも同じ CRON_SECRET を設定してください"

read -rsp "暗号化キーを入力（32文字以上推奨。空欄で自動生成）: " ENC_KEY
echo ""
if [ -z "$ENC_KEY" ]; then
  ENC_KEY=$(openssl rand -hex 32)
  echo "  → 自動生成: $ENC_KEY"
  echo "  ⚠️ このキーをメモしてください！お問い合わせの復号に必要です"
fi
echo "$ENC_KEY" | npx wrangler pages secret put CONTACT_ENCRYPTION_KEY --project-name=ken-gei-prelude 2>/dev/null || true
echo "  → CONTACT_ENCRYPTION_KEY 設定完了"

# 8. DB マイグレーション
echo ""
echo "🗄️ データベースを初期化中..."
npx wrangler d1 execute ken-gei-prelude-db --remote --yes --file=./migrations/0001_init.sql
echo "  → テーブル作成完了"
npx wrangler d1 execute ken-gei-prelude-db --remote --yes --file=./migrations/0002_seed.sql
echo "  → 初期データ投入完了"

# 9. ビルド＆デプロイ
echo ""
echo "🔨 ビルド中..."
npm run build
echo ""
echo "🚀 デプロイ中..."
npx wrangler pages deploy dist --project-name=ken-gei-prelude --branch=main --commit-message "initial deploy"

# 10. Cron ワーカーのデプロイ
echo ""
echo "⏰ Cron ワーカーをデプロイ中..."
if [ -f workers/wrangler.toml ]; then
  # workers/wrangler.toml の D1/KV ID を本体と同じ値に書き換え
  sed -i.bak "s/YOUR_D1_DATABASE_ID/$D1_ID/g" workers/wrangler.toml
  sed -i.bak "s/YOUR_KV_NAMESPACE_ID/$KV_ID/g" workers/wrangler.toml
  rm -f workers/wrangler.toml.bak
  cd workers
  npx wrangler deploy --config wrangler.toml
  echo "$CRON_SECRET" | npx wrangler secret put CRON_SECRET --config wrangler.toml 2>/dev/null
  cd ..
  echo "  → Cron ワーカーデプロイ完了"
else
  echo "  ⚠️ workers/wrangler.toml が見つかりません。Cronワーカーは手動でデプロイしてください"
fi

echo ""
echo "========================================="
echo "✅ セットアップ完了！"
echo ""
echo "🌐 サイトURL: https://ken-gei-prelude.pages.dev"
echo "🔒 管理画面:  https://ken-gei-prelude.pages.dev/admin"
echo "📖 ドキュメント: https://ken-gei-prelude.pages.dev/docs"
echo ""
echo "📌 次のステップ:"
echo "  1. GitHubリポジトリに push"
echo "  2. GitHub Secrets に CLOUDFLARE_API_TOKEN と CLOUDFLARE_ACCOUNT_ID を設定"
echo "  3. 以降は main ブランチへの push で自動デプロイ"
echo "  4. Cronワーカーが毎日21:00(JST)にスクレイピング、毎月1日にメンテナンス実行"
echo ""
echo "🎵 Crescendo を楽しんでください！"
