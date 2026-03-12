import { Link } from 'react-router-dom';

export default function DocsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-serif font-bold text-stone-900">Documentation</h1>
        <p className="text-stone-500 mt-1">Crescendo の使い方ガイド</p>
      </div>

      <div className="prose prose-primary max-w-none space-y-10">
        {/* 1 */}
        <Section id="about" title="1. Crescendo とは">
          <p>
            Crescendo（クレッシェンド）は、愛知県立芸術大学 音楽学部の演奏会情報ポータルサイトです。
            学生・教職員の演奏会を「掲載・閲覧・検索・共有」できます。
          </p>
          <p>
            チケット販売や座席予約は行いません。演奏会の宣伝と情報共有を目的としています。
            完全無料で利用できます。
          </p>
        </Section>

        {/* 2 */}
        <Section id="browse" title="2. 演奏会を見る">
          <h4>一覧ページ</h4>
          <p>
            <Link to="/concerts" className="text-primary-600 hover:underline">演奏会一覧</Link>では、
            今後開催される演奏会をカード形式で表示しています。日付、会場、タイトル、カテゴリが一目で確認できます。
          </p>
          <h4>フィルター・検索</h4>
          <p>
            ページ上部のカテゴリチップをタップすると、種類ごとにフィルターできます。
            検索ボックスで演奏会名、会場名、出演者名などのキーワード検索も可能です。
          </p>
          <h4>カレンダー</h4>
          <p>
            <Link to="/calendar" className="text-primary-600 hover:underline">カレンダーページ</Link>では、
            月ごとのスケジュールを確認できます。過去の月にも遡れます。
          </p>
        </Section>

        {/* 3 */}
        <Section id="register" title="3. 演奏会を登録する">
          <p>
            <Link to="/upload" className="text-primary-600 hover:underline">演奏会登録ページ</Link>から、
            誰でも演奏会を登録できます（アカウント登録不要）。
          </p>
          <h4>⚡ かんたん登録</h4>
          <p>
            最低限の情報（タイトル、日付、開演時刻、会場、カテゴリ、パスワード）だけで登録できます。
          </p>
          <h4>🔧 詳細登録</h4>
          <p>
            プログラム、出演者、料金区分、説明文など、すべての情報を入力できます。
            後から編集で追加することも可能です。
          </p>
          <h4>🔑 編集用パスワード</h4>
          <p className="text-amber-700 font-medium">
            登録時に設定したパスワードは必ずメモしてください。
            後から演奏会を編集・削除する際に必要です。パスワードの再発行はできません。
          </p>
          <h4>チラシアップロード</h4>
          <p>
            対応形式: PDF, JPEG, PNG, WebP, GIF。PDFは最大10MB、画像は最大5MB。
            アップロードすると自動的にWebP形式に変換されます。
          </p>
        </Section>

        {/* 4 */}
        <Section id="calendar" title="4. カレンダーに追加する">
          <p>演奏会詳細ページの「共有・カレンダー」セクションから、各種カレンダーサービスに追加できます。</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Google カレンダー</strong>: ボタンをクリックするとGoogleカレンダーに自動入力されます</li>
            <li><strong>Apple カレンダー</strong>: ICSファイルをダウンロードしてiCalに取り込めます</li>
            <li><strong>TimeTree</strong>: ICSファイルをダウンロードして取り込めます</li>
            <li><strong>Outlook</strong>: ボタンをクリックするとOutlookカレンダーに自動入力されます</li>
          </ul>
          <h4>📅 Webcal購読（自動同期）</h4>
          <p>
            以下のURLをカレンダーアプリに購読登録すると、新しい演奏会が自動的にカレンダーに追加されます。
          </p>
          <code className="block bg-stone-100 p-3 rounded text-sm break-all">
            webcal://ken-gei-prelude.pages.dev/api/feed/ics
          </code>
        </Section>

        {/* 5 */}
        <Section id="share" title="5. 共有する">
          <p>演奏会詳細ページの共有ボタンから、各種SNSに投稿できます。</p>
          <ul className="list-disc list-inside space-y-1">
            <li>📋 リンクコピー: URLをクリップボードにコピー</li>
            <li>X (Twitter): ハッシュタグ付きでポスト</li>
            <li>LINE: LINEで友達に送信</li>
            <li>Facebook: Facebookでシェア</li>
            <li>QRコード: QRコードを表示して印刷物に使用</li>
          </ul>
        </Section>

        {/* 6 */}
        <Section id="edit" title="6. 登録した演奏会を編集・削除する">
          <p>
            演奏会詳細ページの「✏️ この演奏会を編集」リンクから編集ページに移動できます。
            登録時に設定した編集用パスワードを入力すると、内容の編集や削除が行えます。
          </p>
          <p>
            削除した演奏会は30日間ゴミ箱に保管され、その後自動的に完全削除されます。
          </p>
        </Section>

        {/* 7 */}
        <Section id="contact" title="7. お問い合わせ">
          <p>
            <Link to="/contact" className="text-primary-600 hover:underline">お問い合わせフォーム</Link>から、
            以下のような内容を送信できます。
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>掲載依頼: 演奏会の掲載をサイト運営にお願いする</li>
            <li>情報修正: 既に掲載されている情報の修正依頼</li>
            <li>バグ報告: サイトの不具合を報告する</li>
            <li>その他: 質問やご意見など</li>
          </ul>
        </Section>

        {/* 8 */}
        <Section id="admin" title="8. 管理者向け">
          <p>
            <Link to="/admin" className="text-primary-600 hover:underline">管理ダッシュボード</Link>は
            管理者パスワードで認証が必要です。
          </p>
          <p>管理者は以下の操作が可能です:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>全演奏会の編集・削除・公開/非公開切替</li>
            <li>お問い合わせの閲覧・ステータス管理</li>
            <li>閲覧数統計・分析</li>
            <li>チラシ管理</li>
            <li>メンテナンスログの確認</li>
          </ul>
        </Section>

        {/* 9 */}
        <Section id="api" title="9. API仕様">
          <p>
            開発者向けのAPI仕様は <Link to="/docs/api" className="text-primary-600 hover:underline">API仕様ページ</Link> をご覧ください。
          </p>
        </Section>

        {/* 10 */}
        <Section id="faq" title="10. よくある質問（FAQ）">
          <FAQ q="無料ですか？" a="はい、完全無料でご利用いただけます。" />
          <FAQ q="誰でも登録できますか？" a="はい、アカウント登録不要で誰でも演奏会を登録できます。" />
          <FAQ q="登録を削除したいのですが" a="演奏会詳細ページの「編集」リンクから、登録時のパスワードで削除できます。" />
          <FAQ q="チケットは買えますか？" a="Crescendoではチケット販売は行っていません。チケット情報がある場合は、演奏会詳細ページにリンクが掲載されます。" />
          <FAQ q="パスワードを忘れてしまいました" a="パスワードの再発行はできません。修正が必要な場合はお問い合わせフォームからご連絡ください。" />
        </Section>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-xl font-bold mb-4 pb-2 border-b">{title}</h2>
      <div className="space-y-3 text-stone-700 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="bg-stone-50 rounded p-4 border border-stone-100">
      <p className="font-medium text-stone-800">Q: {q}</p>
      <p className="text-stone-600 mt-1">A: {a}</p>
    </div>
  );
}
