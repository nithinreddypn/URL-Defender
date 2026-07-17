import { cn } from "@/lib/utils";
import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  hint?: string;
  valid?: boolean;
  leadingIcon?: ReactNode;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, valid, id, leadingIcon, className, type = "text", ...rest },
  ref,
) {
  const inputId = id || rest.name || label.replace(/\s+/g, "-").toLowerCase();
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword && show ? "text" : type;
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            "h-11 w-full rounded-md border bg-card px-3 text-sm outline-none transition-all placeholder:text-muted-foreground",
            "focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_25%,transparent)]",
            leadingIcon && "pl-9",
            (isPassword || valid) && "pr-10",
            error ? "border-destructive/60" : "border-input",
            className,
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-hover-surface hover:text-foreground"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        {!isPassword && valid && !error && (
          <CheckCircle2 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
        )}
      </div>
      {error ? (
        <p id={`${inputId}-err`} className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export function PasswordStrength({ value }: { value: string }) {
  const score = strengthScore(value);
  const label = ["Too weak", "Weak", "Okay", "Strong", "Excellent"][score];
  const color = ["bg-muted", "bg-red-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-400"][
    score
  ];
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < score ? color : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Password strength: <span className="text-foreground">{label}</span>
      </p>
    </div>
  );
}

export function strengthScore(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4) as 0 | 1 | 2 | 3 | 4;
}

export function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...props}>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.4 4 9.9 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 34.9 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.8 39.7 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.5 35.8 44 30.4 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

export function MicrosoftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 23 23" width="14" height="14" {...props}>
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}
