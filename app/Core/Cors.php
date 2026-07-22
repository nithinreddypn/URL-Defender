<?php
declare(strict_types=1);

namespace App\Core;

final class Cors
{
    public static function send(): void
    {
        $allowed = Env::get('FRONTEND_ORIGIN', '*');
        $origin  = $_SERVER['HTTP_ORIGIN'] ?? '';

        // Allow the configured origin exactly; fall back to * only if none configured.
        if ($allowed === '*' || $allowed === '') {
            header('Access-Control-Allow-Origin: *');
        } else {
            // Support comma-separated list of allowed origins
            $list = array_map('trim', explode(',', $allowed));
            if (in_array($origin, $list, true)) {
                header("Access-Control-Allow-Origin: {$origin}");
                header('Vary: Origin');
                header('Access-Control-Allow-Credentials: true');
            } else {
                header("Access-Control-Allow-Origin: {$list[0]}");
                header('Vary: Origin');
            }
        }
        header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
        header('Access-Control-Max-Age: 86400');
    }
}
