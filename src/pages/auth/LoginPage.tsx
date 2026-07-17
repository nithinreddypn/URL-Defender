import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { z } from "zod";
import { Mail, Lock, Loader2, ArrowRight, ShieldAlert } from "lucide-react";
import { Field, GoogleIcon, MicrosoftIcon } from "@/components/auth/form-primitives";
import { toast } from "sonner";
import { startGoogleSignIn } from "@/lib/google-oauth";
import { ApiError, apiRequest, setAuthToken, type BackendUser } from "@/lib/api";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errs, setErrs] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const signInWithGoogle = () => {
    void startGoogleSignIn().catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Google sign-in could not be started.");
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrs({ email: flat.email?.[0], password: flat.password?.[0] });
      return;
    }
    setErrs({});
    setLoading(true);
    try {
      const response = await apiRequest<{ token: string; user: BackendUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAuthToken(response.token);
      setLoading(false);
      toast.success("Welcome back");
      navigate("/home");
    } catch (cause) {
      setLoading(false);
      if (
        cause instanceof ApiError &&
        cause.status === 403 &&
        /email not verified/i.test(cause.message)
      ) {
        toast.error("Confirm your email before signing in.");
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      const next = attempts + 1;
      setAttempts(next);
      if (next >= 5) setRateLimited(true);
      toast.error(cause instanceof Error ? cause.message : "Unable to sign in.");
    }
  };

  if (rateLimited) {
    return (
      <Card>
        <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <h1 className="text-display text-2xl font-bold">Too many attempts</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          For your protection we've paused sign-ins from this device. Try again in 15 minutes, or
          reset your password if you've forgotten it.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            to="/forgot-password"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-foreground text-sm font-semibold text-background"
          >
            Reset password
          </Link>
          <button
            onClick={() => {
              setRateLimited(false);
              setAttempts(0);
            }}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-border text-sm font-semibold hover:bg-hover-surface"
          >
            I'll wait
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="text-display text-3xl font-bold">Welcome back</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to continue protecting your links.
      </p>

      <div className="mt-7 grid grid-cols-2 gap-3">
        <OAuthBtn provider="Google" onClick={signInWithGoogle}>
          <GoogleIcon />
        </OAuthBtn>
        <OAuthBtn provider="Microsoft">
          <MicrosoftIcon />
        </OAuthBtn>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or continue with email{" "}
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} noValidate className="space-y-4">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errs.email}
          leadingIcon={<Mail className="h-4 w-4" />}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errs.password}
          leadingIcon={<Lock className="h-4 w-4" />}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="inline-flex items-center gap-2 text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-input bg-card accent-foreground"
            />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            className="font-medium text-foreground hover:underline underline-offset-4"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="ring-focus mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-foreground text-sm font-semibold text-background transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Sign in <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link
          to="/signup"
          className="font-medium text-foreground hover:underline underline-offset-4"
        >
          Sign up
        </Link>
      </p>
    </Card>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="glass rounded-2xl p-8 elev-3 animate-fade-up">{children}</div>;
}

export function OAuthBtn({
  provider,
  children,
  onClick,
}: {
  provider: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick ??
        (() =>
          toast.info(`${provider} sign-in is not wired in this demo`, {
            description: "OAuth configuration is required.",
          }))
      }
      className="ring-focus inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-card text-sm font-medium hover:bg-hover-surface transition-colors"
    >
      {children}
      {provider}
    </button>
  );
}
