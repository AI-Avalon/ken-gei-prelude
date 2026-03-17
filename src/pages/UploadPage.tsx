import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConcertForm from '../components/ConcertForm';
import FlyerUploader from '../components/FlyerUploader';
import { createConcert, uploadFlyer } from '../lib/api';
import { buildFlyerThumbnailName, buildFlyerUploadName, type FlyerFile } from '../lib/flyers';
import { toast } from '../components/Toast';
import { useIsMobile } from '../hooks/useDevice';

export default function UploadPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [flyerFiles, setFlyerFiles] = useState<FlyerFile[]>([]);
  const [flyerThumbnailIndex, setFlyerThumbnailIndex] = useState(0);
  const isMobile = useIsMobile();

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

      // Upload all flyer files
      if (flyerFiles.length > 0) {
        let uploadCount = 0;
        for (const [index, flyer] of flyerFiles.entries()) {
          const fd = new FormData();
          fd.append('file', flyer.blob, buildFlyerUploadName(flyer.groupId, index, flyer.pageIndex, flyer.pageTotal));
          if (index === flyerThumbnailIndex) {
            fd.append('thumbnail', flyer.thumbnail, buildFlyerThumbnailName(flyer.groupId, index, flyer.pageIndex, flyer.pageTotal));
          }
          fd.append('concert_slug', concert.slug);
          fd.append('group_id', flyer.groupId);
          fd.append('page_index', String(flyer.pageIndex));
          fd.append('page_total', String(flyer.pageTotal));
          fd.append('sort_index', String(index));
          fd.append('set_thumbnail', index === flyerThumbnailIndex ? '1' : '0');
          const uploadRes = await uploadFlyer(fd);
          if (uploadRes.ok) {
            uploadCount++;
          }
        }
        if (uploadCount < flyerFiles.length) {
          toast(`${flyerFiles.length - uploadCount}枚のチラシのアップロードに失敗しました`, 'error');
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
    <div className={`${isMobile ? 'px-4 py-4' : 'max-w-3xl mx-auto px-4 py-8'} overflow-hidden`}>
      <h1 className={`${isMobile ? 'text-xl' : 'text-2xl sm:text-3xl'} font-bold mb-2`}>演奏会を登録する</h1>
      <p className="text-stone-500 mb-6 text-sm">
        誰でも登録できます。編集用パスワードを設定すると、後から内容を変更できます。
      </p>

      <ConcertForm onSubmit={handleSubmit} submitting={submitting} hideFlyer />

      <div className="mt-8 bg-white rounded-xl border p-4 sm:p-6 space-y-4">
        <h2 className="text-lg font-bold">チラシ画像（任意）</h2>
        <FlyerUploader
          onFilesReady={(files) => setFlyerFiles(files)}
          onThumbnailChange={(i) => setFlyerThumbnailIndex(i)}
        />
      </div>
    </div>
  );
}
