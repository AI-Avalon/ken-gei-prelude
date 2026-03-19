-- Crescendo: Add submitter info to concerts
-- 0004_submitter_info.sql

ALTER TABLE concerts ADD COLUMN submitter_name TEXT DEFAULT '';
ALTER TABLE concerts ADD COLUMN submitter_email TEXT DEFAULT '';
ALTER TABLE concerts ADD COLUMN submitter_lat REAL DEFAULT NULL;
ALTER TABLE concerts ADD COLUMN submitter_lng REAL DEFAULT NULL;
