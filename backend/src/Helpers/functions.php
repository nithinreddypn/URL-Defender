<?php
declare(strict_types=1);

namespace App\Helpers;

use App\Core\Env;

function uuid(): string
{
    $d = random_bytes(16);
    $d[6] = chr((ord($d[6]) & 0x0f) | 0x40); // v4
    $d[8] = chr((ord($d[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
}

function hashToken(string $raw): string
{
    return hash_hmac('sha256', $raw, Env::required('APP_PEPPER'));
}

function otp(int $len = 6): string
{
    $max = (10 ** $len) - 1;
    return str_pad((string) random_int(0, $max), $len, '0', STR_PAD_LEFT);
}

function hostnameOf(string $url): string
{
    $h = parse_url($url, PHP_URL_HOST);
    return $h ?: substr($url, 0, 255);
}

function isEmail(string $s): bool
{
    return (bool) filter_var($s, FILTER_VALIDATE_EMAIL);
}

function isUrl(string $s): bool
{
    return (bool) filter_var($s, FILTER_VALIDATE_URL);
}

function required(array $body, array $keys): void
{
    $missing = [];
    foreach ($keys as $k) {
        if (!isset($body[$k]) || $body[$k] === '') $missing[] = $k;
    }
    if ($missing) {
        \App\Core\Response::error('Missing fields: ' . implode(', ', $missing), 422);
    }
}
