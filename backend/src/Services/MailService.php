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
        <body style='margin:0;padding:0;background-color:#090d16;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;'>
          <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color:#090d16;padding:40px 16px;'>
            <tr>
              <td align='center'>
                <table width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width:540px;background-color:#0f172a;border-radius:20px;border:1px solid #1e293b;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);'>
                  
                  <!-- Top Brand Bar -->
                  <tr>
                    <td style='padding:32px 36px 28px;text-align:center;background:linear-gradient(180deg, #131c2e 0%, #0f172a 100%);border-bottom:1px solid #1e293b;'>
                      <table align='center' border='0' cellspacing='0' cellpadding='0'>
                        <tr>
                          <td style='padding-right:12px;'>
                            <div style='width:42px;height:42px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);border-radius:12px;text-align:center;line-height:42px;'>
                              <span style='font-size:22px;'>🛡️</span>
                            </div>
                          </td>
                          <td style='text-align:left;'>
                            <div style='color:#f8fafc;font-size:18px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;'>URL DEFENDER</div>
                            <div style='color:#64748b;font-size:11px;font-weight:600;letter-spacing:0.5px;'>ENTERPRISE THREAT INTELLIGENCE</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Main Content Area -->
                  <tr>
                    <td style='padding:36px 36px 28px;'>
                      <!-- Security Badge -->
                      <div style='text-align:center;margin-bottom:24px;'>
                        <span style='display:inline-block;padding:6px 14px;background-color:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:9999px;color:#10b981;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;'>
                          OFFICIAL SECURITY DISPATCH
                        </span>
                      </div>

                      <h1 style='color:#f8fafc;font-size:22px;font-weight:700;margin:0 0 12px;text-align:center;'>Your Verification Code</h1>
                      <p style='color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 28px;text-align:center;'>
                        We received a request to verify your email address for your <b>URL Defender</b> account. Enter the 6-digit verification code below to complete your authentication:
                      </p>

                      <!-- 6-Digit Code Box -->
                      <div style='background-color:#020617;border:2px dashed #10b981;border-radius:14px;padding:26px 16px;margin:0 0 24px;text-align:center;box-shadow:inset 0 2px 4px rgba(0,0,0,0.4);'>
                        <div style='font-family:\"SF Mono\",Consolas,Menlo,Monaco,Courier,monospace;font-size:40px;font-weight:900;letter-spacing:14px;color:#10b981;line-height:1;margin-left:14px;'>{$code}</div>
                        <div style='margin-top:10px;color:#64748b;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;'>ONE-TIME VERIFICATION CODE</div>
                      </div>

                      <!-- 1-Minute Expiration Warning Callout -->
                      <div style='background-color:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:14px 16px;margin-0 0 24px;'>
                        <table width='100%' border='0' cellspacing='0' cellpadding='0'>
                          <tr>
                            <td width='24' style='vertical-align:top;padding-right:8px;font-size:16px;'>⏱️</td>
                            <td style='color:#f87171;font-size:13px;line-height:1.5;font-weight:600;'>
                              <b>Expiration Notice:</b> This code will expire in <b>1 minute (60 seconds)</b>. For your security, never share this code with anyone.
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- Security Guidelines -->
                      <div style='background-color:#1e293b;border-radius:10px;padding:16px 20px;margin-bottom:8px;'>
                        <div style='color:#cbd5e1;font-size:12px;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;'>🔒 Security Guidelines</div>
                        <ul style='margin:0;padding-left:16px;color:#94a3b8;font-size:12px;line-height:1.6;'>
                          <li>URL Defender staff will <b>never</b> contact you asking for your verification code.</li>
                          <li>This code can only be used once to verify your account session.</li>
                          <li>If you did not request this email, no action is required and your account remains secure.</li>
                        </ul>
                      </div>
                    </td>
                  </tr>

                  <!-- Corporate Footer -->
                  <tr>
                    <td style='padding:24px 36px;background-color:#090d16;border-top:1px solid #1e293b;text-align:center;'>
                      <p style='color:#64748b;font-size:12px;line-height:1.5;margin:0 0 6px;'>
                        <b>URL Defender Security Operations Center</b> • Enterprise Threat Network
                      </p>
                      <p style='color:#475569;font-size:11px;margin:0 0 10px;'>
                        Contact Security Desk: <a href='mailto:urldefenderservice@gmail.com' style='color:#10b981;text-decoration:none;'>urldefenderservice@gmail.com</a>
                      </p>
                      <p style='color:#334155;font-size:11px;margin:0;'>
                        © {$year} URL Defender Inc. All rights reserved. Automated System Dispatch.
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
        <body style='margin:0;padding:0;background-color:#090d16;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;'>
          <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color:#090d16;padding:40px 16px;'>
            <tr>
              <td align='center'>
                <table width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width:540px;background-color:#0f172a;border-radius:20px;border:1px solid #1e293b;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);'>
                  
                  <!-- Top Brand Bar -->
                  <tr>
                    <td style='padding:32px 36px 28px;text-align:center;background:linear-gradient(180deg, #131c2e 0%, #0f172a 100%);border-bottom:1px solid #1e293b;'>
                      <table align='center' border='0' cellspacing='0' cellpadding='0'>
                        <tr>
                          <td style='padding-right:12px;'>
                            <div style='width:42px;height:42px;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.4);border-radius:12px;text-align:center;line-height:42px;'>
                              <span style='font-size:22px;'>🔑</span>
                            </div>
                          </td>
                          <td style='text-align:left;'>
                            <div style='color:#f8fafc;font-size:18px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;'>URL DEFENDER</div>
                            <div style='color:#64748b;font-size:11px;font-weight:600;letter-spacing:0.5px;'>ACCOUNT RECOVERY SYSTEM</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Main Content Area -->
                  <tr>
                    <td style='padding:36px 36px 28px;'>
                      <!-- Security Badge -->
                      <div style='text-align:center;margin-bottom:24px;'>
                        <span style='display:inline-block;padding:6px 14px;background-color:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.3);border-radius:9999px;color:#60a5fa;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;'>
                          PASSWORD RESET REQUEST
                        </span>
                      </div>

                      <h1 style='color:#f8fafc;font-size:22px;font-weight:700;margin:0 0 12px;text-align:center;'>Reset Your Password</h1>
                      <p style='color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 28px;text-align:center;'>
                        We received a security request to reset the password associated with your <b>URL Defender</b> account. Click the button below to proceed with setting a new password:
                      </p>

                      <!-- Reset Action Button -->
                      <div style='text-align:center;margin:0 0 32px;'>
                        <a href='{$link}' style='display:inline-block;background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 36px;border-radius:12px;box-shadow:0 10px 20px -5px rgba(37,99,235,0.5);letter-spacing:0.5px;'>
                          Reset Account Password →
                        </a>
                      </div>

                      <!-- Expiration Warning Callout -->
                      <div style='background-color:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.3);border-radius:10px;padding:14px 16px;margin:0 0 24px;'>
                        <table width='100%' border='0' cellspacing='0' cellpadding='0'>
                          <tr>
                            <td width='24' style='vertical-align:top;padding-right:8px;font-size:16px;'>⚠️</td>
                            <td style='color:#facc15;font-size:13px;line-height:1.5;font-weight:600;'>
                              <b>Link Expiration:</b> This reset link will expire in <b>15 minutes</b>. If you did not initiate this request, you can safely ignore this email.
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- Direct Link Box -->
                      <div style='background-color:#1e293b;border-radius:10px;padding:16px;margin-bottom:8px;'>
                        <div style='color:#cbd5e1;font-size:11px;font-weight:700;margin-bottom:6px;text-transform:uppercase;'>Having trouble with the button?</div>
                        <p style='color:#94a3b8;font-size:11px;margin:0;word-break:break-all;'>
                          Copy and paste this URL into your browser: <br>
                          <a href='{$link}' style='color:#60a5fa;text-decoration:none;'>{$link}</a>
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Corporate Footer -->
                  <tr>
                    <td style='padding:24px 36px;background-color:#090d16;border-top:1px solid #1e293b;text-align:center;'>
                      <p style='color:#64748b;font-size:12px;line-height:1.5;margin:0 0 6px;'>
                        <b>URL Defender Security Operations Center</b> • Enterprise Threat Network
                      </p>
                      <p style='color:#475569;font-size:11px;margin:0 0 10px;'>
                        Contact Security Desk: <a href='mailto:urldefenderservice@gmail.com' style='color:#10b981;text-decoration:none;'>urldefenderservice@gmail.com</a>
                      </p>
                      <p style='color:#334155;font-size:11px;margin:0;'>
                        © {$year} URL Defender Inc. All rights reserved. Automated Security Transmission.
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
        $isDanger = strtolower($verdict) === 'dangerous';
        $badgeColor = $isDanger ? '#ef4444' : '#f59e0b';
        $bgBadge = $isDanger ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)';
        $borderBadge = $isDanger ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)';

        $html = "
        <!DOCTYPE html>
        <html lang='en'>
        <head>
          <meta charset='utf-8'>
          <meta name='viewport' content='width=device-width, initial-scale=1.0'>
          <title>Threat Alert — URL Defender</title>
        </head>
        <body style='margin:0;padding:0;background-color:#090d16;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;'>
          <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color:#090d16;padding:40px 16px;'>
            <tr>
              <td align='center'>
                <table width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width:540px;background-color:#0f172a;border-radius:20px;border:1px solid #1e293b;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);'>
                  
                  <!-- Top Header -->
                  <tr>
                    <td style='padding:32px 36px 28px;text-align:center;background:linear-gradient(180deg, #1f1315 0%, #0f172a 100%);border-bottom:1px solid #1e293b;'>
                      <table align='center' border='0' cellspacing='0' cellpadding='0'>
                        <tr>
                          <td style='padding-right:12px;'>
                            <div style='width:44px;height:44px;background:{$bgBadge};border:1px solid {$borderBadge};border-radius:12px;text-align:center;line-height:44px;'>
                              <span style='font-size:22px;'>🚨</span>
                            </div>
                          </td>
                          <td style='text-align:left;'>
                            <div style='color:#f8fafc;font-size:18px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;'>URL DEFENDER</div>
                            <div style='color:{$badgeColor};font-size:11px;font-weight:700;letter-spacing:1px;'>CRITICAL THREAT DISPATCH</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Main Content Area -->
                  <tr>
                    <td style='padding:36px 36px 28px;'>
                      <div style='text-align:center;margin-bottom:24px;'>
                        <span style='display:inline-block;padding:6px 14px;background-color:{$bgBadge};border:1px solid {$borderBadge};border-radius:9999px;color:{$badgeColor};font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;'>
                          {$verdict} THREAT DETECTED
                        </span>
                      </div>

                      <h1 style='color:#f8fafc;font-size:22px;font-weight:700;margin:0 0 12px;text-align:center;'>Malicious Link Flagged</h1>
                      <p style='color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 28px;text-align:center;'>
                        URL Defender Threat Engine has detected a <b>{$verdict}</b> security threat during your recent scan analysis. Do not visit or submit credentials to this link:
                      </p>

                      <!-- Threat Detail Box -->
                      <div style='background-color:#020617;border:1px solid #1e293b;border-radius:14px;padding:20px;margin:0 0 24px;'>
                        <div style='margin-bottom:12px;'>
                          <span style='color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;'>Scanned Target Domain</span>
                          <p style='color:#f8fafc;font-family:monospace;font-size:15px;font-weight:700;margin:4px 0 0;word-break:break-all;'>{$host}</p>
                        </div>
                        <div style='display:table;width:100%;border-top:1px solid #1e293b;padding-top:12px;margin-top:12px;'>
                          <div style='display:table-cell;width:50%;'>
                            <span style='color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;'>Risk Score</span>
                            <p style='color:{$badgeColor};font-size:18px;font-weight:800;margin:2px 0 0;'>{$riskScore} / 100</p>
                          </div>
                          <div style='display:table-cell;width:50%;'>
                            <span style='color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;'>Threat Category</span>
                            <p style='color:#cbd5e1;font-size:13px;font-weight:600;margin:2px 0 0;'>{$threatCategory}</p>
                          </div>
                        </div>
                      </div>

                      <!-- Action Button -->
                      <div style='text-align:center;margin:0 0 28px;'>
                        <a href='http://localhost:3000/alerts' style='display:inline-block;background:#ef4444;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;box-shadow:0 8px 16px -4px rgba(239,68,68,0.5);'>
                          View Threat Report →
                        </a>
                      </div>

                      <p style='color:#64748b;font-size:12px;line-height:1.5;margin:0;text-align:center;'>
                        This threat alert was dispatched automatically based on your alert preferences.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style='padding:24px 36px;background-color:#090d16;border-top:1px solid #1e293b;text-align:center;'>
                      <p style='color:#64748b;font-size:12px;margin:0 0 6px;'><b>URL Defender Security Operations Center</b></p>
                      <p style='color:#475569;font-size:11px;margin:0;'>© {$year} URL Defender Inc. All rights reserved.</p>
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
        <body style='margin:0;padding:0;background-color:#090d16;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;'>
          <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color:#090d16;padding:40px 16px;'>
            <tr>
              <td align='center'>
                <table width='100%' border='0' cellspacing='0' cellpadding='0' style='max-width:540px;background-color:#0f172a;border-radius:20px;border:1px solid #1e293b;overflow:hidden;'>
                  
                  <!-- Top Header -->
                  <tr>
                    <td style='padding:32px 36px 28px;text-align:center;background:linear-gradient(180deg, #131c2e 0%, #0f172a 100%);border-bottom:1px solid #1e293b;'>
                      <div style='color:#10b981;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;'>📊 WEEKLY DIGEST</div>
                      <h1 style='color:#f8fafc;font-size:22px;font-weight:700;margin:0 0 6px;'>Weekly Security Summary</h1>
                      <p style='color:#94a3b8;font-size:13px;margin:0;'>Your personal URL scan activity breakdown</p>
                    </td>
                  </tr>

                  <!-- Content Area -->
                  <tr>
                    <td style='padding:32px 36px;'>
                      <div style='display:table;width:100%;margin-bottom:24px;'>
                        <div style='display:table-cell;width:33%;text-align:center;background:#020617;border:1px solid #1e293b;border-radius:12px;padding:16px 8px;'>
                          <span style='color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;'>Total Scans</span>
                          <p style='color:#f8fafc;font-size:22px;font-weight:800;margin:6px 0 0;'>{$totalScans}</p>
                        </div>
                        <div style='display:table-cell;width:33%;text-align:center;background:#020617;border:1px solid #1e293b;border-radius:12px;padding:16px 8px;'>
                          <span style='color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;'>Threats Flagged</span>
                          <p style='color:#ef4444;font-size:22px;font-weight:800;margin:6px 0 0;'>{$threatsFound}</p>
                        </div>
                        <div style='display:table-cell;width:33%;text-align:center;background:#020617;border:1px solid #1e293b;border-radius:12px;padding:16px 8px;'>
                          <span style='color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;'>Safe URLs</span>
                          <p style='color:#10b981;font-size:22px;font-weight:800;margin:6px 0 0;'>{$safeUrls}</p>
                        </div>
                      </div>

                      <div style='text-align:center;margin-top:24px;'>
                        <a href='http://localhost:3000/home' style='display:inline-block;background:#10b981;color:#020617;font-size:14px;font-weight:800;text-decoration:none;padding:14px 32px;border-radius:10px;'>
                          Go to Security Dashboard →
                        </a>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style='padding:20px 36px;background-color:#090d16;border-top:1px solid #1e293b;text-align:center;'>
                      <p style='color:#64748b;font-size:11px;margin:0;'>© {$year} URL Defender Inc. All rights reserved.</p>
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
