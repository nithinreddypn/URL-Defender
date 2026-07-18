import { Link } from "react-router-dom";
import { useState } from "react";
import { z } from "zod";
import { Github, Linkedin, Twitter, Check, Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { toast } from "sonner";

const cols = [
  {
    title: "Product",
    links: [
      { label: "Features", to: "/features" },
      { label: "How it works", to: "/how-it-works" },
      { label: "Pricing", to: "/pricing" },
      { label: "Scan a URL", to: "/scan" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/" },
      { label: "Careers", to: "/" },
      { label: "Press", to: "/" },
      { label: "Contact", to: "/" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Threat intel blog", to: "/" },
      { label: "Documentation", to: "/" },
      { label: "Status", to: "/" },
      { label: "Changelog", to: "/" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
      { label: "Security", to: "/" },
      { label: "DPA", to: "/" },
    ],
  },
] as const;

const emailSchema = z.string().trim().email("Enter a valid email");

export function MarketingFooter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      setState("error");
      return;
    }
    setError(null);
    setState("loading");
    setTimeout(() => {
      setState("success");
      toast.success("You're on the list", { description: "We'll send a monthly threat digest." });
    }, 700);
  };

  return (
    <footer className="hairline-t mt-24 bg-surface-alt/40">
      <div className="container-page py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground">
              Real-time URL scanning and threat intelligence. Built to catch phishing, malware, and
              impersonation before it reaches your users.
            </p>
            <form onSubmit={submit} className="mt-6" noValidate>
              <label htmlFor="footer-email" className="text-xs font-medium text-muted-foreground">
                Get the monthly threat digest
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="footer-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (state !== "idle") setState("idle");
                  }}
                  placeholder="you@company.com"
                  aria-invalid={state === "error"}
                  aria-describedby={error ? "footer-email-error" : undefined}
                  className="ring-focus h-10 flex-1 rounded-md border border-input bg-card px-3 text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={state === "loading" || state === "success"}
                  className="ring-focus inline-flex h-10 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-transform hover:scale-[1.02] active:scale-[0.97] disabled:opacity-70"
                >
                  {state === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {state === "success" && <Check className="h-4 w-4" />}
                  {state !== "loading" && state !== "success" && "Subscribe"}
                </button>
              </div>
              {error && (
                <p id="footer-email-error" className="mt-2 text-xs text-destructive">
                  {error}
                </p>
              )}
            </form>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {c.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col-reverse items-start justify-between gap-6 border-t border-border pt-8 md:flex-row md:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} URL Defender. All rights reserved.
          </p>
          <div className="flex items-center gap-1">
            <a
              href="#"
              aria-label="Twitter"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-hover-surface hover:text-foreground"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="GitHub"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-hover-surface hover:text-foreground"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="LinkedIn"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-hover-surface hover:text-foreground"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
