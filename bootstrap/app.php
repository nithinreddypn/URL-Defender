<?php
declare(strict_types=1);

/**
 * URL Defender Application Bootstrapper
 */

if (!defined('BASE_PATH')) {
    define('BASE_PATH', dirname(__DIR__));
}

// Fallback PSR-4 Autoloader & Helper loader (if composer vendor/autoload is not present)
spl_autoload_register(function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) return;
    $rel = str_replace('\\', '/', substr($class, strlen($prefix)));
    $file = BASE_PATH . '/app/' . $rel . '.php';
    if (is_file($file)) require $file;
});

if (file_exists(BASE_PATH . '/app/Helpers/functions.php')) {
    require_once BASE_PATH . '/app/Helpers/functions.php';
}

use App\Core\{Env, Cors, Response};

// Error logging
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', BASE_PATH . '/storage/logs/php-error.log');

// Load environment variables
try {
    Env::load(BASE_PATH . '/.env');
} catch (\Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Backend not configured', 'detail' => $e->getMessage()]);
    exit;
}

Cors::send();

// Global Exception Handler
set_exception_handler(function (\Throwable $e): void {
    error_log((string) $e);
    Response::error('Server error', 500);
});

// Process request routing
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if (str_starts_with($uri, '/api/')) {
    require BASE_PATH . '/routes/api.php';
} else {
    require BASE_PATH . '/routes/web.php';
}
