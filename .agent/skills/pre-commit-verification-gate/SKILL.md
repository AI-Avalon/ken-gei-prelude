---
name: pre-commit-verification-gate
description: コミット前にビルド・型・セキュリティ・UI見切れ・ページ遷移・カレンダー・PDF描画を全自動検証するゲートスキル
---
# Pre-Commit Verification Gate

## 監査・実装ルール
いかなる変更も、`git commit` を実行する前に以下の全自動検証スイート（`npm run verify:all`）を実行し、すべてエラーゼロで通過しなければならない。
1. **Static Checks**: TypeScript型チェック (`tsc --noEmit`)、Linter、本番ビルド (`vite build`) の成功。
2. **Security Audit**: D1のプリペアドステートメント使用確認、外部URLフェッチ時のSSRFホワイトリスト確認、`dangerouslySetInnerHTML` のサニタイズ確認。
3. **E2E & Visual Sanity Check**:
   - トップページ、カレンダービュー、検索フィルタ、公演詳細ページ、ブラウザバック等の全ページ遷移がエラー（Console Error / Page Error / 404）なしで動作すること。
   - Mobile (375px) / Desktop (1440px) で文字見切れや横はみ出しがないこと。
   - PDF/フライヤープレビューが空枠になっていないこと。
