<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Db;

final class KaggleLookupService
{
    public static function extractCanonicalDomain(string $input): string
    {
        $u = strtolower(trim($input));
        $u = preg_replace('#^https?://#i', '', $u);
        $u = explode('/', $u)[0];
        $u = explode(':', $u)[0];
        $u = explode('?', $u)[0];
        $u = explode('#', $u)[0];
        if (str_starts_with($u, 'www.')) {
            $u = substr($u, 4);
        }
        if (function_exists('idn_to_ascii') && preg_match('/[^\x20-\x7E]/', $u)) {
            $converted = idn_to_ascii($u, IDNA_DEFAULT, INTL_IDNA_VARIANT_UTS46);
            if ($converted !== false) {
                $u = $converted;
            }
        }
        return $u;
    }

    public static function extractRootDomain(string $canonicalDomain): string
    {
        $parts = explode('.', $canonicalDomain);
        if (count($parts) > 2) {
            return implode('.', array_slice($parts, -2));
        }
        return $canonicalDomain;
    }

    public static function lookup(string $normalizedUrl): ?array
    {
        $canonicalDomain = self::extractCanonicalDomain($normalizedUrl);
        $rootDomain = self::extractRootDomain($canonicalDomain);

        $candidates = [
            1 => ['url' => $normalizedUrl, 'level' => 'Exact URL'],
            2 => ['url' => rtrim($normalizedUrl, '/'), 'level' => 'URL No Slash'],
            3 => ['url' => $canonicalDomain, 'level' => 'Canonical Domain'],
            4 => ['url' => $rootDomain, 'level' => 'Root Domain'],
        ];

        $matchedRow = null;
        $matchedLevel = null;

        foreach ($candidates as $step => $cand) {
            if (empty($cand['url'])) continue;
            $hash = md5($cand['url']);
            try {
                $row = Db::one(
                    'SELECT normalized_url, category, source, confidence FROM kaggle_url_reputation WHERE url_hash = ? LIMIT 1',
                    [$hash]
                );
                if ($row) {
                    $matchedRow = $row;
                    $matchedLevel = $cand['level'];
                    error_log("[KaggleLookup] Match found at step {$step} ({$matchedLevel}): {$cand['url']}");
                    break; // Always prioritize the most specific match! Never merge conflicting classifications.
                }
            } catch (\Throwable $e) {
                error_log("[KaggleLookup] DB error at step {$step}: " . $e->getMessage());
            }
        }

        if (!$matchedRow) {
            error_log("[KaggleLookup] Miss for URL: {$normalizedUrl}");
            return null;
        }

        $cat = $matchedRow['category'];
        $source = $matchedRow['source'] ?: 'Kaggle Dataset';
        $confidence = $matchedRow['confidence'] ?: 'Medium';

        if ($cat === 'benign') {
            $verdict = 'safe';
            $status = 'Safe';
            $risk = 0;
            $catName = 'Clean / Safe';
        } else {
            $verdict = 'dangerous';
            $status = 'Dangerous';
            $risk = match($cat) {
                'malware' => 98,
                'phishing' => 95,
                'defacement' => 90,
                default => 85
            };
            $catName = match($cat) {
                'malware' => 'Malware Page',
                'phishing' => 'Phishing Link',
                'defacement' => 'Defaced Website',
                default => 'Suspicious Link'
            };
        }

        return [
            'verdict' => $verdict,
            'status' => $status,
            'risk_score' => $risk,
            'category' => $catName,
            'threat_category' => $catName,
            'threat_type' => $catName,
            'ssl_status' => 'unknown',
            'redirect_count' => 0,
            'first_detected_at' => date('Y-m-d H:i:s'),
            'last_analysis_status' => 'Recent',
            'source' => $source === 'Kaggle Dataset' ? 'Kaggle Reputation Dataset' : $source,
            'confidence' => $confidence === 'Medium' ? 'Medium Confidence' : $confidence,
            'matched_level' => $matchedLevel,
            'cached' => true,
            'engines' => []
        ];
    }
}
