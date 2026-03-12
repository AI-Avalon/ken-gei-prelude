-- Crescendo: Initial Schema
-- 0001_init.sql

-- 演奏会テーブル
CREATE TABLE IF NOT EXISTS concerts (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  fingerprint     TEXT UNIQUE,

  title           TEXT NOT NULL,
  subtitle        TEXT DEFAULT '',
  description     TEXT DEFAULT '',

  date            TEXT NOT NULL,
  time_open       TEXT DEFAULT '',
  time_start      TEXT NOT NULL,
  time_end        TEXT DEFAULT '',

  venue_json      TEXT NOT NULL DEFAULT '{"name":""}',

  category        TEXT NOT NULL DEFAULT 'other',
  departments_json TEXT DEFAULT '[]',
  instruments_json TEXT DEFAULT '[]',
  tags_json        TEXT DEFAULT '[]',

  pricing_json    TEXT DEFAULT '[{"label":"入場料","amount":0}]',
  pricing_note    TEXT DEFAULT '',

  seating         TEXT DEFAULT '',
  ticket_url      TEXT DEFAULT '',
  ticket_note     TEXT DEFAULT '',

  program_json    TEXT DEFAULT '[]',
  performers_json TEXT DEFAULT '[]',
  supervisors_json TEXT DEFAULT '[]',
  guest_artists_json TEXT DEFAULT '[]',

  contact_email   TEXT DEFAULT '',
  contact_tel     TEXT DEFAULT '',
  contact_person  TEXT DEFAULT '',
  contact_url     TEXT DEFAULT '',

  flyer_r2_keys   TEXT DEFAULT '[]',
  flyer_thumbnail_key TEXT DEFAULT '',

  views           INTEGER DEFAULT 0,

  source          TEXT DEFAULT 'manual',
  source_url      TEXT DEFAULT '',

  is_published    INTEGER DEFAULT 1,
  is_featured     INTEGER DEFAULT 0,
  is_deleted      INTEGER DEFAULT 0,
  deleted_at      TEXT DEFAULT '',

  edit_password_hash TEXT NOT NULL,

  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  created_by      TEXT DEFAULT 'public'
);

CREATE INDEX IF NOT EXISTS idx_concerts_slug ON concerts(slug);
CREATE INDEX IF NOT EXISTS idx_concerts_date ON concerts(date);
CREATE INDEX IF NOT EXISTS idx_concerts_category ON concerts(category);
CREATE INDEX IF NOT EXISTS idx_concerts_published ON concerts(is_published, is_deleted);
CREATE INDEX IF NOT EXISTS idx_concerts_views ON concerts(views DESC);

-- 閲覧ログ
CREATE TABLE IF NOT EXISTS analytics (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  concert_id  TEXT NOT NULL,
  viewed_at   TEXT DEFAULT (datetime('now')),
  referrer    TEXT DEFAULT '',
  user_agent  TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_analytics_concert ON analytics(concert_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(viewed_at);

-- お問い合わせ
CREATE TABLE IF NOT EXISTS inquiries (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name_encrypted  TEXT NOT NULL,
  email_encrypted TEXT NOT NULL,
  subject         TEXT NOT NULL,
  message         TEXT NOT NULL,
  concert_id      TEXT DEFAULT '',
  status          TEXT DEFAULT 'unread',
  admin_note      TEXT DEFAULT '',
  created_at      TEXT DEFAULT (datetime('now'))
);

-- 会場マスター
CREATE TABLE IF NOT EXISTS venues (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  data_json TEXT NOT NULL DEFAULT '{}'
);

-- レート制限
CREATE TABLE IF NOT EXISTS rate_limits (
  ip          TEXT NOT NULL,
  endpoint    TEXT NOT NULL,
  attempts    INTEGER DEFAULT 1,
  last_attempt TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (ip, endpoint)
);

-- メンテナンスログ
CREATE TABLE IF NOT EXISTS maintenance_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task        TEXT NOT NULL,
  result      TEXT NOT NULL,
  details     TEXT DEFAULT '',
  executed_at TEXT DEFAULT (datetime('now'))
);
