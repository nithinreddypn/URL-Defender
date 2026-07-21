<?php
require_once __DIR__ . '/src/Core/Env.php';
require_once __DIR__ . '/src/Services/VirusTotalService.php';

use App\Core\Env;
use App\Services\VirusTotalService;

Env::load(__DIR__ . '/.env');

$url = "signin.eby.de.zukruygxctzmmqi.civpro.co.za";
echo "Testing VirusTotalService::scan('{$url}')...\n";

$res = VirusTotalService::scan($url, "test-" . time());

echo "Verdict: " . $res['verdict'] . "\n";
echo "Risk score: " . $res['risk_score'] . "\n";
echo "Threat category: " . $res['threat_category'] . "\n";
echo "Flagged count: " . $res['blacklist']['listed_on'] . "\n";
echo "Total engines: " . count($res['engines']) . "\n";
