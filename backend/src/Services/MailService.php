<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Env;

/**
 * SMTP mailer over raw sockets — no dependencies.
 * Email content is never written to local logs.
 */
final class MailService
{
    public static function send(string $to, string $subject, string $html): bool
    {
        $config = require __DIR__ . '/../../config/mail.php';
        $host   = $config['host'] ?? '';
        if ($host === '') return false;

        $port   = (int) ($config['port'] ?? 587);
        $user   = $config['user'] ?? '';
        $pass   = $config['pass'] ?? '';
        $from   = $config['from'] ?? 'noreply@localhost';
        $fromN  = $config['from_name'] ?? 'URL Defender';
        $secure = strtolower($config['secure'] ?? 'tls');

        $transport = $secure === 'ssl' ? "ssl://{$host}" : $host;
        $errno = 0; $errstr = '';
        $sock = @stream_socket_client("{$transport}:{$port}", $errno, $errstr, 15);
        if (!$sock) return false;

        $expect = function ($code) use ($sock) {
            $line = '';
            while (($chunk = fgets($sock, 515)) !== false) {
                $line .= $chunk;
                if (isset($chunk[3]) && $chunk[3] === ' ') break;
            }
            return str_starts_with($line, (string)$code);
        };
        $cmd = fn(string $c) => fwrite($sock, $c . "\r\n");

        if (!$expect(220)) { fclose($sock); return false; }
        $cmd("EHLO " . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
        if (!$expect(250)) { fclose($sock); return false; }

        if ($secure === 'tls') {
            $cmd('STARTTLS');
            if (!$expect(220)) { fclose($sock); return false; }
            stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            $cmd("EHLO " . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
            $expect(250);
        }

        if ($user !== '') {
            $cmd('AUTH LOGIN');
            if (!$expect(334)) { fclose($sock); return false; }
            $cmd(base64_encode($user));
            if (!$expect(334)) { fclose($sock); return false; }
            $cmd(base64_encode($pass));
            if (!$expect(235)) { fclose($sock); return false; }
        }

        $cmd("MAIL FROM:<{$from}>");
        if (!$expect(250)) { fclose($sock); return false; }
        $cmd("RCPT TO:<{$to}>");
        if (!$expect(250)) { fclose($sock); return false; }
        $cmd('DATA');
        if (!$expect(354)) { fclose($sock); return false; }

        $headers  = "From: {$fromN} <{$from}>\r\n";
        $headers .= "To: <{$to}>\r\n";
        $headers .= "Subject: " . self::encodeSubject($subject) . "\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "Content-Transfer-Encoding: 8bit\r\n";

        $body = preg_replace('/^\./m', '..', $html); // dot-stuffing
        fwrite($sock, $headers . "\r\n" . $body . "\r\n.\r\n");
        if (!$expect(250)) { fclose($sock); return false; }
        $cmd('QUIT');
        fclose($sock);
        return true;
    }

    public static function sendOtp(string $to, string $code): bool
    {
        $html = "
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset='utf-8'>
          <meta name='viewport' content='width=device-width, initial-scale=1.0'>
          <title>Verification Code</title>
        </head>
        <body style='margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;'>
          <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color:#0f172a;padding:40px 20px;'>
            <tr>
              <td align='center'>
                <table width='100%' max-width='500' border='0' cellspacing='0' cellpadding='0' style='max-width:500px;background-color:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);'>
                  <!-- Header -->
                  <tr>
                    <td style='padding:32px 32px 24px;text-align:center;border-bottom:1px solid #334155;background:linear-gradient(180deg, #1e293b 0%, #0f172a 100%);'>
                      <div style='display:inline-block;padding:10px 16px;background-color:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:9999px;'>
                        <span style='color:#10b981;font-weight:700;font-size:14px;letter-spacing:1px;text-transform:uppercase;'>🛡️ URL Defender Security</span>
                      </div>
                      <h1 style='color:#f8fafc;font-size:22px;font-weight:700;margin:16px 0 4px;'>Email Verification Code</h1>
                      <p style='color:#94a3b8;font-size:14px;margin:0;'>Verify your identity to proceed</p>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style='padding:32px;text-align:center;'>
                      <p style='color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;'>Your 6-digit URL Defender single-use verification code is:</p>
                      
                      <div style='background-color:#0f172a;border:2px dashed #10b981;border-radius:12px;padding:20px;margin:0 0 24px;display:inline-block;width:85%;'>
                        <span style='font-family:monospace,Courier,sans-serif;font-size:36px;font-weight:800;letter-spacing:10px;color:#34d399;text-shadow:0 0 12px rgba(52,211,153,0.3);'>{$code}</span>
                      </div>

                      <div style='background-color:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:12px;margin:0 0 24px;text-align:center;'>
                        <p style='color:#f87171;font-size:13px;font-weight:600;margin:0;'>⚠️ This code expires in 1 minute.</p>
                      </div>

                      <p style='color:#64748b;font-size:12px;line-height:1.5;margin:0;'>If you did not request this code, please secure your account immediately or contact support.</p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style='padding:20px 32px;background-color:#0f172a;border-top:1px solid #334155;text-align:center;'>
                      <p style='color:#64748b;font-size:12px;margin:0;'>© " . date('Y') . " URL Defender. All rights reserved. Automated Security Dispatcher.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        ";
        return self::send($to, "Your verification code: {$code}", $html);
    }

    public static function sendPasswordReset(string $to, string $link): bool
    {
        $html = "
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset='utf-8'>
          <meta name='viewport' content='width=device-width, initial-scale=1.0'>
          <title>Reset Password</title>
        </head>
        <body style='margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;'>
          <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color:#0f172a;padding:40px 20px;'>
            <tr>
              <td align='center'>
                <table width='100%' max-width='500' border='0' cellspacing='0' cellpadding='0' style='max-width:500px;background-color:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);'>
                  <!-- Header -->
                  <tr>
                    <td style='padding:32px 32px 24px;text-align:center;border-bottom:1px solid #334155;background:linear-gradient(180deg, #1e293b 0%, #0f172a 100%);'>
                      <div style='display:inline-block;padding:10px 16px;background-color:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);border-radius:9999px;'>
                        <span style='color:#60a5fa;font-weight:700;font-size:14px;letter-spacing:1px;text-transform:uppercase;'>🔑 Account Recovery</span>
                      </div>
                      <h1 style='color:#f8fafc;font-size:22px;font-weight:700;margin:16px 0 4px;'>Password Reset Request</h1>
                      <p style='color:#94a3b8;font-size:14px;margin:0;'>Securely reset your password</p>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style='padding:32px;text-align:center;'>
                      <p style='color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;'>We received a request to reset the password for your URL Defender account. Click the button below to set a new password:</p>
                      
                      <div style='margin:0 0 28px;'>
                        <a href='{$link}' style='display:inline-block;background-color:#2563eb;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;box-shadow:0 4px 14px 0 rgba(37,99,235,0.39);'>Reset Password</a>
                      </div>

                      <div style='background-color:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.25);border-radius:8px;padding:12px;margin:0 0 24px;text-align:center;'>
                        <p style='color:#facc15;font-size:13px;font-weight:600;margin:0;'>⚠️ This link will expire in 15 minutes.</p>
                      </div>

                      <p style='color:#64748b;font-size:12px;line-height:1.5;margin:0;'>If you did not request a password reset, you can safely ignore this email.</p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style='padding:20px 32px;background-color:#0f172a;border-top:1px solid #334155;text-align:center;'>
                      <p style='color:#64748b;font-size:12px;margin:0;'>© " . date('Y') . " URL Defender. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        ";
        return self::send($to, 'Reset your URL Defender password', $html);
    }

    private static function encodeSubject(string $s): string
    {
        return '=?UTF-8?B?' . base64_encode($s) . '?=';
    }

}
