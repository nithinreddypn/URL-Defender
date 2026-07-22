<?php
declare(strict_types=1);

use App\Core\Env;

return [
    'api_key' => Env::get('VIRUSTOTAL_API_KEY', ''),
];
