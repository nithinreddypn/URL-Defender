import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { Card } from "./LoginPage";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || undefined;
  const nav = useNavigate();

  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const [sending, setSending] = useState(false);
  const [expiresIn, setExpiresIn] = useState(60); // 1 min (60 seconds)

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (expiresIn <= 0 || verified) return;
    const t = setTimeout(() => setExpiresIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [expiresIn, verified]);

  const full = code.join("");
  const canSubmit =
    !!email &&
    full.length === 6 &&
    /^\d{6}$/.test(full) &&
    !verifying &&
    !verified &&
    expiresIn > 0;

  const setDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    setCode((prev) => {
      const next = [...prev];
      next[i] = d;
      return next;
    });
    if (error) setError(null);
    if (d && i < 5) inputsRef.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[i] && i > 0) inputsRef.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) inputsRef.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) inputsRef.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = Array(6).fill("");
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setCode(next);
    setError(null);
    inputsRef.current[Math.min(text.length, 5)]?.focus();
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setVerifying(true);
    try {
      await apiRequest("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email, code: full }),
      });
      setVerifying(false);
      setVerified(true);
      toast.success("Email verified", { description: "Your account is ready." });
      setTimeout(() => nav("/login"), 1200);
    } catch (cause) {
      setVerifying(false);
      setError(
        cause instanceof Error ? cause.message : "That code could not be verified. Try again.",
      );
      setCode(Array(6).fill(""));
      inputsRef.current[0]?.focus();
    }
  };

  const resend = async () => {
    if (!email || sending || cooldown > 0) return;
    setSending(true);
    try {
      const response = await apiRequest<{ email_sent?: boolean }>("/api/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setCode(Array(6).fill(""));
      setError(null);
      setExpiresIn(60);
      setCooldown(30);
      if (response.email_sent === false) {
        toast.error("We could not send the email. Please try again shortly.");
      } else {
        toast.success("New code sent", { description: `Sent to ${email}.` });
      }
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to resend the code.");
    } finally {
      setSending(false);
    }
  };

  const mm = useMemo(() => String(Math.floor(expiresIn / 60)).padStart(1, "0"), [expiresIn]);
  const ss = useMemo(() => String(expiresIn % 60).padStart(2, "0"), [expiresIn]);

  if (verified) {
    return (
      <Card>
        <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="text-display text-2xl font-bold">Email verified</h1>
        <p className="mt-2 text-sm text-muted-foreground">Redirecting you to sign in…</p>
      </Card>
    );
  }

  return (
    <Card>
      <EnvelopeShield />
      <h1 className="mt-6 text-display text-3xl font-bold">Confirm your email</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We sent a 6-digit code to{" "}
        <span className="text-foreground font-medium">{email ?? "your email address"}</span>. Enter
        it below to prove the address is yours.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        <div className="flex justify-between gap-2" onPaste={handlePaste}>
          {code.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              aria-label={`Digit ${i + 1}`}
              aria-invalid={!!error}
              className={
                "h-14 w-full rounded-md border bg-card text-center text-xl font-semibold outline-none transition-all " +
                "focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_25%,transparent)] " +
                (error ? "border-destructive/60" : "border-input")
              }
            />
          ))}
        </div>

        {error ? (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Code expires in{" "}
            <span className="text-foreground font-medium">
              {mm}:{ss}
            </span>
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-foreground text-sm font-semibold text-background transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
        >
          {verifying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" /> Verify email
            </>
          )}
        </button>
      </form>

      <button
        type="button"
        onClick={resend}
        disabled={sending || cooldown > 0}
        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-card text-sm font-semibold hover:bg-hover-surface disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {sending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : cooldown > 0 ? (
          `Resend code in ${cooldown}s`
        ) : (
          "Resend code"
        )}
      </button>

      <p className="mt-4 text-xs text-muted-foreground">
        Didn't get it? Check your spam folder, or{" "}
        <Link to="/signup" className="text-foreground underline underline-offset-4">
          use a different email
        </Link>
        .
      </p>

      <div className="mt-6 border-t border-border pt-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      </div>
    </Card>
  );
}

function EnvelopeShield() {
  return (
    <div className="relative inline-flex h-16 w-16 items-center justify-center">
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl opacity-90"
        style={{
          background:
            "linear-gradient(135deg, rgba(34,197,94,0.25), rgba(59,130,246,0.25), rgba(139,92,246,0.25))",
          filter: "blur(14px)",
        }}
      />
      <svg
        viewBox="0 0 64 64"
        className="relative h-14 w-14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <rect x="8" y="16" width="48" height="34" rx="6" className="text-foreground/80" />
        <path d="M8 20l24 18 24-18" className="text-foreground/60" />
        <path
          d="M32 30l14 6v6c0 8-6 14-14 16-8-2-14-8-14-16v-6l14-6z"
          fill="var(--card)"
          className="text-emerald-400"
          strokeWidth="1.8"
        />
        <path
          d="M27 42l4 4 6-8"
          className="text-emerald-400"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </div>
  );
}
