/**
 * MOCK DATA — placeholder for a future real detection API integration.
 *
 * Deterministically derives a rich "scan result" object from a URL so that
 * the same URL always produces the same verdict, engine breakdown, SSL info,
 * etc., while different URLs produce visibly different results.
 *
 * Replace `generateScanResult` with a real detection-engine call later; keep
 * the returned shape stable so the UI doesn't have to change.
 */

import type { Scan, ScanVerdict } from "@/lib/mock/scans";

export type SslStatus = "valid" | "expired" | "self-signed" | "invalid";

export type EngineResult = {
  name: string;
  flagged: boolean;
  label: string;
};

export type ScanResult = {
  id: string;
  url: string;
  hostname: string;
  verdict: ScanVerdict;
  risk_score: number;
  threat_category: string;
  ssl: {
    status: SslStatus;
    issuer: string;
    expires_at: string;
    valid_from: string;
  };
  domain_age_days: number;
  blacklist: {
    listed_on: number;
    total_lists: number;
    sources: string[];
  };
  engines: EngineResult[];
  ip_address: string;
  redirect_chain: string[];
  headers: Record<string, string>;
  timeline: {
    submitted_at: string;
    analyzed_at: string;
    completed_at: string;
  };
  recommendations: string[];
  scanned_at: string;
  duration_ms: number;
};

// ------- deterministic PRNG (mulberry32 seeded via FNV-1a) -------

function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

function intBetween(rand: () => number, min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] ?? url;
  }
}

// ------- classification heuristics (for freshly-submitted URLs) -------

const DANGER_SIGNALS = [
  "verify",
  "secure-login",
  "banking",
  "-update-",
  "update-",
  "invoice",
  "support-billing",
  "confirm-account",
  "wallet-connect",
  "reset-password-",
  "microsoft-security",
  "apple-id-",
  "paypal-",
  "bankofamerica",
];

const SUSPICIOUS_SIGNALS = [
  "cloud-",
  "-cdn.",
  "share-",
  "download-",
  "free-",
  "gift-",
  "cdn-share",
  "storage-",
  "temp-",
  "-signin.",
  "docusign-",
];

/**
 * Given a raw URL, classify to a verdict + risk score deterministically.
 * Used when a user submits a new scan.
 */
export function classifyUrl(url: string): { verdict: ScanVerdict; risk_score: number } {
  const rand = mulberry32(fnv1a(url));
  const host = safeHostname(url).toLowerCase();

  const isDanger = DANGER_SIGNALS.some((k) => host.includes(k));
  const isSuspicious = !isDanger && SUSPICIOUS_SIGNALS.some((k) => host.includes(k));
  const manyHyphens = (host.match(/-/g)?.length ?? 0) >= 3;
  const digitsInDomain = /\d{3,}/.test(host);

  if (isDanger) {
    return { verdict: "dangerous", risk_score: intBetween(rand, 78, 96) };
  }
  if (isSuspicious || manyHyphens || digitsInDomain) {
    return { verdict: "suspicious", risk_score: intBetween(rand, 42, 68) };
  }
  return { verdict: "safe", risk_score: intBetween(rand, 1, 9) };
}

// ------- result generator -------

const ENGINE_NAMES = [
  "Google Safe Browsing",
  "VirusTotal",
  "PhishTank",
  "OpenPhish",
  "Cloudflare Radar",
  "Kaspersky",
  "ESET Web Filter",
  "Sucuri SiteCheck",
  "Fortinet FortiGuard",
  "Norton Safe Web",
  "Bitdefender TrafficLight",
  "McAfee WebAdvisor",
];

const BLACKLIST_SOURCES = [
  "Spamhaus DBL",
  "SURBL",
  "URIBL",
  "Malware Domain List",
  "PhishTank",
  "OpenPhish",
];

const SSL_ISSUERS = [
  "Let's Encrypt Authority X3",
  "DigiCert Global CA G2",
  "Sectigo RSA Domain Validation",
  "GlobalSign Atlas R3",
  "Google Trust Services",
];

const THREAT_CATEGORIES: Record<ScanVerdict, string[]> = {
  dangerous: [
    "Credential Phishing",
    "Malware Distribution",
    "Brand Impersonation",
    "Financial Fraud",
  ],
  suspicious: [
    "Newly Registered Domain",
    "Unverified Redirect Chain",
    "Suspicious Certificate",
    "Look-alike Domain",
  ],
  safe: ["No Threats Detected"],
};

function generateEngines(rand: () => number, verdict: ScanVerdict): EngineResult[] {
  const flagCount =
    verdict === "dangerous"
      ? intBetween(rand, 7, 11)
      : verdict === "suspicious"
        ? intBetween(rand, 2, 4)
        : 0;

  const flaggedIdx = new Set<number>();
  while (flaggedIdx.size < flagCount) {
    flaggedIdx.add(Math.floor(rand() * ENGINE_NAMES.length));
  }

  return ENGINE_NAMES.map((name, i) => {
    const flagged = flaggedIdx.has(i);
    return {
      name,
      flagged,
      label: flagged ? pick(rand, ["Phishing", "Malicious", "Suspicious", "Malware"]) : "Clean",
    };
  });
}

function generateSsl(rand: () => number, verdict: ScanVerdict): ScanResult["ssl"] {
  const now = Date.now();
  const d = 86_400_000;
  if (verdict === "dangerous" && rand() > 0.4) {
    return {
      status: "self-signed",
      issuer: "Self-signed certificate",
      valid_from: new Date(now - intBetween(rand, 2, 20) * d).toISOString(),
      expires_at: new Date(now + intBetween(rand, 30, 300) * d).toISOString(),
    };
  }
  if (verdict === "suspicious" && rand() > 0.7) {
    return {
      status: "expired",
      issuer: pick(rand, SSL_ISSUERS),
      valid_from: new Date(now - intBetween(rand, 400, 800) * d).toISOString(),
      expires_at: new Date(now - intBetween(rand, 5, 40) * d).toISOString(),
    };
  }
  return {
    status: "valid",
    issuer: pick(rand, SSL_ISSUERS),
    valid_from: new Date(now - intBetween(rand, 30, 200) * d).toISOString(),
    expires_at: new Date(now + intBetween(rand, 60, 320) * d).toISOString(),
  };
}

function generateIp(rand: () => number): string {
  return `${intBetween(rand, 20, 220)}.${intBetween(rand, 0, 255)}.${intBetween(rand, 0, 255)}.${intBetween(rand, 1, 254)}`;
}

/**
 * Given a persisted Scan (URL + verdict + timing), deterministically derive
 * the full scan-result object. Pure function of the scan's stable fields.
 */
export function generateScanResult(scan: Scan): ScanResult {
  const rand = mulberry32(fnv1a(`${scan.url}::${scan.id}`));
  const hostname = safeHostname(scan.url);

  const engines = generateEngines(rand, scan.verdict);
  const ssl = generateSsl(rand, scan.verdict);
  const category = pick(rand, THREAT_CATEGORIES[scan.verdict]);

  const domain_age_days =
    scan.verdict === "dangerous"
      ? intBetween(rand, 2, 40)
      : scan.verdict === "suspicious"
        ? intBetween(rand, 40, 240)
        : intBetween(rand, 400, 5200);

  const blacklist_total = 87;
  const listed_on =
    scan.verdict === "dangerous"
      ? intBetween(rand, 6, 14)
      : scan.verdict === "suspicious"
        ? intBetween(rand, 1, 4)
        : 0;
  const blacklist_sources = BLACKLIST_SOURCES.slice(
    0,
    Math.min(listed_on, BLACKLIST_SOURCES.length),
  );

  const submittedMs = new Date(scan.scanned_at).getTime() - scan.duration_ms;
  const submitted_at = new Date(submittedMs).toISOString();
  const analyzed_at = new Date(submittedMs + Math.floor(scan.duration_ms * 0.55)).toISOString();
  const completed_at = scan.scanned_at;

  const redirect_chain =
    scan.verdict === "safe"
      ? [scan.url]
      : [
          scan.url,
          `https://${hostname}/track?u=${intBetween(rand, 1000, 9999)}`,
          `https://cdn.${hostname.split(".").slice(-2).join(".")}/landing`,
        ];

  const headers: Record<string, string> = {
    server: pick(rand, ["nginx/1.24.0", "cloudflare", "AmazonS3", "Apache/2.4.58"]),
    "content-type": "text/html; charset=UTF-8",
    "x-frame-options": scan.verdict === "safe" ? "SAMEORIGIN" : "ALLOWALL",
    "strict-transport-security":
      scan.verdict === "safe" ? "max-age=31536000; includeSubDomains" : "missing",
    "content-security-policy":
      scan.verdict === "safe" ? "default-src 'self'; frame-ancestors 'none'" : "missing",
    "cache-control": pick(rand, ["no-store", "public, max-age=3600", "private, max-age=0"]),
  };

  const recommendations = buildRecommendations(scan.verdict, hostname);

  return {
    id: scan.id,
    url: scan.url,
    hostname,
    verdict: scan.verdict,
    risk_score: scan.risk_score,
    threat_category: category,
    ssl,
    domain_age_days,
    blacklist: { listed_on, total_lists: blacklist_total, sources: blacklist_sources },
    engines,
    ip_address: generateIp(rand),
    redirect_chain,
    headers,
    timeline: { submitted_at, analyzed_at, completed_at },
    recommendations,
    scanned_at: scan.scanned_at,
    duration_ms: scan.duration_ms,
  };
}

function buildRecommendations(verdict: ScanVerdict, host: string): string[] {
  if (verdict === "dangerous") {
    return [
      `Do not enter any credentials, payment details, or personal information on ${host}.`,
      "Close the tab immediately and clear cookies for this domain.",
      "If you already submitted a password, rotate it on the legitimate site and enable 2FA.",
      "Report the URL to your security team or forward the message to phishing@your-org.com.",
    ];
  }
  if (verdict === "suspicious") {
    return [
      `Treat ${host} as untrusted until you can independently verify who runs it.`,
      "Verify the destination by typing the brand's official domain manually instead of clicking.",
      "If you must proceed, use a private/incognito window and never reuse a password.",
      "Re-scan after 24 hours — new domains often become clearly malicious once indexed.",
    ];
  }
  return [
    `No known threats detected on ${host}. It is safe to browse normally.`,
    "Continue treating login pages with care — verify the URL matches the brand's official domain.",
    "Enable your browser's built-in Safe Browsing protection for a second layer of defense.",
    "Consider bookmarking sites you visit often so you never rely on links from email.",
  ];
}
