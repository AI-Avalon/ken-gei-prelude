---
name: zero-touch-persistence
description: 管理者の手動操作なしでGitHub Actionsの60日停止を恒久回避し、エッジ側でも自律更新を継続するスキル
---
# Zero-Touch Persistence & Self-Healing Engine

## 監査・実装ルール
1. **GitHub Actions 自己延命 (Self-Keepalive)**:
   - 定期ワークフロー内に `permissions: { contents: write, actions: write }` を設定し、標準の `GITHUB_TOKEN` を用いて毎回ワークフロー自身の `enable` エンドポイントを叩く。
   - 最終コミット日時を自動判定し、30日以上コミットがない場合は `.keepalive` ファイルに最新UTC時刻とヘルスチェック結果を書き込んで `git commit & push` (`[skip ci]`) する。
2. **Piggyback Lazy Cron (アクセス連動型バックグラウンド更新)**:
   - Worker / API の公演一覧取得エンドポイントにて、最終スクレイピング時刻が12時間以上前の場合、レスポンスは即座にキャッシュから返しつつ `ctx.waitUntil()` で非同期にスクレイピング＆D1更新ジョブを起動する。
3. **Self-Healing Scraper (Zod検証 + 構造変化耐性)**:
   - 大学公式サイトのHTML構造が微変更されても正規表現・複数セレクタ候補・日付パーサーのフォールバックにより抽出を継続し、不正な空データで既存の正常なD1レコードを上書きしない（Upsert保護）。
