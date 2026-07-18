// Client-only Razorpay Checkout loader + opener.
// Test mode key. Replace via VITE_RAZORPAY_KEY_ID for your own test account.
export const RAZORPAY_KEY_ID =
  (import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined) ?? "rzp_test_1DP5mmOlF5G5ag"; // Razorpay's public demo test key

export type RazorpayMethod = "upi" | "card" | "netbanking";

type RazorpayOptions = {
  key: string;
  amount: number; // in paise
  currency: string;
  name: string;
  description?: string;
  image?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  method?: Partial<Record<"upi" | "card" | "netbanking" | "wallet" | "emi" | "paylater", boolean>>;
  handler?: (response: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }) => void;
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

let loaderPromise: Promise<boolean> | null = null;

export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      loaderPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return loaderPromise;
}

export async function openRazorpayCheckout(opts: {
  amountInPaise: number;
  planName: string;
  method: RazorpayMethod;
  prefill?: RazorpayOptions["prefill"];
  onSuccess?: RazorpayOptions["handler"];
  onDismiss?: () => void;
}): Promise<boolean> {
  const ok = await loadRazorpay();
  if (!ok || !window.Razorpay) return false;

  const methodConfig: RazorpayOptions["method"] = {
    upi: opts.method === "upi",
    card: opts.method === "card",
    netbanking: opts.method === "netbanking",
    wallet: false,
    emi: false,
    paylater: false,
  };

  const rzp = new window.Razorpay({
    key: RAZORPAY_KEY_ID,
    amount: opts.amountInPaise,
    currency: "INR",
    name: "URL Defender",
    description: `${opts.planName} plan`,
    theme: { color: "#0f172a" },
    prefill: opts.prefill,
    method: methodConfig,
    handler: opts.onSuccess,
    modal: { ondismiss: opts.onDismiss },
  });
  rzp.open();
  return true;
}
