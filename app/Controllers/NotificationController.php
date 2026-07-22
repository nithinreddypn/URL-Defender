<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\{Db, Request, Response};

final class NotificationController
{
    // GET /api/notifications  (auth)
    public function list(Request $req): void
    {
        $rows = Db::all(
            'SELECT id, scan_id, type, title, message, severity, read_at, dismissed, created_at
               FROM notifications
              WHERE user_id=? AND dismissed=0
              ORDER BY created_at DESC LIMIT 50',
            [$req->user['id']]
        );
        $unread = (int) (Db::one(
            'SELECT COUNT(*) c FROM notifications WHERE user_id=? AND read_at IS NULL AND dismissed=0',
            [$req->user['id']]
        )['c'] ?? 0);
        Response::json(['notifications' => $rows, 'unread' => $unread]);
    }

    // POST /api/notifications/read-all
    public function readAll(Request $req): void
    {
        Db::q('UPDATE notifications SET read_at=NOW() WHERE user_id=? AND read_at IS NULL', [$req->user['id']]);
        Response::json(['ok' => true]);
    }

    // POST /api/notifications/{id}/read
    public function readOne(Request $req): void
    {
        Db::q('UPDATE notifications SET read_at=NOW() WHERE id=? AND user_id=?', [$req->params['id'], $req->user['id']]);
        Response::json(['ok' => true]);
    }

    // POST /api/notifications/clear
    public function clear(Request $req): void
    {
        Db::q('UPDATE notifications SET dismissed=1 WHERE user_id=?', [$req->user['id']]);
        Response::json(['ok' => true]);
    }

    // POST /api/notifications/weekly-summary
    public function sendWeeklySummary(Request $req): void
    {
        $userId = $req->user['id'];
        $userEmail = $req->user['email'];
        
        $totalScans = (int) (Db::one('SELECT COUNT(*) c FROM scans WHERE user_id=?', [$userId])['c'] ?? 0);
        $threatsFound = (int) (Db::one('SELECT COUNT(*) c FROM scans WHERE user_id=? AND verdict IN ("dangerous", "suspicious")', [$userId])['c'] ?? 0);
        $safeUrls = max(0, $totalScans - $threatsFound);

        $sent = \App\Services\MailService::sendWeeklySummary($userEmail, [
            'total_scans' => max(1, $totalScans),
            'threats_found' => $threatsFound,
            'safe_urls' => $safeUrls,
        ]);

        Response::json(['ok' => true, 'email_sent' => $sent]);
    }
}
