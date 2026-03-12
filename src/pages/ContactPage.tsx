import { useState, useEffect } from 'react';
import { submitContact, fetchConcerts } from '../lib/api';
import { INQUIRY_SUBJECTS } from '../lib/constants';
import { toast } from '../components/Toast';
import type { Concert } from '../types';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [concertId, setConcertId] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [concerts, setConcerts] = useState<Concert[]>([]);

  useEffect(() => {
    fetchConcerts({ limit: 100, sort: 'date_desc' }).then((res) => {
      if (res.ok && res.data) setConcerts(res.data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !subject || !message) return;
    if (message.length < 10) {
      toast('メッセージは10文字以上入力してください', 'error');
      return;
    }
    setSubmitting(true);
    const res = await submitContact({ name, email, subject, message, concert_id: concertId, honeypot });
    if (res.ok) {
      setSubmitted(true);
      toast('お問い合わせを送信しました', 'success');
    } else {
      toast(res.error || '送信に失敗しました', 'error');
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">送信完了</h1>
        <p className="text-gray-500">
          お問い合わせを受け付けました。内容を確認のうえ、対応いたします。
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">お問い合わせ</h1>
      <p className="text-gray-500 mb-8">
        掲載依頼、情報修正、バグ報告などお気軽にどうぞ。
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Honeypot */}
        <div className="hidden" aria-hidden="true">
          <input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
        </div>

        <div>
          <label className="label">お名前 *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="input w-full" required maxLength={50} placeholder="お名前" />
        </div>

        <div>
          <label className="label">メールアドレス *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="input w-full" required placeholder="example@mail.com" />
        </div>

        <div>
          <label className="label">件名 *</label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="input w-full" required>
            <option value="">選択してください</option>
            {INQUIRY_SUBJECTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">関連する演奏会（任意）</label>
          <select value={concertId} onChange={(e) => setConcertId(e.target.value)} className="input w-full">
            <option value="">なし</option>
            {concerts.map((c) => (
              <option key={c.id} value={c.slug}>{c.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">メッセージ * （10〜2000文字）</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input w-full"
            rows={6}
            required
            minLength={10}
            maxLength={2000}
            placeholder="お問い合わせ内容を入力してください"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/2000</p>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? '送信中...' : '送信する'}
        </button>
      </form>
    </div>
  );
}
