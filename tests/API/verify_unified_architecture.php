<?php
declare(strict_types=1);

define('BASE_PATH', __DIR__ . '/../..');

spl_autoload_register(function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) return;
    $rel = str_replace('\\', '/', substr($class, strlen($prefix)));
    $file = BASE_PATH . '/app/' . $rel . '.php';
    if (is_file($file)) require $file;
});

require_once BASE_PATH . '/app/Helpers/functions.php';

use App\Core\{Env, Request, Response, Db};
use App\Controllers\ScanController;
use App\Services\{KaggleLookupService, VirusTotalService};

Env::load(BASE_PATH . '/.env');

echo "=== UNIFIED ARCHITECTURE VERIFICATION SUITE ===\n\n";

// 1. PSR-4 Autoloading Check
echo "[Test 1] Testing PSR-4 App\\ Autoloading from app/ ...\n";
$kaggleMatch = KaggleLookupService::lookup("br-icloud.com.br");
echo "  - KaggleLookupService class loaded successfully!\n";
echo "  - Matched Level: " . ($kaggleMatch['matched_level'] ?? 'N/A') . "\n";
assert($kaggleMatch !== null, "Kaggle lookup failed");
echo "[OK] PSR-4 autoloading verified!\n\n";

// 2. Database Connection via config/database.php
echo "[Test 2] Testing Database Connection via config/database.php ...\n";
require_once BASE_PATH . '/config/database.php';
$dbConnected = Db::one('SELECT 1 as val');
echo "  - Database connected cleanly! Value: " . ($dbConnected['val'] ?? '0') . "\n";
assert(($dbConnected['val'] ?? 0) == 1, "DB check failed");
echo "[OK] Database connection verified!\n\n";

// 3. API Route Verification (GET /api/v1/scans?limit=100)
echo "[Test 3] Testing API Route Handler (ScanController::list) ...\n";
$scanC = new ScanController();
$req = new Request();
$req->user = ['id' => '8e6c1885-06bd-4779-b29c-083b289e16f4', 'plan' => 'free'];
$req->query = ['limit' => '100'];

ob_start();
try {
    @$scanC->list($req);
} catch (\Throwable $e) {}
$jsonOut = ob_get_clean();

$res = json_decode($jsonOut, true);
echo "  - GET /api/v1/scans?limit=100 returned: " . count($res['scans'] ?? []) . " scans\n";
assert(isset($res['scans']), "Response must contain 'scans' key");
echo "[OK] API Route Handler verified!\n\n";

// 4. Public Web Root Assets Verification
echo "[Test 4] Testing Public Web Root Build Assets ...\n";
$indexHtmlExists = file_exists(BASE_PATH . '/public/index.html');
$indexPhpExists  = file_exists(BASE_PATH . '/public/index.php');
$assetsDirExists = is_dir(BASE_PATH . '/public/assets');

echo "  - public/index.html exists: " . ($indexHtmlExists ? 'YES' : 'NO') . "\n";
echo "  - public/index.php exists: " . ($indexPhpExists ? 'YES' : 'NO') . "\n";
echo "  - public/assets/ directory exists: " . ($assetsDirExists ? 'YES' : 'NO') . "\n";

assert($indexHtmlExists && $indexPhpExists && $assetsDirExists, "Public build files missing");
echo "[OK] Public Web Root Build Assets verified!\n\n";

echo "ALL UNIFIED ARCHITECTURE TESTS PASSED CLEANLY!\n";
