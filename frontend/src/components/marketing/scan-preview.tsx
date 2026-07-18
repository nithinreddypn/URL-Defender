import { ShieldCheck, Lock, Globe, Clock, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Floating hero mockup — a stylized scan result UI.
 * Pure CSS/SVG, no external image. Themes correctly.
 */
export function ScanPreview() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + 4));
    }, 60);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[640px]">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-20 -z-10 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 40%, rgba(34,197,94,0.20) 0%, rgba(59,130,246,0.14) 40%, transparent 70%)",
        }}
      />
      <div
        className="relative overflow-hidden rounded-2xl border border-border bg-card elev-3 animate-float"
        style={{
          boxShadow: "0 40px 80px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-surface-alt/60 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          </div>
          <div className="ml-4 flex flex-1 items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span className="font-mono">app.urldefender.io/scan</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Scan complete · 1,200ms
              </p>
              <p className="mt-2 font-mono text-sm sm:text-base text-foreground">
                https://secure-login.bankofamerica-verify.com/session
              </p>
            </div>
            <span
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                background: "color-mix(in oklab, #ef4444 12%, transparent)",
                borderColor: "color-mix(in oklab, #ef4444 40%, transparent)",
                color: "#fca5a5",
              }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              Dangerous
            </span>
          </div>

          {/* Risk gauge bar */}
          <div className="mt-6">
            <div className="flex items-baseline justify-between">
              <p className="text-xs text-muted-foreground">Risk score</p>
              <p className="font-display text-2xl font-bold tabular-nums">
                92<span className="text-sm text-muted-foreground">/100</span>
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${progress * 0.92}%`,
                  background: "linear-gradient(90deg, #f59e0b, #ef4444)",
                }}
              />
            </div>
          </div>

          {/* Grid of checks */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Check
              tone="danger"
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              label="Phishing pattern"
              value="Detected"
            />
            <Check
              tone="danger"
              icon={<Globe className="h-3.5 w-3.5" />}
              label="Domain age"
              value="6 days"
            />
            <Check
              tone="warn"
              icon={<Lock className="h-3.5 w-3.5" />}
              label="SSL certificate"
              value="Free / auto"
            />
            <Check
              tone="danger"
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Blacklists"
              value="4 of 87"
            />
          </div>

          {/* Engine strip */}
          <div className="mt-6 rounded-lg border border-border bg-surface-alt/50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Detection engines</p>
              <p className="text-xs text-muted-foreground">
                <span className="text-red-400 font-semibold">14</span> / 74 flagged
              </p>
            </div>
            <div className="mt-2 grid grid-cols-12 gap-1">
              {Array.from({ length: 36 }).map((_, i) => {
                const flagged = [2, 5, 6, 9, 12, 15, 18, 22, 24, 28, 30, 31, 33].includes(i);
                return (
                  <span
                    key={i}
                    className={`h-2 rounded-sm ${flagged ? "bg-red-500/80" : "bg-emerald-500/40"}`}
                  />
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background py-2.5 text-sm font-medium hover:bg-hover-surface"
          >
            View full report <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Check({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "safe" | "warn" | "danger";
}) {
  const toneColor =
    tone === "safe" ? "text-emerald-400" : tone === "warn" ? "text-amber-400" : "text-red-400";
  return (
    <div className="rounded-lg border border-border bg-surface-alt/50 p-3">
      <div className={`inline-flex items-center gap-1.5 text-xs ${toneColor}`}>
        {icon}
        <span className="text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1.5 font-medium">{value}</p>
    </div>
  );
}
