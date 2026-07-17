import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { ShieldCheck } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";

type Props = {
  safe: number;
  suspicious: number;
  dangerous: number;
};

const COLORS = {
  safe: "#22c55e",
  suspicious: "#f59e0b",
  dangerous: "#ef4444",
} as const;

export function SecurityDonut({ safe, suspicious, dangerous }: Props) {
  const total = safe + suspicious + dangerous;
  const pct = total === 0 ? 0 : Math.round((safe / total) * 100);
  const animated = useCountUp(pct, 1200);

  const data =
    total === 0
      ? [{ name: "empty", value: 1 }]
      : [
          { name: "Safe", value: safe },
          { name: "Suspicious", value: suspicious },
          { name: "Dangerous", value: dangerous },
        ];

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Security overview
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Verdict distribution across all scans
          </p>
        </div>
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="relative mt-6 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={68}
              outerRadius={92}
              paddingAngle={total === 0 ? 0 : 2}
              stroke="var(--card)"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {total === 0
                ? [<Cell key="empty" fill="var(--muted)" />]
                : [
                    <Cell key="safe" fill={COLORS.safe} />,
                    <Cell key="suspicious" fill={COLORS.suspicious} />,
                    <Cell key="dangerous" fill={COLORS.dangerous} />,
                  ]}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-bold tabular-nums">{animated}%</span>
          <span className="text-xs text-muted-foreground">
            {total === 0 ? "No scans yet" : "Safe rate"}
          </span>
        </div>
      </div>

      <ul className="mt-6 space-y-2 text-sm">
        <LegendRow color={COLORS.safe} label="Safe" value={safe} total={total} />
        <LegendRow color={COLORS.suspicious} label="Suspicious" value={suspicious} total={total} />
        <LegendRow color={COLORS.dangerous} label="Dangerous" value={dangerous} total={total} />
      </ul>
    </div>
  );
}

function LegendRow({
  color,
  label,
  value,
  total,
}: {
  color: string;
  label: string;
  value: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <li className="flex items-center gap-3">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="tabular-nums font-medium">{value}</span>
      <span className="w-10 text-right tabular-nums text-xs text-muted-foreground">{pct}%</span>
    </li>
  );
}
