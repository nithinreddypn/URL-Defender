<?php
require_once __DIR__ . '/src/Core/Env.php';
require_once __DIR__ . '/src/Services/VirusTotalService.php';

use App\Core\Env;
use App\Services\VirusTotalService;

Env::load(__DIR__ . '/.env');

$rawInput = "signin.eby.de.zukruygxctzmmqi.civpro.co.za";
echo "Testing VirusTotal API live for: {$rawInput}\n";

$candidates = [
    $rawInput,
    "http://{$rawInput}",
    "http://{$rawInput}/",
    "https://{$rawInput}",
    "https://{$rawInput}/",
];

$apiKey = Env::get('VIRUSTOTAL_API_KEY', '891f8c291f35f7abfea23148f99e7cfdf06ce1073637ee129dc0b0eef7b2232a');

foreach ($candidates as $candidate) {
    $id = rtrim(strtr(base64_encode($candidate), '+/', '-_'), '=');
    $ch = curl_init("https://www.virustotal.com/api/v3/urls/{$id}");
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => ["x-apikey: {$apiKey}", "accept: application/json"],
        CURLOPT_RETURNTRANSFER => true,
    ]);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    echo "\nURL Candidate: {$candidate}\n";
    echo "ID: {$id}\n";
    echo "HTTP Status Code: {$code}\n";

    if ($code === 200) {
        $json = json_decode((string)$res, true);
        $stats = $json['data']['attributes']['last_analysis_stats'] ?? [];
        echo "Stats: " . json_encode($stats) . "\n";
    }
}
