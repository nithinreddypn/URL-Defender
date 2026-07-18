<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Minimal HS256 JWT — no dependencies.
 */
final class Jwt
{
    public static function issue(array $claims, ?int $ttlMinutes = null): string
    {
        $config = require __DIR__ . '/../../config/jwt.php';
        $secret = $config['secret'] ?? '';
        if ($secret === '') {
            throw new \RuntimeException("Missing required JWT_SECRET configuration");
        }
        $iss    = $config['issuer'] ?? 'url-defender';
        $ttl    = $ttlMinutes ?? (int) ($config['ttl_minutes'] ?? 1440);
        $now    = time();

        $payload = array_merge([
            'iss' => $iss,
            'iat' => $now,
            'nbf' => $now,
            'exp' => $now + ($ttl * 60),
            'jti' => bin2hex(random_bytes(16)),
        ], $claims);

        $h = self::b64(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        $p = self::b64(json_encode($payload));
        $sig = self::b64(hash_hmac('sha256', "{$h}.{$p}", $secret, true));
        return "{$h}.{$p}.{$sig}";
    }

    public static function verify(string $token): ?array
    {
        $config = require __DIR__ . '/../../config/jwt.php';
        $secret = $config['secret'] ?? '';
        if ($secret === '') {
            throw new \RuntimeException("Missing required JWT_SECRET configuration");
        }
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;
        [$h, $p, $sig] = $parts;

        $expected = self::b64(hash_hmac('sha256', "{$h}.{$p}", $secret, true));
        if (!hash_equals($expected, $sig)) return null;

        $payload = json_decode(self::b64d($p) ?: '', true);
        if (!is_array($payload)) return null;
        if (isset($payload['exp']) && time() >= (int)$payload['exp']) return null;
        if (isset($payload['nbf']) && time() <  (int)$payload['nbf']) return null;

        return $payload;
    }

    private static function b64(string $s): string
    {
        return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
    }

    private static function b64d(string $s): string
    {
        $pad = 4 - (strlen($s) % 4);
        if ($pad < 4) $s .= str_repeat('=', $pad);
        return base64_decode(strtr($s, '-_', '+/')) ?: '';
    }
}
