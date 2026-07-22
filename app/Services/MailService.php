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
        $year = date('Y');
        $html = "
        <!DOCTYPE html>
        <html lang='en'>
        <head>
          <meta charset='utf-8'>
          <meta name='viewport' content='width=device-width, initial-scale=1.0'>
          <title>Verification Code — URL Defender</title>
        </head>
        <body style='margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;'>
          <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color:#f8fafc;padding:48px 16px;'>
            <tr>
              <td align='center'>
                <table width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width:520px;background-color:#ffffff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);'>
                  
                  <!-- Top Brand Bar -->
                  <tr>
                    <td style='padding:32px 36px 24px;text-align:center;border-bottom:1px solid #f1f5f9;'>
                      <table align='center' border='0' cellspacing='0' cellpadding='0'>
                        <tr>
                          <td style='padding-right:10px;'>
                            <div style='width:40px;height:40px;background:#10b981;border-radius:12px;text-align:center;line-height:40px;'>
                              <span style='font-size:20px;color:#ffffff;'>🛡️</span>
                            </div>
                          </td>
                          <td style='text-align:left;'>
                            <div style='color:#0f172a;font-size:18px;font-weight:800;letter-spacing:1px;text-transform:uppercase;'>URL DEFENDER</div>
                            <div style='color:#64748b;font-size:11px;font-weight:600;letter-spacing:0.5px;'>CYBER THREAT INTELLIGENCE</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Main Content Area -->
                  <tr>
                    <td style='padding:36px 36px 28px;'>
                      <div style='text-align:center;margin-bottom:20px;'>
                        <span style='display:inline-block;padding:6px 14px;background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:9999px;color:#059669;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;'>
                          VERIFICATION CODE DISPATCH
                        </span>
                      </div>

                      <h1 style='color:#0f172a;font-size:24px;font-weight:800;margin:0 0 12px;text-align:center;letter-spacing:-0.5px;'>Verify Your Identity</h1>
                      <p style='color:#475569;font-size:14px;line-height:1.6;margin:0 0 28px;text-align:center;'>
                        Enter the single-use 6-digit verification code below to complete your authentication for <b>URL Defender</b>:
                      </p>

                      <!-- 6-Digit Code Box -->
                      <div style='background-color:#f8fafc;border:2px solid #10b981;border-radius:14px;padding:24px 16px;margin:0 0 24px;text-align:center;'>
                        <div style='font-family:\"SF Mono\",Consolas,Menlo,Monaco,Courier,monospace;font-size:38px;font-weight:900;letter-spacing:12px;color:#059669;line-height:1;margin-left:12px;'>{$code}</div>
                        <div style='margin-top:10px;color:#64748b;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;'>SINGLE-USE PASSCODE</div>
                      </div>

                      <!-- 1-Minute Expiration Notice -->
                      <div style='background-color:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin-bottom:24px;'>
                        <table width='100%' border='0' cellspacing='0' cellpadding='0'>
                          <tr>
                            <td width='24' style='vertical-align:top;padding-right:8px;font-size:16px;'>⏱️</td>
                            <td style='color:#dc2626;font-size:13px;line-height:1.5;font-weight:600;'>
                              <b>Code Expiration:</b> This verification code expires in <b>1 minute (60 seconds)</b>. Never share this code with anyone.
                            </td>
                          </tr>
                        </table>
                      </div>

                      <p style='color:#94a3b8;font-size:12px;line-height:1.5;margin:0;text-align:center;'>
                        If you did not initiate this request, you can safely ignore this email or secure your account.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style='padding:24px 36px;background-color:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;'>
                      <p style='color:#64748b;font-size:12px;line-height:1.5;margin:0 0 6px;'>
                        <b>URL Defender Security Desk</b> • <a href='mailto:urldefenderservice@gmail.com' style='color:#059669;text-decoration:none;'>urldefenderservice@gmail.com</a>
                      </p>
                      <p style='color:#94a3b8;font-size:11px;margin:0;'>
                        © {$year} URL Defender Inc. All rights reserved.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        ";
        return self::send($to, "Your URL Defender verification code is: {$code}", $html);
    }

    public static function sendPasswordReset(string $to, string $link): bool
    {
        $year = date('Y');
        $html = "
        <!DOCTYPE html>
        <html lang='en'>
        <head>
          <meta charset='utf-8'>
          <meta name='viewport' content='width=device-width, initial-scale=1.0'>
          <title>Reset Password — URL Defender</title>
        </head>
        <body style='margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;'>
          <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color:#f8fafc;padding:48px 16px;'>
            <tr>
              <td align='center'>
                <table width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width:520px;background-color:#ffffff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);'>
                  
                  <!-- Top Brand Bar -->
                  <tr>
                    <td style='padding:32px 36px 24px;text-align:center;border-bottom:1px solid #f1f5f9;'>
                      <table align='center' border='0' cellspacing='0' cellpadding='0'>
                        <tr>
                          <td style='padding-right:10px;'>
                            <div style='width:40px;height:40px;background:#2563eb;border-radius:12px;text-align:center;line-height:40px;'>
                              <span style='font-size:20px;color:#ffffff;'>🔑</span>
                            </div>
                          </td>
                          <td style='text-align:left;'>
                            <div style='color:#0f172a;font-size:18px;font-weight:800;letter-spacing:1px;text-transform:uppercase;'>URL DEFENDER</div>
                            <div style='color:#64748b;font-size:11px;font-weight:600;letter-spacing:0.5px;'>ACCOUNT RECOVERY SYSTEM</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Main Content Area -->
                  <tr>
                    <td style='padding:36px 36px 28px;'>
                      <div style='text-align:center;margin-bottom:20px;'>
                        <span style='display:inline-block;padding:6px 14px;background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:9999px;color:#2563eb;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;'>
                          PASSWORD RESET DISPATCH
                        </span>
                      </div>

                      <h1 style='color:#0f172a;font-size:24px;font-weight:800;margin:0 0 12px;text-align:center;letter-spacing:-0.5px;'>Reset Your Password</h1>
                      <p style='color:#475569;font-size:14px;line-height:1.6;margin:0 0 28px;text-align:center;'>
                        We received a request to reset the password for your <b>URL Defender</b> account. Click the button below to choose a new password:
                      </p>

                      <!-- Action CTA Button -->
                      <div style='text-align:center;margin:0 0 32px;'>
                        <a href='{$link}' style='display:inline-block;background-color:#2563eb;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 36px;border-radius:12px;box-shadow:0 8px 16px -4px rgba(37,99,235,0.4);'>
                          Reset Account Password →
                        </a>
                      </div>

                      <!-- 15-Minute Expiration Notice -->
                      <div style='background-color:#fefce8;border:1px solid #fef08a;border-radius:10px;padding:14px 16px;margin-bottom:24px;'>
                        <table width='100%' border='0' cellspacing='0' cellpadding='0'>
                          <tr>
                            <td width='24' style='vertical-align:top;padding-right:8px;font-size:16px;'>⏱️</td>
                            <td style='color:#ca8a04;font-size:13px;line-height:1.5;font-weight:600;'>
                              <b>Link Expiration:</b> This reset link will expire in <b>15 minutes</b>.
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- Plain text link fallback -->
                      <div style='background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:8px;'>
                        <div style='color:#64748b;font-size:11px;font-weight:700;margin-bottom:4px;text-transform:uppercase;'>Button not working?</div>
                        <p style='color:#475569;font-size:11px;margin:0;word-break:break-all;'>
                          Copy and paste this URL into your browser:<br>
                          <a href='{$link}' style='color:#2563eb;text-decoration:none;'>{$link}</a>
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style='padding:24px 36px;background-color:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;'>
                      <p style='color:#64748b;font-size:12px;line-height:1.5;margin:0 0 6px;'>
                        <b>URL Defender Security Desk</b> • <a href='mailto:urldefenderservice@gmail.com' style='color:#2563eb;text-decoration:none;'>urldefenderservice@gmail.com</a>
                      </p>
                      <p style='color:#94a3b8;font-size:11px;margin:0;'>
                        © {$year} URL Defender Inc. All rights reserved.
                      </p>
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

    public static function sendThreatAlert(string $to, string $host, array $result): bool
    {
        $year = date('Y');
        $verdict = strtoupper((string)($result['verdict'] ?? 'DANGEROUS'));
        $riskScore = (int)($result['risk_score'] ?? 95);
        $threatCategory = htmlspecialchars((string)($result['threat_category'] ?? 'Phishing / Malware'));

        $html = "
        <!DOCTYPE html>
        <html lang='en'>
        <head>
          <meta charset='utf-8'>
          <meta name='viewport' content='width=device-width, initial-scale=1.0'>
          <title>Threat Alert — URL Defender</title>
        </head>
        <body style='margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;'>
          <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color:#f8fafc;padding:48px 16px;'>
            <tr>
              <td align='center'>
                <table width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width:520px;background-color:#ffffff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);'>
                  
                  <!-- Top Header -->
                  <tr>
                    <td style='padding:32px 36px 24px;text-align:center;border-bottom:1px solid #f1f5f9;'>
                      <table align='center' border='0' cellspacing='0' cellpadding='0'>
                        <tr>
                          <td style='padding-right:10px;'>
                            <div style='width:40px;height:40px;background:#dc2626;border-radius:12px;text-align:center;line-height:40px;'>
                              <span style='font-size:20px;color:#ffffff;'>🚨</span>
                            </div>
                          </td>
                          <td style='text-align:left;'>
                            <div style='color:#0f172a;font-size:18px;font-weight:800;letter-spacing:1px;text-transform:uppercase;'>URL DEFENDER</div>
                            <div style='color:#dc2626;font-size:11px;font-weight:700;letter-spacing:0.5px;'>CRITICAL THREAT DISPATCH</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Main Content Area -->
                  <tr>
                    <td style='padding:36px 36px 28px;'>
                      <div style='text-align:center;margin-bottom:20px;'>
                        <span style='display:inline-block;padding:6px 14px;background-color:#fef2f2;border:1px solid #fecaca;border-radius:9999px;color:#dc2626;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;'>
                          {$verdict} THREAT DETECTED
                        </span>
                      </div>

                      <h1 style='color:#0f172a;font-size:24px;font-weight:800;margin:0 0 12px;text-align:center;letter-spacing:-0.5px;'>Malicious Link Flagged</h1>
                      <p style='color:#475569;font-size:14px;line-height:1.6;margin:0 0 28px;text-align:center;'>
                        URL Defender Threat Engine detected a <b>{$verdict}</b> security threat during your recent scan analysis. Do not visit or submit credentials to this domain:
                      </p>

                      <!-- Threat Detail Box -->
                      <div style='background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin:0 0 24px;'>
                        <div style='margin-bottom:12px;'>
                          <span style='color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;'>Target Domain</span>
                          <p style='color:#0f172a;font-family:monospace;font-size:15px;font-weight:700;margin:4px 0 0;word-break:break-all;'>{$host}</p>
                        </div>
                        <table width='100%' border='0' cellspacing='0' cellpadding='0' style='border-top:1px solid #e2e8f0;padding-top:12px;'>
                          <tr>
                            <td width='50%'>
                              <span style='color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;'>Risk Score</span>
                              <p style='color:#dc2626;font-size:18px;font-weight:800;margin:2px 0 0;'>{$riskScore} / 100</p>
                            </td>
                            <td width='50%'>
                              <span style='color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;'>Category</span>
                              <p style='color:#334155;font-size:13px;font-weight:600;margin:2px 0 0;'>{$threatCategory}</p>
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- Action Button -->
                      <div style='text-align:center;margin:0 0 28px;'>
                        <a href='http://localhost:3000/alerts' style='display:inline-block;background-color:#dc2626;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;box-shadow:0 8px 16px -4px rgba(220,38,38,0.4);'>
                          View Threat Report →
                        </a>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style='padding:24px 36px;background-color:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;'>
                      <p style='color:#64748b;font-size:12px;margin:0 0 6px;'><b>URL Defender Security Desk</b> • <a href='mailto:urldefenderservice@gmail.com' style='color:#dc2626;text-decoration:none;'>urldefenderservice@gmail.com</a></p>
                      <p style='color:#94a3b8;font-size:11px;margin:0;'>© {$year} URL Defender Inc. All rights reserved.</p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        ";
        return self::send($to, "🚨 [Threat Alert] {$verdict} URL Flagged: {$host}", $html);
    }

    public static function sendWeeklySummary(string $to, array $summary): bool
    {
        $year = date('Y');
        $totalScans = (int)($summary['total_scans'] ?? 14);
        $threatsFound = (int)($summary['threats_found'] ?? 2);
        $safeUrls = (int)($summary['safe_urls'] ?? 12);

        $html = "
        <!DOCTYPE html>
        <html lang='en'>
        <head>
          <meta charset='utf-8'>
          <meta name='viewport' content='width=device-width, initial-scale=1.0'>
          <title>Weekly Security Summary — URL Defender</title>
        </head>
        <body style='margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;'>
          <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color:#f8fafc;padding:48px 16px;'>
            <tr>
              <td align='center'>
                <table width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width:520px;background-color:#ffffff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);'>
                  
                  <!-- Top Header -->
                  <tr>
                    <td style='padding:32px 36px 24px;text-align:center;border-bottom:1px solid #f1f5f9;'>
                      <div style='color:#059669;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;'>📊 WEEKLY DIGEST</div>
                      <h1 style='color:#0f172a;font-size:24px;font-weight:800;margin:0 0 6px;'>Weekly Security Summary</h1>
                      <p style='color:#64748b;font-size:13px;margin:0;'>Your URL scan activity breakdown</p>
                    </td>
                  </tr>

                  <!-- Content Area -->
                  <tr>
                    <td style='padding:32px 36px;'>
                      <table width='100%' border='0' cellspacing='0' cellpadding='0' style='margin-bottom:24px;'>
                        <tr>
                          <td width='33%' style='text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 8px;'>
                            <span style='color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;'>Total Scans</span>
                            <p style='color:#0f172a;font-size:22px;font-weight:800;margin:6px 0 0;'>{$totalScans}</p>
                          </td>
                          <td width='33%' style='text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 8px;'>
                            <span style='color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;'>Threats</span>
                            <p style='color:#dc2626;font-size:22px;font-weight:800;margin:6px 0 0;'>{$threatsFound}</p>
                          </td>
                          <td width='33%' style='text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 8px;'>
                            <span style='color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;'>Safe URLs</span>
                            <p style='color:#059669;font-size:22px;font-weight:800;margin:6px 0 0;'>{$safeUrls}</p>
                          </td>
                        </tr>
                      </table>

                      <div style='text-align:center;margin-top:24px;'>
                        <a href='http://localhost:3000/home' style='display:inline-block;background-color:#10b981;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;padding:14px 32px;border-radius:10px;'>
                          Go to Security Dashboard →
                        </a>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style='padding:20px 36px;background-color:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;'>
                      <p style='color:#94a3b8;font-size:11px;margin:0;'>© {$year} URL Defender Inc. All rights reserved.</p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        ";
        return self::send($to, "📊 Your Weekly Security Summary — URL Defender", $html);
    }

    private static function encodeSubject(string $s): string
    {
        return '=?UTF-8?B?' . base64_encode($s) . '?=';
    }

}
