<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\{Db, Jwt, Request, Response};
use function App\Helpers\hashToken;

final class AuthMiddleware
{
    public function __invoke(Request $req): void
    {
        $token = $req->bearer();
        if (!$token) Response::error('Unauthorized', 401);

        $claims = Jwt::verify($token);
        if (!$claims || empty($claims['sub'])) Response::error('Invalid token', 401);

        // Ensure session still valid (not revoked)
        $sess = Db::one(
            'SELECT id FROM auth_sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1',
            [hashToken($token)]
        );
        if (!$sess) Response::error('Session expired', 401);

        $user = Db::one(
            'SELECT id, email, full_name, avatar_url, plan, email_verified_at, scan_count
               FROM users WHERE id=? AND is_active=1 AND deleted_at IS NULL LIMIT 1',
            [$claims['sub']]
        );
        if (!$user) Response::error('User not found', 401);

        $req->user = $user;
    }
}

final class RequireVerifiedEmail
{
    public function __invoke(Request $req): void
    {
        if (empty($req->user['email_verified_at'])) {
            Response::error('Email not verified', 403);
        }
    }
}
