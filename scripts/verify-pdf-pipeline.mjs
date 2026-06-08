import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

function buildFlyerUploadName(groupId, sortIndex, pageIndex, pageTotal) {
  return `flyer_g${groupId}_o${String(sortIndex + 1).padStart(3, '0')}_p${String(pageIndex + 1).padStart(3, '0')}_t${String(pageTotal).padStart(3, '0')}.webp`;
}

function buildFlyerThumbnailName(groupId, sortIndex, pageIndex, pageTotal) {
  return `flyer_g${groupId}_o${String(sortIndex + 1).padStart(3, '0')}_p${String(pageIndex + 1).padStart(3, '0')}_t${String(pageTotal).padStart(3, '0')}_thumb.webp`;
}

function analyzeKeys(keys) {
  const thumbnailPattern = /_thumb\.(webp|png|jpe?g|gif)$/i;
  const convertedPattern = /_g([a-z0-9-]+)_o(\d+)_p(\d+)_t(\d+)\.webp$/i;
  const renderable = keys.filter((key) => !thumbnailPattern.test(key));
  const converted = renderable.filter((key) => convertedPattern.test(key));
  const pdf = renderable.filter((key) => key.toLowerCase().endsWith('.pdf'));
  return {
    hasCompleteConvertedPages: converted.length > 0,
    displayKeys: converted,
    allPdfKeys: pdf,
  };
}

const tinyPdfBase64 = 'JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAxIDFdID4+CmVuZG9iagp0cmFpbGVyCjw8IC9Sb290IDEgMCBSID4+CiUlRU9G';
const data = Uint8Array.from(Buffer.from(tinyPdfBase64, 'base64'));
const doc = await pdfjsLib.getDocument({ data }).promise;

if (doc.numPages !== 1) {
  throw new Error(`Expected a one-page PDF, got ${doc.numPages}`);
}

const groupId = 'verify';
const pageKey = `flyers/test/${buildFlyerUploadName(groupId, 0, 0, 1)}`;
const thumbKey = `flyers/test/${buildFlyerThumbnailName(groupId, 0, 0, 1)}`;
const analysis = analyzeKeys([
  'flyers/test/source.pdf',
  pageKey,
  thumbKey,
]);

if (!analysis.hasCompleteConvertedPages || analysis.displayKeys[0] !== pageKey || analysis.allPdfKeys.length !== 1) {
  throw new Error(`Unexpected flyer analysis: ${JSON.stringify(analysis)}`);
}

console.log('PDF pipeline verification passed.');
