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

interface NormalizeOptions {
  currentThumbnailKey?: string;
  nextThumbnailKey?: string;
  keepCurrentThumbnail?: boolean;
  sourcePdfKey?: string;
}

const CONVERTED_PAGE_PATTERN = /_g([a-z0-9-]+)_o(\d+)_p(\d+)_t(\d+)\.webp$/i;
const THUMBNAIL_PATTERN = /_thumb\.(webp|png|jpe?g|gif)$/i;

export function buildFlyerStorageKey(slug: string, timestamp: number, groupId: string, sortIndex: number, pageIndex: number, pageTotal: number): string {
  return `flyers/${slug}/${timestamp}_g${groupId}_o${String(sortIndex + 1).padStart(3, '0')}_p${String(pageIndex + 1).padStart(3, '0')}_t${String(pageTotal).padStart(3, '0')}.webp`;
}

export function buildFlyerThumbnailStorageKey(slug: string, timestamp: number, groupId: string, sortIndex: number, pageIndex: number, pageTotal: number): string {
  return `flyers/${slug}/${timestamp}_g${groupId}_o${String(sortIndex + 1).padStart(3, '0')}_p${String(pageIndex + 1).padStart(3, '0')}_t${String(pageTotal).padStart(3, '0')}_thumb.webp`;
}

export function isPdfFlyerKey(key: string): boolean {
  return key.toLowerCase().endsWith('.pdf');
}

function isThumbnailKey(key: string): boolean {
  return THUMBNAIL_PATTERN.test(key);
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

function getCompleteGroupIds(parsedKeys: ParsedFlyerKey[]): Set<string> {
  const groups = new Map<string, { count: number; pageTotal: number }>();

  for (const parsed of parsedKeys) {
    if (parsed.kind !== 'converted-page') continue;
    const existing = groups.get(parsed.groupId);
    if (existing) {
      existing.count += 1;
      existing.pageTotal = Math.max(existing.pageTotal, parsed.pageTotal);
      continue;
    }
    groups.set(parsed.groupId, { count: 1, pageTotal: parsed.pageTotal });
  }

  return new Set(
    [...groups.entries()]
      .filter(([, group]) => group.pageTotal > 0 && group.count >= group.pageTotal)
      .map(([groupId]) => groupId)
  );
}

export function normalizeFlyerKeys(keys: string[], options: NormalizeOptions = {}) {
  const deduped = [...new Set(keys.filter((key) => key && !isThumbnailKey(key)))];
  const parsedKeys = sortParsedKeys(deduped.map((key, originalIndex) => parseFlyerKey(key, originalIndex)));
  const completeGroupIds = getCompleteGroupIds(parsedKeys);

  const normalizedKeys = parsedKeys
    .filter((parsed) => {
      if (options.sourcePdfKey && parsed.key === options.sourcePdfKey) {
        return completeGroupIds.size === 0;
      }
      return true;
    })
    .map((parsed) => parsed.key);

  const firstRenderableKey = normalizedKeys.find((key) => !isPdfFlyerKey(key)) || '';
  const preferredThumbnail = options.keepCurrentThumbnail
    ? options.currentThumbnailKey || ''
    : options.nextThumbnailKey || '';
  const derivedThumbnail = firstRenderableKey
    ? firstRenderableKey.replace(/\.(webp|png|jpe?g|gif)$/i, '_thumb.webp')
    : '';

  return {
    keys: normalizedKeys,
    thumbnailKey: preferredThumbnail || derivedThumbnail || options.currentThumbnailKey || '',
    hasCompleteConvertedPages: completeGroupIds.size > 0,
  };
}