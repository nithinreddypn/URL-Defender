import { useNavigate, Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Building2,
  Camera,
  KeyRound,
  LogOut,
  Mail,
  Pencil,
  ScanLine,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
  MONTHLY_SCAN_LIMIT,
  fetchActivity,
  fetchCurrentUser,
  fetchScans,
  logActivity,
  resetAccount,
  updateProfile,
  uploadAvatar,
  currentMonthUsage,
  type ActivityEvent,
} from "@/lib/dashboard-store";
import { initials, type MockUser } from "@/lib/mock/user";
import type { Scan } from "@/lib/mock/scans";
import { cn } from "@/lib/utils";
import { resolveApiAssetUrl } from "@/lib/api";
import { useCountUp } from "@/hooks/use-count-up";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, PasswordStrength, strengthScore } from "@/components/auth/form-primitives";
import { UpgradePlanDialog } from "@/components/app/upgrade-plan-dialog";

type Profile = MockUser & { company?: string };

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Profile | null>(null);
  const [scans, setScans] = useState<Scan[] | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[] | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function refresh() {
    const [u, s, a] = await Promise.all([fetchCurrentUser(), fetchScans(), fetchActivity()]);
    setUser(u);
    setScans(s);
    setActivity(a);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleLogout() {
    logActivity("logout", "Signed out");
    toast.success("Signed out");
    await navigate("/login");
  }

  async function handleDelete() {
    await resetAccount();
    toast.success("Account deleted");
    await navigate("/login");
  }

  const loading = !user || !scans || !activity;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Account
        </p>
        <h1 className="mt-1 text-display text-2xl sm:text-3xl">Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your identity, security, and subscription.
        </p>
      </div>

      {loading ? (
        <ProfileSkeleton />
      ) : (
        <>
          <ProfileHeader user={user!} onAvatarChange={(file) => updateAvatar(file, refresh)} />

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <StatsSection scans={scans!} />
              <MonthlyChart scans={scans!} />
              <ActivityLog events={activity!} />
            </div>
            <div className="space-y-6">
              <AccountCard
                onEdit={() => setEditOpen(true)}
                onChangePassword={() => setPwOpen(true)}
                onLogout={handleLogout}
                onDelete={() => setDeleteOpen(true)}
              />
              <SubscriptionCard user={user!} scans={scans!} />
            </div>
          </div>
        </>
      )}

      {user && (
        <>
          <EditProfileDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            user={user}
            onSaved={refresh}
          />
          <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} onSaved={refresh} />
          <DeleteAccountDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={handleDelete}
          />
        </>
      )}
    </div>
  );
}

async function updateAvatar(file: File | null, refresh: () => Promise<void>) {
  if (file) await uploadAvatar(file);
  else await updateProfile({ avatar_url: null });
  toast.success(file ? "Avatar updated" : "Avatar removed");
  await refresh();
}

// ---------- header ----------

function ProfileHeader({
  user,
  onAvatarChange,
}: {
  user: Profile;
  onAvatarChange: (file: File | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarUrl = resolveApiAssetUrl(user.avatar_url);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => setAvatarFailed(false), [avatarUrl]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1024 * 1024) {
      toast.error("Image too large — keep it under 1 MB");
      return;
    }
    onAvatarChange(f);
  }

  const memberSince = new Date(user.created_at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="mt-8 flex flex-col gap-5 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center">
      <div className="relative">
        <span
          className="relative inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-full text-xl font-semibold text-background"
          style={{ background: "linear-gradient(135deg,#22c55e 0%,#3b82f6 100%)" }}
          aria-hidden
        >
          {avatarUrl && !avatarFailed ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <span>{initials(user.full_name)}</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Change avatar"
          className="ring-focus absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm hover:bg-hover-surface"
        >
          <Camera className="h-4 w-4" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onFile} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{user.full_name}</h2>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
            <BadgeCheck className="h-3 w-3" /> Verified
          </span>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Mail className="h-3.5 w-3.5" /> {user.email}
        </p>
        {user.company && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" /> {user.company}
          </p>
        )}
        <p className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground">
          Member since {memberSince}
        </p>
      </div>

      {user.avatar_url && (
        <button
          type="button"
          onClick={() => onAvatarChange(null)}
          className="ring-focus inline-flex h-8 items-center gap-1.5 self-start rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-hover-surface hover:text-foreground"
        >
          Remove
        </button>
      )}
    </section>
  );
}

// ---------- stats ----------

function StatsSection({ scans }: { scans: Scan[] }) {
  const total = scans.length;
  const threats = scans.filter((s) => s.verdict === "dangerous").length;
  const safe = scans.filter((s) => s.verdict === "safe").length;

  return (
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">
        Usage statistics
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Total scans" value={total} icon={ScanLine} tone="brand" />
        <MiniStat label="Threats found" value={threats} icon={ShieldAlert} tone="danger" />
        <MiniStat label="Safe URLs" value={safe} icon={ShieldCheck} tone="safe" />
      </div>
    </section>
  );
}

const TONE: Record<"brand" | "danger" | "safe", { fg: string; bg: string }> = {
  brand: { fg: "text-info", bg: "bg-info/10 border-info/20" },
  danger: { fg: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
  safe: { fg: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
};

function MiniStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof ScanLine;
  tone: "brand" | "danger" | "safe";
}) {
  const animated = useCountUp(value, 900);
  const t = TONE[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <span
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border",
          t.bg,
          t.fg,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="mt-4 font-display text-3xl font-bold tabular-nums">
        {animated.toLocaleString()}
      </div>
      <p className="mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

// ---------- monthly chart ----------

function MonthlyChart({ scans }: { scans: Scan[] }) {
  const data = useMemo(() => {
    const now = new Date();
    const months: { label: string; key: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString(undefined, { month: "short" }),
        key: `${d.getFullYear()}-${d.getMonth()}`,
        count: 0,
      });
    }
    for (const s of scans) {
      const d = new Date(s.scanned_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.count += 1;
    }
    return months;
  }, [scans]);

  const isFlat = data.every((d) => d.count === 0);

  return (
    <section
      className="rounded-xl border border-border bg-card p-6"
      aria-labelledby="monthly-heading"
    >
      <div className="flex items-center justify-between">
        <h2 id="monthly-heading" className="text-sm font-semibold">
          Monthly activity
        </h2>
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Last 6 months
        </span>
      </div>
      <div className="mt-4 h-48">
        {isFlat ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border text-center">
            <div>
              <p className="text-sm font-medium">No scans yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Run your first scan to start building history.
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "var(--hover-surface)" }}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--muted-foreground)" }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

// ---------- activity log ----------

const ACTIVITY_META: Record<
  ActivityEvent["kind"],
  { label: string; icon: typeof UserIcon; tone: string }
> = {
  login: { label: "Signed in", icon: UserIcon, tone: "text-info" },
  logout: { label: "Signed out", icon: LogOut, tone: "text-muted-foreground" },
  password_changed: { label: "Password changed", icon: KeyRound, tone: "text-emerald-400" },
  mfa_enabled: { label: "MFA enabled", icon: Shield, tone: "text-emerald-400" },
  mfa_disabled: { label: "MFA disabled", icon: Shield, tone: "text-amber-400" },
  profile_updated: { label: "Profile updated", icon: Pencil, tone: "text-info" },
  plan_changed: { label: "Plan changed", icon: Sparkles, tone: "text-info" },
};

function ActivityLog({ events }: { events: ActivityEvent[] }) {
  return (
    <section
      className="rounded-xl border border-border bg-card p-6"
      aria-labelledby="activity-heading"
    >
      <div className="flex items-center justify-between">
        <h2 id="activity-heading" className="text-sm font-semibold">
          Recent activity
        </h2>
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Last 50 events
        </span>
      </div>
      {events.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
          No account activity recorded yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {events.slice(0, 8).map((e) => {
            const meta = ACTIVITY_META[e.kind];
            const Icon = meta.icon;
            return (
              <li key={e.id} className="flex items-start gap-3">
                <span
                  className={cn(
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background",
                    meta.tone,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{meta.label}</p>
                  {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
                </div>
                <time className="text-[11px] text-muted-foreground">
                  {new Date(e.at).toLocaleString()}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------- account card ----------

function AccountCard({
  onEdit,
  onChangePassword,
  onLogout,
  onDelete,
}: {
  onEdit: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
  onDelete: () => void;
}) {
  return (
    <section
      className="rounded-xl border border-border bg-card p-6"
      aria-labelledby="account-heading"
    >
      <h2 id="account-heading" className="text-sm font-semibold">
        Account
      </h2>
      <ul className="mt-4 space-y-2">
        <AccountRow
          icon={Pencil}
          label="Edit profile"
          description="Name, email, company"
          onClick={onEdit}
        />
        <AccountRow
          icon={KeyRound}
          label="Change password"
          description="Update your sign-in password"
          onClick={onChangePassword}
        />
        <AccountRowLink
          icon={Shield}
          label="Enable MFA"
          description="Add a second factor"
          to="/settings"
        />
        <AccountRow
          icon={LogOut}
          label="Log out"
          description="End this session"
          onClick={onLogout}
        />
        <AccountRow
          icon={Trash2}
          label="Delete account"
          description="Irreversible — removes all data"
          onClick={onDelete}
          destructive
        />
      </ul>
    </section>
  );
}

function AccountRow({
  icon: Icon,
  label,
  description,
  onClick,
  destructive,
}: {
  icon: typeof UserIcon;
  label: string;
  description: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "ring-focus flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-hover-surface",
          destructive && "text-destructive hover:border-destructive/30 hover:bg-destructive/10",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </span>
      </button>
    </li>
  );
}

function AccountRowLink({
  icon: Icon,
  label,
  description,
  to,
}: {
  icon: typeof UserIcon;
  label: string;
  description: string;
  to: "/settings";
}) {
  return (
    <li>
      <Link
        to={to}
        className="ring-focus flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-hover-surface"
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </span>
      </Link>
    </li>
  );
}

// ---------- subscription ----------

function SubscriptionCard({ user, scans }: { user: Profile; scans: Scan[] }) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const used = currentMonthUsage(scans);
  const pct = Math.min(100, Math.round((used / MONTHLY_SCAN_LIMIT) * 100));
  const planLabel = user.plan[0]!.toUpperCase() + user.plan.slice(1);

  return (
    <section className="rounded-xl border border-border bg-card p-6" aria-labelledby="sub-heading">
      <div className="flex items-center justify-between">
        <h2 id="sub-heading" className="text-sm font-semibold">
          Subscription
        </h2>
        <span className="inline-flex items-center gap-1 rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-info">
          <Sparkles className="h-3 w-3" /> {planLabel}
        </span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {MONTHLY_SCAN_LIMIT} scans per month, real-time detection, full history.
      </p>

      <div className="mt-4 space-y-2">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-medium">Usage this period</span>
          <span className="tabular-nums text-muted-foreground">
            {used} of {MONTHLY_SCAN_LIMIT}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 overflow-hidden rounded-full bg-hover-surface"
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-400" : "bg-info",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setUpgradeOpen(true)}
        className="ring-focus mt-5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-transform hover:scale-[1.01] active:scale-[0.98]"
      >
        <Sparkles className="h-3.5 w-3.5" /> Upgrade plan
      </button>
      <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </section>
  );
}

// ---------- dialogs ----------

function EditProfileDialog({
  open,
  onOpenChange,
  user,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: Profile;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(user.full_name);
  const [email, setEmail] = useState(user.email);
  const [company, setCompany] = useState(user.company ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(user.full_name);
      setEmail(user.email);
      setCompany(user.company ?? "");
    }
  }, [open, user]);

  const nameError = name.trim().length < 2 ? "Enter your full name" : null;
  const emailError = !/^\S+@\S+\.\S+$/.test(email.trim()) ? "Enter a valid email" : null;
  const canSave = !nameError && !emailError && !saving;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      await updateProfile({
        full_name: name.trim(),
        email: email.trim(),
        company: company.trim() || undefined,
      });
      toast.success("Profile updated");
      await onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Update the details shown on your account.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={name && nameError ? nameError : undefined}
            leadingIcon={<UserIcon className="h-4 w-4" />}
            autoComplete="name"
          />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={email && emailError ? emailError : undefined}
            leadingIcon={<Mail className="h-4 w-4" />}
            autoComplete="email"
          />
          <Field
            label="Company (optional)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            leadingIcon={<Building2 className="h-4 w-4" />}
          />
          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="ring-focus inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-xs font-medium hover:bg-hover-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="ring-focus inline-flex h-9 items-center rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrent("");
      setNext("");
      setConfirm("");
    }
  }, [open]);

  const currentError = current.length < 1 ? "Enter your current password" : null;
  const nextError =
    next.length < 8
      ? "At least 8 characters"
      : strengthScore(next) < 2
        ? "Choose a stronger password"
        : null;
  const confirmError = confirm !== next ? "Passwords do not match" : null;
  const canSave = !currentError && !nextError && !confirmError && !saving;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      // Local demo: no real auth backend — just log the event.
      await new Promise((r) => setTimeout(r, 400));
      logActivity("password_changed", "Password updated");
      toast.success("Password changed");
      await onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Use a strong password you haven&apos;t used elsewhere.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field
            label="Current password"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            error={current && currentError ? currentError : undefined}
            autoComplete="current-password"
          />
          <div className="space-y-2">
            <Field
              label="New password"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              error={next && nextError ? nextError : undefined}
              autoComplete="new-password"
            />
            <PasswordStrength value={next} />
          </div>
          <Field
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={confirm && confirmError ? confirmError : undefined}
            autoComplete="new-password"
          />
          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="ring-focus inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-xs font-medium hover:bg-hover-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="ring-focus inline-flex h-9 items-center rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {saving ? "Updating…" : "Update password"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccountDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setText("");
  }, [open]);

  const canDelete = text === "DELETE" && !busy;

  async function handle() {
    if (!canDelete) return;
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete account</DialogTitle>
          <DialogDescription>
            This permanently removes your profile, scan history, and activity log. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            Type <span className="font-mono font-semibold">DELETE</span> below to confirm.
          </div>
          <Field
            label="Confirmation"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ring-focus inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-xs font-medium hover:bg-hover-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={handle}
            className="ring-focus inline-flex h-9 items-center gap-1.5 rounded-md bg-destructive px-4 text-xs font-semibold text-destructive-foreground transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {busy ? "Deleting…" : "Delete account"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- skeleton ----------

function ProfileSkeleton() {
  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center gap-5 rounded-xl border border-border bg-card p-6">
        <div className="h-20 w-20 animate-pulse rounded-full bg-hover-surface" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 animate-pulse rounded bg-hover-surface" />
          <div className="h-3 w-56 animate-pulse rounded bg-hover-surface" />
          <div className="h-3 w-32 animate-pulse rounded bg-hover-surface" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-56 animate-pulse rounded-xl border border-border bg-card" />
        </div>
        <div className="space-y-6">
          <div className="h-80 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-56 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </div>
    </div>
  );
}
