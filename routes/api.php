<?php
declare(strict_types=1);

/**
 * URL Defender API Routes Definition
 */

use App\Core\{Router, Request, Response};
use App\Controllers\{AuthController, ScanController, NotificationController, PaymentController};
use App\Middleware\{AuthMiddleware, RequireVerifiedEmail};

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
        require BASE_PATH . '/config/database.php';
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
$router->post('/api/auth/google/callback',    fn($r) => $authC->googleCallback($r));
$router->post('/api/v1/auth/google/callback', fn($r) => $authC->googleCallback($r));

// me & profile
$router->get  ('/api/v1/me', fn($r) => $authC->me($r),       [$auth, $verified]);
$router->patch('/api/v1/me', fn($r) => $authC->updateMe($r), [$auth, $verified]);
$router->post ('/api/v1/me/password', fn($r) => $authC->changePassword($r), [$auth, $verified]);
$router->get  ('/api/v1/me/activity', fn($r) => $authC->activity($r), [$auth, $verified]);
$router->post ('/api/v1/me/activity', fn($r) => $authC->logActivity($r), [$auth, $verified]);
$router->post ('/api/v1/me/avatar',   fn($r) => $authC->uploadAvatar($r), [$auth, $verified]);

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
$router->post('/api/v1/payments/order',    fn($r) => $payC->createOrder($r), [$auth, $verified]);
$router->post('/api/v1/payments/verify',   fn($r) => $payC->verify($r),      [$auth, $verified]);
$router->post('/api/v1/webhooks/razorpay', fn($r) => $payC->webhook($r));

$router->dispatch($req);
