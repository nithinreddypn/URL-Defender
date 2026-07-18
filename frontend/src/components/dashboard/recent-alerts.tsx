import { BellRing, ShieldAlert, Bug, VenetianMask, Ban, Lock } from "lucide-react";
import type { Alert, AlertSeverity, AlertType } from "@/lib/mock/alerts";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<AlertType, typeof BellRing> = {
  phishing: ShieldAlert,
  malware: Bug,
  impersonation: VenetianMask,
  blacklist: Ban,
  ssl: Lock,
};

const SEV: Record<AlertSeverity, { label: string; cls: string }> = {
  low: { label: "Low", cls: "border-border bg-surface-alt/60 text-muted-foreground" },
  medium: { label: "Medium", cls: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
  high: { label: "High", cls: "border-orange-500/30 bg-orange-500/10 text-orange-400" },
  critical: { label: "Critical", cls: "border-destructive/30 bg-destructive/10 text-destructive" },
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

export function RecentAlerts({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Recent alerts</h3>
          <p className="text-xs text-muted-foreground">Highest severity, most recent first</p>
        </div>
        <BellRing className="h-4 w-4 text-muted-foreground" />
      </div>

      {alerts.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-alt/30 px-6 py-10 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <ShieldAlert className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium">All clear</p>
          <p className="text-xs text-muted-foreground">
            No alerts right now. We'll notify you the moment anything looks off.
          </p>
        </div>
      ) : (
        <ol className="relative mt-6 space-y-5 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-border">
          {alerts.slice(0, 5).map((a) => {
            const Icon = TYPE_ICON[a.type];
            const sev = SEV[a.severity];
            return (
              <li key={a.id} className="relative flex gap-4 pl-0">
                <span
                  className={cn(
                    "relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-card",
                    a.severity === "critical"
                      ? "border-destructive/50 text-destructive"
                      : "border-border text-muted-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{a.title}</p>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        sev.cls,
                      )}
                    >
                      {sev.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.detail}</p>
                  <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground/70">
                    <span className="font-mono truncate">{a.url}</span>
                    <span>·</span>
                    <span>{relTime(a.created_at)}</span>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
