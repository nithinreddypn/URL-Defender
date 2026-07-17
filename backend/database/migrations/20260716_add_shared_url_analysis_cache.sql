-- Run after 20260716_add_normalized_url_lookup.sql.
-- Shared, user-agnostic threat intelligence cache.

CREATE TABLE url_analyses (
  id CHAR(36) NOT NULL,
  normalized_url VARCHAR(2048) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  normalized_url_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  url VARCHAR(2048) NOT NULL,
  verdict ENUM('safe','suspicious','dangerous') NOT NULL,
  risk_score TINYINT UNSIGNED NOT NULL DEFAULT 0,
  threat_category VARCHAR(120) NULL,
  duration_ms INT UNSIGNED NOT NULL DEFAULT 0,
  engine_flags SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  engines_total SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  raw_response LONGTEXT NOT NULL,
  first_detected_at DATETIME NOT NULL,
  scanned_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_url_analyses_normalized_hash (normalized_url_hash),
  KEY idx_url_analyses_lookup (normalized_url_hash, scanned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE scans
  ADD COLUMN global_analysis_id CHAR(36) NULL AFTER normalized_url_hash,
  ADD KEY idx_scans_user_global_analysis (user_id, global_analysis_id);

-- Backfill the cache from existing completed scan reports. The newest result for
-- each normalized URL wins; all existing user-history rows then reference it.
INSERT IGNORE INTO url_analyses
  (id, normalized_url, normalized_url_hash, url, verdict, risk_score, threat_category,
   duration_ms, engine_flags, engines_total, raw_response, first_detected_at, scanned_at)
SELECT s.id, s.normalized_url, s.normalized_url_hash, s.url, s.verdict, s.risk_score,
       s.threat_category, s.duration_ms,
       (SELECT COUNT(*) FROM scan_engines e WHERE e.scan_id=s.id AND e.flagged=1),
       (SELECT COUNT(*) FROM scan_engines e WHERE e.scan_id=s.id),
       sr.raw_response, s.scanned_at, s.scanned_at
FROM scans s
INNER JOIN scan_results sr ON sr.scan_id=s.id
WHERE s.verdict IN ('safe', 'suspicious', 'dangerous')
  AND sr.raw_response IS NOT NULL
ORDER BY s.scanned_at DESC;

UPDATE scans s
INNER JOIN url_analyses a ON a.normalized_url_hash=s.normalized_url_hash
  AND a.normalized_url=s.normalized_url
SET s.global_analysis_id=a.id
WHERE s.global_analysis_id IS NULL;
