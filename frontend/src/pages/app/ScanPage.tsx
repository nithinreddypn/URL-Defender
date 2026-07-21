import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ScanLine,
  Link2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  Clock,
  Loader2,
  Check,
} from "lucide-react";

import { fetchScans, fetchMonthlyUsage, beginScan } from "@/lib/dashboard-store";
import type { Scan } from "@/lib/mock/scans";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { toast } from "sonner";
import { ScanSummaryDialog } from "@/components/app/scan-summary-dialog";
import { UpgradePlanDialog } from "@/components/app/upgrade-plan-dialog";
import { apiRequest } from "@/lib/api";

const STAGES = [
  { label: "Checking domain reputation", detail: "Cross-referencing WHOIS + DNS history" },
  { label: "Analyzing SSL certificate", detail: "Verifying issuer, chain, and expiration" },
  { label: "Cross-referencing threat databases", detail: "12 engines · 87 blacklists" },
  { label: "Finalizing report", detail: "Aggregating signals into a verdict" },
] as const;

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function validateUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return "Enter a URL to scan.";
  if (trimmed.length > 2048) return "URL is too long (max 2048 characters).";
  const candidate = normalizeUrl(trimmed);
  try {
    const u = new URL(candidate);
    if (!/^https?:$/.test(u.protocol)) return "Only http and https URLs are supported.";
    if (!u.hostname.includes(".")) return "That doesn't look like a valid domain.";
    if (/\s/.test(u.hostname)) return "Domain cannot contain spaces.";
    return null;
  } catch {
    return "That doesn't look like a valid URL.";
  }
}

function normalizeLookupUrl(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

type LookupData = {
  id: string | null;
  global_analysis_id?: string;
  url: string;
  domain?: string;
  status: string;
  verdict: ScanVerdict;
  risk_score: number;
  category: string;
  threat_type: string;
  ssl_status: string;
  redirect_count: number;
  first_detected_at: string;
  last_analysis_status?: string;
  personal_last_scanned: string | null;
  source: string;
  in_history: boolean;
};

type LookupResponse = {
  success: true;
  exists: boolean;
  data?: LookupData;
};

type LookupState =
  | { status: "idle" | "checking" | "loading" | "not-found" | "error" }
  | { status: "found"; data: LookupData };

export default function ScanPage() {
  const reduceMotion = useReducedMotion();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Scan[] | null>(null);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [summaryScan, setSummaryScan] = useState<Scan | null>(null);
  const [postScanOpen, setPostScanOpen] = useState(false);
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" });
  const lookupCache = useRef(new Map<string, LookupResponse>());

  // scan progress state
  const [stageIdx, setStageIdx] = useState<number>(-1);
  const scanning = stageIdx >= 0;
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    fetchScans().then((s) => setRecent(s.slice(0, 8)));
    fetchMonthlyUsage().then(setUsage);
  }, []);

  // Database-only instant lookup. Requests wait for typing to pause, cancel when
  // input changes, and reuse the most recent response for the same normalized URL.
  useEffect(() => {
    if (scanning || !url.trim() || validateUrl(url)) {
      setLookup({ status: "idle" });
      return;
    }

    const normalized = normalizeLookupUrl(url);
    const cached = lookupCache.current.get(normalized);
    if (cached) {
      setLookup(
        cached.exists && cached.data
          ? { status: "found", data: cached.data }
          : { status: "not-found" },
      );
      return;
    }

    const controller = new AbortController();
    let active = true;
    let slowTimer: ReturnType<typeof setTimeout> | undefined;
    const debounceTimer = setTimeout(async () => {
      setLookup({ status: "checking" });
      slowTimer = setTimeout(() => {
        if (active) setLookup({ status: "loading" });
      }, 300);

      try {
        const response = await apiRequest<LookupResponse>(
          `/api/url/lookup?url=${encodeURIComponent(url.trim())}`,
          { signal: controller.signal },
        );
        lookupCache.current.set(normalized, response);
        if (active) {
          setLookup(
            response.exists && response.data
              ? { status: "found", data: response.data }
              : { status: "not-found" },
          );
        }
      } catch (cause) {
        if (active && !(cause instanceof DOMException && cause.name === "AbortError")) {
          setLookup({ status: "error" });
        }
      } finally {
        if (slowTimer) clearTimeout(slowTimer);
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(debounceTimer);
      if (slowTimer) clearTimeout(slowTimer);
      controller.abort();
    };
  }, [url, scanning]);

  // Typewriter placeholder — rotates sample URLs when the input is empty & idle.
  const SAMPLE_URLS = useMemo(
    () => [
      "https://example.com/login",
      "https://paypa1-secure.co/verify",
      "https://drive.google.com/file/xyz",
      "https://bit.ly/free-gift-card",
      "https://github.com/tanstack/router",
    ],
    [],
  );

  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (reduceMotion || url || scanning) {
      setTyped("");
      return;
    }
    let i = 0;
    let charIdx = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = SAMPLE_URLS[i];
      if (!deleting) {
        charIdx++;
        setTyped(full.slice(0, charIdx));
        if (charIdx === full.length) {
          deleting = true;
          timer = setTimeout(tick, 1400);
          return;
        }
        timer = setTimeout(tick, 55 + Math.random() * 45);
      } else {
        charIdx--;
        setTyped(full.slice(0, charIdx));
        if (charIdx === 0) {
          deleting = false;
          i = (i + 1) % SAMPLE_URLS.length;
          timer = setTimeout(tick, 300);
          return;
        }
        timer = setTimeout(tick, 25);
      }
    };
    timer = setTimeout(tick, 400);
    return () => clearTimeout(timer);
  }, [url, scanning, reduceMotion, SAMPLE_URLS]);

  const atLimit = !!usage && usage.used >= usage.limit;

  const stageDurations = useMemo(() => {
    if (reduceMotion) return STAGES.map(() => 50);
    // 120–180ms per stage — ultra snappy scan progression
    return STAGES.map(() => 120 + Math.floor(Math.random() * 60));
  }, [reduceMotion]);

  async function runScan(e: React.FormEvent) {
    e.preventDefault();
    if (scanning) return;
    if (atLimit) return;

    const v = validateUrl(url);
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    const normalized = normalizeUrl(url);
    startedAtRef.current = performance.now();

    // Kick off the real VirusTotal scan up-front so the animation and the
    // network round-trip run in parallel — the "finalizing" stage waits on it.
    let scanPromise: Promise<import("@/lib/mock/scans").Scan>;
    try {
      scanPromise = beginScan(normalized).promise;
    } catch (err) {
      if ((err as Error).message === "MONTHLY_LIMIT_REACHED") {
        toast.error("Monthly scan limit reached");
        const fresh = await fetchMonthlyUsage();
        setUsage(fresh);
      } else {
        toast.error("Something went wrong. Try again.");
      }
      return;
    }
    // Swallow rejections here — we await the promise below and handle them there.
    scanPromise.catch(() => {});

    // Walk stages 0..n-2 on their normal timers; stage n-1 (Finalizing) waits
    // for the real scan to resolve so the UI never lies about being "done".
    for (let i = 0; i < STAGES.length - 1; i++) {
      setStageIdx(i);
      await new Promise((r) => setTimeout(r, stageDurations[i]));
    }
    setStageIdx(STAGES.length - 1);

    try {
      const scan = await scanPromise;
      setStageIdx(-1);
      // Keep completed URLs in the scan history/report, not in the next-scan input.
      setUrl("");
      setError(null);
      const verdictLabel =
        scan.verdict === "safe"
          ? "Safe"
          : scan.verdict === "suspicious"
            ? "Suspicious"
            : "Dangerous";
      const toaster = scan.verdict === "safe" ? toast.success : toast.error;
      toaster(`${verdictLabel} — ${scan.engine_flags}/${scan.engines_total} engines flagged`, {
        description: scan.url,
      });
      // Refresh recent list + usage, and show the post-scan summary dialog so
      // the user can choose to open the URL (safe) or view the full report.
      const [nextRecent, nextUsage] = await Promise.all([fetchScans(), fetchMonthlyUsage()]);
      setRecent(nextRecent.slice(0, 8));
      setUsage(nextUsage);
      setSummaryScan(scan);
      setPostScanOpen(true);
    } catch (err) {
      setStageIdx(-1);
      if ((err as Error).message === "MONTHLY_LIMIT_REACHED") {
        toast.error("Monthly scan limit reached");
        const fresh = await fetchMonthlyUsage();
        setUsage(fresh);
      } else {
        toast.error("Something went wrong. Try again.");
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <header className="text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          URL scanner
        </p>
        <h1 className="mt-2 text-display text-3xl sm:text-4xl">Scan a URL</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
          Paste any link. We check reputation, SSL, and 12 threat databases in under a second.
        </p>
      </header>

      {/* Scan card */}
      <section
        aria-labelledby="scan-heading"
        className="mt-8 rounded-2xl border border-border bg-card p-6 elev-2 sm:p-8"
      >
        <h2 id="scan-heading" className="sr-only">
          URL input
        </h2>

        {atLimit ? (
          <LimitReached usage={usage!} />
        ) : (
          <form onSubmit={runScan} noValidate>
            <label
              htmlFor="scan-url"
              className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-widest text-muted-foreground"
            >
              <span>URL to scan</span>
              {usage && (
                <span className="normal-case tracking-normal">
                  <span className="font-mono tabular-nums text-foreground">{usage.used}</span>
                  <span className="text-muted-foreground"> / {usage.limit} this month</span>
                </span>
              )}
            </label>
            <div
              className={cn(
                "group relative flex items-stretch gap-2 rounded-xl border bg-background transition-all",
                error
                  ? "border-destructive/60 shadow-[0_0_0_1px_var(--destructive)]"
                  : "border-border focus-within:border-border-strong focus-within:shadow-[0_0_0_1px_var(--ring)]",
              )}
            >
              <span className="grid w-11 place-items-center text-muted-foreground">
                <Globe className="h-5 w-5 transition-colors group-focus-within:text-foreground" />
              </span>

              <div className="relative flex-1">
                <input
                  id="scan-url"
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={
                    typed
                      ? typed
                      : "Paste URL here (e.g. https://example.com/login or paypa1-verify.co)"
                  }
                  disabled={scanning}
                  aria-invalid={!!error}
                  aria-describedby={error ? "scan-url-error" : undefined}
                  className="h-12 w-full bg-transparent pr-8 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-60"
                />
                {url && !scanning && (
                  <button
                    type="button"
                    onClick={() => {
                      setUrl("");
                      setError(null);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Clear input"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={scanning}
                className="ring-focus my-1.5 mr-1.5 inline-flex items-center gap-2 rounded-lg bg-foreground px-5 text-sm font-semibold text-background transition-transform hover:scale-[1.015] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning
                  </>
                ) : (
                  <>
                    <ScanLine className="h-4 w-4" />
                    Scan Now
                  </>
                )}
              </button>
            </div>

            {error && (
              <p
                id="scan-url-error"
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-destructive"
                role="alert"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {error}
              </p>
            )}

            {!error && !scanning && lookup.status === "loading" && (
              <p
                className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"
                role="status"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking previous scans…
              </p>
            )}

            {!error && !scanning && lookup.status === "found" && (
              <UrlAnalysisResultCard data={lookup.data} />
            )}

            {!error && !scanning && lookup.status === "not-found" && (
              <p
                className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"
                role="status"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                No analysis available yet. You can start a new scan.
              </p>
            )}

            {!error && !scanning && lookup.status === "error" && (
              <p className="mt-2 text-xs text-muted-foreground" role="status">
                Could not check previous scans. You can still start a new scan.
              </p>
            )}

            {!error && !scanning && lookup.status === "idle" && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Your scans are private. We never share the URLs you submit.
              </p>
            )}

            {scanning && <ScanProgress currentStage={stageIdx} stageDurations={stageDurations} />}
          </form>
        )}
      </section>

      {/* Recent URLs */}
      <section aria-labelledby="recent-heading" className="mt-10">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 id="recent-heading" className="text-sm font-semibold">
              Recent scans
            </h2>
            <p className="text-xs text-muted-foreground">Click any URL to reopen its report.</p>
          </div>
          <Link
            to="/home"
            className="ring-focus inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-hover-surface hover:text-foreground"
          >
            View dashboard <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {recent === null ? (
            <RecentSkeleton />
          ) : recent.length === 0 ? (
            <EmptyRecent />
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSummaryScan(s);
                      setPostScanOpen(false);
                    }}
                    className="ring-focus flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-hover-surface/60"
                  >
                    <VerdictDot verdict={s.verdict} />
                    <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{s.url}</span>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {relTime(s.scanned_at)}
                    </span>
                    <span className="font-mono tabular-nums text-xs text-muted-foreground">
                      {s.duration_ms}ms
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ScanSummaryDialog
        scan={summaryScan}
        open={!!summaryScan}
        mode={postScanOpen ? "post-scan" : "recent"}
        onOpenChange={(o) => {
          if (!o) {
            setSummaryScan(null);
            setPostScanOpen(false);
          }
        }}
      />
    </div>
  );
}

// ---------- subcomponents ----------

function ScanProgress({
  currentStage,
  stageDurations,
}: {
  currentStage: number;
  stageDurations: number[];
}) {
  const totalWeight = STAGES.length;
  const pct = Math.min(100, ((currentStage + 1) / totalWeight) * 100);
  const active = STAGES[currentStage];

  return (
    <div className="mt-6 animate-fade-up" aria-live="polite" aria-atomic="true">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 font-medium">
          <Sparkles className="h-3.5 w-3.5 text-info" />
          {active?.label}…
        </span>
        <span className="font-mono tabular-nums text-muted-foreground">{Math.round(pct)}%</span>
      </div>

      <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-hover-surface">
        <div
          className="relative h-full rounded-full bg-gradient-to-r from-emerald-400 via-info to-violet-400 transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        >
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1/3 animate-scan-sweep bg-gradient-to-r from-transparent via-white/50 to-transparent"
          />
        </div>
      </div>

      <ol className="mt-4 grid gap-2 sm:grid-cols-2">
        {STAGES.map((s, i) => {
          const done = i < currentStage;
          const doing = i === currentStage;
          return (
            <li
              key={s.label}
              className={cn(
                "group relative flex items-start gap-2.5 overflow-hidden rounded-lg border px-3 py-2.5 transition-all duration-500",
                done && "border-emerald-500/30 bg-emerald-500/5",
                doing && "border-info/40 bg-info/10 shadow-[0_0_0_1px_var(--info)]/20",
                !done && !doing && "border-border bg-background/40 opacity-60",
              )}
            >
              {doing && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/2 animate-scan-sweep bg-gradient-to-r from-transparent via-info/15 to-transparent"
                />
              )}
              <span
                className={cn(
                  "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all",
                  done && "animate-stage-pop bg-emerald-500/25 text-emerald-400",
                  doing && "bg-info/25 text-info ring-2 ring-info/30",
                  !done && !doing && "bg-hover-surface text-muted-foreground",
                )}
                aria-hidden
              >
                {done ? (
                  <Check className="h-3 w-3" />
                ) : doing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
              </span>
              <div className="relative min-w-0">
                <p className={cn("text-xs font-medium", doing && "text-foreground")}>{s.label}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{s.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {/* stageDurations kept in scope so callers know we consumed them */}
      <span className="sr-only">Stage duration ms: {stageDurations.join(",")}</span>
    </div>
  );
}

function LimitReached({ usage }: { usage: { used: number; limit: number } }) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <div>
        <h3 className="text-lg font-semibold">Monthly limit reached</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          You&apos;ve used all{" "}
          <span className="font-mono tabular-nums text-foreground">{usage.used}</span> of your{" "}
          <span className="font-mono tabular-nums text-foreground">{usage.limit}</span> free scans
          this month. Upgrade for unlimited scans, saved reports, and team alerts.
        </p>
      </div>

      <div className="flex w-full max-w-sm items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hover-surface">
          <div
            className="h-full rounded-full bg-amber-400"
            style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
          />
        </div>
        <span className="font-mono tabular-nums text-xs text-muted-foreground">
          {usage.used}/{usage.limit}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setUpgradeOpen(true)}
          className="ring-focus inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-foreground px-5 text-sm font-semibold text-background transition-transform hover:scale-[1.02] active:scale-[0.97]"
        >
          Upgrade for unlimited scans
          <ArrowRight className="h-4 w-4" />
        </button>
        <Link
          to="/home"
          className="ring-focus inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-hover-surface"
        >
          Back to dashboard
        </Link>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Your quota resets on the 1st of next month.
      </p>
      <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}

function VerdictDot({ verdict }: { verdict: Scan["verdict"] }) {
  const cls =
    verdict === "safe"
      ? "bg-emerald-400"
      : verdict === "suspicious"
        ? "bg-amber-400"
        : "bg-destructive";
  return (
    <span aria-label={verdict} className="relative inline-flex h-2 w-2 shrink-0">
      <span className={cn("absolute inset-0 rounded-full", cls)} />
    </span>
  );
}

function RecentSkeleton() {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 px-5 py-4">
          <span className="h-2 w-2 shrink-0 rounded-full bg-hover-surface" />
          <span className="h-3 flex-1 animate-shimmer rounded-md bg-hover-surface" />
          <span className="hidden h-3 w-14 animate-shimmer rounded-md bg-hover-surface sm:inline-block" />
          <span className="h-3 w-10 animate-shimmer rounded-md bg-hover-surface" />
        </li>
      ))}
    </ul>
  );
}

function EmptyRecent() {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-alt/60 text-muted-foreground">
        <ScanLine className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium">No scans yet</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        Your submitted URLs will show up here for one-click re-open.
      </p>
    </div>
  );
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function UrlAnalysisResultCard({ data }: { data: LookupData }) {
  const isSafe = data.verdict === "safe";
  const isDangerous = data.verdict === "dangerous";
  const isSuspicious = data.verdict === "suspicious";

  // Requirement 5: Dynamic styling based on status
  const theme = isSafe
    ? {
        border: "border-emerald-500/40",
        bg: "bg-emerald-950/20",
        headerBadge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        textAccent: "text-emerald-400",
        icon: <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />,
        shadow: "shadow-[0_0_24px_rgba(16,185,129,0.08)]",
      }
    : isDangerous
      ? {
          border: "border-rose-500/40",
          bg: "bg-rose-950/20",
          headerBadge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
          textAccent: "text-rose-400",
          icon: <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />,
          shadow: "shadow-[0_0_24px_rgba(244,63,94,0.08)]",
        }
      : isSuspicious
        ? {
            border: "border-amber-500/40",
            bg: "bg-amber-950/20",
            headerBadge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
            textAccent: "text-amber-400",
            icon: <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />,
            shadow: "shadow-[0_0_24px_rgba(245,158,11,0.08)]",
          }
        : {
            border: "border-slate-500/30",
            bg: "bg-slate-500/10",
            headerBadge: "bg-slate-500/20 text-slate-300 border-slate-500/30",
            textAccent: "text-slate-300",
            icon: <ShieldQuestion className="h-5 w-5 text-slate-400 shrink-0" />,
            shadow: "shadow-[0_0_20px_rgba(148,163,184,0.05)]",
          };

  const domain =
    data.domain ||
    (() => {
      try {
        const u = data.url.startsWith("http") ? data.url : `https://${data.url}`;
        return new URL(u).hostname.replace(/^www\./, "");
      } catch {
        return data.url;
      }
    })();

  const formattedFirstDetected = data.first_detected_at
    ? new Date(data.first_detected_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Recent";

  return (
    <div
      className={cn(
        "mt-4 rounded-xl border p-5 transition-all",
        theme.border,
        theme.bg,
        theme.shadow,
      )}
    >
      {/* Header Badge & Privacy Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          {theme.icon}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("text-sm font-semibold tracking-wide", theme.textAccent)}>
                {data.in_history ? "Already in Your Scan History" : "Analysis Available"}
              </span>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
                  theme.headerBadge,
                )}
              >
                {data.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.in_history
                ? `Your last scan: ${
                    data.personal_last_scanned
                      ? new Date(data.personal_last_scanned).toLocaleString()
                      : "Recently"
                  }`
                : "Showing the latest verified analysis from URL Defender Threat Intelligence."}
            </p>
          </div>
        </div>

        {(data.id || data.global_analysis_id) && (
          <Link
            to={`/scan/${data.id || data.global_analysis_id}/result`}
            className="ring-focus inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-all hover:bg-hover-surface hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>View report</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        )}
      </div>

      {/* URL Technical Details Grid */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs sm:grid-cols-4 lg:grid-cols-5">
        <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Domain
          </span>
          <p className="mt-1 truncate font-mono font-semibold text-foreground">{domain}</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Status
          </span>
          <p className={cn("mt-1 font-semibold", theme.textAccent)}>{data.status}</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Risk Score
          </span>
          <p className="mt-1 font-mono font-semibold text-foreground">{data.risk_score} / 100</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Threat Category
          </span>
          <p className="mt-1 truncate font-medium text-foreground">
            {data.category || "Clean / Safe"}
          </p>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Threat Type
          </span>
          <p className="mt-1 truncate font-medium text-foreground">{data.threat_type}</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            SSL Status
          </span>
          <p className="mt-1 font-medium capitalize text-foreground">{data.ssl_status}</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Redirect Count
          </span>
          <p className="mt-1 font-mono font-medium text-foreground">{data.redirect_count}</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            First Detection
          </span>
          <p className="mt-1 font-medium text-foreground">{formattedFirstDetected}</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Last Analysis
          </span>
          <p className="mt-1 font-medium text-foreground">
            {data.last_analysis_status || "Recent"}
          </p>
        </div>
        <div className="col-span-2 rounded-lg border border-border/40 bg-background/50 p-2.5 sm:col-span-2 lg:col-span-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Source
          </span>
          <p className="mt-1 truncate font-medium text-foreground">
            {data.source || "URL Defender Threat Intelligence"}
          </p>
        </div>
      </div>
    </div>
  );
}
