<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\{Env, Response};

final class RazorpayService
{
    public static function isConfigured(): bool
    {
        return (Env::get('RAZORPAY_KEY_ID', '') ?? '') !== ''
            && (Env::get('RAZORPAY_KEY_SECRET', '') ?? '') !== '';
    }

    public static function keyId(): string
    {
        return Env::get('RAZORPAY_KEY_ID', '') ?? '';
    }

    public static function createOrder(int $amountPaise, string $receipt, string $currency = 'INR'): array
    {
        if (!self::isConfigured()) Response::error('Payments not configured', 503);
        $ch = curl_init('https://api.razorpay.com/v1/orders');
        curl_setopt_array($ch, [
            CURLOPT_USERPWD        => Env::required('RAZORPAY_KEY_ID') . ':' . Env::required('RAZORPAY_KEY_SECRET'),
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS     => json_encode([
                'amount'   => $amountPaise,
                'currency' => $currency,
                'receipt'  => $receipt,
            ]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code >= 400) Response::error('Razorpay order failed', 502, ['raw' => $body]);
        return json_decode((string)$body, true) ?: [];
    }

    public static function verifySignature(string $orderId, string $paymentId, string $signature): bool
    {
        $secret = Env::required('RAZORPAY_KEY_SECRET');
        $expected = hash_hmac('sha256', "{$orderId}|{$paymentId}", $secret);
        return hash_equals($expected, $signature);
    }

    public static function verifyWebhook(string $rawBody, string $signature): bool
    {
        $secret = Env::get('RAZORPAY_WEBHOOK_SECRET', '') ?? '';
        if ($secret === '') return false;
        $expected = hash_hmac('sha256', $rawBody, $secret);
        return hash_equals($expected, $signature);
    }
}
