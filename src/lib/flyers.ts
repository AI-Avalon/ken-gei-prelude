export interface FlyerFile {
  blob: Blob;
  thumbnail: Blob;
  previewUrl: string;
  groupId: string;
  pageIndex: number;
  pageTotal: number;
  sourcePdfKey?: string;
}

type FlyerKind = 'converted-page' | 'image' | 'pdf' | 'other';

interface ParsedFlyerKey {
  key: string;
  kind: FlyerKind;
  originalIndex: number;
  sortIndex: number;
  pageIndex: number;
  pageTotal: number;
  groupId: string;
}

interface ConvertedGroup {
  groupId: string;
  sortIndex: number;
  pageTotal: number;
  pageKeys: string[];
}

const CONVERTED_PAGE_PATTERN = /_g([a-z0-9-]+)_o(\d+)_p(\d+)_t(\d+)\.webp$/i;
const THUMBNAIL_PATTERN = /_thumb\.(webp|png|jpe?g|gif)$/i;

export function buildFlyerUploadName(groupId: string, sortIndex: number, pageIndex: number, pageTotal: number): string {
  return `flyer_g${groupId}_o${String(sortIndex + 1).padStart(3, '0')}_p${String(pageIndex + 1).padStart(3, '0')}_t${String(pageTotal).padStart(3, '0')}.webp`;
}

export function buildFlyerThumbnailName(groupId: string, sortIndex: number, pageIndex: number, pageTotal: number): string {
  return `flyer_g${groupId}_o${String(sortIndex + 1).padStart(3, '0')}_p${String(pageIndex + 1).padStart(3, '0')}_t${String(pageTotal).padStart(3, '0')}_thumb.webp`;
}

export function isPdfFlyerKey(key: string): boolean {
  return key.toLowerCase().endsWith('.pdf');
}

export function isRenderableFlyerKey(key: string): boolean {
  return !THUMBNAIL_PATTERN.test(key);
}

function parseFlyerKey(key: string, originalIndex: number): ParsedFlyerKey {
  const basename = key.split('/').pop() || key;
  const convertedMatch = basename.match(CONVERTED_PAGE_PATTERN);
  if (convertedMatch) {
    return {
      key,
      kind: 'converted-page',
      originalIndex,
      groupId: convertedMatch[1],
      sortIndex: Number.parseInt(convertedMatch[2], 10),
      pageIndex: Number.parseInt(convertedMatch[3], 10),
      pageTotal: Number.parseInt(convertedMatch[4], 10),
    };
  }
  if (isPdfFlyerKey(key)) {
    return {
      key,
      kind: 'pdf',
      originalIndex,
      groupId: '',
      sortIndex: Number.MAX_SAFE_INTEGER,
      pageIndex: Number.MAX_SAFE_INTEGER,
      pageTotal: 0,
    };
  }
  if (/\.(webp|png|jpe?g|gif)$/i.test(basename)) {
    return {
      key,
      kind: 'image',
      originalIndex,
      groupId: '',
      sortIndex: Number.MAX_SAFE_INTEGER,
      pageIndex: Number.MAX_SAFE_INTEGER,
      pageTotal: 0,
    };
  }
  return {
    key,
    kind: 'other',
    originalIndex,
    groupId: '',
    sortIndex: Number.MAX_SAFE_INTEGER,
    pageIndex: Number.MAX_SAFE_INTEGER,
    pageTotal: 0,
  };
}

function sortParsedKeys(parsedKeys: ParsedFlyerKey[]): ParsedFlyerKey[] {
  return [...parsedKeys].sort((left, right) => {
    const kindOrder = (kind: FlyerKind) => {
      if (kind === 'converted-page') return 0;
      if (kind === 'image') return 1;
      if (kind === 'pdf') return 2;
      return 3;
    };
    const leftKindOrder = kindOrder(left.kind);
    const rightKindOrder = kindOrder(right.kind);
    if (leftKindOrder !== rightKindOrder) return leftKindOrder - rightKindOrder;
    if (left.kind === 'converted-page' && right.kind === 'converted-page') {
      if (left.sortIndex !== right.sortIndex) return left.sortIndex - right.sortIndex;
      if (left.pageIndex !== right.pageIndex) return left.pageIndex - right.pageIndex;
    }
    return left.originalIndex - right.originalIndex;
  });
}

function getMaxTimestamp(group: ConvertedGroup): number {
  let max = 0;
  for (const key of group.pageKeys) {
    const basename = key.split('/').pop() || key;
    const m = basename.match(/^(\d+)_/);
    if (m) max = Math.max(max, Number.parseInt(m[1], 10));
  }
  return max;
}

function getCompleteConvertedGroups(parsedKeys: ParsedFlyerKey[]): ConvertedGroup[] {
  const groups = new Map<string, ConvertedGroup>();

  for (const parsed of parsedKeys) {
    if (parsed.kind !== 'converted-page') continue;
    const existing = groups.get(parsed.groupId);
    if (existing) {
      existing.pageKeys.push(parsed.key);
      existing.sortIndex = Math.min(existing.sortIndex, parsed.sortIndex);
      existing.pageTotal = Math.max(existing.pageTotal, parsed.pageTotal);
      continue;
    }
    groups.set(parsed.groupId, {
      groupId: parsed.groupId,
      sortIndex: parsed.sortIndex,
      pageTotal: parsed.pageTotal,
      pageKeys: [parsed.key],
    });
  }

  const completeGroups = [...groups.values()].filter(
    (group) => group.pageKeys.length >= group.pageTotal && group.pageTotal > 0
  );

  // Deduplicate: if multiple groups share the same minimum sortIndex (same PDF converted
  // more than once), keep only the group with the highest max timestamp (most recent conversion).
  const byMinSort = new Map<number, ConvertedGroup>();
  for (const group of completeGroups) {
    const existing = byMinSort.get(group.sortIndex);
    if (!existing || getMaxTimestamp(group) > getMaxTimestamp(existing)) {
      byMinSort.set(group.sortIndex, group);
    }
  }

  return [...byMinSort.values()]
    .sort((left, right) => left.sortIndex - right.sortIndex)
    .map((group) => ({
      ...group,
      pageKeys: group.pageKeys.sort((left, right) => {
        const leftPage = parseFlyerKey(left, 0).pageIndex;
        const rightPage = parseFlyerKey(right, 0).pageIndex;
        return leftPage - rightPage;
      }),
    }));
}

export function analyzeConcertFlyers(keys: string[]) {
  const parsedKeys = sortParsedKeys(
    keys
      .filter(isRenderableFlyerKey)
      .map((key, originalIndex) => parseFlyerKey(key, originalIndex))
  );
  const completeGroups = getCompleteConvertedGroups(parsedKeys);

  // All complete groups are shown; deduplication by sortIndex was removed because it caused
  // legitimate second PDFs (front/back) to be dropped when both had sortIndex=1.
  const convertedPageKeys = completeGroups.flatMap((group) => group.pageKeys);
  const fallbackImageKeys = parsedKeys
    .filter((parsed) => parsed.kind === 'image')
    .map((parsed) => parsed.key);
  const pdfKeys = parsedKeys
    .filter((parsed) => parsed.kind === 'pdf')
    .map((parsed) => parsed.key);
  const hasCompleteConvertedPages = convertedPageKeys.length > 0;

  // displayKeys: converted WebP pages take priority; fallback to raw images only if no converted pages
  // When displayKeys has any content, PDFs should NOT be re-rendered (they are the same content)
  const displayKeys = hasCompleteConvertedPages ? convertedPageKeys : fallbackImageKeys;

  return {
    hasCompleteConvertedPages,
    displayKeys,
    modalKeys: displayKeys,
    // pdfKeys: only non-empty when there are NO displayable images at all (nothing to show)
    pdfKeys: displayKeys.length === 0 ? pdfKeys : [],
    // allPdfKeys: always includes raw PDF keys (for download links)
    allPdfKeys: pdfKeys,
  };
}