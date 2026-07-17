-- Run once for each database before deploying Instant URL Lookup.
-- The hash gives a compact, exact-match index even for long URLs.

ALTER TABLE scans
  ADD COLUMN normalized_url VARCHAR(2048) CHARACTER SET ascii COLLATE ascii_general_ci NULL AFTER url,
  ADD COLUMN normalized_url_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER normalized_url,
  ADD INDEX idx_scans_user_normalized_lookup (user_id, normalized_url_hash, scanned_at);

UPDATE scans
SET normalized_url = TRIM(TRAILING '/' FROM REPLACE(REPLACE(LOWER(TRIM(url)), 'https://', ''), 'http://', '')),
    normalized_url_hash = SHA2(TRIM(TRAILING '/' FROM REPLACE(REPLACE(LOWER(TRIM(url)), 'https://', ''), 'http://', '')), 256)
WHERE normalized_url IS NULL OR normalized_url_hash IS NULL;

ALTER TABLE scans
  MODIFY normalized_url VARCHAR(2048) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  MODIFY normalized_url_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL;
