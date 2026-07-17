import { Link } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  cadence: string;
  priceLabel: string;
  perMonth: string;
  suffix: string;
  badge?: string;
  saveLabel?: string;
  features: string[];
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "monthly",
    name: "1 Month",
    cadence: "billed monthly",
    priceLabel: "₹799",
    perMonth: "₹799 / month",
    suffix: "mo",
    features: [
      "Unlimited URL scans",
      "Real-time threat detection",
      "7-day scan history",
      "Email threat alerts",
    ],
  },
  {
    id: "quarterly",
    name: "3 Months",
    cadence: "billed every 3 months",
    priceLabel: "₹2,149",
    perMonth: "₹716 / month",
    suffix: "3mo",
    badge: "Popular",
    saveLabel: "Save 11%",
    highlight: true,
    features: [
      "Everything in Monthly",
      "90-day scan history",
      "Priority scan queue",
      "Weekly security digest",
      "CSV / JSON exports",
    ],
  },
  {
    id: "yearly",
    name: "1 Year",
    cadence: "billed annually",
    priceLabel: "₹6,399",
    perMonth: "₹533 / month",
    suffix: "yr",
    saveLabel: "Save 33%",
    features: [
      "Everything in Quarterly",
      "1-year scan history",
      "Team seats (up to 5)",
      "API access",
      "24/7 priority support",
    ],
  },
];

export default function PricingPage() {
  return (
    <section className="container-page py-24 sm:py-32">
      <div className="mx-auto max-w-2xl text-center animate-fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          Pricing
        </div>
        <h1 className="mt-6 text-display text-4xl sm:text-5xl">Simple plans, real protection.</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Start free with 50 scans a month. Upgrade any time for unlimited scans, longer history and
          priority protection.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Available plans"
        className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-3"
      >
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={cn(
              "relative flex flex-col rounded-2xl border p-6 transition-all",
              p.highlight
                ? "border-foreground bg-hover-surface shadow-sm"
                : "border-border bg-card",
            )}
          >
            {p.badge && (
              <span className="absolute -top-2.5 right-4 rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-semibold text-background">
                {p.badge}
              </span>
            )}
            <div className="text-sm font-semibold">{p.name}</div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight">{p.priceLabel}</span>
              <span className="text-xs text-muted-foreground">/ {p.suffix}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{p.perMonth}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{p.cadence}</div>
            {p.saveLabel && (
              <div className="mt-3 inline-flex w-fit rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                {p.saveLabel}
              </div>
            )}
            <ul className="mt-6 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check
                    className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500"
                    strokeWidth={2.5}
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/signup"
              className={cn(
                "ring-focus mt-6 inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98]",
                p.highlight
                  ? "bg-foreground text-background"
                  : "border border-border bg-card hover:bg-hover-surface",
              )}
            >
              Get started
            </Link>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
        Cancel anytime. Prices in INR, taxes may apply. Payments aren't live yet — the free tier is
        available today.
      </p>
    </section>
  );
}
