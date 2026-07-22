<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Env;

/**
 * Exchanges a Google authorization code for a verified OpenID Connect identity.
 * The Google client secret is read only on the server.
 */
final class GoogleOAuthService
{
    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';
    private const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

    public static function isConfigured(): bool
    {
        return (Env::get('GOOGLE_CLIENT_ID', '') ?? '') !== ''
            && (Env::get('GOOGLE_CLIENT_SECRET', '') ?? '') !== ''
            && (Env::get('GOOGLE_REDIRECT_URI', '') ?? '') !== '';
    }

    /** @return array{sub:string,email:string,name:string,picture:?string} */
    public static function identityFromCode(string $code, string $codeVerifier): array
    {
        if (!self::isConfigured()) {
            throw new \RuntimeException('Google sign-in is not configured');
        }

        $response = self::requestToken($code, $codeVerifier);
        $accessToken = $response['access_token'] ?? null;
        if (!is_string($accessToken) || $accessToken === '') {
            throw new \RuntimeException('Google did not return an access token');
        }
        $claims = self::requestUserInfo($accessToken);
        $email = strtolower(trim((string) ($claims['email'] ?? '')));

        if (!filter_var($claims['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN)
            || !filter_var($email, FILTER_VALIDATE_EMAIL)
            || !is_string($claims['sub'] ?? null)) {
            throw new \RuntimeException('Invalid Google identity response');
        }

        $name = trim((string) ($claims['name'] ?? ''));
        if ($name === '') $name = strstr($email, '@', true) ?: 'Google user';

        return [
            'sub' => $claims['sub'],
            'email' => $email,
            'name' => mb_substr($name, 0, 120),
            'picture' => is_string($claims['picture'] ?? null) ? $claims['picture'] : null,
        ];
    }

    /** @return array<string,mixed> */
    private static function requestToken(string $code, string $codeVerifier): array
    {
        $body = http_build_query([
            'code' => $code,
            'client_id' => Env::required('GOOGLE_CLIENT_ID'),
            'client_secret' => Env::required('GOOGLE_CLIENT_SECRET'),
            'redirect_uri' => Env::required('GOOGLE_REDIRECT_URI'),
            'code_verifier' => $codeVerifier,
            'grant_type' => 'authorization_code',
        ]);

        $ch = curl_init(self::TOKEN_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_TIMEOUT => 15,
        ]);
        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        $data = is_string($raw) ? json_decode($raw, true) : null;
        if ($raw === false || $status < 200 || $status >= 300 || !is_array($data)) {
            error_log('Google OAuth token exchange failed: ' . ($error ?: "HTTP {$status}"));
            throw new \RuntimeException('Google sign-in could not be completed');
        }
        return $data;
    }

    /** @return array<string,mixed> */
    private static function requestUserInfo(string $accessToken): array
    {
        $ch = curl_init(self::USERINFO_URL);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ["Authorization: Bearer {$accessToken}"],
            CURLOPT_TIMEOUT => 15,
        ]);
        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $claims = is_string($raw) ? json_decode($raw, true) : null;
        if ($status < 200 || $status >= 300 || !is_array($claims)) {
            throw new \RuntimeException('Google identity lookup failed');
        }
        return $claims;
    }
}
