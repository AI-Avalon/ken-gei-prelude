# Crescendo 宣伝キット

主役は Crescendo サイトです。20th演奏会は「実際に登録するとこう使える」という掲載例として扱います。

## 保存場所

| 用途 | ファイル |
|---|---|
| Instagram 正方形 | `public/promo/crescendo/instagram-square.png` |
| Instagram ストーリー | `public/promo/crescendo/instagram-story.png` |
| X / 横長告知 | `public/promo/crescendo/x-card.png` |
| LINE配信用 | `public/promo/crescendo/line-share.png` |
| OGP画像 | `public/promo/crescendo/ogp.png` |
| A4説明チラシ | `public/promo/crescendo/a4-guide.jpg` |
| QR付き案内 | `public/promo/crescendo/qr-guide.png` |
| 登録手順説明 | `public/promo/crescendo/registration-flow.png` |
| カレンダー連携説明 | `public/promo/crescendo/calendar-flow.png` |
| 20th掲載例カード | `public/promo/examples/celliberta-20th/celliberta-example-card.png` |
| 20thポスター表/裏 | `public/promo/examples/celliberta-20th/poster-page-1.webp`, `poster-page-2.webp` |

再生成:

```bash
npm run promo:assets
```

20th掲載例カードのQRは、既定で本番の掲載例ページへ向けています。

掲載例URL:

```text
https://ken-gei-prelude.pages.dev/concerts/20270220-ensemble-celliberta-U34Dyl
```

別のURLへ向けて再生成する場合:

```bash
CELLIBERTA_URL=https://ken-gei-prelude.pages.dev/concerts/実際のslug npm run promo:assets
```

## 投稿文面

### Instagram / X 短文

愛知県立芸術大学の演奏会情報を探せる・登録できるポータルサイト「Crescendo」を公開しています。

演奏会を探す、チラシを見る、SNSで共有する、カレンダーに入れるところまでスマホで使えます。

https://ken-gei-prelude.pages.dev

#愛知県立芸術大学 #県芸 #演奏会 #クラシック音楽 #Crescendo

### 登録を促す文面

演奏会のポスターができたら、Crescendoに掲載できます。

タイトル、日付、開演時刻、会場、料金だけでも登録可能。チラシ画像やPDFも載せられ、詳細ページからQR共有・SNS共有・カレンダー追加まで使えます。

登録はこちら:
https://ken-gei-prelude.pages.dev/upload

### 来場者向け文面

今後の演奏会情報は Crescendo で確認できます。

一覧・検索・カレンダー表示に対応し、気になる演奏会はGoogleカレンダーやAppleカレンダーに追加できます。

https://ken-gei-prelude.pages.dev/concerts

### 管理者/運用者向け説明

Crescendoは、愛知県立芸術大学の演奏会情報を集約する無料ポータルです。

演奏会登録、チラシ表示、共有リンク、QRコード、カレンダー連携、問い合わせ、管理画面を備えています。告知の入口を一本化し、SNSや紙ポスターから演奏会詳細へ誘導できます。

## 20th掲載例として使う情報

付属ポスターから確実に読める基本情報だけを使います。

| 項目 | 値 |
|---|---|
| タイトル | Ensemble Celliberta 20th Anniversary Concert |
| 日付 | 2027-02-20 |
| 開場 | 17:30 |
| 開演 | 18:00 |
| 料金 | 入場料 ¥1,000 |
| カテゴリ | アンサンブル |
| 専攻 | 弦楽器 |

会場、出演者、チケット案内などの細部は推測しません。
