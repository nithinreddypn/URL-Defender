<?php
declare(strict_types=1);

use App\Core\Env;

return [
    'secret'      => Env::get('JWT_SECRET', 'please_change_me_to_a_64_char_random_hex_string'),
    'ttl_minutes' => (int) Env::get('JWT_TTL_MINUTES', '1440'),
    'issuer'      => Env::get('JWT_ISSUER', 'url-defender'),
];
