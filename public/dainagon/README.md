大納言写真の置き場所

1. 元写真を `public/dainagon/inbox/` に入れる
2. `npm run dainagon:photos` を実行する
3. WebP は `public/dainagon/gallery/` に生成される
4. 生成済み写真の一覧は `src/data/dainagonPhotos.json` に保存される

重複写真は内容ハッシュで判定され、すでに変換済みなら追加されません。
変換に成功した元写真は自動削除されます。
