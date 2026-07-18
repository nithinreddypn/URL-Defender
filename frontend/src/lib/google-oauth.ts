const STATE_KEY = "url-defender-google-oauth-state";
const VERIFIER_KEY = "url-defender-google-oauth-verifier";

function base64Url(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function randomValue(size: number): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

/** Begins an OAuth authorization-code flow with PKCE. */
export async function startGoogleSignIn(): Promise<void> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("Google sign-in has not been configured for this app.");
  }

  // Clear any existing auth token to avoid session issues
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("url-defender-token");
  }

  const state = randomValue(32);
  const verifier = randomValue(64);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = base64Url(new Uint8Array(digest));
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${query}`);
}

export function consumeGoogleOAuthResponse(): { code: string; verifier: string } {
  const query = new URLSearchParams(window.location.search);
  const code = query.get("code");
  const receivedState = query.get("state");
  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);

  if (query.get("error")) throw new Error("Google sign-in was cancelled or denied.");
  if (!code || !verifier || !receivedState || receivedState !== expectedState) {
    throw new Error("Google sign-in could not be verified. Please try again.");
  }
  return { code, verifier };
}
