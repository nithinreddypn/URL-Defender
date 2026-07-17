# URL Defender QA and Security Test Suite

## Scope and execution rules

Observed implementation: React/TanStack Start frontend, PHP REST API, MySQL, JWT, SMTP OTP/reset email, VirusTotal, and shared `url_analyses` cache. No Flutter source or browser-extension package is present in this repository; those cases are marked **conditional** and must be executed when those clients are supplied.

Use isolated test accounts, a non-production VirusTotal key, and synthetic URLs. Never submit private, malicious, or customer URLs during test execution. Record the measured **Actual Result** and set **Status** to Pass, Fail, Blocked, or Not Run.

Priority: P0 critical path, P1 high, P2 medium. Severity: Critical, High, Medium, Low.

## Functional test cases

| ID | Module | Scenario / Preconditions | Steps | Expected result | Actual result | Status | Priority | Severity |
|---|---|---|---|---|---|---|---|---|
| F-AUTH-001 | Registration | New valid email; SMTP configured | Submit name, email, strong password, terms | Account is created; server creates hashed OTP; email is sent; no JWT is issued | Not Run | Not Run | P0 | High |
| F-AUTH-002 | Registration | Existing active email | Submit same email | Generic duplicate-account handling; no duplicate user/role/OTP row | Not Run | Not Run | P1 | Medium |
| F-AUTH-003 | Registration | Invalid inputs | Test malformed email, short name, weak/short password, omitted terms | Field errors; no account or email created | Not Run | Not Run | P1 | Medium |
| F-AUTH-004 | Email verification | Newly registered account and received OTP | Enter correct six-digit OTP | OTP is consumed, `email_verified_at` is set, success alert is shown, sign-in becomes available | Not Run | Not Run | P0 | High |
| F-AUTH-005 | Email verification | Unverified account | Enter wrong OTP five times | Clear error, attempts increment, sixth request is rate-limited; account remains unverified | Not Run | Not Run | P0 | High |
| F-AUTH-006 | Email verification | Expired OTP | Wait >10 minutes, submit code | Expired-code error; no verification; resend flow can issue a fresh code | Not Run | Not Run | P1 | Medium |
| F-AUTH-007 | OTP resend | Unverified account | Request resend after client cooldown | New OTP email is sent, old OTP cannot verify, UI resets expiry/cooldown | Not Run | Not Run | P1 | Medium |
| F-AUTH-008 | Login | Verified, active password account | Submit correct credentials | JWT/session issued; user reaches dashboard | Not Run | Not Run | P0 | High |
| F-AUTH-009 | Login | Unverified valid password account | Submit valid credentials | 403/verification prompt; no token and no protected access | Not Run | Not Run | P0 | High |
| F-AUTH-010 | Login | Invalid credential | Submit invalid password and unknown email | Same safe error response; failed attempt logged; no user enumeration | Not Run | Not Run | P0 | High |
| F-AUTH-011 | Forgot password | Existing and non-existing emails | Request reset for both | Same generic acknowledgement; only existing account receives link | Not Run | Not Run | P0 | High |
| F-AUTH-012 | Reset password | Valid reset token | Set a strong matching password | Password hash changes, token is consumed, active sessions are revoked, login works with new password | Not Run | Not Run | P0 | High |
| F-AUTH-013 | Reset password | Expired/used/malformed token | Submit new password | Safe invalid-link error; no password/session change | Not Run | Not Run | P0 | High |
| F-AUTH-014 | Google OAuth | Google client configured; allowed user | Complete OAuth + PKCE callback | Token exchange succeeds; verified user/session created or reused; profile matches verified Google claims | Not Run | Not Run | P0 | High |
| F-AUTH-015 | Logout | Authenticated user | Logout then call `/api/me` with old token | Session revoked; token fails; frontend clears state and returns to login | Not Run | Not Run | P1 | High |
| F-PRO-001 | Profile | Authenticated user | Change display name and save | Backend user record and user menu/profile refresh with new value | Not Run | Not Run | P1 | Medium |
| F-PRO-002 | Avatar upload | Authenticated user; JPG/PNG/WebP <=1 MB | Upload each allowed type | File stored server-side; DB stores URL only; avatar renders | Not Run | Not Run | P1 | Medium |
| F-PRO-003 | Avatar validation | Authenticated user | Upload >1 MB, SVG, executable renamed as image | Clean 422 error; no file/DB update | Not Run | Not Run | P0 | High |
| F-URL-001 | URL validation | Scan form | Try blank, malformed, non-http(s), whitespace host, >2048 chars | Client and API reject invalid URL; no VT call/history write | Not Run | Not Run | P0 | High |
| F-URL-002 | Normalization | Variants of `Google.com/` | Enter `https://Google.com/`, `http://google.com`, `google.com/` | Same normalized lookup key: `google.com` | Not Run | Not Run | P0 | Medium |
| F-LOOK-001 | Instant lookup | Valid URL present only in global cache | Pause typing 400 ms | One database-only request; status-colored Existing Analysis card; no VT request; no global user activity shown | Not Run | Not Run | P0 | High |
| F-LOOK-002 | Instant lookup | Valid URL absent from cache | Pause typing | Shows “No analysis available yet”; Scan remains enabled; VT is not called automatically | Not Run | Not Run | P0 | High |
| F-LOOK-003 | Lookup performance | Valid URL typed rapidly | Type/edit continuously then stop | Earlier requests are aborted; only final normalized URL is queried; client cache prevents repeat query | Not Run | Not Run | P1 | Medium |
| F-LOOK-004 | Existing analysis privacy | Global-only URL | Inspect card/API response | URL threat facts only; no another-user timestamp/name/ID/history/count | Not Run | Not Run | P0 | Critical |
| F-LOOK-005 | Personal history label | Current user previously scanned cached URL | Look up URL | Shows “Already in your scan history” and only that user’s own scan date/time | Not Run | Not Run | P1 | Medium |
| F-SCAN-001 | New scan | Cache miss; valid URL; quota available | Click Scan Now | Backend calls VT once, persists global analysis and personal history, returns report | Not Run | Not Run | P0 | High |
| F-SCAN-002 | Cached scan | Cache hit; direct POST/controlled UI action | Start scan | No VT call; creates only a personal history reference/cached report; returns immediately | Not Run | Not Run | P0 | High |
| F-SCAN-003 | VirusTotal failure | Stub timeout/429/5xx | Submit new valid URL | Generic safe error; no stack trace; pending history is handled consistently; retry is possible | Not Run | Not Run | P0 | High |
| F-SCAN-004 | Quota | Free account at monthly limit | Submit cache miss then cache hit | Cache miss blocked with upgrade message; cache-hit behavior matches product policy and is documented | Not Run | Not Run | P1 | Medium |
| F-SCAN-005 | Report presentation | Safe/suspicious/dangerous/unknown records | Open each report | Matching green/amber/red/gray card, correct icon, URL threat fields, privacy-safe source/history labels | Not Run | Not Run | P1 | Medium |
| F-HIST-001 | Scan history | User A and User B have scans | Load history for each account | Each account sees only its own rows, filters, details, and alerts | Not Run | Not Run | P0 | Critical |
| F-HIST-002 | Search/filter history | History contains all verdicts/dates | Search URL, filter verdict/risk/date, paginate | Correct subset/count/page; clear filters restores list | Not Run | Not Run | P1 | Medium |
| F-NOTI-001 | Notifications | Create suspicious/dangerous scan | Open notifications, mark read, clear | Threat notification created for owner only; read/clear state persists | Not Run | Not Run | P1 | Medium |
| F-SET-001 | Settings | Authenticated user | Change notification/preferences and reload | Saved settings persist; no unrelated account data changes | Not Run | Not Run | P2 | Low |
| F-UI-001 | Dark mode | Any page | Toggle theme, reload, navigate | Theme persists; contrast and icons remain readable | Not Run | Not Run | P2 | Low |
| F-EXT-001 | Browser extension (conditional) | Extension package/build available | Install, authenticate, scan active tab | Uses authenticated API, honors cache/privacy, handles expired session safely | Not Run | Not Run | P1 | High |
| F-FLT-001 | Flutter client (conditional) | Flutter build/API environment available | Repeat auth, lookup, scan, history, logout smoke path | Same API contract and privacy behavior as web | Not Run | Not Run | P0 | High |

## Non-functional test cases

| ID | Category | Scenario / workload | Expected acceptance criteria | Actual result | Status | Priority | Severity |
|---|---|---|---|---|---|---|---|
| NF-PERF-001 | Performance | Indexed global lookup, warm DB | Backend p95 <100 ms; no external request; query plan uses global lookup index | Not Run | Not Run | P0 | High |
| NF-PERF-002 | Performance | Login with normal DB/network | API p95 <500 ms excluding client rendering | Not Run | Not Run | P1 | Medium |
| NF-PERF-003 | Performance | Cache-hit scan creation | API p95 <250 ms; no VT outbound call | Not Run | Not Run | P0 | High |
| NF-PERF-004 | Performance | Cache-miss VT scan | Measure p50/p95 separately; UI remains responsive; timeout is bounded | Not Run | Not Run | P0 | High |
| NF-PERF-005 | Performance | 10k/100k personal-history records | Search/filter p95 <500 ms with pagination/indexes | Not Run | Not Run | P1 | Medium |
| NF-LOAD-001 | Load | 100 concurrent authenticated users: 70% lookup, 20% history, 10% scan | Error rate <1%; p95 targets remain met; no data crossover | Not Run | Not Run | P0 | High |
| NF-LOAD-002 | Load | 500 concurrent users | Measure saturation, DB connections, CPU/memory, VT queue/rate-limit handling | Not Run | Not Run | P0 | High |
| NF-LOAD-003 | Load | 1,000 concurrent users | System degrades safely with 429/503 rather than data loss or 5xx leaks | Not Run | Not Run | P0 | Critical |
| NF-STRESS-001 | Stress | Sustained lookup/API maximum for 30–60 min | No memory leak; connection pool recovers; logs remain bounded | Not Run | Not Run | P1 | High |
| NF-STRESS-002 | Stress | Continuous cache-miss scans with VT rate limit simulated | Backoff/clear errors; no duplicate global records; no exhausted worker pool | Not Run | Not Run | P0 | High |
| NF-REL-001 | Reliability | Interrupt client network during lookup/scan | Request cancels/retries safely; no misleading success or duplicate history | Not Run | Not Run | P1 | Medium |
| NF-REL-002 | Reliability | Restart PHP server during requests | Graceful failures; later requests recover; JWT/session behavior correct | Not Run | Not Run | P1 | High |
| NF-REL-003 | Reliability | Restart/unavailable MySQL | Generic DB error only; no credentials/SQL; recovery without corrupt rows | Not Run | Not Run | P0 | Critical |
| NF-REC-001 | Recovery | VT, SMTP, DB, API outages | User-safe message; error logged server-side; retry/recovery path works | Not Run | Not Run | P0 | High |
| NF-UX-001 | Usability | Keyboard-only and screen-reader flows | Visible focus, labels, useful errors, no inaccessible color-only status | Not Run | Not Run | P1 | Medium |
| NF-COMP-001 | Compatibility | Chrome, Edge, Firefox, Safari latest two versions | Core auth, lookup, scan, upload and report work | Not Run | Not Run | P1 | Medium |
| NF-COMP-002 | Mobile/Flutter conditional | Android API 26–latest; phone/tablet sizes | Layout, keyboard, deep links, network recovery work | Not Run | Not Run | P1 | Medium |

## Penetration-test checklist

### Authentication and session

- [ ] Brute force: high-rate login attempts, distributed IPs, account lock/rate-limit verification.
- [ ] Credential stuffing with known-bad account/password pairs; confirm generic errors and audit records.
- [ ] Password guessing: weak/common/Unicode passwords, reset-token replay, OTP brute force and resend abuse.
- [ ] JWT manipulation: altered signature, `alg=none`, expired token, changed `sub`, malformed base64, missing bearer prefix.
- [ ] Session tests: revoked/logout token reuse, password-reset session revocation, concurrent sessions, token storage/XSS exposure.

### Authorization and IDOR

- [ ] Replace scan/history/notification IDs from User A with User B IDs in every GET/PATCH/POST path.
- [ ] Attempt profile/avatar update and logout with another user token.
- [ ] Attempt access to global analyses with an unverified user or no JWT.
- [ ] Try role/admin claim injection; confirm server loads role from DB, not client/JWT claims.
- [ ] Confirm shared cache responses never include personal `scan_history`, users, sessions, IPs, or private timestamps.

### API and input attacks

- [ ] Missing, invalid, expired JWT; wrong HTTP method; content-type tampering; oversized body.
- [ ] SQLi payloads in email, URL, scan ID, filter, pagination, avatar metadata: `' OR 1=1 --`, time-based payloads, encoded variants.
- [ ] Reflected/stored XSS payloads in name, URL, headers, search and notification fields.
- [ ] Command/path injection in URL, upload filename and redirect values.
- [ ] Parameter tampering/mass assignment: `plan`, `roles`, `email_verified_at`, `user_id`, `is_active`, `global_analysis_id`.
- [ ] CORS origin/preflight tests; ensure only configured frontend origins/headers/methods are accepted.

### URL scanner and upload attacks

- [ ] URLs over limit, malformed/encoded/unicode/punycode URLs, mixed-case schemes, fragments/query strings.
- [ ] Redirect loops, private IP/localhost/metadata endpoints, open redirects, obfuscated phishing forms.
- [ ] SSRF review: VT submits the URL; verify backend does not fetch untrusted URLs directly unless guarded.
- [ ] Upload polyglots, double extensions, spoofed MIME, SVG/HTML/script payloads, oversized/truncated files, traversal filenames.

### Network and infrastructure

- [ ] HTTPS-only production redirect, HSTS, certificate hostname/expiry validation, TLS downgrade/MITM simulation.
- [ ] Security headers: CSP, X-Content-Type-Options, frame protection, Referrer-Policy, Permissions-Policy.
- [ ] Confirm `.env`, API keys, SMTP credentials, reset tokens, OTPs and SQL details never appear in frontend bundles/logs/responses.

## Security validation checklist

- [ ] Passwords use bcrypt/Argon2 with an appropriate cost; no plaintext/weak hashes.
- [ ] OTP/reset tokens are random, hashed at rest, single-use, expiry-bound, and rate-limited.
- [ ] JWT signatures, expiry, audience/issuer policy (if used), and server-side session revocation are enforced.
- [ ] Every protected API route has authentication and verified-email authorization where required.
- [ ] Per-user history/profile/notifications use owner checks; IDOR tests pass.
- [ ] `url_analyses` is anonymous and unique per normalized URL; shared responses omit user data.
- [ ] PDO prepared statements are used for dynamic values; no SQL error is returned to clients.
- [ ] URL, upload, JSON, pagination and filter validation is server-side.
- [ ] Contextual output encoding and React escaping prevent XSS; dangerous URLs are not unsafely rendered.
- [ ] Error responses are generic; detailed errors go only to restricted logs in debug mode.
- [ ] Logs are access-controlled, redacted, retained appropriately, and monitored for auth/VT anomalies.

## API, database, and client checklists

### API

- [ ] Contract-test status, schema, content type, and error payload for every `/api/auth/*`, `/api/me`, `/api/url/lookup`, `/api/scans/*`, notification and payment endpoint.
- [ ] Test OPTIONS/CORS, JSON parse errors, duplicate requests, retry idempotency, pagination boundaries and response-size limits.
- [ ] Assert lookup never invokes VirusTotal; assert cache miss scan invokes it once only.

### Database

- [ ] Confirm normalized URL/hash and global-cache indexes with `EXPLAIN`.
- [ ] Confirm global normalized URL uniqueness and foreign-key/reference integrity for user history.
- [ ] Test concurrent inserts for the same normalized URL; exactly one global analysis must survive.
- [ ] Test migrations on empty, populated, and rollback-restored databases.
- [ ] Verify backups/restores, least-privilege DB account, encrypted transport, and no secrets in dumps.

### React web / Flutter conditional UI

- [ ] Unit-test normalizer, debouncer, request cancellation, API error mapping, validation and status-to-style mapping.
- [ ] E2E-test registration → verification → login → lookup → cached/new scan → history → logout.
- [ ] Test screen readers, 200% zoom, keyboard navigation, small screens, dark mode, offline/retry state.
- [ ] Flutter only: widget tests, integration tests, secure token storage, deep-link reset/OAuth callback, Android permission/network tests.
