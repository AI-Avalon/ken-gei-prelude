import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConcertForm from '../components/ConcertForm';
import FlyerUploader from '../components/FlyerUploader';
import { createConcert, uploadFlyer } from '../lib/api';
import { toast } from '../components/Toast';

export default function UploadPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [flyerFile, setFlyerFile] = useState<{ file: Blob; thumbnail: Blob } | null>(null);

  const handleSubmit = async (data: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await createConcert(data);
      if (!res.ok) {
        toast(res.error || '登録に失敗しました', 'error');
        setSubmitting(false);
        return;
      }

      const concert = res.data!;

      // Upload flyer if selected
      if (flyerFile) {
        const fd = new FormData();
        fd.append('file', flyerFile.file, 'flyer.webp');
        fd.append('thumbnail', flyerFile.thumbnail, 'thumb.webp');
        fd.append('concert_slug', concert.slug);
        const uploadRes = await uploadFlyer(fd);
        if (!uploadRes.ok) {
          toast('チラシのアップロードに失敗しました', 'error');
        }
      }

      toast('演奏会を登録しました！', 'success');
      navigate(`/concerts/${concert.slug}`);
    } catch {
      toast('エラーが発生しました', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">演奏会を登録する</h1>
      <p className="text-gray-500 mb-8">
        誰でも登録できます。編集用パスワードを設定すると、後から内容を変更できます。
      </p>

      <ConcertForm onSubmit={handleSubmit} submitting={submitting} hideFlyer />

      <div className="mt-8">
        <h2 className="text-lg font-bold mb-4">チラシ画像（任意）</h2>
        <FlyerUploader
          onFileReady={(file, thumbnail) => setFlyerFile({ file, thumbnail })}
        />
      </div>
    </div>
  );
}
