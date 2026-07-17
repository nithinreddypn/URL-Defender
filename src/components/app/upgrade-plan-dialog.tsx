import { useState } from "react";
import { ArrowLeft, Check, CreditCard, Landmark, Smartphone, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { logActivity, fetchCurrentUser } from "@/lib/dashboard-store";
import { openRazorpayCheckout, type RazorpayMethod } from "@/lib/razorpay";

export type PlanId = "monthly" | "quarterly" | "yearly";

type Plan = {
  id: PlanId;
  name: string;
  cadence: string;
  priceLabel: string;
  perMonth: string;
  amountPaise: number;
  badge?: string;
  saveLabel?: string;
  features: string[];
};

const PLANS: Plan[] = [
  {
    id: "monthly",
    name: "1 Month",
    cadence: "billed monthly",
    priceLabel: "₹799",
    perMonth: "₹799 / month",
    amountPaise: 79900,
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
    amountPaise: 214900,
    badge: "Popular",
    saveLabel: "Save 11%",
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
    amountPaise: 639900,
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

type PaymentOption = {
  id: RazorpayMethod;
  label: string;
  hint: string;
  icon: typeof CreditCard;
};

const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: "upi", label: "UPI", hint: "GPay, PhonePe, Paytm & more", icon: Smartphone },
  { id: "card", label: "Card", hint: "Credit or debit card", icon: CreditCard },
  { id: "netbanking", label: "Netbanking", hint: "All major Indian banks", icon: Landmark },
];

const BANKS = [
  { code: "HDFC", name: "HDFC Bank" },
  { code: "ICIC", name: "ICICI Bank" },
  { code: "SBIN", name: "State Bank of India" },
  { code: "UTIB", name: "Axis Bank" },
  { code: "KKBK", name: "Kotak Mahindra Bank" },
  { code: "YESB", name: "Yes Bank" },
  { code: "PUNB", name: "Punjab National Bank" },
  { code: "BARB", name: "Bank of Baroda" },
];

// ----- Validation schemas -----
const upiSchema = z.object({
  vpa: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9]{1,32}$/, {
      message: "Enter a valid UPI ID (e.g. name@bank)",
    }),
});

const cardSchema = z.object({
  name: z.string().trim().min(2, "Enter the name on card").max(64),
  number: z
    .string()
    .transform((v) => v.replace(/\s+/g, ""))
    .pipe(z.string().regex(/^\d{13,19}$/, "Card number must be 13–19 digits")),
  expiry: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])\/(\d{2})$/, "Expiry must be MM/YY"),
  cvv: z
    .string()
    .trim()
    .regex(/^\d{3,4}$/, "CVV must be 3 or 4 digits"),
});

const netbankingSchema = z.object({
  bank: z.string().min(1, "Select a bank"),
});

type Step = "plan" | "method" | "details";

export function UpgradePlanDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [step, setStep] = useState<Step>("plan");
  const [selected, setSelected] = useState<PlanId>("quarterly");
  const [method, setMethod] = useState<RazorpayMethod>("upi");
  const [loading, setLoading] = useState(false);

  // UPI
  const [vpa, setVpa] = useState("");
  // Card
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  // Netbanking
  const [bank, setBank] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const plan = PLANS.find((p) => p.id === selected)!;

  function reset() {
    setStep("plan");
    setLoading(false);
    setVpa("");
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setBank("");
    setErrors({});
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  function formatCardNumber(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 19);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  }

  function formatExpiry(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    if (digits.length < 3) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  function validateDetails(): boolean {
    setErrors({});
    let result;
    if (method === "upi") {
      result = upiSchema.safeParse({ vpa });
    } else if (method === "card") {
      result = cardSchema.safeParse({
        name: cardName,
        number: cardNumber,
        expiry: cardExpiry,
        cvv: cardCvv,
      });
    } else {
      result = netbankingSchema.safeParse({ bank });
    }
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".") || "form";
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return false;
    }
    return true;
  }

  async function handlePay() {
    if (!validateDetails()) return;
    setLoading(true);
    const user = await fetchCurrentUser();

    const prefill: {
      name: string;
      email: string;
      vpa?: string;
      bank?: string;
    } = { name: user.full_name, email: user.email };
    if (method === "upi") prefill.vpa = vpa.trim();
    if (method === "netbanking") prefill.bank = bank;

    const detailSummary =
      method === "upi"
        ? `UPI ${vpa.trim()}`
        : method === "card"
          ? `Card ending ${cardNumber.replace(/\s/g, "").slice(-4)}`
          : `Netbanking ${BANKS.find((b) => b.code === bank)?.name ?? bank}`;

    const ok = await openRazorpayCheckout({
      amountInPaise: plan.amountPaise,
      planName: plan.name,
      method,
      prefill,
      onSuccess: (res) => {
        logActivity("plan_changed", `Paid for ${plan.name} · ${detailSummary}`);
        toast.success("Payment successful", {
          description: `Payment ID: ${res.razorpay_payment_id}`,
        });
        handleOpenChange(false);
      },
      onDismiss: () => {
        setLoading(false);
        toast.info("Payment cancelled", {
          description: "You closed the checkout before completing payment.",
        });
      },
    });
    if (!ok) {
      setLoading(false);
      toast.error("Couldn't open Razorpay", {
        description: "Check your internet connection and try again.",
      });
    }
  }

  const stepLabel =
    step === "plan" ? "Upgrade" : step === "method" ? "Payment method" : "Payment details";
  const stepTitle =
    step === "plan"
      ? "Choose a plan"
      : step === "method"
        ? `Pay ${plan.priceLabel} for ${plan.name}`
        : method === "upi"
          ? "Enter your UPI ID"
          : method === "card"
            ? "Enter your card details"
            : "Select your bank";
  const stepDesc =
    step === "plan"
      ? "Unlock unlimited scans, longer history and priority protection."
      : step === "method"
        ? "Select how you'd like to pay. Details are collected on the next step."
        : "Your details are sent securely to Razorpay for authorization.";

  const inputCls =
    "ring-focus h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-foreground";
  const labelCls = "mb-1.5 block text-xs font-medium text-muted-foreground";
  const errCls = "mt-1 text-[11px] font-medium text-red-500";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            {stepLabel}
          </div>
          <DialogTitle className="text-xl">{stepTitle}</DialogTitle>
          <DialogDescription>{stepDesc}</DialogDescription>
        </DialogHeader>

        {step === "plan" && (
          <div role="radiogroup" aria-label="Choose a plan" className="grid gap-3 sm:grid-cols-3">
            {PLANS.map((p) => {
              const active = selected === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelected(p.id)}
                  className={cn(
                    "ring-focus group relative flex flex-col rounded-xl border p-4 text-left transition-all",
                    active
                      ? "border-foreground bg-hover-surface shadow-sm"
                      : "border-border bg-card hover:border-foreground/40",
                  )}
                >
                  {p.badge && (
                    <span className="absolute -top-2 right-3 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background">
                      {p.badge}
                    </span>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{p.name}</span>
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full border",
                        active ? "border-foreground bg-foreground" : "border-border",
                      )}
                      aria-hidden
                    >
                      {active && <Check className="h-3 w-3 text-background" strokeWidth={3} />}
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-semibold tracking-tight">{p.priceLabel}</span>
                    <span className="text-xs text-muted-foreground">
                      / {p.id === "monthly" ? "mo" : p.id === "quarterly" ? "3mo" : "yr"}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{p.perMonth}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{p.cadence}</div>
                  {p.saveLabel && (
                    <div className="mt-2 inline-flex w-fit rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                      {p.saveLabel}
                    </div>
                  )}
                  <ul className="mt-4 space-y-1.5">
                    {p.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-1.5 text-xs text-muted-foreground"
                      >
                        <Check
                          className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-500"
                          strokeWidth={2.5}
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        )}

        {step === "method" && (
          <div
            role="radiogroup"
            aria-label="Choose a payment method"
            className="grid gap-3 sm:grid-cols-3"
          >
            {PAYMENT_OPTIONS.map((opt) => {
              const active = method === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMethod(opt.id)}
                  className={cn(
                    "ring-focus relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all",
                    active
                      ? "border-foreground bg-hover-surface shadow-sm"
                      : "border-border bg-card hover:border-foreground/40",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-10 w-10 items-center justify-center rounded-lg border",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{opt.hint}</div>
                  </div>
                  <span
                    className={cn(
                      "absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full border",
                      active ? "border-foreground bg-foreground" : "border-border",
                    )}
                    aria-hidden
                  >
                    {active && <Check className="h-3 w-3 text-background" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {step === "details" && (
          <div className="rounded-xl border border-border bg-card/50 p-4">
            {method === "upi" && (
              <div>
                <label htmlFor="upi-vpa" className={labelCls}>
                  UPI ID (VPA)
                </label>
                <input
                  id="upi-vpa"
                  type="text"
                  autoComplete="off"
                  inputMode="email"
                  placeholder="yourname@upi"
                  value={vpa}
                  onChange={(e) => setVpa(e.target.value)}
                  className={inputCls}
                  aria-invalid={!!errors.vpa}
                />
                {errors.vpa && <p className={errCls}>{errors.vpa}</p>}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  You'll get a collect request in your UPI app to approve ₹
                  {(plan.amountPaise / 100).toLocaleString("en-IN")}.
                </p>
              </div>
            )}

            {method === "card" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="card-name" className={labelCls}>
                    Name on card
                  </label>
                  <input
                    id="card-name"
                    type="text"
                    autoComplete="cc-name"
                    placeholder="As printed on your card"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className={inputCls}
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && <p className={errCls}>{errors.name}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="card-number" className={labelCls}>
                    Card number
                  </label>
                  <input
                    id="card-number"
                    type="text"
                    autoComplete="cc-number"
                    inputMode="numeric"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    className={inputCls}
                    aria-invalid={!!errors.number}
                  />
                  {errors.number && <p className={errCls}>{errors.number}</p>}
                </div>
                <div>
                  <label htmlFor="card-expiry" className={labelCls}>
                    Expiry (MM/YY)
                  </label>
                  <input
                    id="card-expiry"
                    type="text"
                    autoComplete="cc-exp"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    className={inputCls}
                    aria-invalid={!!errors.expiry}
                  />
                  {errors.expiry && <p className={errCls}>{errors.expiry}</p>}
                </div>
                <div>
                  <label htmlFor="card-cvv" className={labelCls}>
                    CVV
                  </label>
                  <input
                    id="card-cvv"
                    type="password"
                    autoComplete="cc-csc"
                    inputMode="numeric"
                    placeholder="•••"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                    className={inputCls}
                    aria-invalid={!!errors.cvv}
                  />
                  {errors.cvv && <p className={errCls}>{errors.cvv}</p>}
                </div>
                <p className="text-[11px] text-muted-foreground sm:col-span-2">
                  Card details are handed off to Razorpay's PCI-DSS secure checkout for
                  authorization.
                </p>
              </div>
            )}

            {method === "netbanking" && (
              <div>
                <label htmlFor="bank-select" className={labelCls}>
                  Choose your bank
                </label>
                <select
                  id="bank-select"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className={inputCls}
                  aria-invalid={!!errors.bank}
                >
                  <option value="">Select a bank…</option>
                  {BANKS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {errors.bank && <p className={errCls}>{errors.bank}</p>}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  You'll be redirected to your bank's secure login to authorize the payment.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            {step === "plan"
              ? "Cancel anytime. Prices in INR, taxes may apply."
              : "Secured by Razorpay. Test mode — use Razorpay test credentials."}
          </p>
          <div className="flex gap-2 sm:justify-end">
            {step !== "plan" ? (
              <button
                type="button"
                onClick={() => {
                  setErrors({});
                  setStep(step === "details" ? "method" : "plan");
                }}
                disabled={loading}
                className="ring-focus inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-4 text-sm font-medium hover:bg-hover-surface disabled:opacity-60"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="ring-focus h-9 rounded-md border border-border px-4 text-sm font-medium hover:bg-hover-surface"
              >
                Not now
              </button>
            )}
            {step === "plan" && (
              <button
                type="button"
                onClick={() => setStep("method")}
                className="ring-focus inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-4 text-sm font-semibold text-background transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Continue with {plan.name}
              </button>
            )}
            {step === "method" && (
              <button
                type="button"
                onClick={() => setStep("details")}
                className="ring-focus inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-4 text-sm font-semibold text-background transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Continue
              </button>
            )}
            {step === "details" && (
              <button
                type="button"
                onClick={handlePay}
                disabled={loading}
                className="ring-focus inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-4 text-sm font-semibold text-background transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? "Opening Razorpay…" : `Pay ${plan.priceLabel}`}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
