const TOKEN_KEY = "url-defender-token";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function apiBase(): string {
  return (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
}

/** Resolve API-hosted uploads while preserving third-party avatar URLs. */
export function resolveApiAssetUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("/")) return `${apiBase()}${value}`;

  try {
    const asset = new URL(value);
    const base = new URL(apiBase());
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
    if (
      asset.pathname.startsWith("/uploads/") &&
      localHosts.has(asset.hostname) &&
      localHosts.has(base.hostname)
    ) {
      return `${apiBase()}${asset.pathname}`;
    }
  } catch {
    return value;
  }

  return value;
}

export function getAuthToken(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBase()}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) clearAuthToken();
    throw new ApiError(body.error || body.message || "Request failed", response.status);
  }
  return body as T;
}

export type BackendUser = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  plan: "free" | "team" | "enterprise";
  email_verified_at: string | null;
  created_at: string;
  roles?: string[];
};

export async function fetchBackendUser(): Promise<BackendUser> {
  const response = await apiRequest<{ user: BackendUser }>("/api/me");
  return response.user;
}
