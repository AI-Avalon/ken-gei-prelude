import { Link } from 'react-router-dom';
import { UNIVERSITY, SITE_NAME, SITE_NAME_JP, SITE_TAGLINE, CREATOR_NAME } from '../lib/constants';

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-serif font-bold text-stone-900">About</h1>
        <p className="text-stone-500 mt-1">このサイトについて</p>
      </div>

      <div className="space-y-8">
        {/* Concept */}
        <section className="card p-6">
          <h2 className="text-lg font-serif font-bold mb-4 text-stone-900">コンセプト</h2>
          <blockquote className="border-l-2 border-primary-400 pl-4 italic text-stone-600 text-lg mb-4 font-serif">
            {SITE_TAGLINE}
          </blockquote>
          <p className="text-stone-700 text-sm leading-relaxed">
            {SITE_NAME}（{SITE_NAME_JP}）は、愛知県立芸術大学 音楽学部の演奏会情報を
            集約・共有するためのポータルサイトです。
            学生や教職員が主催・出演する演奏会の情報を、
            誰でも簡単に登録・閲覧・共有できます。
          </p>
          <p className="text-stone-700 text-sm leading-relaxed mt-2">
            「Crescendo」(クレッシェンド) ── だんだん強くなる音楽記号のように、
            若き音楽家たちの成長と活躍を応援します。
          </p>
        </section>

        {/* University */}
        <section className="card p-6">
          <h2 className="text-lg font-serif font-bold mb-4 text-stone-900">愛知県立芸術大学</h2>
          <div className="space-y-2 text-sm text-stone-700">
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
                className="text-primary-700 hover:text-primary-600 transition-colors">
                公式サイト →
              </a>
            </p>
          </div>
        </section>

        {/* Creator */}
        <section className="card p-6">
          <h2 className="text-lg font-serif font-bold mb-4 text-stone-900">制作者</h2>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-display text-lg font-bold flex-shrink-0">
              ♪
            </div>
            <div>
              <p className="font-medium text-stone-900">{CREATOR_NAME}</p>
              <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                愛知県立芸術大学の演奏会情報をより多くの人に届けたいという思いから、
                このサイトを開発しました。
              </p>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="card p-6">
          <h2 className="text-lg font-serif font-bold mb-4 text-stone-900">技術スタック</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <TechItem label="フロントエンド" value="React 18 + TypeScript" />
            <TechItem label="ビルドツール" value="Vite 5" />
            <TechItem label="スタイリング" value="Tailwind CSS 3" />
            <TechItem label="ルーティング" value="React Router v6" />
            <TechItem label="ホスティング" value="Cloudflare Pages" />
            <TechItem label="API" value="Pages Functions" />
            <TechItem label="データベース" value="Cloudflare D1" />
            <TechItem label="ストレージ" value="Cloudflare KV" />
            <TechItem label="地図" value="Leaflet + OSM" />
            <TechItem label="検索" value="Fuse.js" />
          </div>
        </section>

        {/* Open Source */}
        <section className="card p-6">
          <h2 className="text-lg font-serif font-bold mb-4 text-stone-900">オープンソース</h2>
          <p className="text-sm text-stone-700 mb-3">
            このプロジェクトは MIT ライセンスの下でオープンソースとして公開されています。
          </p>
          <p className="text-sm text-stone-500">
            ソースコードは GitHub にて公開中です。
          </p>
        </section>

        {/* Contact */}
        <section className="card p-6 text-center">
          <h2 className="text-lg font-serif font-bold mb-4 text-stone-900">お問い合わせ</h2>
          <p className="text-sm text-stone-600 mb-4">
            掲載依頼、バグ報告、ご意見・ご質問はお問い合わせフォームからお送りください。
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
    <div className="bg-stone-50 rounded p-3 border border-stone-100">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="font-medium text-stone-800">{value}</div>
    </div>
  );
}
