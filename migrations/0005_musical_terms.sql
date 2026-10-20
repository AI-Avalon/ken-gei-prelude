-- Crescendo: Musical Terminology Dictionary Schema & Irregular Concert Status
-- 0005_musical_terms.sql

CREATE TABLE IF NOT EXISTS musical_terms (
  id                TEXT PRIMARY KEY,
  term              TEXT NOT NULL,
  normalized_term   TEXT NOT NULL,
  reading_kana      TEXT NOT NULL,
  reading_hiragana  TEXT NOT NULL,
  abbreviations_json TEXT NOT NULL DEFAULT '[]',
  lang              TEXT NOT NULL DEFAULT 'It',
  category          TEXT NOT NULL,
  short_meaning     TEXT NOT NULL,
  definition        TEXT NOT NULL,
  performer_nuance  TEXT NOT NULL,
  bpm_min           INTEGER,
  bpm_max           INTEGER,
  related_terms_json TEXT NOT NULL DEFAULT '[]',
  scene_tags_json   TEXT NOT NULL DEFAULT '[]',
  created_at        TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_musical_terms_category ON musical_terms(category);
CREATE INDEX IF NOT EXISTS idx_musical_terms_lang ON musical_terms(lang);
CREATE INDEX IF NOT EXISTS idx_musical_terms_normalized ON musical_terms(normalized_term);
