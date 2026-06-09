import type { FlyerFile } from './flyers';

export const ALLOWED_FLYER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_UPLOAD_BYTES = 50 * 1024 * 1024;

const PDF_SCALE = 2.6;
const FULL_MAX_EDGE = 2200;
const THUMB_MAX_EDGE = 560;
const WEBP_QUALITIES = [0.92, 0.86, 0.8, 0.72, 0.64];
const WEBP_EDGES = [2200, 1900, 1600, 1300, 1100];

export interface ProcessProgress {
  phase: string;
  current?: number;
  total?: number;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

export function validateFlyerFile(file: File): string {
  if (!ALLOWED_FLYER_TYPES.includes(file.type)) {
    return '対応していないファイル形式です。PDF、JPEG、PNG、WebP、GIFを選んでください';
  }
  const maxSize = file.type === 'application/pdf' ? MAX_PDF_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES;
  if (file.size > maxSize) {
    return file.type === 'application/pdf'
      ? 'PDFのサイズが50MBを超えています'
      : '画像は5MB以下にしてください。PDFの場合は端末内でWebP化してから送信されます';
  }
  return '';
}

export async function processFlyerFile(
  file: File,
  onProgress?: (progress: ProcessProgress) => void
): Promise<FlyerFile[]> {
  if (file.type === 'application/pdf') {
    return renderPdfToFlyerFiles(file, onProgress);
  }
  onProgress?.({ phase: '画像をWebPに変換中...' });
  const image = await loadImage(file);
  const canvas = imageToCanvas(image, FULL_MAX_EDGE);
  const flyer = await canvasToFlyerFile(canvas, {
    groupId: crypto.randomUUID(),
    pageIndex: 0,
    pageTotal: 1,
    sourceName: file.name,
  });
  URL.revokeObjectURL(image.src);
  return [flyer];
}

export function normalizeFlyerFiles(files: FlyerFile[]): FlyerFile[] {
  const groupCounts = new Map<string, number>();
  const groupIndexes = new Map<string, number>();
  for (const file of files) {
    groupCounts.set(file.groupId, (groupCounts.get(file.groupId) || 0) + 1);
  }
  return files.map((file) => {
    const index = groupIndexes.get(file.groupId) || 0;
    groupIndexes.set(file.groupId, index + 1);
    return {
      ...file,
      pageIndex: index,
      pageTotal: groupCounts.get(file.groupId) || 1,
    };
  });
}

export async function rotateFlyerFile(file: FlyerFile, degrees = 90): Promise<FlyerFile> {
  const image = await loadImage(file.blob);
  const nextRotation = ((file.rotation || 0) + degrees + 360) % 360;
  const canvas = rotateImageToCanvas(image, degrees);
  URL.revokeObjectURL(image.src);
  return canvasToFlyerFile(canvas, {
    ...file,
    rotation: nextRotation,
  }, file.previewUrl);
}

export async function downloadFlyerAs(file: FlyerFile, format: 'png' | 'webp', filename: string): Promise<void> {
  const image = await loadImage(file.blob);
  const canvas = imageToCanvas(image, Math.max(image.naturalWidth, image.naturalHeight));
  URL.revokeObjectURL(image.src);
  const blob = format === 'png'
    ? await canvasToBlob(canvas, 'image/png', 1)
    : await encodeCanvasToWebP(canvas, MAX_IMAGE_UPLOAD_BYTES, 0.9);
  downloadBlob(blob, filename);
}

export async function canvasToUploadBlobs(canvas: HTMLCanvasElement): Promise<{ blob: Blob; thumbnail: Blob }> {
  return {
    blob: await encodeCanvasToWebP(canvas, MAX_IMAGE_UPLOAD_BYTES, 0.9),
    thumbnail: await createThumbnail(canvas),
  };
}

async function renderPdfToFlyerFiles(
  file: File,
  onProgress?: (progress: ProcessProgress) => void
): Promise<FlyerFile[]> {
  onProgress?.({ phase: 'PDFを読み込み中...' });
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

  const groupId = crypto.randomUUID();
  const files: FlyerFile[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    onProgress?.({ phase: 'PDFを端末内で画像化中...', current: pageNum, total: pdf.numPages });
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: PDF_SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
    files.push(await canvasToFlyerFile(canvas, {
      groupId,
      pageIndex: pageNum - 1,
      pageTotal: pdf.numPages,
      sourceName: file.name,
    }));
  }

  onProgress?.({ phase: `${pdf.numPages}ページの変換完了` });
  return files;
}

async function canvasToFlyerFile(
  canvas: HTMLCanvasElement,
  meta: Pick<FlyerFile, 'groupId' | 'pageIndex' | 'pageTotal'> & Partial<FlyerFile>,
  previousPreviewUrl?: string
): Promise<FlyerFile> {
  const blob = await encodeCanvasToWebP(canvas, MAX_IMAGE_UPLOAD_BYTES, 0.9);
  const thumbnail = await createThumbnail(canvas);
  if (previousPreviewUrl) URL.revokeObjectURL(previousPreviewUrl);
  return {
    blob,
    thumbnail,
    previewUrl: URL.createObjectURL(blob),
    groupId: meta.groupId,
    pageIndex: meta.pageIndex,
    pageTotal: meta.pageTotal,
    sourcePdfKey: meta.sourcePdfKey,
    sourceName: meta.sourceName,
    rotation: meta.rotation || 0,
  };
}

async function encodeCanvasToWebP(canvas: HTMLCanvasElement, maxBytes: number, preferredQuality: number): Promise<Blob> {
  for (const edge of WEBP_EDGES) {
    const scaled = scaleCanvas(canvas, edge);
    for (const quality of WEBP_QUALITIES) {
      const blob = await canvasToBlob(scaled, 'image/webp', Math.min(preferredQuality, quality));
      if (blob.size <= maxBytes) return blob;
    }
  }
  return canvasToBlob(scaleCanvas(canvas, 950), 'image/webp', 0.58);
}

function imageToCanvas(image: HTMLImageElement, maxEdge: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ratio = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function rotateImageToCanvas(image: HTMLImageElement, degrees: number): HTMLCanvasElement {
  const normalized = ((degrees % 360) + 360) % 360;
  const swap = normalized === 90 || normalized === 270;
  const canvas = document.createElement('canvas');
  canvas.width = swap ? image.naturalHeight : image.naturalWidth;
  canvas.height = swap ? image.naturalWidth : image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((normalized * Math.PI) / 180);
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  return canvas;
}

function scaleCanvas(source: HTMLCanvasElement, maxEdge: number): HTMLCanvasElement {
  const ratio = Math.min(1, maxEdge / Math.max(source.width, source.height));
  if (ratio === 1) return source;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * ratio));
  canvas.height = Math.max(1, Math.round(source.height * ratio));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function createThumbnail(canvas: HTMLCanvasElement): Promise<Blob> {
  return canvasToBlob(scaleCanvas(canvas, THUMB_MAX_EDGE), 'image/webp', 0.82);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas conversion failed')),
      type,
      quality
    );
  });
}

function loadImage(source: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(source);
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
