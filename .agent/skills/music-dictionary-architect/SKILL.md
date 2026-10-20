---
name: music-dictionary-architect
description: 日本人音大生・演奏者向けの「音楽楽語辞典」DB構築・曖昧検索・ウムラウト正規化・演奏ニュアンス解説を実装するスキル
---
# Music Terminology Dictionary Architect (For Performers)

## 辞典データ構造と検索要件
1. **演奏者目線のスキーマ設計**:
   - 各用語は以下のフィールドを持つこと：
     - `id` (slug: 例 `drangend`, `sul-ponticello`)
     - `term` (原語表記: 例 `Drängend`, `Sul ponticello`, `Cédez`)
     - `normalized_term` (検索用正規化文字列: ウムラウト・アクサンを除去した `drangend`, `draengend`, `cedez` 等)
     - `reading_kana` (カタカナ読み: 例 `ドレンゲント`, `スル・ポンティチェロ`)
     - `reading_hiragana` (ひらがな読み: 例 `どれんげんと`)
     - `abbreviations` (略記配列: 例 `["rit.", "ritard."]`, `["G.P."]`, `["m.d.", "M.D."]`, `["l.v."]`)
     - `lang` (`It` イタリア語 / `De` ドイツ語 / `Fr` フランス語 / `En` 英語 / `Lat` ラテン語)
     - `category` (`tempo` 速度標語 / `tempo_change` 速度変化 / `dynamics` 強弱 / `expression` 発想・表情 / `technique` 奏法・編成 / `german_dir` ドイツ語指示語 / `french_dir` フランス語指示語 / `theory_form` 楽式・和声・理論)
     - `short_meaning` (一目でわかる端的な訳: 例 `急き立てるように、前へ押し進める`)
     - `definition` (楽譜上の正確な定義・語源)
     - `performer_nuance` (【最重要】実際の演奏・アンサンブルでのアプローチ。単なる直訳ではなく、弓の圧力・スピード、息の支え、拍節感、どういう作曲家［マーラー、ドビュッシー、ベートーヴェン等］で頻出するか等の実践的解説)
     - `bpm_range` (速度標語の場合のみ: 例 `[40, 52]`)
     - `related_terms` (類義語・対義語・比較すべき用語のslug配列と違いの解説)
2. **イレギュラー完全対応の検索エンジン**:
   - NFD正規化＋ドイツ語ウムラウト展開 (`ä->ae/a`, `ö->oe/o`, `ü->ue/u`, `ß->ss`)＋フランス語アクサン除去により、英語キーボードからのアルファベット入力でも100%ヒットさせる。
   - カタカナ・ひらがな・略語（ピリオド有無問わず）・日本語の意味（「悲しげに」「だんだん速く」「駒の近く」「弱音器」等の逆引き）のすべてで0msインクリメンタル検索を実現する。
