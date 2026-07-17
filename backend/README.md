# URL Defender — PHP Backend (Hostinger)

Zero-dependency PHP 8.1+ backend. No Composer, no vendor folder. Just upload.

## 📤 Deploy to Hostinger

### 1. Upload files

In **hPanel → File Manager**:

```
public_html/
├── api/                 ← upload the contents of backend/public/ HERE
│   ├── index.php
│   └── .htaccess
├── src/                 ← upload backend/src/
├── storage/             ← upload backend/storage/ (must be writable, chmod 755)
├── .env                 ← create this from .env.example
└── .htaccess            ← upload backend/.htaccess
```

**Simpler layout** (recommended): put the whole `backend/` folder OUTSIDE `public_html`, then point a subdomain like `api.yourdomain.com` to `backend/public/`. This keeps `src/` and `.env` unreachable from the web.

### 2. Create `.env`

Copy `.env.example` → `.env` and fill in:

- **DB creds** from hPanel → Databases → MySQL Databases (username is `uXXXXXX_...`)
- **JWT_SECRET**: run `openssl rand -hex 32` locally, paste result
- **APP_PEPPER**: same as above (different value)
- Leave `VIRUSTOTAL_API_KEY`, `RAZORPAY_*`, `SMTP_*` empty — add them later

### 3. PHP version

In hPanel → **Select PHP Version**, choose **PHP 8.1 or 8.2**. Enable extensions: `pdo_mysql`, `curl`, `openssl`, `json`, `mbstring`.

### 4. Verify

Visit: `https://yourdomain.com/api/health`

Expected response:
```json
{ "ok": true, "time": "...", "virustotal": false, "razorpay": false, "smtp": false }
```

The `false` flags mean those keys aren't set yet — the rest of the API still works.

## 🔑 Adding keys later

Edit `.env`, save. **No restart needed** — PHP re-reads it on every request.

- **VirusTotal**: sign up at https://virustotal.com/gui/join-us → Profile → API Key
- **Razorpay**: dashboard.razorpay.com → Settings → API Keys (use Test Mode first)
- **SMTP**: Hostinger email account, or SendGrid/Brevo/Gmail app-password

While SMTP is empty, OTP codes are written to `storage/logs/otp.log` so you can test the full signup flow immediately.

## 📡 API Endpoints

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | `/api/health` | — | — |
| POST | `/api/auth/signup` | — | `{ email, password, full_name }` |
| POST | `/api/auth/verify-email` | — | `{ email, code }` |
| POST | `/api/auth/resend-otp` | — | `{ email }` |
| POST | `/api/auth/login` | — | `{ email, password }` |
| POST | `/api/auth/logout` | ✔ | — |
| POST | `/api/auth/forgot-password` | — | `{ email }` |
| POST | `/api/auth/reset-password` | — | `{ token, password }` |
| POST | `/api/auth/google/callback` | — | `{ code, code_verifier }` |
| GET | `/api/me` | ✔ | — |
| PATCH | `/api/me` | ✔ | `{ full_name?, avatar_url? }` |
| POST | `/api/scans` | ✔ | `{ url }` |
| GET | `/api/scans` | ✔ | `?limit&offset&verdict` |
| GET | `/api/scans/{id}` | ✔ | — |
| GET | `/api/notifications` | ✔ | — |
| POST | `/api/notifications/read-all` | ✔ | — |
| POST | `/api/notifications/{id}/read` | ✔ | — |
| POST | `/api/notifications/clear` | ✔ | — |
| POST | `/api/payments/order` | ✔ | `{ plan }` |
| POST | `/api/payments/verify` | ✔ | Razorpay checkout response |
| POST | `/api/webhooks/razorpay` | signature | Razorpay event |

Auth = `Authorization: Bearer <jwt>` header.

## Google sign-in

Create a **Web application** OAuth client in Google Cloud. For local development, add these exact values to the client:

| Setting | Value |
|---|---|
| Authorized JavaScript origin | `http://localhost:3000` |
| Authorized redirect URI | `http://localhost:3000/auth/google/callback` |

Copy the client ID, client secret, and redirect URI into `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in `backend/.env`. Add the client ID, redirect URI, and `VITE_API_BASE_URL` to the frontend `.env`. The client secret must never be placed in the frontend environment file.

## 🔒 Security notes

- Passwords: bcrypt cost 12
- OTPs & reset tokens: HMAC-SHA256 with `APP_PEPPER`, never stored raw
- JWT: HS256, stored session-hash in `auth_sessions` so logout truly revokes
- Login attempts logged to `login_attempts` for future rate-limiting
- Soft delete on users via `deleted_at`
- Webhook signature required for `/api/webhooks/razorpay`

## 🧪 Quick test with curl

```bash
BASE=https://yourdomain.com

# Signup
curl -X POST $BASE/api/auth/signup -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"password123","full_name":"You"}'

# Check storage/logs/otp.log for the 6-digit code, then:
curl -X POST $BASE/api/auth/verify-email -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","code":"123456"}'

# Login → returns { token, user }
curl -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"password123"}'
```
