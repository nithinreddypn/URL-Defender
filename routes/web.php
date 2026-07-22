<?php
declare(strict_types=1);

/**
 * URL Defender Web & SPA Fallback Routes
 */

use App\Core\Response;

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// 1. Static asset check: if requested file exists in public/, serve it directly
$requestedFile = BASE_PATH . '/public' . $uri;
if (is_file($requestedFile)) {
    return false;
}

// 2. React SPA Fallback: Return public/index.html for all non-API web routes
$spaHtmlFile = BASE_PATH . '/public/index.html';
if (file_exists($spaHtmlFile)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($spaHtmlFile);
    exit;
}

Response::error('Page not found', 404);
