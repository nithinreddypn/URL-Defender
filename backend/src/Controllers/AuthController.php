<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\{Db, Jwt, Request, Response};
use App\Services\{GoogleOAuthService, MailService};
use function App\Helpers\{uuid, hashToken, otp, isEmail, required};

final class AuthController
{
    // POST /api/auth/signup   { email, password, full_name }
    public function signup(Request $req): void
    {
        required($req->body, ['email', 'password', 'full_name']);
        $email = strtolower(trim((string) $req->body['email']));
        $pass  = (string) $req->body['password'];
        $name  = trim((string) $req->body['full_name']);

        if (!isEmail($email))            Response::error('Invalid email', 422);
        if (strlen($pass) < 8)           Response::error('Password must be at least 8 chars', 422);
        if (strlen($name) < 2)           Response::error('Name too short', 422);

        $existing = Db::one('SELECT id, deleted_at FROM users WHERE email=? LIMIT 1', [$email]);
        if ($existing && $existing['deleted_at'] === null) Response::error('Email already registered', 409);

        $userId = uuid();
        $hash   = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);

        Db::q(
            'INSERT INTO users (id, email, password_hash, full_name, plan) VALUES (?, ?, ?, ?, "free")',
            [$userId, $email, $hash, $name]
        );
        Db::q(
            'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, "user")',
            [uuid(), $userId]
        );

        // Issue OTP
        $code = otp(6);
        Db::q(
            'INSERT INTO email_verifications (id, user_id, code_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
            [uuid(), $userId, hashToken($code)]
        );
        $emailSent = MailService::sendOtp($email, $code);

        Response::json([
            'ok' => true,
            'user_id' => $userId,
            'email_sent' => $emailSent,
            'message' => $emailSent ? 'OTP sent' : 'Unable to send verification email',
        ], 201);
    }

    // POST /api/auth/verify-email  { email, code }
    public function verifyEmail(Request $req): void
    {
        required($req->body, ['email', 'code']);
        $email = strtolower(trim((string) $req->body['email']));
        $code  = trim((string) $req->body['code']);

        $user = Db::one('SELECT id, email_verified_at FROM users WHERE email=? AND deleted_at IS NULL LIMIT 1', [$email]);
        if (!$user) Response::error('Invalid code', 400);
        if ($user['email_verified_at']) Response::json(['ok' => true, 'message' => 'Already verified']);

        $ev = Db::one(
            'SELECT id, code_hash, attempts FROM email_verifications
              WHERE user_id=? AND consumed_at IS NULL AND expires_at > NOW()
              ORDER BY created_at DESC LIMIT 1',
            [$user['id']]
        );
        if (!$ev) Response::error('Code expired', 400);
        if ((int) $ev['attempts'] >= 5) Response::error('Too many attempts', 429);

        if (!hash_equals($ev['code_hash'], hashToken($code))) {
            Db::q('UPDATE email_verifications SET attempts = attempts + 1 WHERE id=?', [$ev['id']]);
            Response::error('Invalid code', 400);
        }

        Db::q(
            'UPDATE email_verifications SET consumed_at=NOW(), verified_ip=?, verified_user_agent=? WHERE id=?',
            [$req->ip(), $req->ua(), $ev['id']]
        );
        Db::q('UPDATE users SET email_verified_at=NOW() WHERE id=?', [$user['id']]);
        Response::json(['ok' => true]);
    }

    // POST /api/auth/resend-otp  { email }
    public function resendOtp(Request $req): void
    {
        required($req->body, ['email']);
        $email = strtolower(trim((string) $req->body['email']));
        $user = Db::one('SELECT id, email_verified_at FROM users WHERE email=? AND deleted_at IS NULL LIMIT 1', [$email]);
        if (!$user || $user['email_verified_at']) Response::json(['ok' => true]); // silent

        $code = otp(6);
        Db::q(
            'INSERT INTO email_verifications (id, user_id, code_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
            [uuid(), $user['id'], hashToken($code)]
        );
        $emailSent = MailService::sendOtp($email, $code);
        Response::json(['ok' => true, 'email_sent' => $emailSent]);
    }

    // POST /api/auth/login  { email, password }
    public function login(Request $req): void
    {
        required($req->body, ['email', 'password']);
        $email = strtolower(trim((string) $req->body['email']));
        $pass  = (string) $req->body['password'];

        $user = Db::one(
            'SELECT id, password_hash, is_active, deleted_at, email_verified_at FROM users WHERE email=? LIMIT 1',
            [$email]
        );

        $credentialsValid = $user && $user['deleted_at'] === null && (int)$user['is_active'] === 1
            && password_verify($pass, $user['password_hash']);
        $ok = $credentialsValid && !empty($user['email_verified_at']);

        Db::q(
            'INSERT INTO login_attempts (email, user_id, ip_address, user_agent, success, failure_reason)
             VALUES (?, ?, ?, ?, ?, ?)',
            [$email, $user['id'] ?? null, $req->ip(), $req->ua(), $ok ? 1 : 0,
             $ok ? null : ($credentialsValid ? 'email_unverified' : ($user ? 'bad_password' : 'no_user'))]
        );

        if (!$credentialsValid) Response::error('Invalid credentials', 401);
        if (empty($user['email_verified_at'])) Response::error('Email not verified', 403);

        Response::json($this->issueSession($user['id'], $req));
    }

    // POST /api/auth/google/callback  { code, code_verifier }
    public function googleCallback(Request $req): void
    {
        if (!GoogleOAuthService::isConfigured()) {
            Response::error('Google sign-in is temporarily unavailable', 503);
        }
        required($req->body, ['code', 'code_verifier']);

        try {
            $identity = GoogleOAuthService::identityFromCode(
                (string) $req->body['code'],
                (string) $req->body['code_verifier']
            );
        } catch (\Throwable $e) {
            error_log('Google OAuth: ' . $e->getMessage());
            Response::error('Google sign-in could not be completed', 401);
        }

        $user = Db::one(
            'SELECT id, is_active, deleted_at FROM users WHERE email=? LIMIT 1',
            [$identity['email']]
        );
        if ($user && ($user['deleted_at'] !== null || (int) $user['is_active'] !== 1)) {
            Response::error('This account is unavailable', 403);
        }

        if (!$user) {
            $userId = uuid();
            // Google accounts do not have a local password. Store an unguessable hash so
            // the existing schema remains compatible and password sign-in stays disabled.
            $unusablePassword = password_hash(bin2hex(random_bytes(32)), PASSWORD_BCRYPT, ['cost' => 12]);
            Db::q(
                'INSERT INTO users (id, email, password_hash, full_name, avatar_url, plan, email_verified_at)
                 VALUES (?, ?, ?, ?, ?, "free", NOW())',
                [$userId, $identity['email'], $unusablePassword, $identity['name'], $identity['picture']]
            );
            Db::q('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, "user")', [uuid(), $userId]);
        } else {
            $userId = $user['id'];
            Db::q(
                'UPDATE users SET email_verified_at=COALESCE(email_verified_at, NOW()) WHERE id=?',
                [$userId]
            );
        }

        Db::q(
            'INSERT INTO login_attempts (email, user_id, ip_address, user_agent, success, failure_reason)
             VALUES (?, ?, ?, ?, 1, NULL)',
            [$identity['email'], $userId, $req->ip(), $req->ua()]
        );
        Response::json($this->issueSession($userId, $req));
    }

    // POST /api/auth/logout  (auth)
    public function logout(Request $req): void
    {
        $token = $req->bearer();
        if ($token) Db::q('UPDATE auth_sessions SET revoked_at=NOW() WHERE token_hash=?', [hashToken($token)]);
        Response::json(['ok' => true]);
    }

    // POST /api/auth/forgot-password  { email }
    public function forgotPassword(Request $req): void
    {
        required($req->body, ['email']);
        $email = strtolower(trim((string) $req->body['email']));
        $user = Db::one('SELECT id FROM users WHERE email=? AND deleted_at IS NULL LIMIT 1', [$email]);
        if ($user) {
            $raw = bin2hex(random_bytes(32));
            Db::q(
                'INSERT INTO password_resets (id, user_id, token_hash, expires_at, requested_ip, requested_user_agent)
                 VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE), ?, ?)',
                [uuid(), $user['id'], hashToken($raw), $req->ip(), $req->ua()]
            );
            $origin = \App\Core\Env::get('FRONTEND_ORIGIN', '');
            $link   = rtrim($origin, '/') . '/reset-password?token=' . $raw;
            MailService::sendPasswordReset($email, $link);
        }
        Response::json(['ok' => true]); // always ok — don't leak existence
    }

    // POST /api/auth/reset-password  { token, password }
    public function resetPassword(Request $req): void
    {
        required($req->body, ['token', 'password']);
        $token = (string) $req->body['token'];
        $pass  = (string) $req->body['password'];
        if (strlen($pass) < 8) Response::error('Password too short', 422);

        $pr = Db::one(
            'SELECT id, user_id FROM password_resets
             WHERE token_hash=? AND consumed_at IS NULL AND expires_at > NOW() LIMIT 1',
            [hashToken($token)]
        );
        if (!$pr) Response::error('Invalid or expired token', 400);

        Db::q('UPDATE users SET password_hash=? WHERE id=?', [password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]), $pr['user_id']]);
        Db::q('UPDATE password_resets SET consumed_at=NOW() WHERE id=?', [$pr['id']]);
        Db::q('UPDATE auth_sessions SET revoked_at=NOW() WHERE user_id=? AND revoked_at IS NULL', [$pr['user_id']]);
        Response::json(['ok' => true]);
    }

    // GET /api/me  (auth)
    public function me(Request $req): void
    {
        Response::json(['user' => $this->userDto($req->user['id'])]);
    }

    // PATCH /api/me  (auth)  { full_name?, avatar_url? }
    public function updateMe(Request $req): void
    {
        $fields = [];
        $vals   = [];
        if (isset($req->body['full_name'])) { $fields[] = 'full_name=?';  $vals[] = trim((string) $req->body['full_name']); }
        if (array_key_exists('avatar_url', $req->body)) {
            if ($req->body['avatar_url'] !== null && $req->body['avatar_url'] !== '') {
                Response::error('Use the avatar upload endpoint for images', 422);
            }
            $fields[] = 'avatar_url=?';
            $vals[] = null;
        }
        if (!$fields) Response::json(['user' => $this->userDto($req->user['id'])]);
        $vals[] = $req->user['id'];
        Db::q('UPDATE users SET ' . implode(',', $fields) . ' WHERE id=?', $vals);
        Response::json(['user' => $this->userDto($req->user['id'])]);
    }

    // POST /api/me/avatar  (auth, multipart/form-data with `avatar` file)
    public function uploadAvatar(Request $req): void
    {
        $file = $_FILES['avatar'] ?? null;
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            Response::error('Select an image to upload', 422);
        }
        if ((int) $file['size'] > 1024 * 1024) {
            Response::error('Image too large — keep it under 1 MB', 422);
        }

        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file((string) $file['tmp_name']);
        $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!isset($extensions[$mime])) {
            Response::error('Upload a JPG, PNG, or WebP image', 422);
        }

        $directory = __DIR__ . '/../../public/uploads/avatars';
        if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
            throw new \RuntimeException('Avatar storage is unavailable');
        }
        $filename = $req->user['id'] . '-' . bin2hex(random_bytes(8)) . '.' . $extensions[$mime];
        $target = $directory . '/' . $filename;
        if (!move_uploaded_file((string) $file['tmp_name'], $target)) {
            throw new \RuntimeException('Avatar upload failed');
        }

        $old = (string) ($req->user['avatar_url'] ?? '');
        if (str_contains($old, '/uploads/avatars/')) {
            $oldPath = $directory . '/' . basename(parse_url($old, PHP_URL_PATH) ?: '');
            if (is_file($oldPath)) @unlink($oldPath);
        }
        $origin = rtrim(\App\Core\Env::get('API_PUBLIC_ORIGIN', '') ?: '', '/');
        if ($origin === '') {
            $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
            $origin = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
        }
        $url = $origin . '/uploads/avatars/' . $filename;
        Db::q('UPDATE users SET avatar_url=? WHERE id=?', [$url, $req->user['id']]);
        Response::json(['user' => $this->userDto($req->user['id'])]);
    }

    private function userDto(string $id): array
    {
        $u = Db::one(
            'SELECT id, email, full_name, avatar_url, plan, email_verified_at, created_at
               FROM users WHERE id=? LIMIT 1',
            [$id]
        );
        $roles = Db::all('SELECT role FROM user_roles WHERE user_id=?', [$id]);
        $u['roles'] = array_column($roles, 'role');
        return $u;
    }

    private function issueSession(string $userId, Request $req): array
    {
        $token = Jwt::issue(['sub' => $userId]);
        Db::q(
            'INSERT INTO auth_sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
             VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))',
            [uuid(), $userId, hashToken($token), $req->ip(), $req->ua()]
        );
        Db::q('UPDATE users SET last_login_at=NOW() WHERE id=?', [$userId]);
        return ['token' => $token, 'user' => $this->userDto($userId)];
    }
}
