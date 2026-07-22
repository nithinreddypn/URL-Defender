<?php
declare(strict_types=1);

return [
    'name' => 'URL Defender',
    'env'  => $_ENV['APP_ENV'] ?? 'production',
    'url'  => $_ENV['APP_URL'] ?? 'http://127.0.0.1:8001',
    'version' => '1.0.0',
];
