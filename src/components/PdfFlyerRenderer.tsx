import { useState, useEffect, useCallback } from 'react';

interface Props {
  pdfKey: string;
  concertSlug: string;
  alt: string;
  onClick?: (url: string) => void;
  startPage?: number;
}

/**
 * Lazily renders a PDF stored in KV as an image.
 * Uses pdfjs-dist (already a dependency) to render each page to canvas → WebP.
 * After rendering, POSTs the converted image to /api/upload for permanent KV storage.
 */
export default function PdfFlyerRenderer({ pdfKey, concertSlug, alt, onClick, startPage = 1 }: Props) {
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
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = Math.min(pdf.numPages, 4);
      const urls: string[] = [];

      for (let pageNum = startPage; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        await (page.render({ canvasContext: ctx, viewport, canvas } as any).promise);

        // Convert to WebP blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => b ? resolve(b) : reject(new Error('Conversion failed')),
            'image/webp',
            0.85
          );
        });

        const url = URL.createObjectURL(blob);
        urls.push(url);

        // Upload converted image to server (fire-and-forget)
        uploadConverted(blob, concertSlug, pageNum).catch(() => {});
      }

      setPages(urls);
    } catch {
      setError('PDFの変換に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [pdfKey, concertSlug, startPage]);

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

async function uploadConverted(blob: Blob, concertSlug: string, pageNum: number): Promise<void> {
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
  formData.append('file', blob, `flyer_p${pageNum}.webp`);
  formData.append('thumbnail', thumbnail, `thumb_p${pageNum}.webp`);
  formData.append('concert_slug', concertSlug);

  await fetch('/api/upload', { method: 'POST', body: formData });
}
