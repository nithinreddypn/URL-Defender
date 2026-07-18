import { Link } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Fingerprint,
  Chrome,
  Radar,
  Check,
  MinusCircle,
  PlusCircle,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
const ScanPreview = lazy(() =>
  import("@/components/marketing/scan-preview").then((m) => ({ default: m.ScanPreview })),
);

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <Showcase />
      <FAQ />
      <FinalCTA />
    </>
  );
}

/* ------------------ HERO ------------------ */

function Hero() {
  return (
    <section className="container-page relative pt-16 pb-24 sm:pt-20 md:pt-28">
      <div className="mx-auto max-w-4xl text-center animate-fade-up">
        <Link
          to="/features"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
        >
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Real-time threat intelligence · v3.2 shipped
          <ArrowRight className="h-3 w-3" />
        </Link>

        <h1 className="text-hero mt-6">
          <span className="text-gradient-primary">Every link is a decision.</span>
          <br />
          <span className="text-gradient-brand">Make the safe one.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          URL Defender scans any URL in under 1,200ms — cross-referencing 70+ threat feeds, domain
          reputation, SSL posture, and phishing patterns — so you know exactly what's on the other
          side of the click.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/signup"
            className="ring-focus inline-flex h-12 items-center justify-center gap-2 rounded-md bg-foreground px-6 text-sm font-semibold text-background transition-transform duration-150 hover:scale-[1.02] active:scale-[0.97]"
            style={{ boxShadow: "0 10px 30px -10px rgba(255,255,255,0.35)" }}
          >
            Scan a URL for free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/signup"
            className="ring-focus inline-flex h-12 items-center justify-center rounded-md border border-border bg-card px-6 text-sm font-semibold transition-colors hover:bg-hover-surface"
          >
            Create an account
          </Link>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          No credit card required · 50 free scans per month
        </p>
      </div>

      <div className="relative mt-16 sm:mt-20 min-h-[420px]">
        <Suspense fallback={<div aria-hidden className="h-[420px]" />}>
          <ScanPreview />
        </Suspense>
      </div>
    </section>
  );
}

/* ------------------ TRUST BAR ------------------ */

/* ------------------ FEATURES ------------------ */

function Features() {
  return (
    <section className="container-page py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Capabilities
        </p>
        <h2 className="mt-3 text-display text-4xl sm:text-5xl">
          Multi-layered detection, <span className="text-muted-foreground">one API call away.</span>
        </h2>
        <p className="mt-4 text-muted-foreground">
          Nine detection systems working in parallel. One clear verdict.
        </p>
      </div>

      {/* Spotlight card */}
      <div className="mt-14 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
              <Radar className="h-3 w-3" /> Flagship
            </span>
            <h3 className="mt-4 text-3xl font-display font-semibold tracking-tight">
              Real-time phishing detection
            </h3>
            <p className="mt-3 text-muted-foreground">
              A transformer model trained on 4.1M phishing pages catches novel kits within hours of
              first appearance — including brand impersonation, credential harvesters, and lookalike
              domains that signature-based scanners miss.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                "Detects 0-day phishing kits with 99.2% precision",
                "Screenshots and DOM analysis on every scan",
                "Brand impersonation matching across 8,000+ targets",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <PhishingMock />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            icon: Zap,
            title: "Sub-2 second scans",
            body: "Distributed edge scanners in 14 regions return a full verdict before the user hits enter.",
          },
          {
            icon: ShieldCheck,
            title: "Malware & drive-by detection",
            body: "Sandboxed page rendering flags exploit kits, malicious redirects, and payload hosts.",
          },
          {
            icon: Fingerprint,
            title: "SSL & domain forensics",
            body: "Certificate age, issuer reputation, WHOIS anomalies, and DNS history in a single view.",
          },
          {
            icon: Globe,
            title: "Threat intel federation",
            body: "70+ commercial and OSINT feeds unified into one score, updated every 90 seconds.",
          },
          {
            icon: Chrome,
            title: "Browser extension",
            body: "One-click checks in Chrome, Edge, Firefox, and Safari. Zero configuration.",
          },
          {
            icon: Radar,
            title: "Bulk & API access",
            body: "Scan up to 10,000 URLs per batch, or stream results into your SIEM via webhook.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="group rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:elev-2"
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-alt/60">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PhishingMock() {
  return (
    <div className="relative rounded-xl border border-border bg-surface-alt/60 p-4 font-mono text-xs">
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Signal weights</span>
        <span className="text-emerald-400">match: 0.987</span>
      </div>
      <div className="mt-3 space-y-1.5">
        {[
          ["Brand impersonation (BofA)", 0.94, "danger"],
          ["Credential form on new domain", 0.88, "danger"],
          ["Homograph in URL", 0.71, "warn"],
          ["Missing DMARC / SPF", 0.62, "warn"],
          ["Cloudflare proxy fingerprint", 0.41, "info"],
          ["Punycode in host", 0.22, "info"],
        ].map(([label, weight, tone]) => {
          const color =
            tone === "danger" ? "bg-red-500" : tone === "warn" ? "bg-amber-500" : "bg-sky-500";
          return (
            <div key={label as string} className="flex items-center gap-3">
              <span className="w-52 truncate text-foreground/80">{label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full ${color}`}
                  style={{ width: `${(weight as number) * 100}%` }}
                />
              </div>
              <span className="w-10 text-right tabular-nums">{(weight as number).toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------ HOW IT WORKS ------------------ */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Paste a URL",
      body: "Drop any link into the scan bar, the browser extension, or send it through the API.",
    },
    {
      n: "02",
      title: "We run 9 checks in parallel",
      body: "Domain reputation, SSL, phishing model, sandbox render, blacklist cross-reference, and more.",
    },
    {
      n: "03",
      title: "Get a verdict in 1,200ms",
      body: "A single risk score, clear reasoning, and recommended next action — no security jargon required.",
    },
  ];

  return (
    <section className="container-page py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          How it works
        </p>
        <h2 className="mt-3 text-display text-4xl sm:text-5xl">
          From "is this safe?" to a full report{" "}
          <span className="text-muted-foreground">in under 1,200ms.</span>
        </h2>
      </div>

      <div className="relative mt-14 grid gap-8 md:grid-cols-3">
        {/* Connector line */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-[12%] right-[12%] top-8 hidden h-px md:block"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--border-strong) 20%, var(--border-strong) 80%, transparent)",
          }}
        />
        {steps.map((s, i) => (
          <div
            key={s.n}
            className="relative rounded-xl border border-border bg-card p-6 elev-1 animate-fade-up"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-background font-display text-lg font-bold">
              {s.n}
            </div>
            <h3 className="mt-6 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------ SHOWCASE ------------------ */

function Showcase() {
  const [tab, setTab] = useState<"dashboard" | "result" | "alerts">("dashboard");
  return (
    <section className="container-page py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Product tour
        </p>
        <h2 className="mt-3 text-display text-4xl sm:text-5xl">
          Enterprise-grade visibility.{" "}
          <span className="text-muted-foreground">Consumer-grade clarity.</span>
        </h2>
      </div>

      <div className="mt-10 flex justify-center">
        <div
          role="tablist"
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card/60 p-1 backdrop-blur"
        >
          {(["dashboard", "result", "alerts"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`ring-focus rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "result" ? "Scan result" : t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-card elev-2">
        <div className="flex items-center gap-2 border-b border-border bg-surface-alt/60 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
          </div>
          <div className="ml-4 rounded-md border border-border bg-background/60 px-3 py-1 font-mono text-xs text-muted-foreground">
            app.urldefender.io / {tab}
          </div>
        </div>
        <div className="p-6 sm:p-10 min-h-[340px]">
          {tab === "dashboard" && <MockDashboard />}
          {tab === "result" && <MockResult />}
          {tab === "alerts" && <MockAlerts />}
        </div>
      </div>
    </section>
  );
}

function MockDashboard() {
  const stats = [
    { label: "URLs scanned", value: "12,847", delta: "+8.2%" },
    { label: "Threats blocked", value: "391", delta: "+12%" },
    { label: "Safe URLs", value: "12,456", delta: "+7.9%" },
    { label: "Security score", value: "A+", delta: "stable" },
  ];
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface-alt/40 p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-2xl font-bold tabular-nums">{s.value}</p>
            <p className="mt-1 text-xs text-emerald-400">{s.delta}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-xl border border-border bg-surface-alt/40 p-4">
          <p className="text-sm font-medium">Security overview</p>
          <div className="mt-4 flex items-center justify-center">
            <div
              className="grid h-32 w-32 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#22c55e 0 72%, #f59e0b 72% 88%, #ef4444 88% 100%)`,
              }}
            >
              <div className="h-24 w-24 rounded-full bg-card grid place-items-center">
                <div>
                  <p className="text-center font-display text-xl font-bold">96.9%</p>
                  <p className="text-center text-[10px] text-muted-foreground">safe</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface-alt/40 p-4">
          <p className="text-sm font-medium">Recent scans</p>
          <div className="mt-3 space-y-2">
            {[
              ["stripe.com/pay/inv_82…", "Safe", "text-emerald-400"],
              ["bit.ly/3xR9-verify", "Suspicious", "text-amber-400"],
              ["mikroteams-login.io/sso", "Dangerous", "text-red-400"],
              ["github.com/torvalds/linux", "Safe", "text-emerald-400"],
            ].map(([url, status, cls]) => (
              <div
                key={url as string}
                className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-xs"
              >
                <span className="font-mono text-foreground/80 truncate">{url}</span>
                <span className={`font-medium ${cls}`}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MockResult() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
          Dangerous · confidence 98%
        </span>
        <p className="mt-3 font-mono text-sm">mikroteams-login.io/sso/auth</p>
        <h3 className="mt-4 text-display text-3xl font-bold">Credential phishing</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Impersonates Microsoft Teams login. Domain registered 4 days ago, hosted behind CDN, page
          contains credential harvesting form posting to an external endpoint.
        </p>
        <div className="mt-6 rounded-lg border border-border bg-surface-alt/40 p-4 font-mono text-xs">
          <div className="text-muted-foreground">$ curl -X POST /scan</div>
          <div className="mt-1">{'{ "score": 98, "verdict": "phishing" }'}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          ["Domain age", "4 days"],
          ["SSL issuer", "Let's Encrypt"],
          ["Blacklists", "12 / 87"],
          ["Country", "Panama"],
          ["Redirects", "3 hops"],
          ["Forms found", "1"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-border bg-surface-alt/40 p-3">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="mt-1 font-medium">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockAlerts() {
  const items = [
    {
      t: "12:04",
      type: "Phishing",
      url: "mikroteams-login.io/sso",
      sev: "Critical",
      cls: "text-red-400 border-red-500/40 bg-red-500/10",
    },
    {
      t: "11:47",
      type: "Malware",
      url: "cdn-static.jsx-cache.ru/init.js",
      sev: "High",
      cls: "text-red-400 border-red-500/40 bg-red-500/10",
    },
    {
      t: "11:12",
      type: "Suspicious redirect",
      url: "bit.ly/3xR9-verify",
      sev: "Medium",
      cls: "text-amber-400 border-amber-500/40 bg-amber-500/10",
    },
    {
      t: "10:58",
      type: "Impersonation",
      url: "netfl1x-billing.co/renew",
      sev: "High",
      cls: "text-red-400 border-red-500/40 bg-red-500/10",
    },
    {
      t: "10:30",
      type: "Fake login",
      url: "app-notion.workspace-login.io",
      sev: "Critical",
      cls: "text-red-400 border-red-500/40 bg-red-500/10",
    },
  ];
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div
          key={i.url}
          className="flex items-center gap-4 rounded-lg border border-border bg-surface-alt/40 p-3"
        >
          <span className="w-14 text-xs text-muted-foreground tabular-nums">{i.t}</span>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${i.cls}`}
          >
            {i.sev}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{i.type}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{i.url}</p>
          </div>
          <button className="text-xs text-muted-foreground hover:text-foreground">View →</button>
        </div>
      ))}
    </div>
  );
}

/* ------------------ FAQ ------------------ */

const FAQS = [
  {
    q: "How accurate is the phishing detection?",
    a: "Our transformer model averages 99.2% precision and 97.8% recall against the OpenPhish and PhishTank ground-truth sets, retrained weekly on new kit variants.",
  },
  {
    q: "Do you store the URLs I scan?",
    a: "By default, scans are retained for 30 days so you can revisit results. You can shorten retention or disable storage entirely in Settings → Privacy. Enterprise customers get a signed data-processing agreement.",
  },
  {
    q: "Is there a free tier?",
    a: "Yes — 50 scans per month, browser extension access, and single-user dashboard. No credit card required. Higher volumes and API access start at team plans.",
  },
  {
    q: "How is this different from Google Safe Browsing?",
    a: "Safe Browsing catches known-bad URLs. URL Defender adds behavioural detection: novel phishing kits, brand impersonation, and page-level malware — usually hours to days before they reach signature-based blocklists.",
  },
  {
    q: "Can I integrate it with my SIEM or SOAR?",
    a: "Team and Enterprise plans include webhook delivery, a REST API, and native connectors for Splunk, Sentinel, and Chronicle.",
  },
  {
    q: "What happens if a URL is a false positive?",
    a: "Every scan includes a one-click 'dispute verdict' action. Disputes are reviewed within 4 business hours and, when confirmed, propagated to all customers' scoring models.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="container-page py-24">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">FAQ</p>
          <h2 className="mt-3 text-display text-4xl">Questions, answered.</h2>
          <p className="mt-4 text-muted-foreground">
            Anything else? Reach us at{" "}
            <a className="underline underline-offset-4" href="mailto:urldefenderservice@gmail.com">
              urldefenderservice@gmail.com
            </a>
            .
          </p>
        </div>
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <button
                  className="ring-focus flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-medium">{f.q}</span>
                  {isOpen ? (
                    <MinusCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
                  ) : (
                    <PlusCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 -mt-1 text-sm text-muted-foreground animate-fade-up">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------ FINAL CTA ------------------ */

function FinalCTA() {
  return (
    <section className="container-page py-24">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-12 sm:p-16 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-90"
          style={{
            background:
              "radial-gradient(60% 80% at 50% 0%, rgba(34,197,94,0.18), transparent 70%), radial-gradient(60% 80% at 50% 100%, rgba(59,130,246,0.18), transparent 70%)",
          }}
        />
        <h2 className="text-display text-4xl sm:text-5xl">Stop clicking blind.</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Free tier includes 50 scans a month and the browser extension. Set up in under a minute.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/signup"
            className="ring-focus inline-flex h-12 items-center justify-center gap-2 rounded-md bg-foreground px-6 text-sm font-semibold text-background transition-transform hover:scale-[1.02] active:scale-[0.97]"
          >
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/features"
            className="ring-focus inline-flex h-12 items-center justify-center rounded-md border border-border bg-background/40 px-6 text-sm font-semibold hover:bg-hover-surface"
          >
            See all features
          </Link>
        </div>
      </div>
    </section>
  );
}
