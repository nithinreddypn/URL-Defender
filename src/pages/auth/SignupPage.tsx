import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { z } from "zod";
import { Mail, Lock, User, Loader2, ArrowRight, UserPlus } from "lucide-react";
import {
  Field,
  PasswordStrength,
  strengthScore,
  GoogleIcon,
} from "@/components/auth/form-primitives";
import { Card, OAuthBtn } from "./LoginPage";
import { toast } from "sonner";
import { startGoogleSignIn } from "@/lib/google-oauth";
import { apiRequest } from "@/lib/api";

const schema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(80),
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
    terms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

export default function SignupPage() {
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "" });
  const [terms, setTerms] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [duplicate, setDuplicate] = useState(false);

  const signInWithGoogle = () => {
    void startGoogleSignIn().catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Google sign-in could not be started.");
    });
  };

  const update = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    if (errs[k]) setErrs((p) => ({ ...p, [k]: "" }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ ...f, terms });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      setErrs(Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    if (strengthScore(f.password) < 2) {
      setErrs({ password: "Choose a stronger password" });
      return;
    }
    setErrs({});
    setLoading(true);
    try {
      const response = await apiRequest<{ email_sent?: boolean }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email: f.email, password: f.password, full_name: f.name }),
      });
      setLoading(false);
      if (response.email_sent === false) {
        toast.error(
          "Account created, but we could not send the verification email. Use Resend code to try again.",
        );
      } else {
        toast.success("Account created", { description: "Check your inbox to verify your email." });
      }
      nav(`/verify-email?email=${encodeURIComponent(f.email)}`);
    } catch (cause) {
      setLoading(false);
      if (cause instanceof Error && /already registered/i.test(cause.message)) setDuplicate(true);
      else toast.error(cause instanceof Error ? cause.message : "Unable to create account.");
    }
  };

  if (duplicate) {
    return (
      <Card>
        <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-info/40 bg-info/10 text-info">
          <UserPlus className="h-5 w-5" />
        </div>
        <h1 className="text-display text-2xl font-bold">Account already exists</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Looks like <span className="text-foreground font-medium">{f.email}</span> is already
          registered. Sign in instead, or reset your password.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            to="/login"
            className="inline-flex h-11 items-center justify-center rounded-md bg-foreground text-sm font-semibold text-background"
          >
            Sign in
          </Link>
          <Link
            to="/forgot-password"
            className="inline-flex h-11 items-center justify-center rounded-md border border-border text-sm font-semibold hover:bg-hover-surface"
          >
            Reset password
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="text-display text-3xl font-bold">Create your account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        50 free scans per month · no credit card required.
      </p>

      <div className="mt-7 grid grid-cols-1 gap-3">
        <OAuthBtn provider="Google" onClick={signInWithGoogle}>
          <GoogleIcon />
        </OAuthBtn>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or with email{" "}
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} noValidate className="space-y-4">
        <Field
          label="Full name"
          value={f.name}
          onChange={update("name")}
          error={errs.name}
          valid={!errs.name && f.name.trim().length >= 2}
          autoComplete="name"
          placeholder="Alex Morgan"
          leadingIcon={<User className="h-4 w-4" />}
        />
        <Field
          label="Work email"
          type="email"
          value={f.email}
          onChange={update("email")}
          error={errs.email}
          valid={!errs.email && z.string().email().safeParse(f.email).success}
          autoComplete="email"
          placeholder="you@company.com"
          leadingIcon={<Mail className="h-4 w-4" />}
        />
        <div>
          <Field
            label="Password"
            type="password"
            value={f.password}
            onChange={update("password")}
            error={errs.password}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            leadingIcon={<Lock className="h-4 w-4" />}
          />
          {f.password && (
            <div className="mt-2">
              <PasswordStrength value={f.password} />
            </div>
          )}
        </div>
        <Field
          label="Confirm password"
          type="password"
          value={f.confirm}
          onChange={update("confirm")}
          error={errs.confirm}
          valid={!!f.confirm && f.confirm === f.password}
          autoComplete="new-password"
          placeholder="Type it again"
          leadingIcon={<Lock className="h-4 w-4" />}
        />

        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => {
              setTerms(e.target.checked);
              if (errs.terms) setErrs((p) => ({ ...p, terms: "" }));
            }}
            className="mt-0.5 h-4 w-4 rounded border-input bg-card accent-foreground"
          />
          <span className="text-muted-foreground">
            I agree to the{" "}
            <Link to="/terms" className="text-foreground underline underline-offset-4">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-foreground underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errs.terms && <p className="-mt-2 text-xs text-destructive">{errs.terms}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-foreground text-sm font-semibold text-background transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Create account <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-foreground hover:underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </Card>
  );
}
