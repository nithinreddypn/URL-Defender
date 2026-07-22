<?php
declare(strict_types=1);

/**
 * URL Defender — Single Production Front Controller
 * Compatible with Hostinger Shared Hosting (PHP 8.1+, Apache)
 */

if (!defined('BASE_PATH')) {
    define('BASE_PATH', dirname(__DIR__));
}

// PHP built-in CLI dev server static asset handler
if (PHP_SAPI === 'cli-server') {
    $requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $publicRoot = realpath(__DIR__);
    $requestedFile = $publicRoot ? realpath($publicRoot . $requestPath) : false;
    if (
        $publicRoot !== false
        && $requestedFile !== false
        && str_starts_with($requestedFile, $publicRoot . DIRECTORY_SEPARATOR)
        && is_file($requestedFile)
        && $requestPath !== '/'
        && $requestPath !== '/index.php'
    ) {
        return false;
    }
}

// Load Composer Autoloader if present
if (file_exists(BASE_PATH . '/vendor/autoload.php')) {
    require BASE_PATH . '/vendor/autoload.php';
}

// Bootstrap Application
require BASE_PATH . '/bootstrap/app.php';
