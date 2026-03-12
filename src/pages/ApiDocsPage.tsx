export default function ApiDocsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">API仕様</h1>
      <p className="text-gray-500 mb-10">開発者向けREST API ドキュメント</p>

      <div className="space-y-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-medium">ベースURL</p>
          <code className="text-xs">https://ken-gei-prelude.pages.dev/api</code>
        </div>

        <Endpoint
          method="GET"
          path="/concerts"
          description="演奏会一覧を取得します。ページネーション、フィルター、ソートに対応。"
          params={[
            { name: 'page', type: 'number', desc: 'ページ番号（デフォルト: 1）' },
            { name: 'limit', type: 'number', desc: '1ページの件数（デフォルト: 20、最大: 100）' },
            { name: 'category', type: 'string', desc: 'カテゴリID（例: "orchestra"）' },
            { name: 'sort', type: 'string', desc: '"date_asc" | "date_desc" | "views" | "created"' },
            { name: 'search', type: 'string', desc: 'キーワード検索' },
            { name: 'dateFrom', type: 'string', desc: '開始日（ISO）' },
            { name: 'dateTo', type: 'string', desc: '終了日（ISO）' },
          ]}
          response={`{
  "ok": true,
  "data": [
    {
      "id": "abc123def456",
      "slug": "20250219-ensemble-a3xk9m",
      "title": "Ensemble Celliberta 18th Concert",
      "date": "2025-02-19",
      "time_start": "18:00",
      "venue": { "name": "緑文化小劇場" },
      "category": "ensemble",
      "views": 342,
      ...
    }
  ],
  "total": 45
}`}
        />

        <Endpoint
          method="GET"
          path="/concerts/:slug"
          description="演奏会の詳細情報を取得します。アクセスごとに閲覧数が1加算されます。"
          response={`{
  "ok": true,
  "data": {
    "id": "abc123def456",
    "slug": "20250219-ensemble-a3xk9m",
    "title": "Ensemble Celliberta 18th Concert",
    "date": "2025-02-19",
    ...
  }
}`}
        />

        <Endpoint
          method="POST"
          path="/concerts"
          description="新しい演奏会を登録します。"
          body={`{
  "title": "演奏会名",
  "date": "2025-03-15",
  "time_start": "18:00",
  "venue_name": "芸術劇場",
  "category": "recital",
  "edit_password": "your-password",
  ...
}`}
          response={`{
  "ok": true,
  "data": { "id": "...", "slug": "..." }
}`}
        />

        <Endpoint
          method="PUT"
          path="/concerts/:slug"
          description="演奏会情報を更新します。編集用パスワードまたは管理者トークンが必要です。"
          body={`{
  "title": "更新後のタイトル",
  "edit_password": "your-password"
}`}
        />

        <Endpoint
          method="DELETE"
          path="/concerts/:slug"
          description="演奏会を論理削除します。30日後に自動で物理削除されます。"
          body={`{
  "edit_password": "your-password"
}`}
        />

        <Endpoint
          method="POST"
          path="/upload"
          description="チラシ画像をアップロードします。FormDataで送信。"
          body={`FormData:
  file: Blob (WebP画像)
  thumbnail: Blob (サムネイル)
  concert_slug: string`}
          response={`{
  "ok": true,
  "data": {
    "key": "flyers/20250219-ensemble-a3xk9m/1234.webp",
    "thumbnail_key": "flyers/..._thumb.webp"
  }
}`}
        />

        <Endpoint
          method="GET"
          path="/image/:key"
          description="KVに保存された画像を取得します。7日間キャッシュされます。"
        />

        <Endpoint
          method="POST"
          path="/contact"
          description="お問い合わせを送信します。名前・メールはAES-256-GCM暗号化されて保存されます。"
          body={`{
  "name": "山田太郎",
  "email": "yamada@example.com",
  "subject": "listing",
  "message": "掲載をお願いします..."
}`}
        />

        <Endpoint
          method="GET"
          path="/feed/ics"
          description="全公開演奏会のICS (iCalendar) フィードを返します。Webcal購読に使用。"
          response={`BEGIN:VCALENDAR
VERSION:2.0
...
END:VCALENDAR`}
        />

        <div className="card p-6">
          <h3 className="font-bold text-lg mb-3">認証</h3>
          <div className="text-sm text-gray-700 space-y-2">
            <p>編集・削除操作にはリクエストボディに <code className="bg-gray-100 px-1 rounded">edit_password</code> を含めます。</p>
            <p>管理者APIは <code className="bg-gray-100 px-1 rounded">POST /api/admin/auth</code> で取得したトークンを
              <code className="bg-gray-100 px-1 rounded">X-Admin-Token</code> ヘッダーに設定します。</p>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-lg mb-3">レート制限</h3>
          <div className="text-sm text-gray-700 space-y-2">
            <p>演奏会の登録: 1時間あたり10件/IP</p>
            <p>お問い合わせの送信: 1時間あたり5件/IP</p>
            <p>パスワード認証: 5回失敗で15分ロック</p>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-lg mb-3">エラーレスポンス</h3>
          <pre className="text-sm bg-gray-50 p-3 rounded overflow-x-auto">{`{
  "ok": false,
  "error": "エラーメッセージ"
}`}</pre>
        </div>
      </div>
    </div>
  );
}

function Endpoint({
  method, path, description, params, body, response,
}: {
  method: string;
  path: string;
  description: string;
  params?: { name: string; type: string; desc: string }[];
  body?: string;
  response?: string;
}) {
  const methodColor: Record<string, string> = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-amber-100 text-amber-800',
    DELETE: 'bg-red-100 text-red-800',
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-2">
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${methodColor[method] || 'bg-gray-100'}`}>
          {method}
        </span>
        <code className="text-sm font-medium">{path}</code>
      </div>
      <p className="text-sm text-gray-600 mb-4">{description}</p>

      {params && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Query Parameters</p>
          <div className="bg-gray-50 rounded p-3 text-xs space-y-1">
            {params.map((p) => (
              <div key={p.name} className="flex gap-2">
                <code className="text-primary-600">{p.name}</code>
                <span className="text-gray-400">({p.type})</span>
                <span className="text-gray-600">{p.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {body && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Request Body</p>
          <pre className="bg-gray-50 rounded p-3 text-xs overflow-x-auto">{body}</pre>
        </div>
      )}

      {response && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Response</p>
          <pre className="bg-gray-50 rounded p-3 text-xs overflow-x-auto">{response}</pre>
        </div>
      )}
    </div>
  );
}
