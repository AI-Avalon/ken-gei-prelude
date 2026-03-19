import { useState, useEffect, useCallback } from 'react';
import { analyzeConcertFlyers, buildFlyerThumbnailName, buildFlyerUploadName } from '../lib/flyers';

interface Props {
  pdfKey: string;
  concertSlug: string;
  alt: string;
  onClick?: (url: string) => void;
  startPage?: number;
  sortIndex?: number;
}

/**
 * Lazily renders a PDF stored in KV as an image.
 * Uses pdfjs-dist (already a dependency) to render each page to canvas → WebP.
 * After rendering, POSTs the converted image to /api/upload for permanent KV storage.
 * Skips upload if images already exist for this concert (prevents duplication on reload).
 */
export default function PdfFlyerRenderer({ pdfKey, concertSlug, alt, onClick, startPage = 1, sortIndex = 0 }: Props) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const convertPdf = useCallback(async () => {
    try {
      // Fetch the PDF from KV
      const res = await fetch(`/api/image/${pdfKey}`);
      if (!res.ok) {
        setError('PDFの読み込みに失敗しました');
        setLoading(false);
        return;
      }

      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const arrayBuffer = await res.arrayBuffer();
      const cdnBase = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}`;
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        // CJKを含む未埋め込みフォントPDFの文字欠落対策
        cMapUrl: `${cdnBase}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `${cdnBase}/standard_fonts/`,
        useWorkerFetch: true,
      }).promise;
      const totalPages = pdf.numPages;
      const urls: string[] = [];
      const groupId = crypto.randomUUID();

      // Check if this concert already has WebP images (skip upload if so)
      let alreadyUploaded = false;
      try {
        const checkRes = await fetch(`/api/concerts/${concertSlug}`);
        if (checkRes.ok) {
          const checkData = await checkRes.json() as { data?: { flyer_r2_keys?: string[] } };
          const existingKeys = checkData.data?.flyer_r2_keys || [];
          if (analyzeConcertFlyers(existingKeys).hasCompleteConvertedPages) {
            alreadyUploaded = true;
          }
        }
      } catch { /* ignore check error */ }

      for (let pageNum = startPage; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        // Use scale 3.0 for sharper text (especially small back-page text)
        const viewport = page.getViewport({ scale: 3.0 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await (page.render({ canvasContext: ctx, viewport, canvas } as any).promise);

        // Convert to WebP blob with higher quality for text readability
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => b ? resolve(b) : reject(new Error('Conversion failed')),
            'image/webp',
            0.92
          );
        });

        const url = URL.createObjectURL(blob);
        urls.push(url);

        // Upload converted image to server only if not already uploaded
        if (!alreadyUploaded) {
          await uploadConverted(
            blob,
            concertSlug,
            pageNum - 1,
            totalPages,
            groupId,
            sortIndex,
            pdfKey
          ).catch(() => {});
        }
      }

      setPages(urls);
    } catch {
      setError('PDFの変換に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [pdfKey, concertSlug, startPage, sortIndex]);

  useEffect(() => {
    convertPdf();
    return () => {
      // Cleanup object URLs on unmount
      pages.forEach(url => URL.revokeObjectURL(url));
    };
  }, [convertPdf]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="bg-stone-100 rounded-lg p-8 text-center animate-pulse">
          <div className="text-2xl mb-2">📄</div>
          <p className="text-sm text-stone-500">PDFチラシを変換中...</p>
        </div>
      </div>
    );
  }

  if (error || pages.length === 0) {
    return (
      <div className="bg-stone-50 rounded-lg p-6 text-center">
        <p className="text-sm text-stone-400">{error || 'PDFを表示できません'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pages.map((url, i) => (
        <div key={i} className="relative">
          <img
            src={url}
            alt={`${alt} ${i + 1}`}
            className="rounded-lg w-full cursor-pointer shadow-sm"
            onClick={() => onClick?.(url)}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
          {pages.length > 1 && (
            <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
              {i + 1}/{pages.length}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

async function uploadConverted(
  blob: Blob,
  concertSlug: string,
  pageIndex: number,
  pageTotal: number,
  groupId: string,
  sortIndex: number,
  sourcePdfKey: string
): Promise<void> {
  // Create a small thumbnail
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });

  const thumbCanvas = document.createElement('canvas');
  const maxThumb = 400;
  let { width, height } = img;
  if (Math.max(width, height) > maxThumb) {
    const ratio = maxThumb / Math.max(width, height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  thumbCanvas.width = width;
  thumbCanvas.height = height;
  const ctx = thumbCanvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(img, 0, 0, width, height);

  const thumbnail = await new Promise<Blob>((resolve, reject) => {
    thumbCanvas.toBlob(
      (b) => b ? resolve(b) : reject(new Error('Thumb failed')),
      'image/webp',
      0.7
    );
  });

  URL.revokeObjectURL(img.src);

  const formData = new FormData();
  formData.append('file', blob, buildFlyerUploadName(groupId, sortIndex, pageIndex, pageTotal));
  formData.append('thumbnail', thumbnail, buildFlyerThumbnailName(groupId, sortIndex, pageIndex, pageTotal));
  formData.append('concert_slug', concertSlug);
  formData.append('group_id', groupId);
  formData.append('page_index', String(pageIndex));
  formData.append('page_total', String(pageTotal));
  formData.append('sort_index', String(sortIndex));
  formData.append('set_thumbnail', pageIndex === 0 ? '1' : '0');
  formData.append('source_pdf_key', sourcePdfKey);

  await fetch('/api/upload', { method: 'POST', body: formData });
}
