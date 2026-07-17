# Web, API, Database, and File Storage Audit

## Scope

Audit date: 2026-07-16

Reviewed components:

- React/TanStack Start web client
- PHP REST API in `backend/`
- Local MySQL schema and data consistency indicators
- Avatar upload storage under `backend/public/uploads/avatars/`
- VirusTotal, Google OAuth, SMTP, and Razorpay integration boundaries

No mobile client was found or assumed. The API observations apply to any future mobile client, browser extension, or other client using the same HTTP endpoints.

## Verification summary

| Area | Result | Evidence |
|---|---|---|
| Avatar upload persists the new URL | Pass | `POST /api/me/avatar` stores the generated path in `users.avatar_url`, then returns a fresh `userDto()` query. |
| Profile update returns the newest user object | Pass | `PATCH /api/me` updates the row and immediately calls `userDto()` rather than returning request data. |
| Login returns a current user object | Pass | `issueSession()` creates the session, updates `last_login_at`, and returns a fresh `userDto()`. |
| Local static avatar serving | Pass after remediation | A real uploaded JPG returned HTTP 200 with `Content-Type: image/jpeg`. |
| Stored local-avatar integrity | Needs remediation | 2 local avatar references were found; 1 referenced a file that is not present in storage. |
| Global URL lookup indexing | Pass | `url_analyses.normalized_url_hash` has a unique index and lookup index; `scans` has user/global/normalized lookup indexes. |
| Notification indexing | Pass | `notifications` has user/time, unread, dismissed, and scan indexes. |
| Consistent API response contract | Needs remediation | Success payloads currently use several incompatible envelope shapes. |
| Explicit image cache policy | Needs remediation | The tested avatar response did not contain `Cache-Control`, `ETag`, or `Last-Modified`. |
| Database as the only source of truth | Partially passes | User/profile data is API/database-backed, but some scan-result and activity UI data is persisted in browser local storage. |

## Current architecture

```text
Web client
  |  JSON + Bearer token
  v
PHP API controllers
  |---- PDO prepared statements ----> MySQL
  |
  `---- move_uploaded_file() --------> public/uploads/avatars/
                                           |
                                           `--> stored URL in users.avatar_url
```

The authenticated profile flow is database-backed:

```text
PATCH /api/me or POST /api/me/avatar
             |
             v
       UPDATE users
             |
             v
       fresh SELECT via userDto()
             |
             v
       { "user": { ...latest database values... } }
```

## Findings

### A-01: API success envelopes are inconsistent

Severity: Medium

The API has no single success-envelope convention. Examples observed in the controllers:

| Endpoint family | Current success shape |
|---|---|
| `/api/health` | `{ "ok": true, ... }` |
| simple auth/notification/payment mutations | `{ "ok": true, ... }` |
| `/api/me`, profile update, avatar upload | `{ "user": { ... } }` |
| sign-in and Google callback | `{ "token": "...", "user": { ... } }` |
| URL lookup | `{ "success": true, "exists": ..., "data": ... }` |
| scans | `{ "scans": [...], "total": ..., "limit": ..., "offset": ... }` |
| errors | `{ "error": "..." }` |

This is usable by the current web client, but a mobile client or extension must implement endpoint-specific parsing. It does not meet a cross-client consistent-contract goal.

Recommended future contract (not implemented by this audit):

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Use a parallel error envelope such as `{ "success": false, "error": { "code": "...", "message": "..." } }`, with pagination in `meta`.

### A-02: Avatar file and database write are not atomic

Severity: High

`uploadAvatar()` writes a file first, deletes the previous local file, and then updates `users.avatar_url`. The file system and MySQL update are not coordinated in a transaction/compensation workflow.

Failure modes:

- A database failure after upload leaves an orphaned new file.
- A database failure after deletion of the old file leaves the old database URL pointing to a missing file.
- A manual file deletion can leave a valid database URL with no corresponding asset.

Evidence from the local audit: one of two local avatar database references had no matching file in `uploads/avatars`.

### A-03: Image caching is implicit rather than controlled

Severity: Medium

The tested static avatar response contained `Content-Type: image/jpeg` but did not include `Cache-Control`, `ETag`, or `Last-Modified`. Browser caching behavior is therefore server/default dependent.

The upload naming strategy is good for cache invalidation: each new avatar gets a random filename. Production should still set an explicit immutable cache policy for these versioned files, for example `Cache-Control: public, max-age=31536000, immutable`.

### A-04: Legacy/relative avatar URLs require client normalization

Severity: Medium

The audit found both absolute local URLs and a legacy relative `/uploads/avatars/...` URL in `users.avatar_url`. A relative URL would otherwise resolve against the web origin (`localhost:3000`) instead of the API origin.

The web client now normalizes relative and legacy local upload URLs through its configured API base. This protects the current web client, but URL storage should eventually use one canonical representation so all clients behave identically without client-specific repair logic.

### A-05: Database is not the only persistence layer for all client state

Severity: Low

Profile and server-backed scan data are fetched from the API. However, `dashboard-store.ts` stores scan-result cache and activity-related UI data in browser local storage. This can be useful for responsiveness, but it means the database is not the sole persistence layer for all displayed state.

For cross-client consistency, local storage should be treated strictly as an expiring cache; server data should remain authoritative after mutation, login, and reconnect.

## Changes already made

The following remediation changes were made during the avatar investigation. They were source/runtime fixes; no avatar data was changed during this audit.

1. `backend/public/index.php` now lets PHP's built-in local server serve existing files under `backend/public` directly. Previously it routed avatar requests through the API router, producing failures instead of image bytes.
2. `resolveApiAssetUrl()` was added to the web API utility. It resolves relative upload paths through `VITE_API_BASE_URL` and redirects legacy localhost upload paths to the active local API port.
3. The profile avatar and top navigation avatar now render the stored URL and fall back to initials if loading fails.
4. Google OAuth no longer overwrites an existing user's `avatar_url`. Email/password and Google sign-in now retain the same database-owned avatar setting.
5. Local development configuration was aligned so the web app uses API port 8001 and generated upload URLs use that same API origin.

## Security and data-handling observations

- Avatar uploads require authenticated and verified users.
- Uploads are limited to 1 MB and server MIME detection allows JPEG, PNG, and WebP.
- Generated filenames use the authenticated user ID plus random bytes; client-supplied filenames are not used.
- The Apache configuration disables directory indexes and routes only non-files/non-directories to the PHP front controller.
- Database access goes through PDO prepared statements in `Db::q()`, `Db::one()`, and `Db::all()`.
- API errors use a generic `error` message rather than raw SQL details.

Remaining storage hardening work includes image decoding/re-encoding, transaction/rollback or durable cleanup for avatar file writes, and scheduled detection/removal of orphaned files and broken database references.

## Test evidence

| Test | Result |
|---|---|
| `php -l backend/public/index.php` | Passed |
| `php -l backend/src/Controllers/AuthController.php` | Passed |
| `npm run build` | Passed |
| Local API health endpoint | HTTP 200 |
| Uploaded JPG at `/uploads/avatars/...` | HTTP 200, `image/jpeg` |
| MySQL indexes for global lookup, scans, notifications | Present |

## Prioritized next steps

1. Define and migrate to one versioned API response contract across every endpoint.
2. Make avatar persistence recoverable: write the new file, update the row safely, then delete the old file only after database success; add a cleanup job for orphaned/broken records.
3. Add explicit cache headers for versioned avatar files in Apache/production storage.
4. Adopt one canonical avatar URL format, preferably an API-relative path in the database plus API-provided resolved URL in responses.
5. Add contract and integration tests for signup/login, profile update, avatar upload, a missing avatar file, and Google/email identity parity.
6. Treat browser local storage as a cache with invalidation/versioning, not authoritative application data.
