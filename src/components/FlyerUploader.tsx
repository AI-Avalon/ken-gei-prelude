import { useState, useRef, useCallback } from 'react';
import { uploadFlyer } from '../lib/api';

interface Props {
  concertSlug?: string;
  existingKeys?: string[];
  onUpload?: (key: string, thumbnailKey: string) => void;
  onFileReady?: (file: Blob, thumbnail: Blob) => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_PDF_SIZE = 10 * 1024 * 1024;

export default function FlyerUploader({ concertSlug, existingKeys = [], onUpload, onFileReady }: Props) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('対応していないファイル形式です。PDF、JPEG、PNG、WebPをアップロードしてください');
      return;
    }

    const maxSize = file.type === 'application/pdf' ? MAX_PDF_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      setError(file.type === 'application/pdf'
        ? 'PDFのサイズが10MBを超えています'
        : 'ファイルサイズが5MBを超えています。圧縮してから再度お試しください');
      return;
    }

    try {
      setUploading(true);
      let blob: Blob;
      let thumbnailBlob: Blob;

      if (file.type === 'application/pdf') {
        // PDF handling - for now upload as-is, server handles conversion
        setError('PDFの処理は現在準備中です。JPEG/PNG/WebP画像をアップロードしてください。');
        setUploading(false);
        return;
      } else {
        // Image processing
        const img = await loadImage(file);
        blob = await imageToWebP(img, 2000, 0.85);
        thumbnailBlob = await imageToWebP(img, 400, 0.7);

        // Check size
        if (blob.size > 2 * 1024 * 1024) {
          blob = await imageToWebP(img, 2000, 0.7);
        }
      }

      // Preview
      const previewUrl = URL.createObjectURL(blob);
      setPreviews((prev) => [...prev, previewUrl]);

      // If onFileReady is provided, just pass the blobs back (no upload)
      if (onFileReady) {
        onFileReady(blob, thumbnailBlob);
        setUploading(false);
        return;
      }

      // Upload
      const formData = new FormData();
      formData.append('file', blob, 'flyer.webp');
      formData.append('thumbnail', thumbnailBlob, 'thumb.webp');
      if (concertSlug) formData.append('concert_slug', concertSlug);

      const res = await uploadFlyer(formData);
      if (res.ok && res.data) {
        onUpload?.(res.data.key, res.data.thumbnail_key);
      } else {
        setError(res.error || 'アップロードに失敗しました');
      }
    } catch {
      setError('ファイルの変換に失敗しました。別のファイルをお試しください');
    } finally {
      setUploading(false);
    }
  }, [concertSlug, onUpload, onFileReady]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div>
      {/* Existing images */}
      {existingKeys.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {existingKeys.map((key) => (
            <img key={key} src={`/api/image/${key}`} alt="チラシ"
              className="w-24 h-32 object-cover rounded border" />
          ))}
        </div>
      )}

      {/* Previews */}
      {previews.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {previews.map((url, i) => (
            <img key={i} src={url} alt="プレビュー"
              className="w-24 h-32 object-cover rounded border" />
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-stone-300 rounded-lg p-8 text-center cursor-pointer
                   hover:border-primary-400 hover:bg-primary-50 transition-colors"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          onChange={handleChange}
          className="hidden"
        />
        {uploading ? (
          <p className="text-primary-600">アップロード中...</p>
        ) : (
          <>
            <p className="text-stone-500">📎 クリックまたはドラッグ&ドロップ</p>
            <p className="text-xs text-stone-400 mt-1">JPEG, PNG, WebP, GIF (5MB以下) / PDF (10MB以下)</p>
          </>
        )}
      </div>

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function imageToWebP(img: HTMLImageElement, maxSize: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    let { width, height } = img;

    if (Math.max(width, height) > maxSize) {
      const ratio = maxSize / Math.max(width, height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('Canvas not supported'));
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Conversion failed')),
      'image/webp',
      quality
    );
  });
}
