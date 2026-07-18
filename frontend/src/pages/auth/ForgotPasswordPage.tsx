import { Link } from "react-router-dom";
import { useState } from "react";
import { z } from "zod";
import { Mail, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { Field } from "@/components/auth/form-primitives";
import { Card } from "./LoginPage";
import { apiRequest } from "@/lib/api";

const schema = z.string().trim().email("Enter a valid email");

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "sent">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(email);
    if (!parsed.success) return setErr(parsed.error.issues[0].message);
    setErr(null);
    setState("loading");
    try {
      await apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setState("sent");
    } catch (cause) {
      setState("idle");
      setErr(
        cause instanceof Error
          ? cause.message
          : "Unable to send the reset email. Please try again.",
      );
    }
  };

  if (state === "sent") {
    return (
      <Card>
        <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <h1 className="text-display text-2xl font-bold">Check your inbox</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          If an account exists for <span className="text-foreground font-medium">{email}</span>,
          we've sent a link to reset your password. It's valid for 30 minutes.
        </p>
        <div className="mt-6 space-y-2 text-sm">
          <button
            type="button"
            onClick={() => setState("idle")}
            className="text-muted-foreground hover:text-foreground"
          >
            Use a different email
          </button>
        </div>
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

  return (
    <Card>
      <h1 className="text-display text-3xl font-bold">Forgot your password?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        No problem. Enter the email associated with your account and we'll send you a reset link.
      </p>

      <form onSubmit={submit} noValidate className="mt-7 space-y-4">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (err) setErr(null);
          }}
          error={err}
          leadingIcon={<Mail className="h-4 w-4" />}
          placeholder="you@company.com"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-foreground text-sm font-semibold text-background transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70"
        >
          {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
        </button>
      </form>

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
