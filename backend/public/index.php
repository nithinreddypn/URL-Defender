<?php
declare(strict_types=1);

// PHP's built-in development server sends every request through this router
// script. Let it serve existing public assets (such as uploaded avatars)
// directly instead of treating them as API routes.
if (PHP_SAPI === 'cli-server') {
    $requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $publicRoot = realpath(__DIR__);
    $requestedFile = $publicRoot ? realpath($publicRoot . $requestPath) : false;
    if (
        $publicRoot !== false
        && $requestedFile !== false
        && str_starts_with($requestedFile, $publicRoot . DIRECTORY_SEPARATOR)
        && is_file($requestedFile)
    ) {
        return false;
    }
}

/**
 * URL Defender — PHP backend front controller
 * Compatible with Hostinger shared hosting (PHP 8.1+, Apache).
 */

// ---- Error handling ----
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/../storage/logs/php-error.log');

// ---- Autoload (PSR-4, no Composer) ----
spl_autoload_register(function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) return;
    $rel = str_replace('\\', '/', substr($class, strlen($prefix)));
    $file = __DIR__ . '/../src/' . $rel . '.php';
    if (is_file($file)) require $file;
});
require __DIR__ . '/../src/Helpers/functions.php';

use App\Core\{Env, Cors, Router, Request, Response};
use App\Controllers\{AuthController, ScanController, NotificationController, PaymentController};
use App\Middleware\{AuthMiddleware, RequireVerifiedEmail};

// ---- Env + CORS ----
try {
    Env::load(__DIR__ . '/../.env');
} catch (\Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Backend not configured', 'detail' => $e->getMessage()]);
    exit;
}

Cors::send();

// ---- Global error handler ----
set_exception_handler(function (\Throwable $e): void {
    error_log((string) $e);
    // Exception details can contain SQL, filesystem paths, or credentials.
    // Keep them in the server log and return only a safe response to clients.
    Response::error('Server error', 500);
});

// ---- Routes ----
$req = new Request();
$router = new Router();
$auth = new AuthMiddleware();
$verified = new RequireVerifiedEmail();

$authC = new AuthController();
$scanC = new ScanController();
$notiC = new NotificationController();
$payC  = new PaymentController();

// health
$router->get('/api/health', function() {
    $dbConnected = "disconnected";
    try {
        require __DIR__ . '/../config/database.php';
        $dbConnected = "connected";
    } catch (\Throwable $e) {
        $dbConnected = "disconnected";
    }
    Response::json([
        'status'   => 'ok',
        'database' => $dbConnected,
        'version'  => '1.0',
    ]);
});

// auth
$router->post('/api/v1/auth/signup',          fn($r) => $authC->signup($r));
$router->post('/api/v1/auth/verify-email',    fn($r) => $authC->verifyEmail($r));
$router->post('/api/v1/auth/resend-otp',      fn($r) => $authC->resendOtp($r));
$router->post('/api/v1/auth/login',           fn($r) => $authC->login($r));
$router->post('/api/v1/auth/logout',          fn($r) => $authC->logout($r), [$auth]);
$router->post('/api/v1/auth/forgot-password', fn($r) => $authC->forgotPassword($r));
$router->post('/api/v1/auth/reset-password',  fn($r) => $authC->resetPassword($r));
$router->post('/api/auth/google/callback',      fn($r) => $authC->googleCallback($r));
$router->post('/api/v1/auth/google/callback',    fn($r) => $authC->googleCallback($r));

// me
$router->get  ('/api/v1/me', fn($r) => $authC->me($r),       [$auth, $verified]);
$router->patch('/api/v1/me', fn($r) => $authC->updateMe($r), [$auth, $verified]);
$router->post('/api/v1/me/avatar', fn($r) => $authC->uploadAvatar($r), [$auth, $verified]);

// scans
$router->get ('/api/v1/url/lookup',  fn($r) => $scanC->lookup($r),    [$auth, $verified]);
$router->post('/api/v1/scans',       fn($r) => $scanC->create($r),    [$auth, $verified]);
$router->get ('/api/v1/scans',       fn($r) => $scanC->list($r),      [$auth, $verified]);
$router->delete('/api/v1/scans',    fn($r) => $scanC->deleteAll($r), [$auth, $verified]);
$router->get ('/api/v1/scans/{id}',  fn($r) => $scanC->get($r),       [$auth, $verified]);

// notifications
$router->get ('/api/v1/notifications',                fn($r) => $notiC->list($r),              [$auth, $verified]);
$router->post('/api/v1/notifications/read-all',       fn($r) => $notiC->readAll($r),           [$auth, $verified]);
$router->post('/api/v1/notifications/clear',          fn($r) => $notiC->clear($r),             [$auth, $verified]);
$router->post('/api/v1/notifications/weekly-summary', fn($r) => $notiC->sendWeeklySummary($r), [$auth, $verified]);
$router->post('/api/v1/notifications/{id}/read',      fn($r) => $notiC->readOne($r),           [$auth, $verified]);

// payments
$router->post('/api/v1/payments/order',   fn($r) => $payC->createOrder($r), [$auth, $verified]);
$router->post('/api/v1/payments/verify',  fn($r) => $payC->verify($r),      [$auth, $verified]);
$router->post('/api/v1/webhooks/razorpay',fn($r) => $payC->webhook($r));

$router->dispatch($req);
