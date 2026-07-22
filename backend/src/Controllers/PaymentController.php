<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\{Db, Request, Response};
use App\Services\RazorpayService;
use function App\Helpers\{uuid, required};

final class PaymentController
{
    // INR paise
    private const PLANS = [
        'team'       => ['amount' => 49900,  'label' => 'Team'],       // ₹499
        'enterprise' => ['amount' => 199900, 'label' => 'Enterprise'], // ₹1999
    ];

    // POST /api/payments/order  (auth)  { plan }
    public function createOrder(Request $req): void
    {
        required($req->body, ['plan']);
        $plan = (string) $req->body['plan'];
        if (!isset(self::PLANS[$plan])) Response::error('Invalid plan', 422);

        $amount  = self::PLANS[$plan]['amount'];
        $receipt = 'ud_' . substr(uuid(), 0, 20);
        $order   = RazorpayService::createOrder($amount, $receipt);

        Db::q(
            'INSERT INTO payments (id, user_id, razorpay_order_id, receipt, amount_paise, currency, status)
             VALUES (?, ?, ?, ?, ?, "INR", "created")',
            [uuid(), $req->user['id'], $order['id'], $receipt, $amount]
        );

        Response::json([
            'order_id' => $order['id'],
            'amount'   => $amount,
            'currency' => 'INR',
            'key_id'   => RazorpayService::keyId(),
            'plan'     => $plan,
            'receipt'  => $receipt,
        ], 201);
    }

    // POST /api/payments/verify  (auth)
    // { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, method? }
    public function verify(Request $req): void
    {
        required($req->body, ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature', 'plan']);
        $oid  = (string) $req->body['razorpay_order_id'];
        $pid  = (string) $req->body['razorpay_payment_id'];
        $sig  = (string) $req->body['razorpay_signature'];
        $plan = (string) $req->body['plan'];
        $method = $req->body['method'] ?? null;

        if (!RazorpayService::verifySignature($oid, $pid, $sig)) {
            Db::q('UPDATE payments SET status="failed", failure_reason="bad_signature" WHERE razorpay_order_id=?', [$oid]);
            Response::error('Invalid signature', 400);
        }

        $pay = Db::one('SELECT id, user_id FROM payments WHERE razorpay_order_id=? LIMIT 1', [$oid]);
        if (!$pay || $pay['user_id'] !== $req->user['id']) Response::error('Order mismatch', 400);

        Db::q(
            'UPDATE payments SET razorpay_payment_id=?, razorpay_signature=?, status="captured", method=? WHERE id=?',
            [$pid, $sig, $method, $pay['id']]
        );

        // Upsert subscription (30-day period)
        $sub = Db::one('SELECT id FROM subscriptions WHERE user_id=? LIMIT 1', [$req->user['id']]);
        if ($sub) {
            Db::q(
                'UPDATE subscriptions SET plan=?, status="active",
                    current_period_start=NOW(), current_period_end=DATE_ADD(NOW(), INTERVAL 30 DAY)
                 WHERE id=?',
                [$plan, $sub['id']]
            );
            $subId = $sub['id'];
        } else {
            $subId = uuid();
            Db::q(
                'INSERT INTO subscriptions (id, user_id, plan, status, current_period_start, current_period_end)
                 VALUES (?, ?, ?, "active", NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))',
                [$subId, $req->user['id'], $plan]
            );
        }
        Db::q('UPDATE payments SET subscription_id=? WHERE id=?', [$subId, $pay['id']]);
        Db::q('UPDATE users SET plan=? WHERE id=?', [$plan, $req->user['id']]);
        \App\Services\AuditLogService::log($req->user['id'], 'subscription_changed', "Upgraded to " . ucfirst($plan) . " plan", $req);

        Db::q(
            'INSERT INTO notifications (id, user_id, type, title, message, severity)
             VALUES (?, ?, "billing", "Payment successful", ?, "info")',
            [uuid(), $req->user['id'], "You're now on the " . ucfirst($plan) . " plan."]
        );

        Response::json(['ok' => true, 'plan' => $plan]);
    }

    // POST /api/webhooks/razorpay  (public, signature verified)
    public function webhook(Request $req): void
    {
        $raw = file_get_contents('php://input') ?: '';
        $sig = $req->header('x-razorpay-signature') ?? '';
        if (!RazorpayService::verifyWebhook($raw, $sig)) Response::error('Invalid signature', 401);

        $payload = json_decode($raw, true) ?: [];
        $event = $payload['event'] ?? '';
        // We only need capture failures / refunds here; success is handled in /verify
        $pid = $payload['payload']['payment']['entity']['id'] ?? null;
        if (!$pid) Response::json(['ok' => true]);

        switch ($event) {
            case 'payment.failed':
                Db::q('UPDATE payments SET status="failed", failure_reason=? WHERE razorpay_payment_id=?',
                    [$payload['payload']['payment']['entity']['error_description'] ?? 'failed', $pid]);
                break;
            case 'refund.processed':
                Db::q('UPDATE payments SET status="refunded" WHERE razorpay_payment_id=?', [$pid]);
                break;
        }
        Response::json(['ok' => true]);
    }
}
