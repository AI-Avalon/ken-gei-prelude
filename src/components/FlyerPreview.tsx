import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { analyzeConcertFlyers, buildFlyerThumbnailName, buildFlyerUploadName } from '../lib/flyers';
import { canvasToUploadBlobs } from '../lib/flyerProcessing';
import { CATEGORIES } from '../lib/constants';
import { formatDateLong, formatTime, formatPricing, resolveSmartVenue } from '../lib/utils';
import LoadingMetronome from './LoadingMetronome';
import type { Concert } from '../types';

interface Props {
  concert: Concert;
}

/**
 * 3-Stage Hybrid Flyer & PDF Renderer (`FlyerPreview`)
 * Skill: `.agent/skills/flyer-pdf-renderer/SKILL.md`
 * - Stage 1 (WebP Fast Render): Pre-converted WebP images in `aspect-[1/1.414]` (A4) container with Skeleton placeholder (0 CLS).
 * - Stage 2 (PDF.js Canvas Render): Client-side `pdfjs-dist` rendering to Canvas -> WebP for front (page 1) and back (page 2).
 * - Stage 3 (Elegant Classical Typography Poster Fallback): Never shows broken image icons or empty frames.
 * - Interactive Front/Back tabs, swipe gestures, native `<dialog closedby="any">` zoom lightbox, and PDF Open/Save action bar.
 */
export default function FlyerPreview({ concert }: Props) {
  const analysis = analyzeConcertFlyers(concert.flyer_r2_keys || []);
  const { displayKeys, pdfKeys, allPdfKeys } = analysis;

  const [renderedPdfPages, setRenderedPdfPages] = useState<string[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});
  const [loadedUrls, setLoadedUrls] = useState<Record<string, boolean>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewBothDesktop, setViewBothDesktop] = useState(false);

  // Lightbox state with native <dialog>
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogTitleId = useId();
  const touchStartXRef = useRef<number | null>(null);

  // Combine available pages: Stage 1 (displayKeys) or Stage 2 (renderedPdfPages)
  const rawImageUrls = displayKeys.length > 0
    ? displayKeys.map((k) => (k.startsWith('http') || k.startsWith('/') || k.startsWith('blob:') || k.startsWith('data:') ? k : `/api/image/${k}`))
    : renderedPdfPages;

  const validImageUrls = rawImageUrls.filter((u) => !failedUrls[u]);
  const totalPages = validImageUrls.length;
  const safeActiveIndex = totalPages > 0 ? Math.min(activeIndex, totalPages - 1) : 0;

  // Stage 2: Convert PDF via pdfjs-dist when displayKeys is empty but pdfKeys exist
  const convertPdfKeys = useCallback(async () => {
    if (displayKeys.length > 0 || pdfKeys.length === 0) return;
    setPdfLoading(true);
    const generatedUrls: string[] = [];

    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      const cdnBase = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}`;

      for (let sortIdx = 0; sortIdx < pdfKeys.length; sortIdx++) {
        const pdfKey = pdfKeys[sortIdx];
        const pdfUrl = pdfKey.startsWith('http') || pdfKey.startsWith('/') ? pdfKey : `/api/image/${pdfKey}`;
        const res = await fetch(pdfUrl);
        if (!res.ok) continue;
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/html')) continue;

        const arrayBuffer = await res.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({
          data: arrayBuffer,
          cMapUrl: `${cdnBase}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `${cdnBase}/standard_fonts/`,
          useWorkerFetch: true,
        }).promise;

        const numPages = Math.min(pdf.numPages, 4);
        const groupId = crypto.randomUUID();

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await (page.render({ canvasContext: ctx, viewport, canvas } as any).promise);

          const { blob, thumbnail } = await canvasToUploadBlobs(canvas);
          const blobUrl = URL.createObjectURL(blob);
          generatedUrls.push(blobUrl);
          setLoadedUrls((prev) => ({ ...prev, [blobUrl]: true }));

          // Background cache upload (non-blocking)
          const formData = new FormData();
          formData.append('file', blob, buildFlyerUploadName(groupId, sortIdx, pageNum - 1, numPages));
          formData.append('thumbnail', thumbnail, buildFlyerThumbnailName(groupId, sortIdx, pageNum - 1, numPages));
          formData.append('concert_slug', concert.slug);
          formData.append('group_id', groupId);
          formData.append('page_index', String(pageNum - 1));
          formData.append('page_total', String(numPages));
          formData.append('sort_index', String(sortIdx));
          formData.append('set_thumbnail', pageNum === 1 && sortIdx === 0 ? '1' : '0');
          fetch('/api/upload', { method: 'POST', body: formData }).catch(() => {});
        }
      }

      if (generatedUrls.length > 0) {
        setRenderedPdfPages(generatedUrls);
      }
    } catch {
      // Fallback to Stage 3 classical typography poster automatically
    } finally {
      setPdfLoading(false);
    }
  }, [displayKeys.length, pdfKeys, concert.slug]);

  useEffect(() => {
    convertPdfKeys();
  }, [convertPdfKeys]);

  // Native <dialog> modal management & light-dismiss fallback (`light-dismiss-a-dialog`)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      setLightboxOpen(false);
      setZoomScale(1);
    };
    dialog.addEventListener('close', handleClose);

    // Fallback for browsers without native `closedby="any"` support
    const handleBackdropClick = (event: MouseEvent) => {
      if ('closedBy' in HTMLDialogElement.prototype) return;
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isDialogContent) {
        dialog.close();
      }
    };
    dialog.addEventListener('click', handleBackdropClick);

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('click', handleBackdropClick);
    };
  }, []);

  const openLightbox = (index: number) => {
    setActiveIndex(index);
    setZoomScale(1);
    setLightboxOpen(true);
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  };

  const closeLightbox = () => {
    const dialog = dialogRef.current;
    if (dialog && dialog.open) {
      dialog.close();
    }
    setLightboxOpen(false);
    setZoomScale(1);
  };

  const pageLabel = (idx: number, total: number) => {
    if (total === 2) return idx === 0 ? '表面 (おもて)' : '裏面 (うら)';
    return `ページ ${idx + 1} / ${total}`;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(dx) > 45 && totalPages > 1) {
      if (dx < 0 && safeActiveIndex < totalPages - 1) {
        setActiveIndex(safeActiveIndex + 1);
      } else if (dx > 0 && safeActiveIndex > 0) {
        setActiveIndex(safeActiveIndex - 1);
      }
    }
  };

  // Resolve primary PDF URL (if any) or printable flyer URL
  const primaryPdfUrl = allPdfKeys.length > 0
    ? (allPdfKeys[0].startsWith('http') || allPdfKeys[0].startsWith('/') ? allPdfKeys[0] : `/api/image/${allPdfKeys[0]}`)
    : validImageUrls[safeActiveIndex] || null;

  return (
    <div className="space-y-4" data-testid="flyer-preview-container">
      {/* Top Controls: Front/Back One-Tap Switcher Tabs */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-100/90 p-1.5 rounded-xl border border-stone-200/70">
          <div className="flex flex-wrap items-center gap-1.5 flex-1">
            {validImageUrls.map((_, idx) => {
              const isSelected = !viewBothDesktop && safeActiveIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setViewBothDesktop(false);
                    setActiveIndex(idx);
                  }}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-navy-900 text-primary-300 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                  }`}
                >
                  {idx === 0 ? '📄 ' : '🎼 '}
                  {pageLabel(idx, totalPages)}
                </button>
              );
            })}
          </div>
          {totalPages === 2 && (
            <button
              type="button"
              onClick={() => setViewBothDesktop(!viewBothDesktop)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                viewBothDesktop
                  ? 'bg-primary-700 text-white shadow-sm'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-primary-300'
              }`}
            >
              {viewBothDesktop ? '1枚ずつ表示' : '表・裏を並べて表示'}
            </button>
          )}
        </div>
      )}

      {/* Main Flyer Viewport: Stage 1 (WebP) / Stage 2 (PDF.js Canvas) / Stage 3 (Classical Typography Poster) */}
      {pdfLoading ? (
        <div className="max-w-md mx-auto aspect-[1/1.414] rounded-2xl bg-stone-100 border border-stone-200/80 flex flex-col items-center justify-center p-6 shadow-inner">
          <LoadingMetronome label="高精細チラシプレビューを生成しています..." />
        </div>
      ) : totalPages > 0 ? (
        <div
          className={`grid gap-4 ${
            viewBothDesktop && totalPages >= 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1 max-w-md mx-auto'
          }`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {(viewBothDesktop ? validImageUrls : [validImageUrls[safeActiveIndex]]).map((imgUrl, idx) => {
            const actualIndex = viewBothDesktop ? idx : safeActiveIndex;
            const isLoaded = Boolean(loadedUrls[imgUrl]);
            // Apply optimize-image-priority: high priority for primary visible flyer, low for secondary
            const priorityProps = actualIndex === 0
              ? ({ fetchPriority: 'high' } as Record<string, string>)
              : ({ fetchPriority: 'low', loading: 'lazy' } as Record<string, string>);

            return (
              <div
                key={imgUrl}
                onClick={() => openLightbox(actualIndex)}
                className="relative w-full aspect-[1/1.414] bg-gradient-to-b from-stone-50 to-stone-100 rounded-2xl border border-stone-200/80 shadow-md overflow-hidden cursor-zoom-in group select-none"
              >
                {/* Skeleton placeholder to guarantee zero CLS */}
                {!isLoaded && (
                  <div className="absolute inset-0 skeleton flex items-center justify-center">
                    <span className="text-xs text-stone-500 font-serif">読み込み中...</span>
                  </div>
                )}
                <img
                  src={imgUrl}
                  alt={`${concert.title} ${pageLabel(actualIndex, totalPages)}`}
                  width={800}
                  height={1131}
                  {...priorityProps}
                  onLoad={() => setLoadedUrls((prev) => ({ ...prev, [imgUrl]: true }))}
                  onError={() => setFailedUrls((prev) => ({ ...prev, [imgUrl]: true }))}
                  className={`w-full h-full object-contain transition-all duration-300 group-hover:scale-[1.015] ${
                    isLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />

                {/* Top badge */}
                {totalPages > 1 && (
                  <span className="absolute top-3 left-3 bg-navy-900/80 text-primary-200 text-xs font-medium px-3 py-1 rounded-full backdrop-blur-md border border-primary-500/30">
                    {pageLabel(actualIndex, totalPages)}
                  </span>
                )}

                {/* Zoom indicator pill */}
                <div className="absolute bottom-3 right-3 bg-navy-900/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow-sm border border-white/15 group-hover:bg-primary-700 transition-colors">
                  <span>🔍</span>
                  <span>タップで拡大プレビュー</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Stage 3: Elegant Classical Typography Poster Card Fallback (Never renders a broken frame) */
        <ClassicalPosterFallback concert={concert} />
      )}

      {/* Action Bar: Open Official PDF / Save PDF / Enlarge */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-stone-200/60">
        <div className="flex flex-wrap items-center gap-2">
          {totalPages > 0 && (
            <button
              type="button"
              onClick={() => openLightbox(safeActiveIndex)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
            >
              🔍 フルスクリーン拡大
            </button>
          )}
          {totalPages > 1 && (
            <button
              type="button"
              onClick={() => setActiveIndex((safeActiveIndex + 1) % totalPages)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-primary-50 text-primary-800 hover:bg-primary-100 border border-primary-200/70 transition-colors"
            >
              🔄 {safeActiveIndex === 0 ? '裏面を見る' : '表面を見る'}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {primaryPdfUrl && (
            <>
              <a
                href={primaryPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white border border-stone-200 text-stone-700 hover:border-primary-400 hover:text-primary-700 transition-colors shadow-sm"
              >
                📄 公式PDFを別タブで開く
              </a>
              <a
                href={primaryPdfUrl}
                download={`${concert.slug}-flyer${allPdfKeys.length > 0 ? '.pdf' : '.webp'}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-navy-900 text-primary-300 hover:bg-navy-800 transition-colors shadow-sm"
              >
                📥 PDF・チラシを保存
              </a>
            </>
          )}
        </div>
      </div>

      {/* Fullscreen Zoom Lightbox Modal (Native <dialog closedby="any">) */}
      <dialog
        ref={dialogRef}
        {...({ closedby: 'any' } as any)}
        aria-labelledby={dialogTitleId}
        className="w-full max-w-5xl bg-transparent p-0 m-auto backdrop:bg-navy-950/90 open:flex flex-col items-center justify-center outline-none"
      >
        {lightboxOpen && totalPages > 0 && (
          <div
            className="relative w-[96vw] max-w-4xl bg-navy-950/95 border border-primary-800/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-navy-900 border-b border-primary-800/30 text-white">
              <div className="min-w-0 flex items-center gap-2">
                <h3 id={dialogTitleId} className="text-sm font-serif font-bold text-primary-200">
                  {concert.title}
                </h3>
                {totalPages > 1 && (
                  <span className="text-xs bg-primary-900/80 text-primary-300 px-2.5 py-0.5 rounded-full border border-primary-700/50 whitespace-nowrap shrink-0">
                    {pageLabel(safeActiveIndex, totalPages)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Zoom controls */}
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.max(1, Number((z - 0.5).toFixed(1))))}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white tabular-nums"
                  aria-label="縮小"
                >
                  −
                </button>
                <span className="text-xs text-primary-300 px-1.5 tabular-nums">{Math.round(zoomScale * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.min(3, Number((z + 0.5).toFixed(1))))}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white tabular-nums"
                  aria-label="拡大"
                >
                  ＋
                </button>
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="ml-2 px-3 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-xs font-semibold text-white"
                  aria-label="閉じる"
                >
                  ✕ 閉じる
                </button>
              </div>
            </div>

            {/* Lightbox Canvas Area */}
            <div className="relative flex-1 overflow-auto flex items-center justify-center p-3 sm:p-6 min-h-[55vh]">
              <img
                src={validImageUrls[safeActiveIndex]}
                alt={`${concert.title} 拡大プレビュー`}
                style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
                className="max-h-[75vh] w-auto object-contain rounded-lg transition-transform duration-200"
              />
            </div>

            {/* Lightbox Footer Switcher */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 px-4 py-3 bg-navy-900 border-t border-primary-800/30">
                {validImageUrls.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setZoomScale(1);
                      setActiveIndex(idx);
                    }}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      safeActiveIndex === idx
                        ? 'bg-primary-500 text-navy-950 shadow'
                        : 'bg-white/10 text-stone-300 hover:bg-white/20'
                    }`}
                  >
                    {pageLabel(idx, totalPages)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </dialog>
    </div>
  );
}

/**
 * Stage 3: Classical Music Typography Poster Card
 * Automatically rendered when no flyer image/PDF is registered or if network fetch fails.
 */
export function ClassicalPosterFallback({ concert }: { concert: Concert }) {
  const cat = CATEGORIES[concert.category] || CATEGORIES.other;
  const smartVenue = resolveSmartVenue(concert.venue);
  const pricing = formatPricing(concert.pricing);

  return (
    <div
      data-testid="flyer-typography-fallback"
      className="max-w-md mx-auto aspect-[1/1.414] rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-stone-900 text-white p-6 sm:p-8 shadow-xl border border-primary-500/30 flex flex-col justify-between relative overflow-hidden"
    >
      {/* Decorative inner gold frame */}
      <div className="absolute inset-3 border border-primary-400/25 rounded-xl pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-primary-500/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-accent-500/10 blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 text-center space-y-2 pt-2">
        <p className="text-[11px] tracking-[0.28em] text-primary-300/90 uppercase font-display">
          Aichi University of the Arts
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs bg-primary-500/20 text-primary-200 border border-primary-400/30">
          <span>{cat.icon}</span>
          <span>{cat.label}</span>
        </div>
      </div>

      {/* Centerpiece Title & Program Preview */}
      <div className="relative z-10 my-auto py-4 text-center space-y-4">
        <div className="text-primary-400/70 text-2xl font-display">♪</div>
        <h3 className="text-lg sm:text-xl font-serif font-bold text-primary-100 leading-relaxed px-2 [overflow-wrap:anywhere]">
          {concert.title}
        </h3>
        {concert.subtitle && (
          <p className="text-xs sm:text-sm text-stone-300 font-serif leading-relaxed px-2 [overflow-wrap:anywhere]">
            {concert.subtitle}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <span className="w-12 h-px bg-primary-400/40" />
          <span className="text-primary-300 text-xs">✦</span>
          <span className="w-12 h-px bg-primary-400/40" />
        </div>
        {concert.program && concert.program.length > 0 && (
          <div className="space-y-1 text-xs text-stone-300/90 max-w-xs mx-auto">
            {concert.program.slice(0, 3).map((p, idx) => (
              <p key={idx} className="leading-snug [overflow-wrap:anywhere]">
                {p.composer ? `${p.composer}：` : ''}{p.piece}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Footer Date & Venue Details */}
      <div className="relative z-10 border-t border-primary-500/25 pt-4 space-y-1.5 text-center">
        <p className="text-sm sm:text-base font-serif font-bold text-primary-200 tabular-nums">
          {formatDateLong(concert.date)}
        </p>
        <p className="text-xs text-stone-300 tabular-nums">
          {formatTime(concert)} ／ 入場料：{pricing}
        </p>
        <p className="text-xs text-primary-300/90 font-medium [overflow-wrap:anywhere]">
          📍 {smartVenue.name}
        </p>
      </div>
    </div>
  );
}
