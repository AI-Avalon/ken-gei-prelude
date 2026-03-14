-- Slug redirect table for merged/deduplicated concerts
-- When a duplicate concert is merged, the old slug is recorded here
-- so that existing bookmarks and shared links continue to work.
CREATE TABLE IF NOT EXISTS slug_redirects (
  old_slug TEXT PRIMARY KEY,
  new_slug TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_slug_redirects_new ON slug_redirects(new_slug);
