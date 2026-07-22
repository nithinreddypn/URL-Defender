<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Db;
use App\Core\Request;

final class AuditLogService
{
    public static function log(?string $userId, string $action, string $description, Request $req): void
    {
        Db::q(
            'INSERT INTO audit_log (user_id, action, ip_address, user_agent, metadata, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())',
            [
                $userId,
                $action,
                $req->ip(),
                substr($req->ua() ?? '', 0, 255),
                json_encode(['description' => $description])
            ]
        );
    }

    public static function fetch(string $userId): array
    {
        return Db::all(
            'SELECT id, action, metadata, created_at FROM audit_log
              WHERE user_id=? ORDER BY created_at DESC LIMIT 100',
            [$userId]
        );
    }
}
