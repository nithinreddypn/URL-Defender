<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\{Env, Response};

final class VirusTotalService
{
    private const BASE = 'https://www.virustotal.com/api/v3';
    private const POLL_MAX_MS = 18000;
    private const POLL_INTERVAL_MS = 900;
    private const POLL_MIN_ENGINES = 15;

    private static function apiKey(): string
    {
        static $key = null;
        if ($key === null) {
            $config = require __DIR__ . '/../../config/virustotal.php';
            $key = $config['api_key'] ?? '';
        }
        return $key;
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

        $urlObjectId = self::urlObjectId($url);
        $cached = self::fetchUrlObject($urlObjectId);
        $cachedStats = $cached['data']['attributes']['last_analysis_stats'] ?? null;
        $cachedTotal = self::total($cachedStats);

        $analysis = null;
        $urlObj   = $cached;

        if (!$cached || $cachedTotal < self::POLL_MIN_ENGINES) {
            $analysisId = self::submitUrl($url);
            $analysis   = self::pollAnalysis($analysisId);
            if (!$urlObj) $urlObj = self::fetchUrlObject($urlObjectId);
        }

        $stats   = $analysis['data']['attributes']['stats']   ?? $urlObj['data']['attributes']['last_analysis_stats']   ?? [];
        $results = $analysis['data']['attributes']['results'] ?? $urlObj['data']['attributes']['last_analysis_results'] ?? [];

        [$verdict, $risk] = self::verdictFrom($stats);
        [$engines, $flaggedLabels] = self::mapEngines($results);
        $flaggedCount = count(array_filter($engines, fn($e) => $e['flagged']));
        $host = parse_url($url, PHP_URL_HOST) ?: $url;

        $completedAt = microtime(true);
        $durationMs  = (int) round(($completedAt - $submittedAt) * 1000);

        return [
            'id'              => $scanId,
            'url'             => $url,
            'hostname'        => $host,
            'verdict'         => $verdict,
            'risk_score'      => $risk,
            'threat_category' => self::category($verdict, $urlObj, $flaggedLabels),
            'ssl'             => self::mapSsl($urlObj),
            'domain_age_days' => 0,
            'blacklist'       => [
                'listed_on'   => $flaggedCount,
                'total_lists' => count($engines) ?: 74,
                'sources'     => array_slice(array_column(array_filter($engines, fn($e) => $e['flagged']), 'name'), 0, 6),
            ],
            'engines'         => $engines,
            'ip_address'      => '—',
            'redirect_chain'  => $urlObj['data']['attributes']['redirection_chain'] ?? [$url],
            'headers'         => $urlObj['data']['attributes']['last_http_response_headers'] ?? new \stdClass(),
            'timeline'        => [
                'submitted_at' => date('c', (int) $submittedAt),
                'analyzed_at'  => date('c', (int) ($submittedAt + ($durationMs / 1000) * 0.55)),
                'completed_at' => date('c', (int) $completedAt),
            ],
            'recommendations' => self::recommendations($verdict, $host),
            'scanned_at'      => date('c', (int) $completedAt),
            'duration_ms'     => $durationMs,
        ];
    }

    // ---------- HTTP ----------
    private static function http(string $method, string $path, array $opts = []): array
    {
        $key = self::apiKey();
        if ($key === '') {
            throw new \RuntimeException("Missing required VIRUSTOTAL_API_KEY configuration");
        }
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
            CURLOPT_TIMEOUT        => 20,
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code >= 400) return ['_error' => $code, '_body' => (string)$body];
        return json_decode((string)$body, true) ?: [];
    }

    private static function submitUrl(string $url): string
    {
        $r = self::http('POST', '/urls', ['form' => ['url' => $url]]);
        if (isset($r['_error'])) Response::error('VirusTotal submit failed', 502);
        return $r['data']['id'] ?? '';
    }

    private static function pollAnalysis(string $id): array
    {
        $deadline = microtime(true) + (self::POLL_MAX_MS / 1000);
        $last = [];
        while (microtime(true) < $deadline) {
            $last = self::http('GET', "/analyses/{$id}");
            $status = $last['data']['attributes']['status'] ?? '';
            if ($status === 'completed') return $last;
            if (self::total($last['data']['attributes']['stats'] ?? null) >= self::POLL_MIN_ENGINES) return $last;
            usleep(self::POLL_INTERVAL_MS * 1000);
        }
        return $last;
    }

    private static function fetchUrlObject(string $id): ?array
    {
        $r = self::http('GET', "/urls/{$id}");
        return isset($r['_error']) ? null : $r;
    }

    private static function urlObjectId(string $url): string
    {
        return rtrim(strtr(base64_encode(hash('sha256', $url, true)), '+/', '-_'), '=');
    }

    // ---------- mapping ----------
    private static function total(?array $s): int
    {
        return (int)(($s['malicious'] ?? 0) + ($s['suspicious'] ?? 0) + ($s['harmless'] ?? 0) + ($s['undetected'] ?? 0));
    }

    private static function verdictFrom(array $s): array
    {
        $m = $s['malicious'] ?? 0; $u = $s['suspicious'] ?? 0; $h = $s['harmless'] ?? 0;
        if ($m > 0) return ['dangerous',  min(96, 55 + $m * 6)];
        if ($u > 0) return ['suspicious', min(70, 32 + $u * 7)];
        return ['safe', $h > 0 ? 3 : 8];
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
        if (!empty($cats)) return array_values($cats)[0];
        return match ($verdict) {
            'safe'       => 'No Threats Detected',
            'suspicious' => 'Unclassified — proceed with caution',
            default      => 'Malicious URL',
        };
    }

    private static function recommendations(string $verdict, string $host): array
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
