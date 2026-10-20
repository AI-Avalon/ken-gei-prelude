---
name: responsive-and-truncation-auditor
description: PC版とスマホ版の情報量完全一致、および文字見切れ（Truncation/Overflow）の根絶を監査・保証するスキル
---
# Responsive Parity & Text Truncation Auditor

## 監査・実装ルール
1. **Single JSX Tree 原則**:
   - `hidden md:block` と `md:hidden` で別々のコンポーネントや情報を二重管理することを禁止する。
   - 必ず単一のデータ・単一のJSX構造を使用し、CSS Grid / Flexbox (`grid-cols-1 lg:grid-cols-12` 等) でレスポンシブ配置する。
2. **文字見切れ（Truncation / Clipping）の完全禁止**:
   - 公演タイトル、サブタイトル、日時、開場/開演時刻、会場名、入場料、出演者、プログラム（曲目）、主催・問い合わせ先において、テキストが途中で `...` になって読めなくなる `truncate` (`white-space: nowrap; text-overflow: ellipsis`) や、固定高さ (`h-32 overflow-hidden` 等) による文字切れを一切禁止する。
   - カード一覧ビューでもタイトルは最低2〜3行表示または全文折り返しとし、詳細ビュー・モーダルでは1文字たりとも省略せず全文を表示する。
   - 日本語組版ルールとして `overflow-wrap: anywhere` と適切な `line-height` (1.6〜1.8)、`clamp()` による流体フォントサイズを適用し、画面幅 320px（小型スマホ）〜 2560px（大型モニター）まで横スクロールバー（Horizontal Overflow）を発生させない。
3. **自動検証コマンド**:
   - Playwright で 375x812 (Mobile) と 1440x900 (Desktop) の両ビューポートで全ページを走査し、`document.documentElement.scrollWidth > window.innerWidth` が `false` であること、および主要テキスト要素の `scrollWidth > clientWidth` が存在しないことを検証する。
