<?php
require_once __DIR__ . '/src/Core/Env.php';
require_once __DIR__ . '/src/Services/VirusTotalService.php';

use App\Core\Env;
use App\Services\VirusTotalService;

Env::load(__DIR__ . '/.env');

$candidate = "signin.eby.de.zukruygxctzmmqi.civpro.co.za";
$id = rtrim(strtr(base64_encode($candidate), '+/', '-_'), '=');
$apiKey = Env::get('VIRUSTOTAL_API_KEY', '891f8c291f35f7abfea23148f99e7cfdf06ce1073637ee129dc0b0eef7b2232a');

$ch = curl_init("https://www.virustotal.com/api/v3/urls/{$id}");
curl_setopt_array($ch, [
    CURLOPT_HTTPHEADER => ["x-apikey: {$apiKey}", "accept: application/json"],
    CURLOPT_RETURNTRANSFER => true,
]);
$res = curl_exec($ch);
curl_close($ch);

$json = json_decode((string)$res, true);
$attrs = $json['data']['attributes'] ?? [];

echo "Keys in attributes:\n" . json_encode(array_keys($attrs)) . "\n\n";
echo "last_analysis_stats:\n" . json_encode($attrs['last_analysis_stats'] ?? []) . "\n\n";

$results = $attrs['last_analysis_results'] ?? [];
echo "Count of last_analysis_results: " . count($results) . "\n";
echo "Sample 3 engines from last_analysis_results:\n";
print_r(array_slice($results, 0, 3));
