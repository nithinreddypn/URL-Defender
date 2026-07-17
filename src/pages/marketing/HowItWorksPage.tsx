import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const STAGES = [
  {
    n: "01",
    t: "Ingest",
    body: "URL enters via web, extension, API, or webhook. Normalised, de-punycoded, and dispatched to the nearest edge scanner.",
    ms: 20,
  },
  {
    n: "02",
    t: "Parallel checks",
    body: "Nine engines run concurrently: phishing model, malware sandbox, SSL/domain, threat feeds, redirect chain, DOM diff, impersonation, DNS history, blacklist cross-ref.",
    ms: 900,
  },
  {
    n: "03",
    t: "Score & explain",
    body: "Signals are weighted by a calibrated classifier. The response includes a numeric score, verdict, top contributing signals, and a plain-language explanation.",
    ms: 180,
  },
  {
    n: "04",
    t: "Deliver",
    body: "Verdict returned to caller, streamed to any configured integrations, and stored for 30 days (configurable) for audit and re-inspection.",
    ms: 50,
  },
];

export default function HowItWorksPage() {
  return (
    <section className="container-page py-20">
      <div className="mx-auto max-w-2xl text-center animate-fade-up">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          How it works
        </p>
        <h1 className="mt-3 text-display text-5xl">Four stages. 1,200ms.</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Every scan follows the same deterministic pipeline. Here's what happens between paste and
          verdict.
        </p>
      </div>

      <ol className="mt-16 space-y-6">
        {STAGES.map((s, i) => (
          <li
            key={s.n}
            className="grid gap-6 rounded-2xl border border-border bg-card p-8 md:grid-cols-[auto_1fr_auto] md:items-center animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-background font-display text-lg font-bold">
              {s.n}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{s.t}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </div>
            <div className="font-mono text-sm text-emerald-400 tabular-nums">~{s.ms}ms</div>
          </li>
        ))}
      </ol>

      <div className="mt-16 text-center">
        <Link
          to="/signup"
          className="inline-flex h-12 items-center gap-2 rounded-md bg-foreground px-6 text-sm font-semibold text-background hover:scale-[1.02] active:scale-[0.97] transition-transform"
        >
          Run your first scan <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
