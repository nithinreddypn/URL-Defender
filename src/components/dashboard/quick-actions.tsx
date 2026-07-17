import { Link } from "react-router-dom";
import { ScanLine, BellRing, Download, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const ACTIONS = [
  {
    to: "/scan" as const,
    icon: ScanLine,
    title: "Scan a URL",
    body: "Paste any link, get a verdict in 1,200ms.",
    accent: "from-emerald-400/20 to-emerald-400/0",
  },
  {
    to: "/alerts" as const,
    icon: BellRing,
    title: "View alerts",
    body: "Review every flagged URL from the last 30 days.",
    accent: "from-info/20 to-info/0",
  },
  {
    to: null,
    icon: Download,
    title: "Export report",
    body: "Download your scan history as CSV or PDF.",
    accent: "from-violet-400/20 to-violet-400/0",
  },
] as const;

export function QuickActions() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {ACTIONS.map((a) => {
        const inner = (
          <>
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br opacity-60 ${a.accent}`}
            />
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card">
              <a.icon className="h-4 w-4" />
            </span>
            <div className="mt-4">
              <p className="text-sm font-semibold">{a.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{a.body}</p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-foreground">
              Go <ArrowRight className="h-3 w-3" />
            </span>
          </>
        );

        const wrap =
          "ring-focus group relative isolate flex flex-col rounded-xl border border-border bg-card p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:elev-2 hover:border-border-strong";

        if (a.to) {
          return (
            <Link key={a.title} to={a.to} className={wrap}>
              {inner}
            </Link>
          );
        }
        return (
          <button
            key={a.title}
            type="button"
            onClick={() =>
              toast.success("Report queued", {
                description: "You'll get an email when it's ready to download.",
              })
            }
            className={wrap}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
