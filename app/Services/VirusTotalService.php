<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\{Env, Response};

final class VirusTotalService
{
    private const BASE = 'https://www.virustotal.com/api/v3';
    private const MAX_RETRIES = 3;
    private const MAX_EXECUTION_TIME_SEC = 7.0;
    private const POLL_INTERVAL_MS = 300;

    private static function apiKey(): string
    {
        return Env::get('VIRUSTOTAL_API_KEY', '');
    }

    public static function isConfigured(): bool
    {
        return self::apiKey() !== '';
    }

    /** @return array shape matching frontend ScanResult */
    public static function scan(string $url, string $scanId): array
    {
        if (!self::isConfigured()) {
            Response::error('Scanner not configured. Set VIRUSTOTAL_API_KEY in .env.', 503);
        }
        $submittedAt = microtime(true);

        // Normalize URL protocol for VirusTotal API v3
        $normalizedUrl = trim($url);
        if (!preg_match('#^https?://#i', $normalizedUrl)) {
            $normalizedUrl = 'https://' . $normalizedUrl;
        }

        $urlObjectId = self::urlObjectId($normalizedUrl);

        // Always request a fresh live analysis from VirusTotal
        $analysis = null;
        $analysisId = self::submitUrl($normalizedUrl);
        if ($analysisId !== '') {
            $analysis = self::pollAnalysis($analysisId, $submittedAt);
        }

        // Fetch the updated URL object
        $urlObj = self::fetchUrlObject($urlObjectId);

        $analysisStats = $analysis['data']['attributes']['stats'] ?? [];
        $urlObjStats   = $urlObj['data']['attributes']['last_analysis_stats'] ?? [];
        $stats = (!empty($analysisStats) && self::totalStats($analysisStats) > 0) ? $analysisStats : $urlObjStats;

        $analysisResults = $analysis['data']['attributes']['results'] ?? [];
        $urlObjResults   = $urlObj['data']['attributes']['last_analysis_results'] ?? [];
        $results = !empty($analysisResults) ? $analysisResults : $urlObjResults;

        $status = $analysis['data']['attributes']['status'] ?? 'completed';

        // Derive engine statistics dynamically across all status fields
        $totalEnginesFromStats = self::totalStats($stats);

        [$engines, $flaggedLabels] = self::mapEngines($results);
        $totalEngines = max($totalEnginesFromStats, count($engines));

        // If VT status is queued or in-progress and polling timed out without stats
        $isPending = ($status === 'queued' || $status === 'in_progress') && $totalEngines === 0;

        [$verdict, $risk, $analysisStatus] = self::verdictFrom($stats, $urlObj, $flaggedLabels, $isPending);

        $completedAt = microtime(true);
        $durationMs  = (int) round(($completedAt - $submittedAt) * 1000);
        $host = parse_url($normalizedUrl, PHP_URL_HOST) ?: $normalizedUrl;

        $maliciousCount  = (int) ($stats['malicious']  ?? 0);
        $suspiciousCount = (int) ($stats['suspicious'] ?? 0);
        $harmlessCount   = (int) ($stats['harmless']   ?? 0);
        $undetectedCount = (int) ($stats['undetected'] ?? 0);

        return [
            'id'              => $scanId,
            'vt_analysis_id'  => $analysisId ?: $urlObjectId,
            'url'             => $url,
            'hostname'        => $host,
            'verdict'         => $verdict,
            'status'          => $analysisStatus,
            'risk_score'      => $risk,
            'threat_category' => self::category($verdict, $urlObj, $flaggedLabels),
            'ssl'             => self::mapSsl($urlObj),
            'domain_age_days' => 0,
            'blacklist'       => [
                'listed_on'   => $maliciousCount,
                'total_lists' => $totalEngines,
                'sources'     => array_slice(array_column(array_filter($engines, fn($e) => $e['flagged']), 'name'), 0, 6),
            ],
            'engines'         => $engines,
            'ip_address'      => '—',
            'redirect_chain'  => $urlObj['data']['attributes']['redirection_chain'] ?? [$normalizedUrl],
            'headers'         => $urlObj['data']['attributes']['last_http_response_headers'] ?? new \stdClass(),
            'timeline'        => [
                'submitted_at' => date('c', (int) $submittedAt),
                'analyzed_at'  => date('c', (int) ($submittedAt + ($durationMs / 1000) * 0.55)),
                'completed_at' => date('c', (int) $completedAt),
            ],
            'recommendations' => self::recommendations($verdict, $host),
            'scanned_at'      => date('c', (int) $completedAt),
            'duration_ms'     => $durationMs,
            'confidence'      => self::calculateConfidence($stats, $urlObj, count($engines)),
            'virustotal_raw'  => [
                'vt_analysis_id'        => $analysisId ?: $urlObjectId,
                'malicious'             => $maliciousCount,
                'suspicious'            => $suspiciousCount,
                'harmless'              => $harmlessCount,
                'undetected'            => $undetectedCount,
                'timeout'               => (int) ($stats['timeout'] ?? 0),
                'failure'               => (int) ($stats['failure'] ?? 0),
                'reputation'            => (int) ($urlObj['data']['attributes']['reputation'] ?? 0),
                'total_votes'           => $urlObj['data']['attributes']['total_votes'] ?? ['harmless' => 0, 'malicious' => 0],
                'categories'            => $urlObj['data']['attributes']['categories'] ?? [],
                'last_analysis_stats'   => $stats,
                'last_analysis_results' => $results,
                'community_score'       => (int) ($urlObj['data']['attributes']['reputation'] ?? 0),
            ],
        ];
    }

    // ---------- HTTP WITH RETRY & EXPONENTIAL BACKOFF ----------
    private static function http(string $method, string $path, array $opts = []): array
    {
        $key = self::apiKey();
        if ($key === '') {
            throw new \RuntimeException("Missing required VIRUSTOTAL_API_KEY configuration");
        }

        $attempts = 0;
        $backoffMs = 1000;

        while ($attempts <= self::MAX_RETRIES) {
            $ch = curl_init(self::BASE . $path);
            $headers = [
                'x-apikey: ' . $key,
                'accept: application/json',
            ];
            if (isset($opts['form'])) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($opts['form']));
                $headers[] = 'content-type: application/x-www-form-urlencoded';
            }
            curl_setopt_array($ch, [
                CURLOPT_CUSTOMREQUEST  => $method,
                CURLOPT_HTTPHEADER     => $headers,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 10,
            ]);

            $body = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($code === 429 && $attempts < self::MAX_RETRIES) {
                $attempts++;
                error_log("[VirusTotal] HTTP 429 Rate Limit encountered. Retrying attempt {$attempts}/" . self::MAX_RETRIES . " after {$backoffMs}ms...");
                usleep($backoffMs * 1000);
                $backoffMs *= 2; // Exponential backoff: 1s -> 2s -> 4s
                continue;
            }

            if ($code >= 400) {
                error_log("[VirusTotal] Request to {$path} failed with HTTP {$code}: " . substr((string)$body, 0, 200));
                return ['_error' => $code, '_body' => (string)$body];
            }

            return json_decode((string)$body, true) ?: [];
        }

        return ['_error' => 429, '_body' => 'Rate limit exceeded after retries'];
    }

    private static function submitUrl(string $url): string
    {
        $r = self::http('POST', '/urls', ['form' => ['url' => $url]]);
        if (isset($r['_error'])) return '';
        return $r['data']['id'] ?? '';
    }

    private static function pollAnalysis(string $id, float $startTime): array
    {
        $last = [];
        while ((microtime(true) - $startTime) < self::MAX_EXECUTION_TIME_SEC) {
            $last = self::http('GET', "/analyses/{$id}");
            $status = $last['data']['attributes']['status'] ?? '';
            if ($status === 'completed') {
                error_log("[VirusTotal] Live analysis {$id} completed cleanly.");
                return $last;
            }
            if (self::totalStats($last['data']['attributes']['stats'] ?? null) >= 5) {
                return $last;
            }
            usleep(self::POLL_INTERVAL_MS * 1000);
        }
        error_log("[VirusTotal] Polling deadline reached (7s max limit) for analysis {$id}.");
        return $last;
    }

    private static function fetchUrlObject(string $id): ?array
    {
        $r = self::http('GET', "/urls/{$id}");
        return isset($r['_error']) ? null : $r;
    }

    private static function urlObjectId(string $url): string
    {
        return rtrim(strtr(base64_encode($url), '+/', '-_'), '=');
    }

    private static function totalStats(?array $s): int
    {
        if (empty($s)) return 0;
        $numeric = array_filter($s, 'is_numeric');
        return (int) array_sum($numeric);
    }

    // ---------- INTERNAL WEIGHTED URL DEFENDER RISK SCORE & VERDICT ----------
    private static function verdictFrom(array $s, ?array $urlObj, array $flaggedLabels, bool $isPending = false): array
    {
        if ($isPending) {
            return ['suspicious', 30, 'Analysis Pending'];
        }

        $m = (int) ($s['malicious'] ?? 0);
        $u = (int) ($s['suspicious'] ?? 0);
        $h = (int) ($s['harmless'] ?? 0);
        $total = self::totalStats($s);

        $rep = (int) ($urlObj['data']['attributes']['reputation'] ?? 0);
        $votes = $urlObj['data']['attributes']['total_votes'] ?? [];
        $maliciousVotes = (int) ($votes['malicious'] ?? 0);

        $hasExplicitThreat = false;
        $tn = $urlObj['data']['attributes']['threat_names'] ?? [];
        foreach ($tn as $name) {
            $nameLower = strtolower((string)$name);
            if (str_contains($nameLower, 'phish') || str_contains($nameLower, 'malware') || str_contains($nameLower, 'trojan') || str_contains($nameLower, 'exploit')) {
                $hasExplicitThreat = true;
                break;
            }
        }
        foreach ($flaggedLabels as $label) {
            $labelLower = strtolower((string)$label);
            if (str_contains($labelLower, 'phish') || str_contains($labelLower, 'malware') || str_contains($labelLower, 'trojan') || str_contains($labelLower, 'exploit')) {
                $hasExplicitThreat = true;
                break;
            }
        }

        // Determine Verdict and Status
        if ($m >= 1) {
            $verdict = 'dangerous';
            $status = 'Malicious';
            // Internal URL Defender Risk Score Calculation (Not an official VT score)
            $weightMalicious = min(80, $m * 6);
            $weightReputation = $rep < 0 ? min(15, abs($rep)) : 0;
            $weightVotes = min(10, $maliciousVotes * 2);
            $risk = (int) min(99, max(40, 30 + $weightMalicious + $weightReputation + $weightVotes));
        } else if ($u >= 1 || $rep < 0) {
            $verdict = 'suspicious';
            $status = 'Suspicious';
            $risk = (int) min(69, max(30, 25 + ($u * 10) + ($rep < 0 ? abs($rep) : 0)));
        } else {
            $verdict = 'safe';
            $status = ($h > 0 || $total > 0) ? 'Safe' : 'Unknown';
            $risk = 0;
        }

        return [$verdict, $risk, $status];
    }

    private static function calculateConfidence(array $stats, ?array $urlObj, int $engineCount): string
    {
        $total = self::totalStats($stats);
        $m = (int) ($stats['malicious'] ?? 0);
        $h = (int) ($stats['harmless'] ?? 0);

        if ($total >= 50 && ($m >= 5 || $h >= 45)) {
            return 'Very High';
        }
        if ($total >= 20 || $engineCount >= 20) {
            return 'High';
        }
        if ($total >= 5) {
            return 'Medium Confidence';
        }
        return 'Low';
    }

    private static function mapEngines(array $results): array
    {
        $engines = []; $flaggedLabels = [];
        foreach ($results as $name => $e) {
            $cat = $e['category'] ?? '';
            $flagged = in_array($cat, ['malicious', 'suspicious'], true);
            $label = match (true) {
                $flagged                => $e['result'] ?? ($cat === 'malicious' ? 'Malicious' : 'Suspicious'),
                $cat === 'harmless'     => 'Clean',
                $cat === 'undetected'   => 'Unrated',
                $cat === 'timeout'      => 'Timeout',
                default                 => 'Clean',
            };
            if ($flagged) $flaggedLabels[] = $label;
            $engines[] = ['name' => $name, 'flagged' => $flagged, 'label' => $label];
        }
        usort($engines, fn($a, $b) => ($b['flagged'] <=> $a['flagged']) ?: strcmp($a['name'], $b['name']));
        return [$engines, $flaggedLabels];
    }

    private static function mapSsl(?array $urlObj): array
    {
        $cert = $urlObj['data']['attributes']['last_https_certificate'] ?? null;
        $now = date('c');
        if (!$cert) return ['status' => 'invalid', 'issuer' => 'Unknown', 'valid_from' => $now, 'expires_at' => $now];
        $issuer = $cert['issuer']['CN'] ?? $cert['issuer']['O'] ?? 'Unknown issuer';
        $nb = $cert['validity']['not_before'] ?? null;
        $na = $cert['validity']['not_after']  ?? null;
        $vf = $nb ? date('c', strtotime($nb) ?: time()) : $now;
        $ex = $na ? date('c', strtotime($na) ?: time()) : $now;
        $status = ($na && strtotime($na) < time()) ? 'expired' : 'valid';
        return ['status' => $status, 'issuer' => $issuer, 'valid_from' => $vf, 'expires_at' => $ex];
    }

    private static function category(string $verdict, ?array $urlObj, array $flaggedLabels): string
    {
        $tn = $urlObj['data']['attributes']['threat_names'] ?? [];
        if (!empty($tn)) return $tn[0];
        if (!empty($flaggedLabels)) return ucfirst($flaggedLabels[0]);
        $cats = $urlObj['data']['attributes']['categories'] ?? [];
        if (!empty($cats)) {
            foreach ($cats as $vendor => $cat) {
                if (preg_match('#(phish|malware|defacement|exploit|spam|virus)#i', (string)$cat)) {
                    return ucfirst((string)$cat);
                }
            }
            return array_values($cats)[0];
        }
        return match ($verdict) {
            'safe'       => 'No Threats Detected',
            'suspicious' => 'Unclassified — proceed with caution',
            default      => 'Malicious URL',
        };
    }

    public static function recommendations(string $verdict, string $host): array
    {
        return match ($verdict) {
            'dangerous' => [
                "Do not enter any credentials or personal info on {$host}.",
                'Close the tab and clear cookies for this domain.',
                'If you submitted a password, rotate it and enable 2FA.',
                'Report the URL to your security team.',
            ],
            'suspicious' => [
                "Treat {$host} as untrusted until verified.",
                "Type the brand's official domain manually instead of clicking.",
                'If you must proceed, use incognito and never reuse a password.',
                'Re-scan after 24 hours.',
            ],
            default => [
                "No known threats detected on {$host}.",
                'Continue treating login pages with care.',
                "Enable your browser's Safe Browsing protection.",
                'Bookmark sites you visit often.',
            ],
        };
    }
}
