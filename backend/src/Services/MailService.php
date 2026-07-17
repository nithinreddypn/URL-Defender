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
        $host = Env::get('SMTP_HOST', '');
        if ($host === '') return false;

        $port   = (int) Env::get('SMTP_PORT', '587');
        $user   = Env::get('SMTP_USER', '');
        $pass   = Env::get('SMTP_PASS', '');
        $from   = Env::get('SMTP_FROM', 'noreply@localhost');
        $fromN  = Env::get('SMTP_FROM_NAME', 'URL Defender');
        $secure = strtolower(Env::get('SMTP_SECURE', 'tls'));

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
        $html = "<p>Your URL Defender verification code is:</p>
                 <p style='font-size:28px;font-weight:700;letter-spacing:6px'>{$code}</p>
                 <p>This code expires in 10 minutes.</p>";
        return self::send($to, "Your verification code: {$code}", $html);
    }

    public static function sendPasswordReset(string $to, string $link): bool
    {
        $html = "<p>You requested a password reset.</p>
                 <p><a href='{$link}'>Reset your password</a> (expires in 30 minutes)</p>
                 <p>If you didn't request this, ignore this email.</p>";
        return self::send($to, 'Reset your URL Defender password', $html);
    }

    private static function encodeSubject(string $s): string
    {
        return '=?UTF-8?B?' . base64_encode($s) . '?=';
    }

}
