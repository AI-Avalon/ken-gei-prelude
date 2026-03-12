import { useState } from 'react';
import { verifyEditPassword } from '../lib/api';

interface Props {
  concertSlug: string;
  onVerified: (password: string) => void;
  children: React.ReactNode;
}

export default function PasswordGate({ concertSlug, onVerified, children }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await verifyEditPassword(concertSlug, password);
      if (res.ok) {
        setVerified(true);
        onVerified(password);
      } else {
        setError('パスワードが正しくありません');
      }
    } catch {
      setError('認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (verified) return <>{children}</>;

  return (
    <div className="max-w-md mx-auto py-20">
      <div className="card p-8 text-center">
        <h2 className="text-xl font-bold mb-2">🔒 認証が必要です</h2>
        <p className="text-gray-500 mb-6 text-sm">
          この操作には、演奏会登録時に設定したパスワードが必要です。
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワードを入力"
            className="input w-full text-center"
            autoFocus
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '認証中...' : '認証する'}
          </button>
        </form>
      </div>
    </div>
  );
}
