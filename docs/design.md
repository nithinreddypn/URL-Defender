# Alert and Notification System — Current Design

## Overview

URL Defender currently has two related but separate user-facing concepts:

1. **Notifications** are persisted backend records in the `notifications` table. They appear in the top navigation bell and can be read, marked read, or cleared.
2. **Alerts** are not stored as backend alert records. The Alerts tab derives them in the frontend from the authenticated user’s scan history: every non-safe scan becomes a displayed alert.

The system is user-scoped. The shared `url_analyses` threat-intelligence cache has no notification or alert recipients and does not expose who scanned a URL.

## Architecture

```text
VirusTotal result / payment verification
                 |
                 v
       PHP controllers create notifications
                 |
                 v
       MySQL notifications (per user_id)
                 |
                 v
  GET /api/notifications (JWT + verified email)
                 |
                 v
 React NotificationBell (15-second polling + focus refresh)

Personal scans (GET /api/scans)
                 |
                 v
 dashboard-store.fetchAlerts()
                 |
                 v
 React Alerts tab (derived display only)
```

## Alert flow

The Alerts tab at `/alerts?tab=alerts` calls `fetchAlerts()` and `fetchScans()` when it mounts. `fetchAlerts()` calls `GET /api/scans?limit=100`, filters out scans whose verdict is `safe`, then creates a frontend `Alert` object for each remaining scan.

```text
Authenticated user
       |
       v
GET /api/scans?limit=100
       |
       v
Filter verdict != safe
       |
       +--> dangerous -> “Malicious URL detected”
       |
       +--> suspicious -> “Suspicious URL flagged”
       |
       v
Render Alerts tab; link to that user's scan report
```

### Alert types and severity mapping

These are frontend display classifications in `dashboard-store.ts`.

| Scan verdict | Alert title | Alert type | Severity |
|---|---|---|---|
| `dangerous` | Malicious URL detected | `phishing` | `critical` when risk >=85; otherwise `high` |
| `suspicious` | Suspicious URL flagged | `blacklist` | `medium` when risk >=60; otherwise `low` |
| `safe` | No alert | — | — |

The alert detail is derived from engine counts (`N of M engines flagged`). The displayed URL is reduced to its hostname when it parses as a URL. The alert ID is synthetic: `alert_<scanId>`.

The UI has icon/label definitions for `malware`, `impersonation`, and `ssl`, but the current derivation function produces only `phishing` and `blacklist`.

## Notification flow

### Trigger events

| Trigger | Backend producer | Persisted notification |
|---|---|---|
| A scan verdict is not `safe` (new VT analysis or reused shared analysis added to history) | `ScanController::notifyThreat()` | `type=threat_detected`; title is `<Verdict> URL detected`; severity is `critical` for dangerous, `warning` for suspicious |
| Successful payment/plan verification | `PaymentController::verify()` | `type=billing`; title `Payment successful`; severity `info` |

No email, push, websocket, browser push, scheduled digest, or admin broadcast notification producer is currently implemented.

```text
POST /api/scans
       |
       +--> safe result ----------> no notification row
       |
       +--> suspicious/dangerous -> INSERT notifications(user_id, scan_id, ...)

POST /api/payments/verify
       |
       +--> successful payment ---> INSERT notifications(user_id, type=billing, ...)
```

### Retrieval and state changes

```text
NotificationBell
   |-- on mount, window focus, storage event, every 15 seconds
   v
GET /api/notifications
   |-- newest 50 non-dismissed rows
   `-- unread count

Open item  -> POST /api/notifications/{id}/read (when unread)
Mark all  -> POST /api/notifications/read-all
Clear all -> POST /api/notifications/clear (sets dismissed=1)
```

The bell renders `threat_detected` as `threat`; all other current backend types, including `billing`, are rendered as the frontend `system` kind. The frontend declares a `digest` display kind, but no current backend producer maps to it.

## Backend components

| Component | Current responsibility |
|---|---|
| `backend/src/Controllers/ScanController.php` | Creates threat notification rows for non-safe scan results; associates the row with `scan_id` and `user_id`. |
| `backend/src/Controllers/PaymentController.php` | Creates an informational billing notification after successful payment verification and plan update. |
| `backend/src/Controllers/NotificationController.php` | Lists, counts unread, marks read, and soft-clears the authenticated user’s notifications. |
| `backend/src/Middleware/AuthMiddleware.php` | Validates bearer JWT, server-side session state, active user, and attaches the user to the request. |
| `RequireVerifiedEmail` middleware | Prevents unverified users from calling notification endpoints. |

## Database tables involved

### `notifications`

Current columns used by the feature:

| Column | Purpose |
|---|---|
| `id` | Notification UUID. |
| `user_id` | Owner; every notification query/update scopes to it. |
| `scan_id` | Optional scan association for threat notifications. |
| `type` | Enum: `scan_complete`, `threat_detected`, `system`, `billing`, `security`. Current producers use `threat_detected` and `billing`. |
| `title`, `message` | UI content. |
| `severity` | Enum: `info`, `warning`, `critical`. |
| `read_at` | `NULL` means unread. |
| `dismissed` | Soft-clear flag; list excludes `dismissed=1`. |
| `created_at` | Sort/display timestamp. |

### Related tables

- `scans`: personal scan history. It supplies the frontend-derived Alerts data and owns scan records referenced by threat notifications.
- `scan_results` and `scan_engines`: provide stored report/engine values used when scans are listed and converted into alerts.
- `url_analyses`: anonymous global threat-analysis cache. It is used for analysis reuse, not for notification recipients or Alert ownership.
- `users`, `auth_sessions`: used by authentication/ownership checks.

## API endpoints used

All notification endpoints require a valid JWT, an active non-deleted user, and a verified email.

| Method and endpoint | Current behavior |
|---|---|
| `GET /api/notifications` | Returns up to 50 newest non-dismissed notifications for the current user plus an unread count. |
| `POST /api/notifications/{id}/read` | Sets `read_at=NOW()` only where the row ID and `user_id` match. |
| `POST /api/notifications/read-all` | Sets `read_at=NOW()` for all unread notifications owned by the current user. |
| `POST /api/notifications/clear` | Sets `dismissed=1` for all notifications owned by the current user. |
| `GET /api/scans?limit=100` | Source data for frontend-derived Alerts; it is not an alert endpoint. |

## Frontend workflow and user interaction

### Notification bell

- The bell fetches notifications on mount, when the window regains focus, on matching local-storage events, and every 15 seconds.
- Its badge is calculated from locally loaded items with `read === false`.
- Opening a notification marks it read optimistically and opens a dialog containing title, body, relative time, and a close button.
- “Mark all as read” and “Clear all” update UI state optimistically and then call the API.
- The bell does not currently navigate to the associated scan report, even though backend threat rows include `scan_id`.

### Alerts and History page

- The Alerts tab has a list of derived unsafe scans, with severity/type badges and a “View details” link to the owner’s report.
- The History tab separately fetches the same user-scoped scan list and supports client-side text, status, risk, and date filtering plus pagination.
- Alerts are not read/dismissed independently. Removing/dismissing a notification does not remove a derived Alert, and a derived Alert does not create/update a notification row.

## Error handling

- Notification controller operations return simple JSON (`ok: true`) after updates.
- Authentication and verified-email middleware reject unauthorized access before controller queries.
- In the bell, requests are called without an explicit UI error state or retry indicator. A rejected initial fetch can leave the bell in its loading state; optimistic read/clear actions do not currently roll back on API failure.
- Scan failures are handled in `ScanController` with a generic client error and server-side logging. A failed scan does not call `notifyThreat()`.

## Security considerations

- Notification reads, individual read updates, mark-all, and clear operations scope database writes by the authenticated `user_id`.
- The scan-detail endpoint also scopes a scan ID by `user_id`; derived Alerts link only to scans returned for that user.
- Shared `url_analyses` cache responses distinguish personal history from global analysis and do not return other-user identities or history.
- Database access uses the project `Db` helper, which prepares and executes parameterized values.
- JWT validation also checks the corresponding non-revoked, unexpired server-side session; verified-email middleware protects these routes.
- Notification content includes scan host/verdict text. The React UI renders it as text, benefiting from React escaping; the backend does not provide rich HTML notification content.

## Current limitations

- Alerts are client-derived from the first 100 scans, rather than persisted alert records. There is no server-side alerts API, acknowledgement state, or independent alert retention.
- The Alerts tab does not refresh automatically after its initial mount; users generally need to revisit/refresh to see a newly completed scan there.
- The notification bell polls every 15 seconds; there is no real-time delivery channel.
- `GET /api/notifications` limits results to 50 and has no pagination endpoint.
- Clear is a soft dismissal (`dismissed=1`), not a delete or archive/recovery workflow.
- The bell’s UI groups backend `billing` notifications under “System update”; it does not expose a distinct billing label.
- No current notification producer sends email/push/browser/extension messages for threats, even though settings contain notification-related UI controls.
- Notification dialogs do not provide a direct “View scan report” action.
- The system has no implemented admin dashboard alert/notification workflow in this repository.

## Future improvements

The following are improvement opportunities, not current behavior:

- Persist a server-side alert resource with acknowledgement, dismissal, paging, and delivery state.
- Add real-time delivery (for example, SSE/websocket) and reliable retry/rollback behavior in the bell.
- Add a scan-report action for threat notifications and a distinct billing presentation.
- Apply server-side pagination/filtering for Alerts and notification history.
- Add alert-delivery preferences and audited email/push integrations.
- Add monitoring, retention policy, and admin tooling for operational notification health.
