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
$router->get('/api/health', fn() => Response::json([
    'ok'         => true,
    'time'       => date('c'),
    'virustotal' => \App\Services\VirusTotalService::isConfigured(),
    'razorpay'   => \App\Services\RazorpayService::isConfigured(),
    'smtp'       => (Env::get('SMTP_HOST', '') ?? '') !== '',
]));

// auth
$router->post('/api/auth/signup',          fn($r) => $authC->signup($r));
$router->post('/api/auth/verify-email',    fn($r) => $authC->verifyEmail($r));
$router->post('/api/auth/resend-otp',      fn($r) => $authC->resendOtp($r));
$router->post('/api/auth/login',           fn($r) => $authC->login($r));
$router->post('/api/auth/logout',          fn($r) => $authC->logout($r), [$auth]);
$router->post('/api/auth/forgot-password', fn($r) => $authC->forgotPassword($r));
$router->post('/api/auth/reset-password',  fn($r) => $authC->resetPassword($r));
$router->post('/api/auth/google/callback', fn($r) => $authC->googleCallback($r));

// me
$router->get  ('/api/me', fn($r) => $authC->me($r),       [$auth, $verified]);
$router->patch('/api/me', fn($r) => $authC->updateMe($r), [$auth, $verified]);
$router->post('/api/me/avatar', fn($r) => $authC->uploadAvatar($r), [$auth, $verified]);

// scans
$router->get ('/api/url/lookup',  fn($r) => $scanC->lookup($r), [$auth, $verified]);
$router->post('/api/scans',       fn($r) => $scanC->create($r), [$auth, $verified]);
$router->get ('/api/scans',       fn($r) => $scanC->list($r),   [$auth, $verified]);
$router->get ('/api/scans/{id}',  fn($r) => $scanC->get($r),    [$auth, $verified]);

// notifications
$router->get ('/api/notifications',            fn($r) => $notiC->list($r),    [$auth, $verified]);
$router->post('/api/notifications/read-all',   fn($r) => $notiC->readAll($r), [$auth, $verified]);
$router->post('/api/notifications/clear',      fn($r) => $notiC->clear($r),   [$auth, $verified]);
$router->post('/api/notifications/{id}/read',  fn($r) => $notiC->readOne($r), [$auth, $verified]);

// payments
$router->post('/api/payments/order',   fn($r) => $payC->createOrder($r), [$auth, $verified]);
$router->post('/api/payments/verify',  fn($r) => $payC->verify($r),      [$auth, $verified]);
$router->post('/api/webhooks/razorpay',fn($r) => $payC->webhook($r));

$router->dispatch($req);
