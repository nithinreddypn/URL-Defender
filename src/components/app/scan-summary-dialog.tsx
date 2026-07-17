import { Link } from "react-router-dom";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ExternalLink,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Scan, ScanVerdict } from "@/lib/mock/scans";
import { cn } from "@/lib/utils";

type Mode = "post-scan" | "recent";

const VERDICT: Record<
  ScanVerdict,
  {
    label: string;
    Icon: typeof ShieldCheck;
    fg: string;
    bg: string;
    border: string;
    ring: string;
  }
> = {
  safe: {
    label: "SAFE",
    Icon: ShieldCheck,
    fg: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    ring: "ring-emerald-500/40",
  },
  suspicious: {
    label: "SUSPICIOUS",
    Icon: ShieldQuestion,
    fg: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    ring: "ring-amber-500/40",
  },
  dangerous: {
    label: "DANGEROUS",
    Icon: ShieldAlert,
    fg: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    ring: "ring-destructive/40",
  },
};

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

export function ScanSummaryDialog({
  scan,
  open,
  onOpenChange,
  mode = "recent",
}: {
  scan: Scan | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode?: Mode;
}) {
  const [confirmingOpen, setConfirmingOpen] = useState(false);

  if (!scan) return null;
  const v = VERDICT[scan.verdict];
  const isSafe = scan.verdict === "safe";
  const isDanger = scan.verdict === "dangerous";
  // Post-scan: block dangerous entirely. Recent scans: allow with warning.
  const blockOpen = isDanger && mode === "post-scan";

  function openInNewTab() {
    window.open(scan!.url, "_blank", "noopener,noreferrer");
    setConfirmingOpen(false);
    onOpenChange(false);
  }

  function handleOpenClick() {
    if (blockOpen) return;
    if (isSafe) {
      openInNewTab();
    } else {
      setConfirmingOpen(true);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setConfirmingOpen(false);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        {!confirmingOpen ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-4",
                    v.bg,
                    v.fg,
                    v.ring,
                  )}
                >
                  <v.Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <DialogTitle className={cn("font-display tracking-widest", v.fg)}>
                    {v.label}
                  </DialogTitle>
                  <DialogDescription>
                    {scan.engine_flags === 0
                      ? "No engines flagged this URL."
                      : `${scan.engine_flags} of ${scan.engines_total} engines flagged this URL.`}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="rounded-lg border border-border bg-background/50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Scanned URL
              </p>
              <p className="mt-1 break-all font-mono text-[13px] text-foreground" title={scan.url}>
                {scan.url}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <SummaryCell label="Risk" value={`${scan.risk_score}/100`} tone={v.fg} />
              <SummaryCell label="Engines" value={`${scan.engine_flags}/${scan.engines_total}`} />
              <SummaryCell label="When" value={relTime(scan.scanned_at)} />
            </div>

            {isDanger && (
              <div
                role="alert"
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3 text-xs",
                  v.border,
                  v.bg,
                  v.fg,
                )}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="leading-relaxed">
                  {blockOpen
                    ? "Opening this URL is blocked because it was classified as dangerous."
                    : "This URL is dangerous. Opening it may expose you to phishing, malware, or credential theft."}
                </p>
              </div>
            )}

            {scan.verdict === "suspicious" && (
              <div
                role="alert"
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3 text-xs",
                  v.border,
                  v.bg,
                  v.fg,
                )}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="leading-relaxed">
                  Some engines flagged this URL. Proceed only if you trust the source.
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Link
                to={`/scan/${scan.id}/result`}
                onClick={() => onOpenChange(false)}
                className="ring-focus inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-hover-surface"
              >
                View full report
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              {blockOpen ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex h-9 flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 text-xs font-semibold text-destructive opacity-70"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Blocked
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenClick}
                  className={cn(
                    "ring-focus inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-transform hover:scale-[1.02] active:scale-[0.97]",
                    isSafe
                      ? "bg-foreground text-background"
                      : "border border-destructive/40 bg-destructive/10 text-destructive",
                  )}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {isSafe ? "Open URL" : "Open anyway"}
                </button>
              )}
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-4 ring-destructive/30">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <DialogTitle>Open a flagged URL?</DialogTitle>
                  <DialogDescription>
                    You&apos;re about to visit a URL classified as{" "}
                    <span className={cn("font-semibold", v.fg)}>{v.label.toLowerCase()}</span>. This
                    is your choice — proceed with caution.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="rounded-lg border border-border bg-background/50 p-3">
              <p className="break-all font-mono text-[13px]">{scan.url}</p>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <button
                type="button"
                onClick={() => setConfirmingOpen(false)}
                className="ring-focus inline-flex h-9 flex-1 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-hover-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={openInNewTab}
                className="ring-focus inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-destructive px-3 text-xs font-semibold text-destructive-foreground hover:opacity-90"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open anyway
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryCell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-2.5">
      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 font-mono text-xs font-semibold tabular-nums", tone)}>{value}</p>
    </div>
  );
}
