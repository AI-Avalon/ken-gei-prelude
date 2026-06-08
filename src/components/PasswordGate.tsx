import { useEffect, useState } from 'react';
import { verifyEditPassword } from '../lib/api';
import Logo from './Logo';

interface Props {
  concertSlug: string;
  title?: string;
  onVerified: (password: string) => void;
  children: React.ReactNode;
}

export default function PasswordGate({ concertSlug, title, onVerified, children }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const savedPassword = sessionStorage.getItem(`edit_password:${concertSlug}`);
    if (!savedPassword) return;
    setPassword(savedPassword);
    setVerified(true);
    onVerified(savedPassword);
  }, [concertSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await verifyEditPassword(concertSlug, password);
      if (res.ok) {
        sessionStorage.setItem(`edit_password:${concertSlug}`, password);
        setVerified(true);
        onVerified(password);
      } else {
        setError(res.error || 'パスワードが正しくありません');
      }
    } catch {
      setError('認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (verified) return <>{children}</>;

  return (
    <div className="max-w-md mx-auto px-4 py-10 sm:py-20">
      <div className="bg-white rounded-xl shadow-sm border border-stone-200/70 p-6 sm:p-8 text-center">
        <div className="flex justify-center mb-5">
          <Logo compact showSubtitle={false} />
        </div>
        <h2 className="text-xl font-bold mb-2 text-stone-900">編集認証</h2>
        {title && <p className="text-sm font-medium text-stone-700 line-clamp-2 mb-2">{title}</p>}
        <p className="text-stone-500 mb-5 text-sm leading-relaxed">
          この操作には、演奏会登録時に設定したパスワード、または管理者パスワードが必要です。
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="編集用パスワード"
              className="input w-full pr-20 text-center"
              autoComplete="current-password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-stone-500 hover:text-primary-600 px-2 py-1 rounded"
            >
              {showPassword ? '隠す' : '表示'}
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '認証中...' : '認証する'}
          </button>
        </form>
        <p className="text-[11px] text-stone-400 mt-4 leading-relaxed">
          認証後はこのブラウザのタブを閉じるまで再入力を省略します。忘れた場合は管理者に再設定を依頼できます。
        </p>
      </div>
    </div>
  );
}
