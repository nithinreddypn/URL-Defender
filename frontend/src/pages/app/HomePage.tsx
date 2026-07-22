import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ScanLine, ShieldAlert, ShieldCheck, Gauge, ArrowRight } from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { SecurityDonut } from "@/components/dashboard/security-donut";
import { RecentScans } from "@/components/dashboard/recent-scans";
import { RecentAlerts } from "@/components/dashboard/recent-alerts";
import { QuickActions } from "@/components/dashboard/quick-actions";
import {
  StatCardSkeleton,
  DonutSkeleton,
  TableSkeleton,
  TimelineSkeleton,
} from "@/components/dashboard/skeletons";

import {
  fetchCurrentUser,
  fetchScans,
  fetchAlerts,
  computeStats,
  sparkline,
} from "@/lib/dashboard-store";
import type { Scan } from "@/lib/mock/scans";
import type { Alert } from "@/lib/mock/alerts";
import type { MockUser } from "@/lib/mock/user";

export default function DashboardHome() {
  const [user, setUser] = useState<MockUser | null>(null);
  const [scans, setScans] = useState<Scan[] | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);

  useEffect(() => {
    fetchCurrentUser().then(setUser);
    fetchScans().then(setScans);
    fetchAlerts().then(setAlerts);
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <Greeting user={user} />

      {/* Stat cards */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {scans === null || user === null ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <StatCards scans={scans} user={user} />
        )}
      </section>

      {/* Chart + alerts */}
      <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        {scans === null ? (
          <DonutSkeleton />
        ) : (
          (() => {
            const s = computeStats(scans);
            return <SecurityDonut safe={s.safe} suspicious={s.suspicious} dangerous={s.threats} />;
          })()
        )}
        {alerts === null ? <TimelineSkeleton /> : <RecentAlerts alerts={alerts} />}
      </section>

      {/* Recent scans */}
      <section className="mt-6">
        {scans === null ? <TableSkeleton /> : <RecentScans scans={scans} />}
      </section>

      {/* Quick actions */}
      <section className="mt-6">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Quick actions
        </h2>
        <QuickActions />
      </section>
    </div>
  );
}

function Greeting({ user }: { user: MockUser | null }) {
  const name = user?.full_name.split(" ")[0] ?? "";
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Overview
        </p>
        <h1 className="mt-1 text-display text-3xl sm:text-4xl">
          {user ? (
            <>
              Welcome back, {name} <span aria-hidden>👋</span>
            </>
          ) : (
            <span className="inline-block h-9 w-64 animate-shimmer rounded-md" />
          )}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Stay protected from malicious websites.
        </p>
      </div>
      <Link
        to="/scan"
        className="ring-focus inline-flex h-11 items-center justify-center gap-2 self-start rounded-md bg-foreground px-5 text-sm font-semibold text-background transition-transform hover:scale-[1.02] active:scale-[0.97] sm:self-auto"
      >
        <ScanLine className="h-4 w-4" />
        Scan URL
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function StatCards({ scans, user }: { scans: Scan[]; user: MockUser }) {
  const s = computeStats(scans);

  // Split into "this period" (last 7d) vs "previous period" (7-14d ago) for delta.
  const now = Date.now();
  const week = 7 * 86_400_000;
  const inRange = (iso: string, from: number, to: number) => {
    const t = new Date(iso).getTime();
    return t >= from && t < to;
  };
  const cur = scans.filter((x) => inRange(x.scanned_at, now - week, now));
  const prev = scans.filter((x) => inRange(x.scanned_at, now - 2 * week, now - week));
  const delta = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : 100) : ((a - b) / b) * 100);

  return (
    <>
      <StatCard
        label="Lifetime Scans"
        value={user.scan_count}
        icon={ScanLine}
        tone="brand"
        deltaPct={null}
        sparkline={sparkline(scans, () => true)}
      />
      <StatCard
        label="Threats detected"
        value={s.threats}
        icon={ShieldAlert}
        tone="danger"
        deltaPct={
          s.threats === 0
            ? null
            : delta(
                cur.filter((x) => x.verdict === "dangerous").length,
                prev.filter((x) => x.verdict === "dangerous").length,
              )
        }
        sparkline={sparkline(scans, (x) => x.verdict === "dangerous")}
      />
      <StatCard
        label="Safe URLs"
        value={s.safe}
        icon={ShieldCheck}
        tone="safe"
        deltaPct={
          s.safe === 0
            ? null
            : delta(
                cur.filter((x) => x.verdict === "safe").length,
                prev.filter((x) => x.verdict === "safe").length,
              )
        }
        sparkline={sparkline(scans, (x) => x.verdict === "safe")}
      />
      <StatCard
        label="Security score"
        value={s.score}
        icon={Gauge}
        suffix="/100"
        tone={s.score >= 80 ? "safe" : s.score >= 60 ? "warn" : "danger"}
        deltaPct={(() => {
          const curScore =
            cur.length === 0
              ? null
              : (cur.filter((x) => x.verdict === "safe").length / cur.length) * 100;
          const prevScore =
            prev.length === 0
              ? null
              : (prev.filter((x) => x.verdict === "safe").length / prev.length) * 100;
          if (curScore === null || prevScore === null) return null;
          return curScore - prevScore;
        })()}
        sparkline={sparkline(scans, (x) => x.verdict === "safe")}
      />
    </>
  );
}
