# URL Defender — System Architecture & Setup Documentation

## Overview
This document outlines the architecture, component interaction, database schema, and deployment rules for the URL Defender application.

---

## Architecture Diagram

```text
[ React + Vite Client ]  ---> HTTP / JSON (CORS) --->  [ PHP 8+ REST API ]
  (Port 3000 / Vercel)                                   (Port 8001 / Hostinger)
                                                                 |
                                              +------------------+------------------+
                                              |                                     |
                                      [ MySQL Database ]                   [ External APIs ]
                                      (url_defender DB)                    - VirusTotal API v3
                                      - users                              - Gmail SMTP (Mail)
                                      - scans                              - Google OAuth
                                      - url_analyses                       - Razorpay
                                      - scan_engines
                                      - scan_results
```

---

## API Endpoints Reference

### Public / Health
- `GET /api/health` -> System health & database connection status

### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/signup` -> Register new user with email & password
- `POST /api/v1/auth/login` -> User login with JWT token issuance
- `POST /api/v1/auth/verify-email/send-otp` -> Send 6-digit OTP email
- `POST /api/v1/auth/verify-email/verify-otp` -> Confirm 6-digit OTP
- `POST /api/v1/auth/forgot-password` -> Request password reset link
- `POST /api/v1/auth/reset-password` -> Reset user password
- `POST /api/v1/auth/google` -> Google OAuth sign-in & token generation

### URL Scanning & Threat Intelligence (`/api/v1`)
- `GET /api/v1/url/lookup?url=...` -> Instant threat lookup & privacy classification
- `POST /api/v1/scans` -> Submit new URL for real-time VirusTotal analysis
- `GET /api/v1/scans` -> List current user's scan history
- `GET /api/v1/scans/{id}` -> Fetch full scan report (personal or global analysis)

---

## Database Schemas & Migrations

### Core Tables:
1. `users`: User profiles, credentials, verification state.
2. `scans`: User-specific scan submissions linked to global threat entries.
3. `url_analyses`: Shared, anonymous threat intelligence cache for instant lookups.
4. `scan_results`: Full raw JSON payloads from VirusTotal.
5. `scan_engines`: 12+ security engine detection breakdown rows.

---

## Privacy Principles
1. **User Isolation**: User-specific timestamps, scan histories, and profile metadata are only exposed to the authenticated owner.
2. **Anonymous Intelligence**: Shared threat intelligence entries (`url_analyses`) sanitize user details to ensure privacy compliance.
