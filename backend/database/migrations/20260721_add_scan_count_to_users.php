<?php
require_once __DIR__ . '/../../src/Core/Env.php';
require_once __DIR__ . '/../../src/Core/Db.php';

use App\Core\Env;
use App\Core\Db;

Env::load(__DIR__ . '/../../.env');

echo "Running users table scan_count migration...\n";

try {
    // Drop deleted_at1 if it exists
    $cols = Db::all("DESCRIBE users");
    $hasDeletedAt1 = false;
    $hasScanCount = false;
    foreach ($cols as $col) {
        if ($col['Field'] === 'deleted_at1') {
            $hasDeletedAt1 = true;
        }
        if ($col['Field'] === 'scan_count') {
            $hasScanCount = true;
        }
    }

    if ($hasDeletedAt1) {
        echo "Dropping deleted_at1 column...\n";
        Db::q("ALTER TABLE users DROP COLUMN deleted_at1");
    }

    if (!$hasScanCount) {
        echo "Adding scan_count column...\n";
        Db::q("ALTER TABLE users ADD COLUMN scan_count INT NOT NULL DEFAULT 0 AFTER scans_cleared_at");
        
        // Initialize existing users scan_count based on current scans table count
        echo "Initializing scan_count for existing users...\n";
        Db::q("UPDATE users u SET u.scan_count = (SELECT COUNT(*) FROM scans s WHERE s.user_id = u.id)");
    }

    echo "Migration completed successfully!\n";
} catch (\Throwable $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
