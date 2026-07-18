import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";

export type StatCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  suffix?: string;
  deltaPct?: number | null;
  sparkline: { i: number; v: number }[];
  tone: "brand" | "danger" | "safe" | "warn";
};

const TONE_STYLE: Record<StatCardProps["tone"], { fg: string; grad: string; iconBg: string }> = {
  brand: { fg: "text-info", grad: "#3b82f6", iconBg: "text-info" },
  danger: { fg: "text-destructive", grad: "#ef4444", iconBg: "text-destructive" },
  safe: { fg: "text-emerald-400", grad: "#22c55e", iconBg: "text-emerald-400" },
  warn: { fg: "text-amber-400", grad: "#f59e0b", iconBg: "text-amber-400" },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  suffix,
  deltaPct,
  sparkline,
  tone,
}: StatCardProps) {
  const animated = useCountUp(value, 1000);
  const style = TONE_STYLE[tone];
  const isEmpty = sparkline.every((p) => p.v === 0);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:elev-2 hover:border-border-strong">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-alt/60",
            style.iconBg,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <Delta pct={deltaPct} />
      </div>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-3xl font-bold tracking-tight tabular-nums">
          {animated.toLocaleString()}
        </span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      <p className="mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>

      <div className="pointer-events-none mt-4 h-12">
        {isEmpty ? (
          <div className="flex h-full items-end gap-0.5 opacity-40">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="flex-1 rounded-t bg-border" style={{ height: "20%" }} />
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${tone}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={style.grad} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={style.grad} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={style.grad}
                strokeWidth={1.75}
                fill={`url(#spark-${tone})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function Delta({ pct }: { pct: number | null | undefined }) {
  if (pct == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-alt/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        <Minus className="h-3 w-3" /> —
      </span>
    );
  }
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        up
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}
