import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Zap,
  Fingerprint,
  Globe,
  Chrome,
  Radar,
  Lock,
  Layers,
  Bell,
  ArrowRight,
} from "lucide-react";

const GROUPS = [
  {
    title: "Detection engines",
    items: [
      {
        icon: ShieldCheck,
        name: "Phishing model",
        body: "Transformer trained on 4.1M phishing pages, retrained weekly.",
      },
      {
        icon: Radar,
        name: "Malware sandbox",
        body: "Sandboxed page rendering that flags drive-by exploits and payload hosts.",
      },
      {
        icon: Fingerprint,
        name: "Brand impersonation",
        body: "Visual and DOM matching against 8,000+ common targets.",
      },
      {
        icon: Layers,
        name: "Redirect chain analysis",
        body: "Every hop inspected, including client-side JS redirects.",
      },
    ],
  },
  {
    title: "Signals & intelligence",
    items: [
      {
        icon: Globe,
        name: "70+ threat feeds",
        body: "Commercial and OSINT, unified into one score, refreshed every 90s.",
      },
      {
        icon: Lock,
        name: "SSL & domain forensics",
        body: "Certificate age, issuer trust, WHOIS anomalies, DNS history.",
      },
      {
        icon: Zap,
        name: "Real-time reputation",
        body: "Rolling 24h scoring window based on live traffic patterns.",
      },
    ],
  },
  {
    title: "Delivery",
    items: [
      {
        icon: Chrome,
        name: "Browser extension",
        body: "Chrome, Edge, Firefox, Safari. Zero-config, offline-safe fallback.",
      },
      {
        icon: Bell,
        name: "Real-time alerts",
        body: "Slack, email, webhook. Route by severity, tag, or user cohort.",
      },
      {
        icon: Layers,
        name: "REST & bulk API",
        body: "10,000 URLs per batch, streaming results into your SIEM.",
      },
    ],
  },
] as const;

export default function FeaturesPage() {
  return (
    <section className="container-page py-20">
      <div className="mx-auto max-w-2xl text-center animate-fade-up">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Features
        </p>
        <h1 className="mt-3 text-display text-5xl">Everything, without the noise.</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Every capability you'd expect from a modern URL scanner — and nothing you don't.
        </p>
      </div>

      <div className="mt-16 space-y-16">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {g.title}
            </h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {g.items.map(({ icon: Icon, name, body }) => (
                <div
                  key={name}
                  className="rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:elev-2"
                >
                  <Icon className="h-5 w-5 text-foreground" strokeWidth={1.75} />
                  <p className="mt-4 font-semibold">{name}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 text-center">
        <Link
          to="/signup"
          className="inline-flex h-12 items-center gap-2 rounded-md bg-foreground px-6 text-sm font-semibold text-background hover:scale-[1.02] active:scale-[0.97] transition-transform"
        >
          Try it free <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
