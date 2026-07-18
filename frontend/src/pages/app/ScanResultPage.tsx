import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ArrowLeft,
  RefreshCw,
  Download,
  Check,
  X,
  Lock,
  Calendar,
  ListChecks,
  Server,
  ChevronDown,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

import { fetchScanResultById, createScan, type ScanReport } from "@/lib/dashboard-store";
import { type ScanResult } from "@/lib/mock/scan-results";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LoadState =
  { status: "loading" } | { status: "not-found" } | { status: "ready"; report: ScanReport };

export default function ScanResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchScanResultById(id).then((result) => {
      if (cancelled) return;
      if (!result) return setState({ status: "not-found" });
      setState({ status: "ready", report: result });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === "loading") return <ResultSkeleton />;
  if (state.status === "not-found") return <NotFound />;

  const { result, history, analysis } = state.report;

  async function handleRescan() {
    try {
      const fresh = await createScan(result.url);
      toast.success("Scan complete", { description: "Opening the fresh report." });
      navigate(`/scan/${fresh.id}/result`);
    } catch (err) {
      if ((err as Error).message === "MONTHLY_LIMIT_REACHED") {
        toast.error("Monthly scan limit reached", {
          description: "Upgrade to keep scanning this month.",
        });
        navigate("/scan");
      } else {
        toast.error("Rescan failed. Try again.");
      }
    }
  }

  function handleExport() {
    try {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `urldefender-report-${result.id}.json`;
      a.click();
      URL.revokeObjectURL(href);
      toast.success("Report exported");
    } catch {
      toast.error("Export failed");
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/scan"
          className="ring-focus inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-hover-surface hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to scanner
        </Link>
        <div className="flex items-center gap-2">
          <OpenUrlButton url={result.url} verdict={result.verdict} />
          <button
            type="button"
            onClick={handleRescan}
            className="ring-focus inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-hover-surface"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Rescan
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="ring-focus inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-semibold text-background hover:scale-[1.02] active:scale-[0.97] transition-transform"
          >
            <Download className="h-3.5 w-3.5" />
            Export report
          </button>
        </div>
      </div>

      {/* Hero: badge + gauge */}
      <VerdictHero result={result} history={history} analysis={analysis} />

      {/* Stat rows */}
      <StatRows result={result} analysis={analysis} />

      {/* Engines + recommendations */}
      <section className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <EnginesPanel result={result} />
        <RecommendationsPanel result={result} />
      </section>

      {/* Timeline */}
      <Timeline history={history} analysis={analysis} />

      {/* Technical Details */}
      <TechnicalDetails result={result} />
    </div>
  );
}

// ---------- hero ----------

function VerdictHero({
  result,
  history,
  analysis,
}: {
  result: ScanResult;
  history: ScanReport["history"];
  analysis: ScanReport["analysis"];
}) {
  const reduce = useReducedMotion();
  const isSafe = result.verdict === "safe";
  const isDanger = result.verdict === "dangerous";
  const tone = isSafe
    ? {
        text: "SAFE",
        ring: "ring-emerald-500/40",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        fg: "text-emerald-400",
        stroke: "stroke-emerald-400",
        Icon: ShieldCheck,
        glow: "glow-green",
      }
    : isDanger
      ? {
          text: "DANGEROUS",
          ring: "ring-destructive/40",
          bg: "bg-destructive/10",
          border: "border-destructive/30",
          fg: "text-destructive",
          stroke: "stroke-destructive",
          Icon: ShieldAlert,
          glow: "glow-red",
        }
      : result.verdict === "suspicious"
        ? {
            text: "SUSPICIOUS",
            ring: "ring-amber-500/40",
            bg: "bg-amber-500/10",
            border: "border-amber-500/30",
            fg: "text-amber-400",
            stroke: "stroke-amber-400",
            Icon: AlertTriangle,
            glow: "",
          }
        : {
            text: "UNKNOWN",
            ring: "ring-slate-400/30",
            bg: "bg-slate-500/10",
            border: "border-slate-400/30",
            fg: "text-slate-300",
            stroke: "stroke-slate-300",
            Icon: ShieldQuestion,
            glow: "",
          };

  const score = useCountUp(result.risk_score, reduce ? 0 : 900);

  return (
    <section
      className={cn(
        "mt-6 grid gap-6 rounded-2xl border p-6 sm:p-8 md:grid-cols-[auto_1fr_auto] md:items-center",
        tone.bg,
        tone.border,
      )}
    >
      {/* Badge */}
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-center",
          tone.bg,
          tone.border,
          !reduce && "animate-scan-badge",
        )}
      >
        <span
          className={cn(
            "inline-flex h-16 w-16 items-center justify-center rounded-full ring-4",
            tone.ring,
            tone.bg,
            tone.fg,
            !reduce && tone.glow,
          )}
        >
          <tone.Icon className="h-8 w-8" />
        </span>
        <span className={cn("font-display text-lg font-bold tracking-widest", tone.fg)}>
          {tone.text}
        </span>
      </div>

      {/* URL + category */}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Scanned URL
        </p>
        <h1
          className="mt-1 truncate font-mono text-lg text-foreground sm:text-xl"
          title={result.url}
        >
          {result.url}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
              tone.border,
              tone.bg,
              tone.fg,
            )}
          >
            {result.threat_category}
          </span>
          <span className="text-xs text-muted-foreground">
            Analyzed in{" "}
            <span className="font-mono tabular-nums text-foreground">{result.duration_ms}ms</span>
          </span>
        </div>
        <div className="mt-4 rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
          {history.is_personal ? (
            <>
              <span className="font-semibold text-foreground">Already in Your Scan History</span>
              {history.last_scanned_at && (
                <> · Your last scan {new Date(history.last_scanned_at).toLocaleString()}</>
              )}
            </>
          ) : (
            <>
              <span className="font-semibold text-foreground">Analysis Available</span>
              <> · Showing the latest verified analysis from URL Defender Threat Intelligence.</>
            </>
          )}
          {analysis.source === "shared_threat_intelligence" && (
            <span className="block mt-1">Source: Shared Threat Intelligence</span>
          )}
        </div>
      </div>

      {/* Risk gauge */}
      <RiskGauge score={score} target={result.risk_score} tone={tone} />

      <style>{`
        @keyframes scan-badge-in {
          0%   { opacity: 0; transform: scale(0.82); }
          60%  { opacity: 1; transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-scan-badge { animation: scan-badge-in 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .animate-scan-badge { animation: none !important; }
        }
      `}</style>
    </section>
  );
}

function RiskGauge({
  score,
  target,
  tone,
}: {
  score: number;
  target: number;
  tone: { stroke: string; fg: string };
}) {
  const size = 132;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, target)) / 100) * c;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="stroke-hover-surface"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            className={cn("transition-[stroke-dashoffset] duration-1000 ease-out", tone.stroke)}
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-display text-4xl font-bold tabular-nums", tone.fg)}>
            {score}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Risk / 100
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------- stat rows ----------

function StatRows({ result, analysis }: { result: ScanResult; analysis: ScanReport["analysis"] }) {
  const sslTone: Record<ScanResult["ssl"]["status"], string> = {
    valid: "text-emerald-400",
    expired: "text-destructive",
    "self-signed": "text-destructive",
    invalid: "text-destructive",
  };

  const domainAgeLabel =
    result.domain_age_days < 30
      ? `${result.domain_age_days}d — newly registered`
      : result.domain_age_days < 365
        ? `${Math.round(result.domain_age_days / 30)}mo`
        : `${(result.domain_age_days / 365).toFixed(1)}y`;

  const domainAgeTone =
    result.domain_age_days < 30
      ? "text-destructive"
      : result.domain_age_days < 180
        ? "text-amber-400"
        : "text-emerald-400";

  const blTone = result.blacklist.listed_on === 0 ? "text-emerald-400" : "text-destructive";

  const domain = (() => {
    try {
      return new URL(result.url).hostname;
    } catch {
      return result.hostname;
    }
  })();
  const threatType =
    result.blacklist.sources[0] ??
    (result.verdict === "safe" ? "No threat detected" : "Threat signal detected");
  const firstDetection = analysis.first_detected_at
    ? new Date(analysis.first_detected_at).toLocaleDateString()
    : "Unavailable";

  return (
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCell icon={Server} label="Domain" value={domain} tone="text-foreground" />
      <StatCell
        icon={AlertTriangle}
        label="Threat category"
        value={result.threat_category}
        tone={result.verdict === "safe" ? "text-emerald-400" : "text-destructive"}
      />
      <StatCell
        icon={AlertTriangle}
        label="Threat type"
        value={threatType}
        tone={
          result.verdict === "safe"
            ? "text-emerald-400"
            : result.verdict === "dangerous"
              ? "text-destructive"
              : "text-amber-400"
        }
      />
      <StatCell
        icon={Lock}
        label="SSL status"
        value={
          result.ssl.status === "valid"
            ? "Valid certificate"
            : result.ssl.status === "expired"
              ? "Expired"
              : result.ssl.status === "self-signed"
                ? "Self-signed"
                : "Invalid"
        }
        sub={result.ssl.issuer}
        tone={sslTone[result.ssl.status]}
      />
      <StatCell
        icon={ListChecks}
        label="Redirect count"
        value={String(Math.max(0, result.redirect_chain.length - 1))}
        sub={result.redirect_chain.length > 1 ? "Redirects detected" : "No redirects"}
        tone={result.redirect_chain.length > 1 ? "text-amber-400" : "text-emerald-400"}
      />
      <StatCell
        icon={Calendar}
        label="First detection date"
        value={firstDetection}
        sub="Global threat intelligence"
        tone="text-foreground"
      />
      <StatCell
        icon={Check}
        label="Last analysis status"
        value={analysis.last_analysis_status}
        tone="text-emerald-400"
      />
      <StatCell
        icon={ShieldCheck}
        label="Source"
        value={
          analysis.source === "shared_threat_intelligence"
            ? "Shared Threat Intelligence"
            : "URL Defender"
        }
        tone="text-info"
      />
      <StatCell
        icon={Calendar}
        label="Domain age"
        value={domainAgeLabel}
        sub={`Registered ${new Date(Date.now() - result.domain_age_days * 86_400_000)
          .toISOString()
          .slice(0, 10)}`}
        tone={domainAgeTone}
      />
      <StatCell
        icon={ListChecks}
        label="Blacklist status"
        value={
          result.blacklist.listed_on === 0 ? "Clean" : `Listed on ${result.blacklist.listed_on}`
        }
        sub={`of ${result.blacklist.total_lists} sources`}
        tone={blTone}
      />
    </section>
  );
}

function StatCell({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Lock;
  label: string;
  value: string;
  sub?: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={cn("mt-2 truncate text-[15px] font-semibold", tone)} title={value}>
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ---------- engines panel ----------

function EnginesPanel({ result }: { result: ScanResult }) {
  const flagged = result.engines.filter((e) => e.flagged).length;
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold">Detection engines</h3>
          <p className="text-xs text-muted-foreground">
            {flagged === 0 ? "All clean" : `${flagged} of ${result.engines.length} flagged`}
          </p>
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {result.engines.length - flagged}/{result.engines.length} clean
        </span>
      </div>
      <ul className="grid gap-px bg-border sm:grid-cols-2">
        {result.engines.map((e) => (
          <li key={e.name} className="flex items-center gap-3 bg-card px-5 py-3">
            <span
              className={cn(
                "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                e.flagged
                  ? "bg-destructive/10 text-destructive"
                  : "bg-emerald-500/10 text-emerald-400",
              )}
              aria-hidden
            >
              {e.flagged ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{e.name}</p>
            </div>
            <span
              className={cn(
                "font-mono text-[10px] uppercase tracking-widest",
                e.flagged ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {e.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- recommendations ----------

function RecommendationsPanel({ result }: { result: ScanResult }) {
  const isSafe = result.verdict === "safe";
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-full",
            isSafe ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400",
          )}
        >
          {isSafe ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
        </span>
        <div>
          <h3 className="text-sm font-semibold">Recommendations</h3>
          <p className="text-xs text-muted-foreground">What to do next based on this result</p>
        </div>
      </div>
      <ul className="mt-4 space-y-3">
        {result.recommendations.map((r, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span
              className={cn(
                "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                isSafe ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400",
              )}
            >
              {i + 1}
            </span>
            <p className="text-[13px] leading-relaxed text-foreground/90">{r}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- timeline ----------

function Timeline({
  history,
  analysis,
}: {
  history: ScanReport["history"];
  analysis: ScanReport["analysis"];
}) {
  const items = [
    {
      label: "First detection",
      value: analysis.first_detected_at
        ? new Date(analysis.first_detected_at).toLocaleDateString()
        : "Unavailable",
      hint: "Anonymous shared threat intelligence record",
    },
    {
      label: "Analysis availability",
      value: analysis.last_analysis_status,
      hint: "Latest verified URL analysis status",
    },
    ...(history.is_personal && history.last_scanned_at
      ? [
          {
            label: "Your last scan",
            value: new Date(history.last_scanned_at).toLocaleString(),
            hint: "Visible only in your private scan history",
          },
        ]
      : []),
  ];
  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-6">
      <h3 className="text-sm font-semibold">Analysis details</h3>
      <ol className="mt-5 space-y-4">
        {items.map((it, i) => (
          <li key={it.label} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold">
                {i + 1}
              </span>
              {i < items.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{it.label}</p>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {it.value}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{it.hint}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------- technical details ----------

function TechnicalDetails({ result }: { result: ScanResult }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="tech-details-panel"
        className="ring-focus flex w-full items-center justify-between gap-3 px-6 py-4 text-left hover:bg-hover-surface/50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Server className="h-4 w-4 text-muted-foreground" />
          Technical details
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          id="tech-details-panel"
          className="grid gap-5 border-t border-border p-6 font-mono text-[12px]"
        >
          <TechRow label="IP address" value={result.ip_address} />
          <TechRow label="Hostname" value={result.hostname} />
          <TechRow
            label="SSL issuer"
            value={`${result.ssl.issuer} · expires ${result.ssl.expires_at.slice(0, 10)}`}
          />
          <div>
            <p className="mb-2 font-sans text-[11px] uppercase tracking-widest text-muted-foreground">
              Redirect chain
            </p>
            <ol className="space-y-1">
              {result.redirect_chain.map((u, i) => (
                <li key={i} className="flex gap-2 truncate">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span className="truncate">{u}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="mb-2 font-sans text-[11px] uppercase tracking-widest text-muted-foreground">
              Response headers
            </p>
            <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 leading-relaxed">
              {Object.entries(result.headers)
                .map(([k, v]) => `${k}: ${v}`)
                .join("\n")}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}

function TechRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
      <span className="font-sans text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="break-all text-foreground/90">{value}</span>
    </div>
  );
}

// ---------- skeleton ----------

function ResultSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <span className="h-4 w-32 animate-shimmer rounded-md bg-hover-surface" />
        <div className="flex gap-2">
          <span className="h-9 w-24 animate-shimmer rounded-md bg-hover-surface" />
          <span className="h-9 w-32 animate-shimmer rounded-md bg-hover-surface" />
        </div>
      </div>
      <div className="mt-6 grid gap-6 rounded-2xl border border-border bg-card p-8 md:grid-cols-[auto_1fr_auto]">
        <span className="h-32 w-32 animate-shimmer rounded-2xl bg-hover-surface" />
        <div className="space-y-3">
          <span className="block h-3 w-24 animate-shimmer rounded-md bg-hover-surface" />
          <span className="block h-6 w-3/4 animate-shimmer rounded-md bg-hover-surface" />
          <span className="block h-4 w-1/2 animate-shimmer rounded-md bg-hover-surface" />
        </div>
        <span className="h-32 w-32 animate-shimmer rounded-full bg-hover-surface" />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-shimmer rounded-xl bg-hover-surface" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="h-80 animate-shimmer rounded-xl bg-hover-surface" />
        <div className="h-80 animate-shimmer rounded-xl bg-hover-surface" />
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-lg flex-col items-center justify-center px-6 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
        <ShieldQuestion className="h-6 w-6" />
      </span>
      <h1 className="mt-6 text-display text-2xl">Scan not found</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This scan report doesn&apos;t exist or was cleared from local storage.
      </p>
      <Link
        to="/scan"
        className="ring-focus mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-5 text-sm font-semibold text-background hover:scale-[1.02] active:scale-[0.97] transition-transform"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to scanner
      </Link>
    </div>
  );
}

// ---------- open url ----------

function OpenUrlButton({ url, verdict }: { url: string; verdict: ScanResult["verdict"] }) {
  const isSafe = verdict === "safe";
  const isDanger = verdict === "dangerous";

  if (isDanger) {
    return (
      <button
        type="button"
        disabled
        title="Opening this URL is blocked because it was classified as dangerous."
        className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-xs font-semibold text-destructive opacity-80"
      >
        <ShieldAlert className="h-3.5 w-3.5" />
        Open blocked
      </button>
    );
  }

  const onClick = (e: React.MouseEvent) => {
    if (isSafe) return;
    e.preventDefault();
    const ok = window.confirm(
      `This URL was flagged as ${verdict.toUpperCase()}.\n\n${url}\n\nOpen it anyway in a new tab?`,
    );
    if (ok) window.open(url, "_blank", "noopener,noreferrer");
  };
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={cn(
        "ring-focus inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-hover-surface",
        isSafe ? "border-border bg-background" : "border-amber-500/40 text-amber-400",
      )}
      title={isSafe ? "Open URL in a new tab" : "Flagged URL — opens with confirmation"}
    >
      <ExternalLink className="h-3.5 w-3.5" />
      {isSafe ? "Open URL" : "Open anyway"}
    </a>
  );
}
