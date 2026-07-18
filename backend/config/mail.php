<?php
declare(strict_types=1);

use App\Core\Env;

return [
    'host'      => Env::get('SMTP_HOST', 'smtp.gmail.com'),
    'port'      => (int) Env::get('SMTP_PORT', '465'),
    'user'      => Env::get('SMTP_USER', ''),
    'pass'      => Env::get('SMTP_PASS', ''),
    'from'      => Env::get('SMTP_FROM', 'noreply@localhost'),
    'from_name' => Env::get('SMTP_FROM_NAME', 'URL Defender'),
    'secure'    => Env::get('SMTP_SECURE', 'ssl'),
];
