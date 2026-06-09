# Easter Eggs

この文書は GitHub 向けの内部メモです。公開サイトの通常の使い方ページでは、隠し要素を詳しく説明しません。

## 実装場所

- `src/App.tsx`
- `src/pages/DainagonPage.tsx`
- `src/index.css`

## 操作

| 操作 | 挙動 |
|---|---|
| キーボードで `dainagon` と入力 | 隠しギャラリー `/solfege/after-hours/86b7` へ遷移 |
| 画面右上の透明ボタンを短時間に7回タップ | 隠しギャラリーへ遷移 |
| キーボードで `bravo` と入力 | 画面全体に短い祝祭フラッシュを表示 |

## 意図

- サイトの通常導線を邪魔せず、制作者・関係者向けの小さな遊びを残す。
- 旧 `/dainagon` は通常の404に戻し、直接見つかりにくいルートへ移した。
- 画像の追加は `private/dainagon-inbox/` に入れて `npm run dainagon:photos` を実行する。

## QA観点

- 旧 `/dainagon` は404を表示する。
- 隠しルートは直接アクセスとイースターエッグ経由で表示できる。
- `bravo` の一時クラス `egg-bravo` は約1.8秒後に消える。
