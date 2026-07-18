import { Link } from "react-router-dom";
import { ArrowRight, ScanLine } from "lucide-react";
import { useState } from "react";
import type { Scan, ScanVerdict } from "@/lib/mock/scans";
import { cn } from "@/lib/utils";
import { ScanSummaryDialog } from "@/components/app/scan-summary-dialog";

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

const VERDICT: Record<ScanVerdict, { label: string; cls: string; dot: string }> = {
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

export function RecentScans({ scans }: { scans: Scan[] }) {
  const [openScan, setOpenScan] = useState<Scan | null>(null);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold">Recent scans</h3>
          <p className="text-xs text-muted-foreground">Last {scans.length} URLs you scanned</p>
        </div>
        <Link
          to="/alerts"
          className="ring-focus inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-hover-surface hover:text-foreground"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {scans.length === 0 ? (
        <EmptyScans />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <th className="px-6 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Risk</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {scans.slice(0, 6).map((s, idx) => {
                const v = VERDICT[s.verdict];
                return (
                  <tr
                    key={s.id}
                    className={cn(
                      "border-t border-border transition-colors hover:bg-hover-surface/60",
                      idx % 2 === 1 && "bg-surface-alt/20",
                    )}
                  >
                    <td className="max-w-[320px] truncate px-6 py-3.5 font-mono text-[13px]">
                      {s.url}
                    </td>
                    <td className="px-4 py-3.5">
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
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums text-xs">
                      {s.risk_score}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {relTime(s.scanned_at)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setOpenScan(s)}
                        aria-label={`View summary for ${s.url}`}
                        className="ring-focus inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-hover-surface"
                      >
                        View
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ScanSummaryDialog
        scan={openScan}
        open={!!openScan}
        onOpenChange={(o) => !o && setOpenScan(null)}
        mode="recent"
      />
    </div>
  );
}

function EmptyScans() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-alt/60 text-muted-foreground">
        <ScanLine className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium">No scans yet</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Run your first scan to build history, spot patterns, and get alerted on new threats.
      </p>
      <Link
        to="/scan"
        className="mt-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-semibold text-background hover:scale-[1.02] active:scale-[0.97] transition-transform"
      >
        Scan a URL <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
