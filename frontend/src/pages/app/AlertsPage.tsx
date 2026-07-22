import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useAlertsSearch, type AlertsSearchParams } from "@/hooks/use-search";
import {
  AlertTriangle,
  ShieldAlert,
  ShieldQuestion,
  ShieldCheck,
  Search,
  Trash2,
  RefreshCw,
  Eye,
  ScanLine,
  Bell,
  Filter as FilterIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { fetchAlerts, fetchScans, createScan, deleteScan } from "@/lib/dashboard-store";
import type { Alert, AlertSeverity, AlertType } from "@/lib/mock/alerts";
import type { Scan, ScanVerdict } from "@/lib/mock/scans";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScanSummaryDialog } from "@/components/app/scan-summary-dialog";

const PAGE_SIZE = 12;

export default function AlertsPage() {
  const search = useAlertsSearch();
  const tab = search.tab;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Security
          </p>
          <h1 className="mt-1 text-display text-2xl sm:text-3xl">Alerts &amp; History</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every flagged URL and your complete scan history — filterable and shareable.
          </p>
        </div>
        <Link
          to="/scan"
          className="ring-focus inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-3.5 text-xs font-semibold text-background transition-transform hover:scale-[1.02] active:scale-[0.97]"
        >
          <ScanLine className="h-3.5 w-3.5" />
          New scan
        </Link>
      </header>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Alerts and history"
        className="mt-6 inline-flex rounded-lg border border-border bg-card p-1"
      >
        {(["alerts", "history"] as const).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("tab", t);
                next.set("page", "1");
                setSearchParams(next, { replace: true });
              }}
              className={cn(
                "ring-focus inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "alerts" ? (
                <Bell className="h-3.5 w-3.5" />
              ) : (
                <ScanLine className="h-3.5 w-3.5" />
              )}
              {t === "alerts" ? "Alerts" : "History"}
            </button>
          );
        })}
      </div>

      <div className="mt-6">{tab === "alerts" ? <AlertsTab /> : <HistoryTab />}</div>
    </div>
  );
}

// ---------- ALERTS TAB ----------

const SEVERITY: Record<AlertSeverity, { label: string; cls: string; dot: string }> = {
  critical: {
    label: "Critical",
    cls: "border-destructive/40 bg-destructive/15 text-destructive",
    dot: "bg-destructive",
  },
  high: {
    label: "High",
    cls: "border-destructive/30 bg-destructive/10 text-destructive",
    dot: "bg-destructive/80",
  },
  medium: {
    label: "Medium",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    dot: "bg-amber-400",
  },
  low: {
    label: "Low",
    cls: "border-amber-500/20 bg-amber-500/5 text-amber-300",
    dot: "bg-amber-300",
  },
};

const TYPE_ICON: Record<AlertType, typeof ShieldAlert> = {
  phishing: ShieldAlert,
  malware: AlertTriangle,
  impersonation: ShieldQuestion,
  blacklist: ShieldAlert,
  ssl: ShieldQuestion,
};

const TYPE_LABEL: Record<AlertType, string> = {
  phishing: "Phishing",
  malware: "Malware",
  impersonation: "Fake Login",
  blacklist: "Blacklist",
  ssl: "SSL Anomaly",
};

function AlertsTab() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);

  useEffect(() => {
    Promise.all([fetchAlerts(), fetchScans()]).then(([a, s]) => {
      setAlerts(a);
      setScans(s);
    });
  }, []);

  if (alerts === null) return <AlertsSkeleton />;
  if (alerts.length === 0) return <EmptyAlerts />;

  // map alert id → scan id (alert ids are `alert_<scanId>`)
  function scanIdForAlert(a: Alert): string | null {
    const scanId = a.id.replace(/^alert_/, "");
    return scans.some((s) => s.id === scanId) ? scanId : null;
  }

  return (
    <ul className="grid gap-3">
      {alerts.map((a) => {
        const sev = SEVERITY[a.severity];
        const Icon = TYPE_ICON[a.type];
        const scanId = scanIdForAlert(a);
        return (
          <li
            key={a.id}
            className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:p-5"
          >
            <span
              className={cn(
                "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                sev.cls,
              )}
              aria-hidden
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{a.title}</p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
                    sev.cls,
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", sev.dot)} />
                  {sev.label}
                </span>
                <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {TYPE_LABEL[a.type]}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
              <p className="mt-1 truncate font-mono text-[12px] text-foreground/80" title={a.url}>
                {a.url}
              </p>
            </div>
            <div className="flex items-center gap-3 sm:flex-col sm:items-end">
              <time className="text-[11px] text-muted-foreground">
                {new Date(a.created_at).toLocaleString()}
              </time>
              {scanId ? (
                <Link
                  to={`/scan/${scanId}/result`}
                  className="ring-focus inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-hover-surface"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View details
                </Link>
              ) : (
                <span className="text-[11px] text-muted-foreground">Scan unavailable</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyAlerts() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-6 py-16 text-center">
      <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
        <ShieldCheck className="h-7 w-7" />
        <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-border bg-background text-emerald-400">
          <svg
            viewBox="0 0 24 24"
            className="h-2.5 w-2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      </span>
      <div>
        <p className="text-sm font-semibold">No alerts — you&apos;re all clear</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
          Alerts show up here whenever a scan flags a URL as suspicious or dangerous.
        </p>
      </div>
      <Link
        to="/scan"
        className="ring-focus inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-transform hover:scale-[1.02] active:scale-[0.97]"
      >
        <ScanLine className="h-3.5 w-3.5" />
        Run a scan
      </Link>
    </div>
  );
}

function AlertsSkeleton() {
  return (
    <ul className="grid gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
          <span className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-hover-surface" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-hover-surface" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-hover-surface" />
          </div>
          <div className="hidden h-8 w-24 animate-pulse rounded bg-hover-surface sm:block" />
        </li>
      ))}
    </ul>
  );
}

// ---------- HISTORY TAB ----------

const VERDICT_META: Record<ScanVerdict, { label: string; cls: string; dot: string }> = {
  safe: {
    label: "Safe",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    dot: "bg-emerald-400",
  },
  suspicious: {
    label: "Suspicious",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    dot: "bg-amber-400",
  },
  dangerous: {
    label: "Dangerous",
    cls: "border-destructive/30 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
};

function riskBucket(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 85) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function HistoryTab() {
  const search = useAlertsSearch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [scans, setScans] = useState<Scan[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Scan | null>(null);
  const [summary, setSummary] = useState<Scan | null>(null);
  const [rescanning, setRescanning] = useState<string | null>(null);

  async function refresh() {
    const s = await fetchScans();
    setScans(s);
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    if (!scans) return [];
    const q = search.q.trim().toLowerCase();
    const from = search.from ? Date.parse(search.from) : null;
    const to = search.to ? Date.parse(search.to) + 86_400_000 - 1 : null;
    return scans.filter((s) => {
      if (q && !s.url.toLowerCase().includes(q)) return false;
      if (search.status !== "all" && s.verdict !== search.status) return false;
      if (search.risk !== "all" && riskBucket(s.risk_score) !== search.risk) return false;
      const t = new Date(s.scanned_at).getTime();
      if (from !== null && t < from) return false;
      if (to !== null && t > to) return false;
      return true;
    });
  }, [scans, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(search.page, totalPages);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function updateSearch(patch: Partial<AlertsSearchParams>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") {
        next.delete(k);
      } else {
        next.set(k, String(v));
      }
    });
    if (!patch.page) {
      next.set("page", "1");
    }
    setSearchParams(next, { replace: true });
  }

  async function handleRescan(s: Scan) {
    setRescanning(s.id);
    try {
      const fresh = await createScan(s.url);
      toast.success("Scan complete", { description: fresh.url });
      await refresh();
    } catch (err) {
      if ((err as Error).message === "MONTHLY_LIMIT_REACHED") {
        toast.error("Monthly scan limit reached");
      } else {
        toast.error("Rescan failed. Try again.");
      }
    } finally {
      setRescanning(null);
    }
  }

  async function handleDelete(s: Scan) {
    await deleteScan(s.id);
    setConfirmDelete(null);
    toast.success("Scan deleted");
    await refresh();
  }

  const filtersActive =
    search.q !== "" ||
    search.status !== "all" ||
    search.risk !== "all" ||
    search.from !== "" ||
    search.to !== "";

  if (scans === null) return <HistorySkeleton />;

  return (
    <section aria-labelledby="history-heading" className="space-y-4">
      <h2 id="history-heading" className="sr-only">
        Scan history
      </h2>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_auto_auto_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search.q}
              onChange={(e) => updateSearch({ q: e.target.value })}
              placeholder="Search by URL…"
              aria-label="Search history by URL"
              className="ring-focus h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground/70"
            />
          </div>
          <SelectFilter
            label="Status"
            value={search.status}
            onChange={(v) => updateSearch({ status: v as typeof search.status })}
            options={[
              { v: "all", l: "All statuses" },
              { v: "safe", l: "Safe" },
              { v: "suspicious", l: "Suspicious" },
              { v: "dangerous", l: "Dangerous" },
            ]}
          />
          <SelectFilter
            label="Risk"
            value={search.risk}
            onChange={(v) => updateSearch({ risk: v as typeof search.risk })}
            options={[
              { v: "all", l: "All risk" },
              { v: "low", l: "Low" },
              { v: "medium", l: "Medium" },
              { v: "high", l: "High" },
              { v: "critical", l: "Critical" },
            ]}
          />
          <DateFilter
            label="From"
            value={search.from}
            onChange={(v) => updateSearch({ from: v })}
          />
          <DateFilter label="To" value={search.to} onChange={(v) => updateSearch({ to: v })} />
          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("q", "");
                next.set("status", "all");
                next.set("risk", "all");
                next.set("from", "");
                next.set("to", "");
                next.set("page", "1");
                setSearchParams(next, { replace: true });
              }}
              className="ring-focus inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-hover-surface"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <FilterIcon className="h-3 w-3" />
          Showing {filtered.length} of {scans.length}
        </p>
      </div>

      {/* Table / cards */}
      {scans.length === 0 ? (
        <EmptyHistory />
      ) : filtered.length === 0 ? (
        <NoMatches />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-3 font-medium">URL</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Threat</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((s) => {
                  const v = VERDICT_META[s.verdict];
                  const rb = riskBucket(s.risk_score);
                  return (
                    <tr
                      key={s.id}
                      className="border-t border-border transition-colors hover:bg-hover-surface/50"
                    >
                      <td className="max-w-[420px] truncate px-5 py-3 font-mono text-[13px]">
                        {s.url}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                            v.cls,
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", v.dot)} />
                          {v.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span
                          className={cn(
                            "font-semibold uppercase tracking-widest",
                            rb === "critical" || rb === "high"
                              ? "text-destructive"
                              : rb === "medium"
                                ? "text-amber-400"
                                : "text-muted-foreground",
                          )}
                        >
                          {rb}
                        </span>
                        <span className="ml-2 font-mono tabular-nums text-muted-foreground">
                          {s.risk_score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(s.scanned_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/scan/${s.id}/result`}
                            aria-label={`View report for ${s.url}`}
                            className="ring-focus inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background hover:bg-hover-surface"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setSummary(s)}
                            aria-label={`Quick view ${s.url}`}
                            className="ring-focus inline-flex h-8 items-center rounded-md border border-border bg-background px-2 text-[11px] font-medium hover:bg-hover-surface"
                          >
                            Summary
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRescan(s)}
                            disabled={rescanning === s.id}
                            aria-label={`Rescan ${s.url}`}
                            className="ring-focus inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background hover:bg-hover-surface disabled:opacity-60"
                          >
                            <RefreshCw
                              className={cn("h-3.5 w-3.5", rescanning === s.id && "animate-spin")}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(s)}
                            aria-label={`Delete scan of ${s.url}`}
                            className="ring-focus inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="grid gap-3 md:hidden">
            {pageRows.map((s) => {
              const v = VERDICT_META[s.verdict];
              return (
                <li key={s.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 break-all font-mono text-[13px]">{s.url}</p>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        v.cls,
                      )}
                    >
                      {v.label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{new Date(s.scanned_at).toLocaleDateString()}</span>
                    <span className="font-mono tabular-nums">Risk {s.risk_score}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      to={`/scan/${s.id}/result`}
                      className="ring-focus inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-hover-surface"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRescan(s)}
                      disabled={rescanning === s.id}
                      className="ring-focus inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-hover-surface disabled:opacity-60"
                    >
                      <RefreshCw
                        className={cn("h-3.5 w-3.5", rescanning === s.id && "animate-spin")}
                      />
                      Rescan
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(s)}
                      aria-label={`Delete scan of ${s.url}`}
                      className="ring-focus inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              aria-label="Pagination"
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-xs"
            >
              <span className="text-muted-foreground">
                Page <span className="font-mono tabular-nums text-foreground">{page}</span> of{" "}
                <span className="font-mono tabular-nums text-foreground">{totalPages}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set("page", String(Math.max(1, page - 1)));
                    setSearchParams(next, { replace: true });
                  }}
                  className="ring-focus inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2.5 hover:bg-hover-surface disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set("page", String(Math.min(totalPages, page + 1)));
                    setSearchParams(next, { replace: true });
                  }}
                  className="ring-focus inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2.5 hover:bg-hover-surface disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </nav>
          )}
        </>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete scan?</DialogTitle>
            <DialogDescription>
              This removes the scan and its report from your history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {confirmDelete && (
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <p className="break-all font-mono text-[13px]">{confirmDelete.url}</p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="ring-focus inline-flex h-9 flex-1 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-hover-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="ring-focus inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-destructive px-3 text-xs font-semibold text-destructive-foreground hover:opacity-90"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScanSummaryDialog
        scan={summary}
        open={!!summary}
        onOpenChange={(o) => !o && setSummary(null)}
        mode="recent"
      />
    </section>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="ring-focus h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground normal-case tracking-normal"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
      <span className="sr-only">{label}</span>
      <input
        type="date"
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="ring-focus h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground normal-case tracking-normal"
      />
    </label>
  );
}

function EmptyHistory() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-6 py-16 text-center">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface-alt/60 text-muted-foreground">
        <ScanLine className="h-7 w-7" />
      </span>
      <div>
        <p className="text-sm font-semibold">No history yet</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
          Scans you run will appear here so you can filter, re-check, or export them later.
        </p>
      </div>
      <Link
        to="/scan"
        className="ring-focus inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-transform hover:scale-[1.02] active:scale-[0.97]"
      >
        <ScanLine className="h-3.5 w-3.5" />
        Run your first scan
      </Link>
    </div>
  );
}

function NoMatches() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <FilterIcon className="h-5 w-5 text-muted-foreground" />
      <p className="text-sm font-medium">No scans match these filters</p>
      <p className="text-xs text-muted-foreground">
        Try widening the date range or clearing the search.
      </p>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-20 animate-pulse rounded-xl bg-hover-surface" />
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 flex-1 animate-pulse rounded bg-hover-surface" />
              <div className="h-4 w-20 animate-pulse rounded bg-hover-surface" />
              <div className="h-4 w-16 animate-pulse rounded bg-hover-surface" />
              <div className="h-4 w-24 animate-pulse rounded bg-hover-surface" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
