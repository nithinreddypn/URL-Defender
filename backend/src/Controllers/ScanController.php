<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\{Db, Request, Response};
use App\Services\VirusTotalService;
use function App\Helpers\{uuid, isUrl, required, hostnameOf};

final class ScanController
{
    private const FREE_MONTHLY_LIMIT = 50;

    // POST /api/scans  (auth)  { url }
    public function create(Request $req): void
    {
        required($req->body, ['url']);
        $url = trim((string) $req->body['url']);
        if (!isUrl($url) || strlen($url) > 2048) Response::error('Invalid URL', 422);

        $userId = $req->user['id'];
        $period = date('Y-m');
        $normalizedUrl = self::normalizeUrl($url);
        $normalizedHash = hash('sha256', $normalizedUrl);

        // Shared threat-intelligence cache. It contains no user-history data.
        // A cache hit creates a fresh private history entry for this user without
        // consuming their quota or making another VirusTotal request.
        $cached = self::findGlobalAnalysis($normalizedUrl, $normalizedHash);
        if ($cached) {
            $cachedResult = json_decode((string) $cached['raw_response'], true);
            if (is_array($cachedResult)) {
                $scanId = uuid();
                $cachedResult['id'] = $scanId;
                $cachedResult['url'] = $url;
                Db::q(
                    'INSERT INTO scans
                     (id, user_id, url, normalized_url, normalized_url_hash, global_analysis_id, hostname, verdict, risk_score, threat_category, duration_ms, scanned_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
                    [$scanId, $userId, $url, $normalizedUrl, $normalizedHash, $cached['id'], hostnameOf($url),
                     $cached['verdict'], $cached['risk_score'], $cached['threat_category'], $cached['duration_ms']]
                );
                self::storeScanResult($scanId, $cachedResult);
                self::notifyThreat($userId, $scanId, hostnameOf($url), $cachedResult);
                $cachedResult['cached'] = true;
                $cachedResult['source'] = 'shared_threat_intelligence';
                Response::json($cachedResult, 201);
            }
        }

        // Quota check for free plan
        if ($req->user['plan'] === 'free') {
            $usage = Db::one('SELECT scans_used FROM usage_monthly WHERE user_id=? AND period=?', [$userId, $period]);
            $used = (int) ($usage['scans_used'] ?? 0);
            if ($used >= self::FREE_MONTHLY_LIMIT) {
                Response::error('Monthly scan limit reached. Upgrade to continue.', 402);
            }
        }

        $scanId = uuid();
        $host   = hostnameOf($url);

        Db::q(
            'INSERT INTO scans (id, user_id, url, normalized_url, normalized_url_hash, hostname, verdict)
             VALUES (?, ?, ?, ?, ?, ?, "pending")',
            [$scanId, $userId, $url, $normalizedUrl, $normalizedHash, $host]
        );

        try {
            $result = VirusTotalService::scan($url, $scanId);
        } catch (\Throwable $e) {
            Db::q('UPDATE scans SET verdict="error" WHERE id=?', [$scanId]);
            error_log('VirusTotal scan failed: ' . $e->getMessage());
            Response::error('Scan could not be completed. Please try again.', 502);
        }

        $globalId = self::storeGlobalAnalysis($url, $normalizedUrl, $normalizedHash, $result);
        Db::q('UPDATE scans SET global_analysis_id=? WHERE id=?', [$globalId, $scanId]);
        self::storeScanResult($scanId, $result);

        // Bump quota
        Db::q(
            'INSERT INTO usage_monthly (user_id, period, scans_used) VALUES (?, ?, 1)
             ON DUPLICATE KEY UPDATE scans_used = scans_used + 1',
            [$userId, $period]
        );

        self::notifyThreat($userId, $scanId, $host, $result);

        $result['cached'] = false;
        Response::json($result, 201);
    }

    // GET /api/url/lookup?url=... (auth, local database only)
    public function lookup(Request $req): void
    {
        $input = trim((string) ($req->query['url'] ?? ''));
        if ($input === '' || strlen($input) > 2048) Response::error('Invalid URL', 422);

        $validationUrl = preg_match('#^https?://#i', $input) ? $input : "https://{$input}";
        if (!isUrl($validationUrl)) Response::error('Invalid URL', 422);

        $normalizedUrl = self::normalizeUrl($input);
        if ($normalizedUrl === '') Response::error('Invalid URL', 422);

        $analysis = self::findGlobalAnalysis($normalizedUrl, hash('sha256', $normalizedUrl));
        if (!$analysis) Response::json(['success' => true, 'exists' => false]);

        $history = Db::one(
            'SELECT id, scanned_at FROM scans WHERE user_id=? AND global_analysis_id=? ORDER BY scanned_at DESC LIMIT 1',
            [$req->user['id'], $analysis['id']]
        );
        $result = json_decode((string) $analysis['raw_response'], true);
        Response::json([
            'success' => true,
            'exists' => true,
            'data' => [
                'id' => $history['id'] ?? null,
                'url' => $input,
                'status' => ucfirst((string) $analysis['verdict']),
                'verdict' => $analysis['verdict'],
                'risk_score' => (int) $analysis['risk_score'],
                'category' => $analysis['threat_category'],
                'threat_type' => is_array($result) ? (($result['blacklist']['sources'][0] ?? null) ?: (($analysis['verdict'] ?? '') === 'safe' ? 'No threat detected' : 'Threat signal detected')) : 'Unavailable',
                'ssl_status' => is_array($result) ? ($result['ssl']['status'] ?? 'unknown') : 'unknown',
                'redirect_count' => is_array($result) ? max(0, count($result['redirect_chain'] ?? []) - 1) : 0,
                'first_detected_at' => $analysis['first_detected_at'],
                'personal_last_scanned' => $history['scanned_at'] ?? null,
                'source' => 'shared_threat_intelligence',
                'in_history' => $history !== null,
                'result' => is_array($result) ? $result : null,
            ],
        ]);
    }

    // GET /api/scans  (auth)  ?limit=20&offset=0&verdict=...
    public function list(Request $req): void
    {
        $limit  = max(1, min(100, (int) ($req->query['limit']  ?? 20)));
        $offset = max(0, (int) ($req->query['offset'] ?? 0));
        $verdict = $req->query['verdict'] ?? null;

        $where = 'user_id=?';
        $params = [$req->user['id']];
        if ($verdict) { $where .= ' AND verdict=?'; $params[] = $verdict; }

        $rows = Db::all(
            "SELECT s.id, s.url, s.hostname, s.verdict, s.risk_score, s.threat_category, s.duration_ms, s.scanned_at, s.created_at,
                    (SELECT COUNT(*) FROM scan_engines e WHERE e.scan_id=s.id AND e.flagged=1) AS engine_flags,
                    (SELECT COUNT(*) FROM scan_engines e WHERE e.scan_id=s.id) AS engines_total
               FROM scans s WHERE {$where} ORDER BY s.created_at DESC LIMIT {$limit} OFFSET {$offset}",
            $params
        );
        $total = Db::one("SELECT COUNT(*) c FROM scans WHERE {$where}", $params)['c'] ?? 0;

        Response::json(['scans' => $rows, 'total' => (int) $total, 'limit' => $limit, 'offset' => $offset]);
    }

    // GET /api/scans/{id}  (auth)
    public function get(Request $req): void
    {
        $scan = Db::one('SELECT * FROM scans WHERE id=? AND user_id=? LIMIT 1', [$req->params['id'], $req->user['id']]);
        if (!$scan) Response::error('Not found', 404);
        $analysis = !empty($scan['global_analysis_id'])
            ? Db::one('SELECT first_detected_at, scanned_at FROM url_analyses WHERE id=? LIMIT 1', [$scan['global_analysis_id']])
            : null;
        $sr = Db::one('SELECT * FROM scan_results WHERE scan_id=?', [$scan['id']]);
        $engines = Db::all('SELECT engine_name AS name, flagged, label FROM scan_engines WHERE scan_id=? ORDER BY flagged DESC, engine_name', [$scan['id']]);

        $rawResult = $sr && !empty($sr['raw_response']) ? json_decode((string) $sr['raw_response'], true) : null;
        Response::json([
            'scan'    => $scan,
            'result'  => is_array($rawResult) ? $rawResult : $sr,
            'engines' => array_map(fn($e) => ['name' => $e['name'], 'flagged' => (bool)$e['flagged'], 'label' => $e['label']], $engines),
            'history' => [
                'is_personal' => true,
                'last_scanned_at' => $scan['scanned_at'],
            ],
            'analysis' => [
                'source' => $analysis ? 'shared_threat_intelligence' : 'personal_scan',
                'first_detected_at' => $analysis['first_detected_at'] ?? $scan['scanned_at'],
                'last_analysis_status' => $analysis ? 'Recent' : 'Available',
            ],
        ]);
    }

    private static function findGlobalAnalysis(string $normalizedUrl, string $normalizedHash): ?array
    {
        return Db::one(
            'SELECT id, verdict, risk_score, threat_category, duration_ms, raw_response, first_detected_at, scanned_at
               FROM url_analyses
              WHERE normalized_url_hash=? AND normalized_url=?
              LIMIT 1',
            [$normalizedHash, $normalizedUrl]
        );
    }

    private static function storeGlobalAnalysis(string $url, string $normalizedUrl, string $normalizedHash, array $result): string
    {
        $globalId = uuid();
        $globalResult = $result;
        $globalResult['id'] = $globalId;
        try {
            Db::q(
                'INSERT INTO url_analyses
                 (id, normalized_url, normalized_url_hash, url, verdict, risk_score, threat_category, duration_ms,
                  engine_flags, engines_total, raw_response, first_detected_at, scanned_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                [
                    $globalId, $normalizedUrl, $normalizedHash, $url,
                    $result['verdict'], $result['risk_score'], $result['threat_category'], $result['duration_ms'],
                    count(array_filter($result['engines'] ?? [], fn($engine) => !empty($engine['flagged']))),
                    count($result['engines'] ?? []), json_encode($globalResult),
                ]
            );
            return $globalId;
        } catch (\PDOException $e) {
            // Another request may have populated the same shared analysis first.
            $existing = self::findGlobalAnalysis($normalizedUrl, $normalizedHash);
            if ($existing) return $existing['id'];
            throw $e;
        }
    }

    private static function storeScanResult(string $scanId, array $result): void
    {
        Db::q(
            'UPDATE scans SET verdict=?, risk_score=?, threat_category=?, duration_ms=?, scanned_at=NOW() WHERE id=?',
            [$result['verdict'], $result['risk_score'], $result['threat_category'], $result['duration_ms'], $scanId]
        );
        Db::q(
            'INSERT INTO scan_results
             (scan_id, ip_address, ssl_status, ssl_issuer, ssl_valid_from, ssl_expires_at,
              domain_age_days, blacklist_listed, blacklist_total, redirect_chain, headers, recommendations,
              submitted_at, analyzed_at, completed_at, raw_response)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $scanId, $result['ip_address'] ?? null, $result['ssl']['status'] ?? 'none',
                $result['ssl']['issuer'] ?? null, self::toMysql($result['ssl']['valid_from'] ?? null),
                self::toMysql($result['ssl']['expires_at'] ?? null), $result['domain_age_days'] ?? 0,
                $result['blacklist']['listed_on'] ?? 0, $result['blacklist']['total_lists'] ?? 0,
                json_encode($result['redirect_chain'] ?? []), json_encode($result['headers'] ?? new \stdClass()),
                json_encode($result['recommendations'] ?? []), self::toMysql($result['timeline']['submitted_at'] ?? null),
                self::toMysql($result['timeline']['analyzed_at'] ?? null), self::toMysql($result['timeline']['completed_at'] ?? null),
                json_encode($result),
            ]
        );
        foreach ($result['engines'] ?? [] as $engine) {
            Db::q(
                'INSERT INTO scan_engines (scan_id, engine_name, flagged, label) VALUES (?, ?, ?, ?)',
                [$scanId, $engine['name'], !empty($engine['flagged']) ? 1 : 0, $engine['label']]
            );
        }
    }

    private static function notifyThreat(string $userId, string $scanId, string $host, array $result): void
    {
        if (($result['verdict'] ?? 'safe') === 'safe') return;
        Db::q(
            'INSERT INTO notifications (id, user_id, scan_id, type, title, message, severity)
             VALUES (?, ?, ?, "threat_detected", ?, ?, ?)',
            [uuid(), $userId, $scanId, ucfirst($result['verdict']) . ' URL detected',
             "Scan of {$host} returned verdict: {$result['verdict']}.",
             $result['verdict'] === 'dangerous' ? 'critical' : 'warning']
        );
    }

    private static function toMysql(?string $iso): ?string
    {
        if (!$iso) return null;
        $t = strtotime($iso);
        return $t ? date('Y-m-d H:i:s', $t) : null;
    }

    private static function normalizeUrl(string $url): string
    {
        $normalized = strtolower(trim($url));
        $normalized = preg_replace('#^https?://#', '', $normalized) ?? '';
        return rtrim($normalized, '/');
    }
}
