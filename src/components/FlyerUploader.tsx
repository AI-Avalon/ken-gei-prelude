import { useState, useRef, useCallback } from 'react';
import { uploadFlyer } from '../lib/api';
import {
  analyzeConcertFlyers,
  buildFlyerThumbnailName,
  buildFlyerUploadName,
  type FlyerFile,
} from '../lib/flyers';

interface Props {
  concertSlug?: string;
  existingKeys?: string[];
  onUpload?: (key: string, thumbnailKey: string) => void;
  /** Called with ALL accumulated files whenever a new file is processed (for pre-upload staging) */
  onFilesReady?: (files: FlyerFile[]) => void;
  /** Called when the user changes the thumbnail selection index (staging mode only) */
  onThumbnailChange?: (index: number) => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_PDF_SIZE = 10 * 1024 * 1024;

export default function FlyerUploader({ concertSlug, existingKeys = [], onUpload, onFilesReady, onThumbnailChange }: Props) {
  const [files, setFiles] = useState<FlyerFile[]>([]);
  const [thumbnailIndex, setThumbnailIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [pdfProgress, setPdfProgress] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const addFile = useCallback((f: FlyerFile) => {
    setFiles((prev) => {
      const next = [...prev, f];
      onFilesReady?.(next);
      return next;
    });
  }, [onFilesReady]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index].previewUrl);
      onFilesReady?.(next);
      return next;
    });
    setThumbnailIndex((prev) => {
      const next = prev === index ? 0 : prev > index ? prev - 1 : prev;
      onThumbnailChange?.(next);
      return next;
    });
  }, [onFilesReady, onThumbnailChange]);

  const processFile = useCallback(async (file: File) => {
    setError('');
    setPdfProgress('');

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

      if (file.type === 'application/pdf') {
        await processPdf(file);
      } else {
        const img = await loadImage(file);
        const blob = await imageToWebP(img, 2000, 0.85);
        const thumbnail = await imageToWebP(img, 400, 0.7);
        const previewUrl = URL.createObjectURL(blob);
        const groupId = crypto.randomUUID();

        if (onFilesReady) {
          // Staging mode — store locally
          addFile({ blob, thumbnail, previewUrl, groupId, pageIndex: 0, pageTotal: 1 });
        } else {
          // Direct upload mode: first image is thumbnail by default
          await uploadToServer(blob, thumbnail, groupId, 0, 1, true);
        }
      }
    } catch {
      setError('ファイルの変換に失敗しました。別のファイルをお試しください');
    } finally {
      setUploading(false);
      setPdfProgress('');
    }
  }, [concertSlug, onUpload, onFilesReady, addFile]);

  const processPdf = async (file: File) => {
    setPdfProgress('PDFを読み込み中...');

    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const cdnBase = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}`;
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: `${cdnBase}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${cdnBase}/standard_fonts/`,
      useWorkerFetch: true,
    }).promise;
    const totalPages = pdf.numPages;
    const groupId = crypto.randomUUID();

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      setPdfProgress(`ページ ${pageNum}/${totalPages} を変換中...`);
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 3.0 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

      const blob = await canvasToWebP(canvas, 0.96);
      const thumbnail = await createThumbnailFromCanvas(canvas, 560, 0.9);
      const previewUrl = URL.createObjectURL(blob);

      if (onFilesReady) {
        addFile({
          blob,
          thumbnail,
          previewUrl,
          groupId,
          pageIndex: pageNum - 1,
          pageTotal: totalPages,
        });
      } else {
        await uploadToServer(blob, thumbnail, groupId, pageNum - 1, totalPages, pageNum === 1);
      }
    }

    setPdfProgress(`${totalPages}ページの変換完了！`);
  };

  const uploadToServer = async (blob: Blob, thumbnail: Blob, groupId: string, pageIndex = 0, pageTotal = 1, isThumb = false) => {
    const formData = new FormData();
    formData.append('file', blob, buildFlyerUploadName(groupId, pageIndex, pageIndex, pageTotal));
    if (isThumb) {
      formData.append('thumbnail', thumbnail, buildFlyerThumbnailName(groupId, pageIndex, pageIndex, pageTotal));
    }
    if (concertSlug) formData.append('concert_slug', concertSlug);
    formData.append('group_id', groupId);
    formData.append('page_index', String(pageIndex));
    formData.append('page_total', String(pageTotal));
    formData.append('sort_index', String(pageIndex));
    formData.append('set_thumbnail', isThumb ? '1' : '0');

    const res = await uploadFlyer(formData);
    if (res.ok && res.data) {
      onUpload?.(res.data.key, res.data.thumbnail_key);
    } else {
      setError(res.error || 'アップロードに失敗しました');
    }
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

  const allPreviews = files.map((f) => f.previewUrl);
  const existingPreviewKeys = analyzeConcertFlyers(existingKeys).displayKeys;

  return (
    <div>
      {/* Existing server images */}
      {existingPreviewKeys.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {existingPreviewKeys.map((key) => (
            <img key={key} src={`/api/image/${key}`} alt="チラシ"
              className="w-24 h-32 object-cover rounded border" />
          ))}
        </div>
      )}

      {/* Local previews with thumbnail selection */}
      {allPreviews.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {allPreviews.map((url, i) => (
            <div
              key={i}
              className={`relative group cursor-pointer rounded border-2 transition-all ${
                i === thumbnailIndex
                  ? 'border-primary-500 shadow-md'
                  : 'border-stone-200 hover:border-primary-300'
              }`}
              onClick={() => {
                if (onFilesReady) {
                  setThumbnailIndex(i);
                  onThumbnailChange?.(i);
                }
              }}
            >
              <img src={url} alt={`プレビュー ${i + 1}`}
                className="w-24 h-32 object-cover rounded" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                ×
              </button>
              {i === thumbnailIndex ? (
                <span className="absolute bottom-0 left-0 right-0 bg-primary-600/80 text-white text-[9px] text-center py-0.5 font-medium rounded-b">
                  ⭐ サムネイル
                </span>
              ) : onFilesReady ? (
                <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-b">
                  タップして設定
                </span>
              ) : null}
            </div>
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
          aria-label="チラシファイルを選択"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          onChange={handleChange}
          className="hidden"
        />
        {uploading ? (
          <p className="text-primary-600">{pdfProgress || '変換中...'}</p>
        ) : (
          <>
            <p className="text-stone-500">📎 クリックまたはドラッグ&ドロップ</p>
            <p className="text-xs text-stone-400 mt-1">JPEG, PNG, WebP, GIF (5MB以下) / PDF (10MB以下, 全ページ変換)</p>
            {allPreviews.length > 0 && (
              <p className="text-xs text-primary-500 mt-1">追加の画像をアップロードできます</p>
            )}
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

function canvasToWebP(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Conversion failed')),
      'image/webp',
      quality
    );
  });
}

function createThumbnailFromCanvas(canvas: HTMLCanvasElement, maxSize: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const thumbCanvas = document.createElement('canvas');
    let width = canvas.width;
    let height = canvas.height;

    if (Math.max(width, height) > maxSize) {
      const ratio = maxSize / Math.max(width, height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    thumbCanvas.width = width;
    thumbCanvas.height = height;
    const ctx = thumbCanvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(canvas, 0, 0, width, height);
    thumbCanvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Thumbnail failed')),
      'image/webp',
      quality
    );
  });
}
