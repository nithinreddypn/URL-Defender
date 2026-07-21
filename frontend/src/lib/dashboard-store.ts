/**
 * Thin data layer so pages don't import mocks directly.
 * Persists real scans + full scan results and monthly usage to localStorage.
 * Real detection comes from VirusTotal via a server function; when the API
 * fails we gracefully fall back to a deterministic mock so the UI still
 * has something to render.
 *
 * NOTE: MOCK_SCANS / MOCK_ALERTS / MOCK_NOTIFICATIONS are no longer used
 * as seed data — the dashboard now starts empty until the user runs real scans.
 */
import { computeStats, sparkline, type Scan, type ScanVerdict } from "@/lib/mock/scans";
import type { Alert, AlertSeverity, AlertType } from "@/lib/mock/alerts";
import type { MockUser } from "@/lib/mock/user";
import type { ScanResult } from "@/lib/mock/scan-results";
import { apiRequest, fetchBackendUser } from "@/lib/api";

export type Notification = {
  id: string;
  title: string;
  body: string;
  kind: "threat" | "system" | "digest";
  created_at: string;
  read: boolean;
};

const SCANS_KEY = "urldefender:scans:v1";
const RESULTS_KEY = "urldefender:scan-results:v1";
const PROFILE_KEY = "urldefender:profile:v1";
const ACTIVITY_KEY = "urldefender:activity:v1";
const SETTINGS_KEY = "urldefender:settings:v1";
const SESSIONS_KEY = "urldefender:sessions:v1";
const MFA_KEY = "urldefender:mfa:v1";
export const MONTHLY_SCAN_LIMIT = 50;

// ---- settings ----

export type RetentionDays = 30 | 90 | 365 | 0; // 0 = forever

export type AppSettings = {
  accent: "blue" | "emerald" | "violet" | "amber";
  notifyEmailThreats: boolean;
  notifyCriticalPush: boolean;
  notifyWeeklySummary: boolean;
  retentionDays: RetentionDays;
};

export const DEFAULT_SETTINGS: AppSettings = {
  accent: "blue",
  notifyEmailThreats: true,
  notifyCriticalPush: true,
  notifyWeeklySummary: false,
  retentionDays: 90,
};

function _isBrowserLocal() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadSettings(): AppSettings {
  if (!_isBrowserLocal()) return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function fetchSettings(): Promise<AppSettings> {
  return loadSettings();
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const next = { ...loadSettings(), ...patch };
  if (_isBrowserLocal()) {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}

// ---- MFA ----

export type MfaState = {
  enabled: boolean;
  secret?: string;
  backupCodes?: string[];
  enabledAt?: string;
};

export function loadMfa(): MfaState {
  if (!_isBrowserLocal()) return { enabled: false };
  try {
    const raw = window.localStorage.getItem(MFA_KEY);
    if (!raw) return { enabled: false };
    return JSON.parse(raw) as MfaState;
  } catch {
    return { enabled: false };
  }
}

export async function fetchMfa(): Promise<MfaState> {
  return loadMfa();
}

export async function enableMfa(): Promise<MfaState> {
  const secret = randomBase32(16);
  const backupCodes = Array.from({ length: 8 }, () => randomBackupCode());
  const state: MfaState = {
    enabled: true,
    secret,
    backupCodes,
    enabledAt: new Date().toISOString(),
  };
  if (_isBrowserLocal()) {
    try {
      window.localStorage.setItem(MFA_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }
  logActivity("mfa_enabled", "Two-factor authentication enabled");
  return state;
}

export async function disableMfa(): Promise<void> {
  if (_isBrowserLocal()) window.localStorage.removeItem(MFA_KEY);
  logActivity("mfa_disabled", "Two-factor authentication disabled");
}

function randomBase32(len: number): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]!;
  return out;
}

function randomBackupCode(): string {
  const s = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6);
  return `${s.slice(0, 4)}-${s.slice(4, 8)}`.toUpperCase();
}

// ---- sessions ----

export type SessionEntry = {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  current: boolean;
};

function getRealCurrentSession(): SessionEntry {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  let os = "Desktop Device";
  if (/windows nt 10/i.test(ua)) os = "Windows 10/11 Workstation";
  else if (/windows/i.test(ua)) os = "Windows PC";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS Workstation";
  else if (/iphone/i.test(ua)) os = "iPhone";
  else if (/ipad/i.test(ua)) os = "iPad";
  else if (/android/i.test(ua)) os = "Android Device";
  else if (/linux/i.test(ua)) os = "Linux Workstation";

  let browser = "Web Browser";
  if (/edg/i.test(ua)) browser = "Microsoft Edge";
  else if (/chrome|crios/i.test(ua)) browser = "Google Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Mozilla Firefox";
  else if (/safari/i.test(ua)) browser = "Apple Safari";

  return {
    id: "sess_real_active",
    device: os,
    browser: browser,
    location: "127.0.0.1 (Active Local Session)",
    lastActive: new Date().toISOString(),
    current: true,
  };
}

export async function fetchSessions(): Promise<SessionEntry[]> {
  const currentSession = getRealCurrentSession();
  if (!_isBrowserLocal()) return [currentSession];
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    if (!raw) {
      window.localStorage.setItem(SESSIONS_KEY, JSON.stringify([currentSession]));
      return [currentSession];
    }
    const list = JSON.parse(raw) as SessionEntry[];
    if (!Array.isArray(list) || list.length === 0) return [currentSession];
    // Ensure the current live session is always present at index 0
    const others = list.filter((s) => !s.current);
    return [currentSession, ...others];
  } catch {
    return [currentSession];
  }
}

export async function revokeSession(id: string): Promise<SessionEntry[]> {
  const list = await fetchSessions();
  const next = list.filter((s) => s.id !== id || s.current);
  if (_isBrowserLocal()) window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
  return next;
}

export async function revokeAllOtherSessions(): Promise<SessionEntry[]> {
  const list = await fetchSessions();
  const next = list.filter((s) => s.current);
  if (_isBrowserLocal()) window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
  return next;
}

// ---- scan history bulk ops ----

export async function deleteAllScans(): Promise<void> {
  if (!_isBrowserLocal()) return;
  window.localStorage.removeItem(SCANS_KEY);
  window.localStorage.removeItem(RESULTS_KEY);
}

export async function pruneScansByRetention(days: RetentionDays): Promise<number> {
  if (!_isBrowserLocal() || days === 0) return 0;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const list = loadStoredScans();
  const kept = list.filter((s) => new Date(s.scanned_at).getTime() >= cutoff);
  const removed = list.length - kept.length;
  if (removed > 0) {
    persistScans(kept);
    try {
      const map = loadResultsMap();
      const keptIds = new Set(kept.map((k) => k.id));
      for (const k of Object.keys(map)) if (!keptIds.has(k)) delete map[k];
      window.localStorage.setItem(RESULTS_KEY, JSON.stringify(map));
    } catch {
      /* ignore */
    }
  }
  return removed;
}

export type ProfileOverrides = {
  full_name?: string;
  email?: string;
  avatar_url?: string | null;
  company?: string;
};

export type ActivityKind =
  | "login"
  | "logout"
  | "password_changed"
  | "mfa_enabled"
  | "mfa_disabled"
  | "profile_updated"
  | "plan_changed";

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  detail?: string;
  at: string;
};

// ---- storage helpers (SSR-safe) ----

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadStoredScans(): Scan[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(SCANS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Scan[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function persistScans(scans: Scan[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SCANS_KEY, JSON.stringify(scans));
  } catch {
    /* quota / privacy mode — ignore */
  }
}

// ---- scan results ----

function loadResultsMap(): Record<string, ScanResult> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(RESULTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ScanResult>;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function persistResult(result: ScanResult) {
  if (!isBrowser()) return;
  try {
    const map = loadResultsMap();
    map[result.id] = result;
    window.localStorage.setItem(RESULTS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

// ---- reads ----

export async function fetchCurrentUser(): Promise<MockUser & { company?: string }> {
  return fetchBackendUser();
}

export async function updateProfile(
  patch: ProfileOverrides,
): Promise<MockUser & { company?: string }> {
  const response = await apiRequest<{ user: MockUser }>("/api/me", {
    method: "PATCH",
    body: JSON.stringify({ full_name: patch.full_name, avatar_url: patch.avatar_url }),
  });
  if (typeof window !== "undefined") window.dispatchEvent(new Event("url-defender:user-changed"));
  return response.user;
}

export async function uploadAvatar(file: File): Promise<MockUser & { company?: string }> {
  const form = new FormData();
  form.append("avatar", file);
  const response = await apiRequest<{ user: MockUser }>("/api/me/avatar", {
    method: "POST",
    body: form,
  });
  if (typeof window !== "undefined") window.dispatchEvent(new Event("url-defender:user-changed"));
  return response.user;
}

// ---- activity log ----

function loadActivity(): ActivityEvent[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(ACTIVITY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActivityEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function logActivity(kind: ActivityKind, detail?: string): void {
  if (!isBrowser()) return;
  const evt: ActivityEvent = {
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    kind,
    detail,
    at: new Date().toISOString(),
  };
  try {
    const list = loadActivity();
    const next = [evt, ...list].slice(0, 50);
    window.localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export async function fetchActivity(): Promise<ActivityEvent[]> {
  return loadActivity();
}

export async function resetAccount(): Promise<void> {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(SCANS_KEY);
    window.localStorage.removeItem(RESULTS_KEY);
    window.localStorage.removeItem(PROFILE_KEY);
    window.localStorage.removeItem(ACTIVITY_KEY);
  } catch {
    /* ignore */
  }
}

export async function fetchScans(): Promise<Scan[]> {
  const response = await apiRequest<{ scans: Array<Partial<Scan> & { created_at?: string }> }>(
    "/api/scans?limit=100",
  );
  return response.scans.map((scan) => ({
    id: scan.id!,
    url: scan.url!,
    verdict: scan.verdict === "dangerous" || scan.verdict === "safe" ? scan.verdict : "suspicious",
    risk_score: Number(scan.risk_score ?? 0),
    scanned_at: scan.scanned_at || scan.created_at || new Date().toISOString(),
    duration_ms: Number(scan.duration_ms ?? 0),
    engine_flags: Number(scan.engine_flags ?? 0),
    engines_total: Number(scan.engines_total ?? 0),
  }));
}

export async function fetchScanById(id: string): Promise<Scan | null> {
  try {
    const response = await apiRequest<{ scan: Partial<Scan> & { created_at?: string } }>(
      `/api/scans/${id}`,
    );
    const scan = response.scan;
    return {
      id: scan.id!,
      url: scan.url!,
      verdict:
        scan.verdict === "dangerous" || scan.verdict === "safe" ? scan.verdict : "suspicious",
      risk_score: Number(scan.risk_score ?? 0),
      scanned_at: scan.scanned_at || scan.created_at || new Date().toISOString(),
      duration_ms: Number(scan.duration_ms ?? 0),
      engine_flags: 0,
      engines_total: 0,
    };
  } catch {
    return null;
  }
}

/**
 * Return the full ScanResult for a scan id. Real (VirusTotal-derived) results
 * are persisted in localStorage at scan time; if the full result is missing
 * (e.g. cleared storage) we derive one deterministically from the summary.
 */
export type ScanReport = {
  result: ScanResult;
  history: {
    is_personal: boolean;
    last_scanned_at: string | null;
  };
  analysis: {
    source: "shared_threat_intelligence" | "personal_scan";
    first_detected_at: string | null;
    last_analysis_status: string;
  };
};

export async function fetchScanResultById(id: string): Promise<ScanReport | null> {
  try {
    return await apiRequest<ScanReport>(`/api/scans/${id}`);
  } catch {
    return null;
  }
}

/**
 * Alerts are derived from real scans (dangerous + suspicious verdicts) —
 * no more mock seed data.
 */
export async function fetchAlerts(): Promise<Alert[]> {
  const scans = await fetchScans();
  const alerts: Alert[] = scans
    .filter((s) => s.verdict !== "safe")
    .map((s) => alertFromScan(s))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return alerts;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function alertFromScan(s: Scan): Alert {
  const host = hostOf(s.url);
  const isDanger = s.verdict === "dangerous";
  const severity: AlertSeverity = isDanger
    ? s.risk_score >= 85
      ? "critical"
      : "high"
    : s.risk_score >= 60
      ? "medium"
      : "low";
  const type: AlertType = isDanger ? "phishing" : "blacklist";
  return {
    id: `alert_${s.id}`,
    type,
    severity,
    title: isDanger ? "Malicious URL detected" : "Suspicious URL flagged",
    detail: `${s.engine_flags} of ${s.engines_total} engines flagged this URL`,
    url: host,
    created_at: s.scanned_at,
  };
}

const NOTIF_READ_KEY = "urldefender:notif-read:v1";
const NOTIF_DISMISSED_KEY = "urldefender:notif-dismissed:v1";

function loadIdSet(key: string): Set<string> {
  if (!isBrowser()) return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveIdSet(key: string, set: Set<string>) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
}

export async function fetchNotifications(): Promise<Notification[]> {
  const response = await apiRequest<{
    notifications: Array<{
      id: string;
      title: string;
      message: string;
      type: string;
      read_at: string | null;
      created_at: string;
    }>;
  }>("/api/notifications");
  return response.notifications.map((item) => ({
    id: item.id,
    title: item.title,
    body: item.message,
    created_at: item.created_at,
    kind: item.type === "threat_detected" ? "threat" : "system",
    read: !!item.read_at,
  }));
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiRequest("/api/notifications/read-all", { method: "POST" });
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiRequest(`/api/notifications/${id}/read`, { method: "POST" });
}

export async function clearAllNotifications(): Promise<void> {
  await apiRequest("/api/notifications/clear", { method: "POST" });
}

// ---- usage ----

export function currentMonthUsage(scans: Scan[]): number {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return scans.filter((s) => {
    const d = new Date(s.scanned_at);
    return d.getFullYear() === y && d.getMonth() === m;
  }).length;
}

export async function fetchMonthlyUsage(): Promise<{ used: number; limit: number }> {
  const scans = await fetchScans();
  return { used: currentMonthUsage(scans), limit: MONTHLY_SCAN_LIMIT };
}

// ---- writes ----

function newScanId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Kick off a VirusTotal scan without awaiting — returns the in-flight promise
 * so callers can run UI animations in parallel and only block on the result
 * at the very end. Enforces the monthly cap up-front.
 */
export function beginScan(url: string): {
  scanId: string;
  promise: Promise<Scan>;
} {
  const scanId = "pending";
  const promise = apiRequest<ScanResult>("/api/scans", {
    method: "POST",
    body: JSON.stringify({ url }),
  }).then((result) => ({
    id: result.id,
    url: result.url,
    verdict: result.verdict,
    risk_score: result.risk_score,
    scanned_at: result.scanned_at,
    duration_ms: result.duration_ms,
    engine_flags: result.engines.filter((engine) => engine.flagged).length,
    engines_total: result.engines.length,
  }));
  return { scanId, promise };
}

/**
 * Legacy blocking API used by the "Rescan" button on the result page.
 */
export async function createScan(url: string): Promise<Scan> {
  return beginScan(url).promise;
}

/** Remove a scan (and its stored result) from local storage. */
export async function deleteScan(id: string): Promise<void> {
  if (!isBrowser()) return;
  const next = loadStoredScans().filter((s) => s.id !== id);
  persistScans(next);
  try {
    const map = loadResultsMap();
    if (map[id]) {
      delete map[id];
      window.localStorage.setItem(RESULTS_KEY, JSON.stringify(map));
    }
  } catch {
    /* ignore */
  }
}

// ---- fallback helpers (only used if VirusTotal errors) ----

function buildScanFromResult(
  id: string,
  url: string,
  v: { verdict: ScanVerdict; risk_score: number },
  durationMs: number,
): Scan {
  return {
    id,
    url,
    verdict: v.verdict,
    risk_score: v.risk_score,
    scanned_at: new Date().toISOString(),
    duration_ms: Math.max(1, Math.round(durationMs)),
    engine_flags: v.verdict === "dangerous" ? 10 : v.verdict === "suspicious" ? 3 : 0,
    engines_total: 74,
  };
}

function fallbackVerdictForUrl(url: string): { verdict: ScanVerdict; risk_score: number } {
  const host = url.toLowerCase();
  if (/(verify|secure-login|banking|-update-|invoice|wallet-connect)/.test(host)) {
    return { verdict: "dangerous", risk_score: 85 };
  }
  if (/(free-|gift-|share-|download-|-signin)/.test(host)) {
    return { verdict: "suspicious", risk_score: 55 };
  }
  return { verdict: "safe", risk_score: 6 };
}

export { computeStats, sparkline };
