import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Lock, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Field, PasswordStrength, strengthScore } from "@/components/auth/form-primitives";
import { Card } from "./LoginPage";
import { z } from "zod";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || undefined;
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errs, setErrs] = useState<{ pw?: string; confirm?: string }>({});
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [linkInvalid, setLinkInvalid] = useState(!token);

  if (linkInvalid) {
    return (
      <Card>
        <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10 text-destructive">
          <XCircle className="h-5 w-5" />
        </div>
        <h1 className="text-display text-2xl font-bold">Link expired</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Reset links are valid for 30 minutes. Request a fresh one and we'll email it right away.
        </p>
        <Link
          to="/forgot-password"
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-foreground text-sm font-semibold text-background"
        >
          Request a new link
        </Link>
      </Card>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errs = {};
    const pwOk = z.string().min(8).safeParse(pw).success;
    if (!pwOk) next.pw = "At least 8 characters";
    else if (strengthScore(pw) < 2) next.pw = "Choose a stronger password";
    if (pw !== confirm) next.confirm = "Passwords don't match";
    if (Object.keys(next).length) return setErrs(next);
    setErrs({});
    setState("loading");
    try {
      await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password: pw }),
      });
      setState("done");
      toast.success("Password updated");
      setTimeout(() => nav("/login"), 1600);
    } catch (cause) {
      setState("idle");
      if (cause instanceof Error && /invalid|expired/i.test(cause.message)) {
        setLinkInvalid(true);
      } else {
        toast.error(
          cause instanceof Error ? cause.message : "Unable to update the password. Try again.",
        );
      }
    }
  };

  if (state === "done") {
    return (
      <Card>
        <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <h1 className="text-display text-2xl font-bold">Password updated</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You'll be redirected to sign in with your new password in a moment.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="text-display text-3xl font-bold">Set a new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick something you haven't used before. Aim for at least 12 characters with a mix of
        letters, numbers, and symbols.
      </p>

      <form onSubmit={submit} noValidate className="mt-7 space-y-4">
        <div>
          <Field
            label="New password"
            type="password"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              if (errs.pw) setErrs((p) => ({ ...p, pw: undefined }));
            }}
            error={errs.pw}
            leadingIcon={<Lock className="h-4 w-4" />}
            autoComplete="new-password"
          />
          {pw && (
            <div className="mt-2">
              <PasswordStrength value={pw} />
            </div>
          )}
        </div>
        <Field
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            if (errs.confirm) setErrs((p) => ({ ...p, confirm: undefined }));
          }}
          error={errs.confirm}
          valid={!!confirm && confirm === pw}
          leadingIcon={<Lock className="h-4 w-4" />}
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={state === "loading"}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-foreground text-sm font-semibold text-background transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70"
        >
          {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
        </button>
      </form>
    </Card>
  );
}
