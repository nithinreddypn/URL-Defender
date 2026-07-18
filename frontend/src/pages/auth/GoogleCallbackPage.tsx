import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { consumeGoogleOAuthResponse } from "@/lib/google-oauth";

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const handled = useRef(false);

  useEffect(() => {
    // React Strict Mode re-runs effects in development. The OAuth response and
    // PKCE verifier are single-use, so process this callback only once.
    if (handled.current) return;
    handled.current = true;

    const finishSignIn = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL;
        if (!apiBase) throw new Error("The API URL has not been configured.");
        const { code, verifier } = consumeGoogleOAuthResponse();
        const response = await fetch(`${apiBase.replace(/\/$/, "")}/api/auth/google/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, code_verifier: verifier }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || typeof data.token !== "string") {
          throw new Error(data.error || "Google sign-in could not be completed.");
        }
        localStorage.setItem("url-defender-token", data.token);
        navigate("/home", { replace: true });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Google sign-in could not be completed.");
      }
    };
    void finishSignIn();
  }, [navigate]);

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 text-center">
      <div>
        {error ? (
          <>
            <h1 className="text-display text-2xl font-bold">Sign-in failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <a
              className="mt-6 inline-flex text-sm font-medium underline underline-offset-4"
              href="/login"
            >
              Return to sign in
            </a>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-7 w-7 animate-spin" />
            <h1 className="mt-4 text-display text-2xl font-bold">Signing you in</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Completing Google sign-in securely…
            </p>
          </>
        )}
      </div>
    </main>
  );
}
