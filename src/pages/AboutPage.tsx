import { Link } from 'react-router-dom';
import { UNIVERSITY, SITE_NAME, SITE_NAME_JP } from '../lib/constants';

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">このサイトについて</h1>
      <p className="text-gray-500 mb-10">{SITE_NAME}（{SITE_NAME_JP}）</p>

      <div className="space-y-8">
        {/* Concept */}
        <section className="card p-6">
          <h2 className="text-xl font-bold mb-4">🎵 コンセプト</h2>
          <blockquote className="border-l-4 border-primary-400 pl-4 italic text-gray-600 text-lg mb-4">
            若き才能の「前奏曲」を、手のひらの中に
          </blockquote>
          <p className="text-gray-700 text-sm leading-relaxed">
            Ken-Gei Prelude は、愛知県立芸術大学 音楽学部の演奏会情報を
            集約・共有するためのポータルサイトです。
            学生や教職員が主催・出演する演奏会の情報を、
            誰でも簡単に登録・閲覧・共有できます。
          </p>
          <p className="text-gray-700 text-sm leading-relaxed mt-2">
            チケットの販売や座席の予約は行いません。
            演奏会の宣伝と情報共有に特化したサービスです。
          </p>
        </section>

        {/* University */}
        <section className="card p-6">
          <h2 className="text-xl font-bold mb-4">🏛️ 愛知県立芸術大学</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>名称:</strong> {UNIVERSITY.name}（{UNIVERSITY.nameEn}）</p>
            <p><strong>住所:</strong> 〒{UNIVERSITY.postal} {UNIVERSITY.address}</p>
            <p><strong>電話:</strong> {UNIVERSITY.tel}</p>
            <p><strong>アクセス:</strong></p>
            <ul className="list-disc list-inside ml-4">
              {UNIVERSITY.access.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
            <p className="mt-3">
              <a href={UNIVERSITY.website} target="_blank" rel="noopener noreferrer"
                className="text-primary-600 hover:underline">
                公式サイト →
              </a>
            </p>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="card p-6">
          <h2 className="text-xl font-bold mb-4">🛠️ 技術スタック</h2>
          <p className="text-sm text-gray-600 mb-4">
            Ken-Gei Prelude はオープンソースソフトウェアとして公開されています。
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <TechItem label="フロントエンド" value="React 18 + TypeScript" />
            <TechItem label="ビルドツール" value="Vite 5" />
            <TechItem label="スタイリング" value="Tailwind CSS 3" />
            <TechItem label="ルーティング" value="React Router v6" />
            <TechItem label="ホスティング" value="Cloudflare Pages" />
            <TechItem label="API" value="Pages Functions (Workers)" />
            <TechItem label="データベース" value="Cloudflare D1 (SQLite)" />
            <TechItem label="ファイルストレージ" value="Cloudflare KV" />
            <TechItem label="地図" value="Leaflet + OpenStreetMap" />
            <TechItem label="検索" value="fuse.js (曖昧検索)" />
          </div>
        </section>

        {/* Open Source */}
        <section className="card p-6">
          <h2 className="text-xl font-bold mb-4">📂 オープンソース</h2>
          <p className="text-sm text-gray-700 mb-3">
            このプロジェクトは MIT ライセンスの下で公開されています。
            ソースコードは GitHub で自由に閲覧・利用できます。
          </p>
          <a
            href="https://github.com/AI-Avalon/ken-gei-prelude"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center gap-2"
          >
            🐙 GitHub リポジトリ
          </a>
        </section>

        {/* Contact */}
        <section className="card p-6 text-center">
          <h2 className="text-xl font-bold mb-4">📩 お問い合わせ</h2>
          <p className="text-sm text-gray-600 mb-4">
            掲載依頼、バグ報告、ご意見・ご質問などはお問い合わせフォームからお送りください。
          </p>
          <Link to="/contact" className="btn-primary">
            お問い合わせフォーム
          </Link>
        </section>
      </div>
    </div>
  );
}

function TechItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium text-gray-800">{value}</div>
    </div>
  );
}
