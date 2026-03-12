// Crescendo — Slug Generation

import { nanoid } from 'nanoid';

const CATEGORY_SLUG_MAP: Record<string, string> = {
  teiki: 'teiki-ensoukai',
  sotsugyou: 'sotsugyou-ensoukai',
  gakui: 'gakui-shinsa',
  recital: 'recital',
  chamber: 'shitsunai-gaku',
  orchestra: 'orchestra',
  ensemble: 'ensemble',
  opera: 'opera',
  wind: 'suisougaku',
  vocal: 'seigatsu',
  piano: 'piano',
  daigaku: 'daigaku',
  other: 'concert',
};

export function generateSlug(date: string, title: string, category?: string): string {
  const dateStr = date.replace(/-/g, '');
  let titleSlug = slugify(title);

  // If title produced no slug (all Japanese), use category fallback
  if (!titleSlug && category) {
    titleSlug = CATEGORY_SLUG_MAP[category] || 'concert';
  }
  if (!titleSlug) {
    titleSlug = 'concert';
  }

  // Trim to 20 chars
  titleSlug = titleSlug.slice(0, 20).replace(/-$/, '');

  const suffix = nanoid(6);
  const slug = `${dateStr}-${titleSlug}-${suffix}`;
  return slug.slice(0, 60);
}

function slugify(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove non-alphanumeric (keeps ASCII letters/digits)
    .replace(/[\s_]+/g, '-') // Spaces/underscores to hyphens
    .replace(/--+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens
}
