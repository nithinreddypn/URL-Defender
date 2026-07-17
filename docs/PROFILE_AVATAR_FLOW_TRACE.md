# Profile and Avatar End-to-End Flow Trace

## Scope and method

Trace date: 2026-07-16.

This is a read-only implementation trace of the current React web client, PHP API, MySQL records, and local file storage. No code or database record was changed while producing this report. No mobile application was assumed or inspected.

## Lifecycle diagram

```text
Profile page file picker
        |
        | File object (browser memory)
        v
dashboard-store.uploadAvatar(file)
        |
        | POST /api/me/avatar
        | Authorization: Bearer <JWT>
        | multipart/form-data: avatar=<file>
        v
AuthMiddleware + RequireVerifiedEmail
        |
        v
AuthController::uploadAvatar()
        |
        | MIME/size validation, random filename
        v
backend/public/uploads/avatars/<user-id>-<random>.<ext>
        |
        | UPDATE users.avatar_url = <API public URL>
        v
MySQL users table
        |
        | fresh SELECT through userDto()
        v
{ "user": { id, email, full_name, avatar_url, ... } }
        |
        +--> browser dispatches url-defender:user-changed
        |        |
        |        `--> UserMenu fetches GET /api/me into its own React state
        |
        `--> ProfilePage refreshes GET /api/me, GET /api/scans, local activity
                 |
                 v
        ProfileHeader resolves avatar URL and renders <img>
                 |
                 v
Browser requests /uploads/avatars/<filename> from API origin
```

## Files involved

| Layer | File | Responsibility |
|---|---|---|
| Profile page | `src/routes/_app.profile.tsx` | Holds profile-page React state, exposes file picker, invokes upload/removal, refreshes data, and renders the large avatar. |
| Shared web data functions | `src/lib/dashboard-store.ts` | Wraps profile and avatar API calls; dispatches `url-defender:user-changed` after successful mutation. |
| HTTP client | `src/lib/api.ts` | Builds API-base URLs, attaches bearer JWTs, sends requests, fetches `/api/me`, and resolves API-hosted asset URLs. |
| Top navigation | `src/components/app/user-menu.tsx` | Maintains a separate user state for the navigation avatar; refreshes on mount and on the user-changed event. |
| API routes | `backend/public/index.php` | Registers `GET /api/me`, `PATCH /api/me`, and `POST /api/me/avatar`; permits static files when PHP's built-in local server is used. |
| Authentication | `backend/src/Middleware/AuthMiddleware.php` | Validates JWT/session/user and loads the authenticated user, including the current `avatar_url`. |
| Profile controller | `backend/src/Controllers/AuthController.php` | Implements profile read/update, avatar validation/storage, database write, and fresh user DTO response. |
| DB wrapper | `backend/src/Core/Db.php` | Uses PDO prepared statements for controller queries. |
| Config | `backend/.env` | Supplies `API_PUBLIC_ORIGIN`, used when creating the stored public avatar URL. |
| Production static routing | `backend/public/.htaccess` | Lets Apache serve actual files directly and sends non-files to the API front controller. |
| File storage | `backend/public/uploads/avatars/` | Stores generated JPEG, PNG, and WebP avatar files. |

## Sequence of execution

### 1. User chooses an avatar in the Profile page

File: `src/routes/_app.profile.tsx`

`ProfileHeader` contains a hidden `<input type="file" accept="image/*">`. The camera button calls `fileRef.current?.click()`. When the user selects a file, `onFile()` applies a browser-side size check of 1 MB and invokes `onAvatarChange(file)`.

`ProfilePage` supplies that callback as `updateAvatar(file, refresh)`.

Data at this point is only a browser `File` object. Nothing is yet written to MySQL or local storage.

### 2. The web client sends the multipart API request

Files: `src/routes/_app.profile.tsx`, `src/lib/dashboard-store.ts`, `src/lib/api.ts`

`updateAvatar()` calls `uploadAvatar(file)`. `dashboard-store.uploadAvatar()` creates `FormData`, appends the file as the `avatar` field, and calls:

```text
POST /api/me/avatar
Content-Type: multipart/form-data (set by the browser boundary)
Authorization: Bearer <JWT>
```

`apiRequest()` gets the JWT from browser local storage key `url-defender-token`, sets `Accept: application/json`, and prefixes the path with `VITE_API_BASE_URL`.

### 3. Route authentication and authorization

Files: `backend/public/index.php`, `backend/src/Middleware/AuthMiddleware.php`

The route is registered with both `AuthMiddleware` and `RequireVerifiedEmail`.

`AuthMiddleware` validates the bearer JWT, verifies its corresponding `auth_sessions` row is unrevoked and unexpired, and loads the active, non-deleted user from `users`. This loaded request user contains the pre-upload `avatar_url`. `RequireVerifiedEmail` then rejects unverified users.

### 4. API validation and file storage

File: `backend/src/Controllers/AuthController.php`, method `uploadAvatar()`

The controller:

1. Reads `$_FILES['avatar']` and requires successful PHP upload status.
2. Rejects files larger than 1 MB.
3. Uses `finfo(FILEINFO_MIME_TYPE)` and permits only `image/jpeg`, `image/png`, and `image/webp`.
4. Ensures `backend/public/uploads/avatars` exists with mode `0755`.
5. Builds a filename from authenticated user ID plus 8 random bytes, then the server-detected extension.
6. Calls `move_uploaded_file()` to save the file in that directory.
7. If the request user's old avatar URL points to `/uploads/avatars/`, tries to delete the old local file by basename.

The actual avatar bytes reside on disk. The database stores only the resulting URL string.

### 5. Database update and immediate API response

Files: `backend/src/Controllers/AuthController.php`, `backend/src/Core/Db.php`, `backend/config/database.php`

The controller builds an absolute URL:

```text
API_PUBLIC_ORIGIN + /uploads/avatars/ + generated filename
```

It runs a prepared statement equivalent to:

```sql
UPDATE users SET avatar_url = ? WHERE id = ?
```

It then calls `userDto(userId)`, which performs a fresh `SELECT` from `users` and a separate role query from `user_roles`. The response is:

```json
{
  "user": {
    "id": "...",
    "email": "...",
    "full_name": "...",
    "avatar_url": "...",
    "plan": "...",
    "email_verified_at": "...",
    "created_at": "...",
    "roles": []
  }
}
```

For a successful upload, the API response itself is not stale: it is built from a post-update database read.

### 6. Follow-up profile read (`GET /api/me`)

Files: `backend/public/index.php`, `backend/src/Controllers/AuthController.php`, `src/lib/dashboard-store.ts`, `src/lib/api.ts`

After the upload call resolves, the page shows the success toast and calls its `refresh()` function. `refresh()` performs these operations concurrently:

```text
GET /api/me
GET /api/scans
fetchActivity() from browser local storage
```

`GET /api/me` uses the same authenticated and verified route middleware. `AuthController::me()` returns `userDto()` again, so it queries the current `users.avatar_url` value rather than returning a cached request property.

### 7. Web UI render

Files: `src/routes/_app.profile.tsx`, `src/lib/api.ts`, `src/components/app/user-menu.tsx`

`ProfilePage` saves the response from `fetchCurrentUser()` in its local `user` React state. `ProfileHeader` calls `resolveApiAssetUrl(user.avatar_url)`:

- Relative `/uploads/...` values are prefixed with the configured API base URL.
- Legacy localhost upload URLs are redirected to the active local API origin.
- Third-party absolute URLs are preserved.

If an image URL exists and the image has not failed, the profile renders an `<img>` with `object-cover`. An image load failure switches the profile to initials. The top navigation follows the same URL resolution and fallback behavior, but owns a separate React state.

The browser then issues a normal image GET to the resolved API URL. In local PHP development, `backend/public/index.php` returns control to the built-in server for real public files. In Apache/Hostinger, `.htaccess` leaves real files untouched so the web server serves them directly.

## Database tables involved

| Table | Profile/avatar role |
|---|---|
| `users` | Canonical profile fields: ID, email, full name, plan, verification state, and `avatar_url`. This is the single database record updated for profile/avatar changes. |
| `auth_sessions` | Checked by middleware to ensure the bearer token session has not expired or been revoked. |
| `user_roles` | Queried by `userDto()` and included in the latest user response. |
| `login_attempts` | Not part of upload, but written during login/OAuth. |

There is no `avatars` table. Avatar file metadata, checksum, content type, creation time, and deletion state are not stored independently.

## API endpoints involved

| Endpoint | Method | Use in lifecycle | Current response shape |
|---|---|---|---|
| `/api/me/avatar` | POST | Receives multipart avatar file and persists the URL. | `{ "user": { ... } }` |
| `/api/me` | GET | Retrieves current profile after mutation and when pages mount. | `{ "user": { ... } }` |
| `/api/me` | PATCH | Updates full name or clears `avatar_url` when removal is requested. | `{ "user": { ... } }` |
| `/uploads/avatars/{file}` | GET | Returns the image bytes from public storage. | Image response, not JSON. |

## Caching and state management

### Server and database

- `Db` keeps one PDO connection per PHP process, not a cache of user rows.
- `userDto()` performs new SQL queries after profile update, avatar upload, and `GET /api/me`.
- PHP's local built-in server serves existing image files directly after the current router guard. Apache serves existing files directly through `.htaccess`.

### Browser client

- JWT is stored in local storage, but the profile object is not persisted there by these modules.
- `ProfilePage` holds `user`, `scans`, and `activity` in page-local React state.
- `UserMenu` holds an independent `user` React state.
- Successful `updateProfile()` and `uploadAvatar()` dispatch `url-defender:user-changed`; `UserMenu` listens for it and re-fetches `/api/me`.
- The page itself also calls `refresh()` after the mutation rather than using the mutation response directly.
- `fetchActivity()` uses browser local storage. It does not hold the avatar, but it participates in the page-wide `Promise.all` refresh.
- The browser may cache image GET responses. The current static avatar response has no explicit `Cache-Control`, `ETag`, or `Last-Modified` policy in the tested local environment. Unique randomized filenames reduce same-URL cache collision after a new upload.

## Potential synchronization issues and root-cause candidates

### 1. File-system and database write are not atomic

The controller moves the new file, deletes the old file, then updates MySQL. If the database update fails, the new file can be orphaned and the old database URL can point to a deleted file. Concurrent uploads can also interleave their old-file deletion and final database write.

This is the strongest server-side candidate for a database URL that does not have a matching file.

### 2. The page-wide refresh can fail after a successful avatar upload

`updateAvatar()` uploads successfully, shows a success toast, then waits for `refresh()`. `refresh()` uses `Promise.all` for user, scans, and local activity. If any one of these calls fails, the avatar may already be saved but the profile page state may not refresh. The async callback from the file input has no local error state/rollback path.

This is a candidate for a saved avatar that does not appear until a later page reload.

### 3. Profile page and top navigation are separate states

The profile page explicitly refreshes after mutation. The top navigation relies on the custom browser event and its own follow-up `GET /api/me`. If that event is missed, the request fails, or the user menu is unmounted during navigation, the two views can temporarily show different avatars.

### 4. URL-origin configuration can create unreachable images

The database stores an absolute URL created from `API_PUBLIC_ORIGIN`. A local value, an old deployment domain, a port change, or a production misconfiguration produces a URL that can be correct in MySQL but unreachable in the browser. The web resolver currently handles relative and legacy local forms, but other clients must implement equivalent logic unless the server standardizes the stored/returned representation.

### 5. Existing record/file mismatch is possible

The earlier storage audit found a local avatar URL with no corresponding file. When that record is returned by `GET /api/me`, the UI correctly falls back to initials, but the data inconsistency remains in storage/database.

### 6. Google OAuth and local credentials can affect the same user

Both sign-in methods resolve the same `users` row by email. The current Google callback preserves an existing `avatar_url`, so it no longer replaces a user-uploaded avatar. Older data may still contain values written before that behavior was corrected.

## Recommendations after the trace

These are recommendations only; this report makes no code changes.

1. Treat avatar storage and MySQL update as one recoverable operation: preserve the old file until the DB update succeeds, and queue orphan cleanup if a later step fails.
2. Make the profile refresh independent of unrelated scans/activity requests, or update local user state from the already-fresh avatar response before background refresh completes.
3. Use a shared user store/query cache so Profile and UserMenu subscribe to the same current user state rather than synchronizing through a custom browser event.
4. Standardize avatar representation in API responses. A relative API path plus an explicit API base/resolved URL is safer across web, mobile, and extension clients than environment-specific absolute URLs.
5. Add explicit cache headers for immutable random-filename uploads and an image error diagnostic path for failed URLs.
6. Add integration tests for successful upload, missing stored file, DB failure after file write, two concurrent uploads, Google/email login parity, and a failed page refresh after a successful upload.
