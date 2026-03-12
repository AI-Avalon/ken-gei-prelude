import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchConcert, updateConcert, deleteConcert, uploadFlyer } from '../lib/api';
import ConcertForm from '../components/ConcertForm';
import FlyerUploader from '../components/FlyerUploader';
import PasswordGate from '../components/PasswordGate';
import { toast } from '../components/Toast';
import type { Concert } from '../types';

export default function ConcertEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [concert, setConcert] = useState<Concert | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [flyerFile, setFlyerFile] = useState<{ file: Blob; thumbnail: Blob } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetchConcert(slug).then((res) => {
      if (res.ok && res.data) setConcert(res.data);
      setLoading(false);
    });
  }, [slug]);

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!slug) return;
    setSubmitting(true);
    try {
      const res = await updateConcert(slug, data, password);
      if (!res.ok) {
        toast(res.error || '更新に失敗しました', 'error');
        setSubmitting(false);
        return;
      }

      if (flyerFile) {
        const fd = new FormData();
        fd.append('file', flyerFile.file, 'flyer.webp');
        fd.append('thumbnail', flyerFile.thumbnail, 'thumb.webp');
        fd.append('concert_slug', slug);
        await uploadFlyer(fd);
      }

      toast('演奏会を更新しました', 'success');
      navigate(`/concerts/${slug}`);
    } catch {
      toast('エラーが発生しました', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!slug) return;
    setSubmitting(true);
    try {
      const res = await deleteConcert(slug, password);
      if (res.ok) {
        toast('演奏会を削除しました', 'success');
        navigate('/concerts');
      } else {
        toast(res.error || '削除に失敗しました', 'error');
      }
    } catch {
      toast('エラーが発生しました', 'error');
    } finally {
      setSubmitting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">読み込み中...</div>;
  if (!concert) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-gray-500 mb-4">演奏会が見つかりません</p>
        <Link to="/concerts" className="btn-primary">一覧に戻る</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary-600">ホーム</Link>
        <span className="mx-2">&gt;</span>
        <Link to={`/concerts/${slug}`} className="hover:text-primary-600">{concert.title}</Link>
        <span className="mx-2">&gt;</span>
        <span className="text-gray-700">編集</span>
      </nav>

      <PasswordGate concertSlug={slug!} onVerified={(pw) => setPassword(pw)}>
        <h1 className="text-3xl font-bold mb-2">演奏会を編集</h1>
        <p className="text-gray-500 mb-8">{concert.title}</p>

        <ConcertForm
          onSubmit={handleUpdate}
          submitting={submitting}
          initialData={concert}
          isEdit
          hideFlyer
        />

        <div className="mt-8">
          <h2 className="text-lg font-bold mb-4">チラシ画像を変更</h2>
          <FlyerUploader
            onFileReady={(file, thumbnail) => setFlyerFile({ file, thumbnail })}
          />
        </div>

        {/* Delete section */}
        <div className="mt-12 pt-8 border-t border-red-200">
          <h2 className="text-lg font-bold text-red-600 mb-2">危険な操作</h2>
          <p className="text-sm text-gray-500 mb-4">
            この演奏会を削除すると、30日間はゴミ箱に保管されますが、その後完全に削除されます。
          </p>
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <button onClick={handleDelete} disabled={submitting} className="btn-danger">
                {submitting ? '削除中...' : '本当に削除する'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary">
                キャンセル
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="btn-danger">
              🗑️ この演奏会を削除
            </button>
          )}
        </div>
      </PasswordGate>
    </div>
  );
}
