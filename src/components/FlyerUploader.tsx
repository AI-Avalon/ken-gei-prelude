import { useState, useRef, useCallback } from 'react';
import { uploadFlyer } from '../lib/api';
import {
  analyzeConcertFlyers,
  buildFlyerThumbnailName,
  buildFlyerUploadName,
  type FlyerFile,
} from '../lib/flyers';
import {
  downloadFlyerAs,
  formatBytes,
  normalizeFlyerFiles,
  processFlyerFile,
  rotateFlyerFile,
  validateFlyerFile,
  type ProcessProgress,
} from '../lib/flyerProcessing';
import LoadingMetronome from './LoadingMetronome';

interface Props {
  concertSlug?: string;
  existingKeys?: string[];
  onUpload?: (key: string, thumbnailKey: string) => void;
  /** Called with ALL accumulated files whenever a new file is processed (for pre-upload staging) */
  onFilesReady?: (files: FlyerFile[]) => void;
  /** Called when the user changes the thumbnail selection index (staging mode only) */
  onThumbnailChange?: (index: number) => void;
}

export default function FlyerUploader({ concertSlug, existingKeys = [], onUpload, onFilesReady, onThumbnailChange }: Props) {
  const [files, setFiles] = useState<FlyerFile[]>([]);
  const [thumbnailIndex, setThumbnailIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<ProcessProgress | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const syncFiles = useCallback((nextFiles: FlyerFile[], nextThumb = thumbnailIndex) => {
    const normalized = normalizeFlyerFiles(nextFiles);
    const safeThumb = normalized.length === 0 ? 0 : Math.min(nextThumb, normalized.length - 1);
    setFiles(normalized);
    setThumbnailIndex(safeThumb);
    onFilesReady?.(normalized);
    onThumbnailChange?.(safeThumb);
    return normalized;
  }, [onFilesReady, onThumbnailChange, thumbnailIndex]);

  const processFile = useCallback(async (file: File) => {
    setError('');
    setProgress(null);

    const validationError = validateFlyerFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setUploading(true);
      const nextFiles = await processFlyerFile(file, setProgress);

      if (onFilesReady) {
        setFiles((prev) => {
          const normalized = normalizeFlyerFiles([...prev, ...nextFiles]);
          onFilesReady(normalized);
          onThumbnailChange?.(Math.min(thumbnailIndex, Math.max(0, normalized.length - 1)));
          return normalized;
        });
      } else {
        for (const [index, flyer] of normalizeFlyerFiles(nextFiles).entries()) {
          await uploadToServer(flyer, index, index === 0);
        }
      }
    } catch {
      setError('ファイルの変換に失敗しました。別のファイルをお試しください');
    } finally {
      setUploading(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [onFilesReady, onThumbnailChange, thumbnailIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const uploadToServer = async (flyer: FlyerFile, sortIndex: number, isThumb = false) => {
    const formData = new FormData();
    formData.append('file', flyer.blob, buildFlyerUploadName(flyer.groupId, sortIndex, flyer.pageIndex, flyer.pageTotal));
    if (isThumb) {
      formData.append('thumbnail', flyer.thumbnail, buildFlyerThumbnailName(flyer.groupId, sortIndex, flyer.pageIndex, flyer.pageTotal));
    }
    if (concertSlug) formData.append('concert_slug', concertSlug);
    formData.append('group_id', flyer.groupId);
    formData.append('page_index', String(flyer.pageIndex));
    formData.append('page_total', String(flyer.pageTotal));
    formData.append('sort_index', String(sortIndex));
    formData.append('set_thumbnail', isThumb ? '1' : '0');

    const res = await uploadFlyer(formData);
    if (res.ok && res.data) {
      onUpload?.(res.data.key, res.data.thumbnail_key);
    } else {
      setError(res.error || 'アップロードに失敗しました');
    }
  };

  const removeFile = useCallback((index: number) => {
    const removed = files[index];
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    syncFiles(files.filter((_, i) => i !== index), thumbnailIndex === index ? 0 : thumbnailIndex > index ? thumbnailIndex - 1 : thumbnailIndex);
  }, [files, syncFiles, thumbnailIndex]);

  const moveFile = useCallback((index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= files.length) return;
    const next = [...files];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    const nextThumb = thumbnailIndex === index ? nextIndex : thumbnailIndex === nextIndex ? index : thumbnailIndex;
    syncFiles(next, nextThumb);
  }, [files, syncFiles, thumbnailIndex]);

  const rotateFile = useCallback(async (index: number) => {
    try {
      setUploading(true);
      setProgress({ phase: 'ページを回転しています...' });
      const rotated = await rotateFlyerFile(files[index], 90);
      const next = [...files];
      next[index] = rotated;
      syncFiles(next);
    } catch {
      setError('ページの回転に失敗しました');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }, [files, syncFiles]);

  const selectThumbnail = (index: number) => {
    setThumbnailIndex(index);
    onThumbnailChange?.(index);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const existingPreviewKeys = analyzeConcertFlyers(existingKeys).displayKeys;
  const progressText = progress?.current && progress.total
    ? `${progress.phase} ${progress.current}/${progress.total}`
    : progress?.phase || '変換中...';

  return (
    <div>
      {existingPreviewKeys.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-stone-500 mb-2">現在のチラシ</p>
          <div className="flex gap-3 flex-wrap">
            {existingPreviewKeys.map((key) => (
              <div key={key} className="relative">
                <img src={`/api/image/${key}`} alt="チラシ"
                  className="w-28 h-40 object-contain rounded-lg border border-stone-200 bg-stone-50" />
              </div>
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-stone-500">アップロード前にページを整えられます</p>
            <p className="text-[11px] text-stone-400">PDF/画像は端末内でWebP化されます</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {files.map((file, i) => (
              <div
                key={file.previewUrl}
                className={`rounded-lg border bg-white p-2 shadow-sm transition-all ${
                  i === thumbnailIndex ? 'border-primary-500 ring-2 ring-primary-200' : 'border-stone-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => selectThumbnail(i)}
                  className="block w-full overflow-hidden rounded bg-stone-50"
                  aria-label={`ページ ${i + 1} をサムネイルにする`}
                >
                  <img src={file.previewUrl} alt={`プレビュー ${i + 1}`}
                    className="h-40 w-full object-contain" />
                </button>
                <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
                  <span>ページ {i + 1}</span>
                  <span>{formatBytes(file.blob.size)}</span>
                </div>
                {i === thumbnailIndex && (
                  <div className="mt-1 rounded bg-primary-600 px-2 py-1 text-center text-[10px] font-medium text-white">
                    サムネイル
                  </div>
                )}
                <div className="mt-2 grid grid-cols-4 gap-1">
                  <IconButton label="前へ" disabled={i === 0} onClick={() => moveFile(i, -1)}>←</IconButton>
                  <IconButton label="次へ" disabled={i === files.length - 1} onClick={() => moveFile(i, 1)}>→</IconButton>
                  <IconButton label="回転" onClick={() => rotateFile(i)}>↻</IconButton>
                  <IconButton label="削除" onClick={() => removeFile(i)}>×</IconButton>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-1">
                  <SmallButton onClick={() => downloadFlyerAs(file, 'png', `crescendo-page-${i + 1}.png`)}>PNG保存</SmallButton>
                  <SmallButton onClick={() => downloadFlyerAs(file, 'webp', `crescendo-page-${i + 1}.webp`)}>WebP保存</SmallButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        className="border-2 border-dashed border-stone-300 rounded-lg p-7 text-center cursor-pointer
                   hover:border-primary-400 hover:bg-primary-50 transition-colors"
      >
        <input
          ref={fileRef}
          type="file"
          aria-label="チラシファイルを選択"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          onChange={handleChange}
          className="hidden"
        />
        {uploading ? (
          <LoadingMetronome label={progressText} compact />
        ) : (
          <>
            <p className="text-stone-600 font-medium">クリックまたはドラッグ&ドロップ</p>
            <p className="text-xs text-stone-400 mt-1">JPEG, PNG, WebP, GIF (5MB以下) / PDF (50MB以下)</p>
            <p className="text-xs text-primary-600 mt-1">PDFはスマホ・PC内でページごとに画像化してから送信します</p>
          </>
        )}
      </div>

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}

function IconButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-700 disabled:opacity-30 hover:bg-primary-50"
    >
      {children}
    </button>
  );
}

function SmallButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-stone-200 bg-white px-2 py-1 text-[10px] text-stone-600 hover:border-primary-300 hover:text-primary-700"
    >
      {children}
    </button>
  );
}
