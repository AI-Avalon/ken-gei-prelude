---
name: editorial-anti-ai-design
description: AI特有の安っぽいUI・絵文字・不自然な機械文面を排除し、音楽大学・クラシック公演にふさわしいエディトリアルデザインと自然な日本語マイクロコピーを徹底するスキル
---
# Editorial Anti-AI Design & Copywriting Standard

## 禁止事項 (Banned AI Patterns)
1. 紫〜青のネオングラデーション (`from-indigo-500 to-purple-600` 等) の使用禁止。
2. UI見出し・ボタン・説明文における不要な絵文字（🚀, ✨, 💡, 🎉, 🔥 等）の乱用禁止。アイコンは細いストローク（`strokeWidth={1.5}`）の洗練されたSVGアイコンまたはタイポグラフィ記号（`§`, `†`, `—`, `→`）に統一する。
3. 「革新的」「シームレス」「次世代」「フェッチ」「アイテム」等のITテンプレ用語・直訳調メッセージの使用禁止。

## 推奨デザインシステム (Editorial Palette & Typography)
- **Color Tokens**:
  - Background: Deep Stage Charcoal (`#121211` / `#1A1917`) または Paper Ivory (`#FAF7F2`)
  - Accent: Brass Gold (`#C5A059`), Urtext Slate (`#4A6070`), Velvet Crimson (`#8E2A2A`)
  - Border: `border-stone-800/80` または `border-white/10` の1pxヘアライン
- **Typography**:
  - 楽語・欧文見出し: `'Cormorant Garamond', 'EB Garamond', Georgia, serif`（イタリック体を効果的に活用）
  - 日本語見出し: `'Shippori Mincho', 'Noto Serif JP', serif`
  - UI・本文・数値: `'Inter', 'Noto Sans JP', sans-serif`（時刻・日付・周波数・BPMには必ず `tabular-nums` を指定）
