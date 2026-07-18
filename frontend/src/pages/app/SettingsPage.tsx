import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Info,
  KeyRound,
  Laptop,
  LifeBuoy,
  Lock,
  LogOut,
  Mail,
  Moon,
  Palette,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
} from "lucide-react";

import {
  DEFAULT_SETTINGS,
  deleteAllScans,
  disableMfa,
  enableMfa,
  fetchMfa,
  fetchScans,
  fetchSessions,
  fetchSettings,
  logActivity,
  pruneScansByRetention,
  revokeAllOtherSessions,
  revokeSession,
  updateSettings,
  type AppSettings,
  type MfaState,
  type RetentionDays,
  type SessionEntry,
} from "@/lib/dashboard-store";
import type { Scan } from "@/lib/mock/scans";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, PasswordStrength, strengthScore } from "@/components/auth/form-primitives";

type TabId = "appearance" | "notifications" | "privacy" | "security" | "about";

const TABS: { id: TabId; label: string; icon: typeof Palette }[] = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Lock },
  { id: "security", label: "Security", icon: Shield },
  { id: "about", label: "About", icon: Info },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>("appearance");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  async function patch(next: Partial<AppSettings>) {
    const merged = { ...settings, ...next };
    setSettings(merged);
    await updateSettings(next);
  }

  return (
    <div className="container-page py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage appearance, notifications, privacy, security and account.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav
          aria-label="Settings sections"
          className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible"
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "ring-focus flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-hover-surface text-foreground"
                    : "text-muted-foreground hover:bg-hover-surface hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {loading ? (
            <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
          ) : tab === "appearance" ? (
            <AppearancePanel settings={settings} onPatch={patch} />
          ) : tab === "notifications" ? (
            <NotificationsPanel settings={settings} onPatch={patch} />
          ) : tab === "privacy" ? (
            <PrivacyPanel settings={settings} onPatch={patch} />
          ) : tab === "security" ? (
            <SecurityPanel />
          ) : (
            <AboutPanel />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- shared panel primitives ----------

function PanelCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <header className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </header>
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

// ---------- appearance ----------

const ACCENTS: { id: AppSettings["accent"]; label: string; swatch: string }[] = [
  { id: "blue", label: "Blue", swatch: "#3b82f6" },
  { id: "emerald", label: "Emerald", swatch: "#10b981" },
  { id: "violet", label: "Violet", swatch: "#8b5cf6" },
  { id: "amber", label: "Amber", swatch: "#f59e0b" },
];

function AppearancePanel({
  settings,
  onPatch,
}: {
  settings: AppSettings;
  onPatch: (p: Partial<AppSettings>) => Promise<void>;
}) {
  const { theme, setTheme, resolved } = useTheme();
  const options: { id: "light" | "dark" | "system"; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Laptop },
  ];

  return (
    <div className="space-y-6">
      <PanelCard
        title="Theme"
        description="Choose how URL Defender looks. Follows your device by default."
      >
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
          {options.map((o) => {
            const active = theme === o.id;
            const Icon = o.icon;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(o.id)}
                className={cn(
                  "ring-focus flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                  active
                    ? "border-foreground bg-hover-surface"
                    : "border-border hover:border-foreground/40",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{o.label}</span>
                </div>
                <div
                  aria-hidden
                  className={cn(
                    "flex h-14 w-full items-end gap-1 overflow-hidden rounded-md border border-border p-1.5",
                    o.id === "light"
                      ? "bg-white"
                      : o.id === "dark"
                        ? "bg-neutral-950"
                        : resolved === "light"
                          ? "bg-white"
                          : "bg-neutral-950",
                  )}
                >
                  <div
                    className={cn(
                      "h-2 flex-1 rounded-sm",
                      o.id === "light" || (o.id === "system" && resolved === "light")
                        ? "bg-neutral-300"
                        : "bg-neutral-700",
                    )}
                  />
                  <div className="h-4 flex-1 rounded-sm bg-info/70" />
                  <div
                    className={cn(
                      "h-6 flex-1 rounded-sm",
                      o.id === "light" || (o.id === "system" && resolved === "light")
                        ? "bg-neutral-200"
                        : "bg-neutral-800",
                    )}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </PanelCard>

      <PanelCard title="Accent color" description="Used for subtle highlights across the app.">
        <div role="radiogroup" aria-label="Accent color" className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => {
            const active = settings.accent === a.id;
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onPatch({ accent: a.id })}
                className={cn(
                  "ring-focus flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-foreground bg-hover-surface"
                    : "border-border hover:border-foreground/40",
                )}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/10"
                  style={{ background: a.swatch }}
                  aria-hidden
                />
                {a.label}
              </button>
            );
          })}
        </div>
      </PanelCard>
    </div>
  );
}

// ---------- notifications ----------

function NotificationsPanel({
  settings,
  onPatch,
}: {
  settings: AppSettings;
  onPatch: (p: Partial<AppSettings>) => Promise<void>;
}) {
  return (
    <PanelCard title="Notifications" description="Pick where and when we should reach out.">
      <div className="divide-y divide-border">
        <ToggleRow
          label="Email alerts on new threats"
          description="Get an email whenever a scan flags a suspicious or dangerous URL."
          checked={settings.notifyEmailThreats}
          onCheckedChange={(v) => onPatch({ notifyEmailThreats: v })}
        />
        <ToggleRow
          label="Critical threat push notifications"
          description="Show an in-app notification the moment a critical threat is detected."
          checked={settings.notifyCriticalPush}
          onCheckedChange={(v) => onPatch({ notifyCriticalPush: v })}
        />
        <ToggleRow
          label="Weekly summary email"
          description="A short digest of scans and threats, sent every Monday morning."
          checked={settings.notifyWeeklySummary}
          onCheckedChange={(v) => onPatch({ notifyWeeklySummary: v })}
        />
      </div>
    </PanelCard>
  );
}

// ---------- privacy ----------

function PrivacyPanel({
  settings,
  onPatch,
}: {
  settings: AppSettings;
  onPatch: (p: Partial<AppSettings>) => Promise<void>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleRetentionChange(v: string) {
    const days = Number(v) as RetentionDays;
    await onPatch({ retentionDays: days });
    if (days !== 0) {
      const removed = await pruneScansByRetention(days);
      if (removed > 0) {
        toast.success(`Pruned ${removed} older scan${removed === 1 ? "" : "s"}`);
      } else {
        toast.success("Retention updated");
      }
    } else {
      toast.success("Retention set to Forever");
    }
  }

  async function handleExport() {
    const scans = await fetchScans();
    const blob = new Blob(
      [JSON.stringify({ exported_at: new Date().toISOString(), scans }, null, 2)],
      {
        type: "application/json",
      },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `urldefender-scans-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Export ready");
  }

  async function handleDeleteData() {
    await deleteAllScans();
    setConfirmOpen(false);
    toast.success("Scan history cleared");
  }

  return (
    <div className="space-y-6">
      <PanelCard title="Data retention" description="How long we keep your scan history.">
        <div className="flex items-center gap-3">
          <Select value={String(settings.retentionDays)} onValueChange={handleRetentionChange}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Keep for 30 days</SelectItem>
              <SelectItem value="90">Keep for 90 days</SelectItem>
              <SelectItem value="365">Keep for 1 year</SelectItem>
              <SelectItem value="0">Keep forever</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PanelCard>

      <PanelCard title="Your data" description="Export or delete your scan history at any time.">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleExport}
            className="ring-focus flex items-center gap-3 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:bg-hover-surface"
          >
            <Download className="h-5 w-5 text-info" />
            <div>
              <div className="text-sm font-medium">Download my data</div>
              <p className="text-xs text-muted-foreground">Export all scans as a JSON file.</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="ring-focus flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-left transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="h-5 w-5 text-destructive" />
            <div>
              <div className="text-sm font-medium text-destructive">Delete my data</div>
              <p className="text-xs text-muted-foreground">Clear scan history. Account stays.</p>
            </div>
          </button>
        </div>
      </PanelCard>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete scan history?</DialogTitle>
            <DialogDescription>
              This clears every scan and report from your account. Your profile and settings will
              stay. This action can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="ring-focus h-9 rounded-md border border-border px-4 text-sm font-medium hover:bg-hover-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteData}
              className="ring-focus h-9 rounded-md bg-destructive px-4 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
            >
              Delete data
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- security ----------

function SecurityPanel() {
  const [mfa, setMfa] = useState<MfaState | null>(null);
  const [sessions, setSessions] = useState<SessionEntry[] | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [mfaSetupOpen, setMfaSetupOpen] = useState(false);
  const [mfaDisableOpen, setMfaDisableOpen] = useState(false);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);

  async function refresh() {
    const [m, s] = await Promise.all([fetchMfa(), fetchSessions()]);
    setMfa(m);
    setSessions(s);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleRevoke(id: string) {
    const next = await revokeSession(id);
    setSessions(next);
    toast.success("Session revoked");
  }
  async function handleRevokeAll() {
    const next = await revokeAllOtherSessions();
    setSessions(next);
    setRevokeAllOpen(false);
    toast.success("All other sessions revoked");
  }
  async function handleDisableMfa() {
    await disableMfa();
    setMfaDisableOpen(false);
    await refresh();
    toast.success("Two-factor authentication disabled");
  }

  return (
    <div className="space-y-6">
      <PanelCard title="Password" description="Use a strong, unique password for your account.">
        <button
          type="button"
          onClick={() => setPwOpen(true)}
          className="ring-focus inline-flex h-9 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-hover-surface"
        >
          <KeyRound className="h-4 w-4" />
          Change password
        </button>
      </PanelCard>

      <PanelCard
        title="Two-factor authentication"
        description="Add an authenticator app for a second layer of security at sign-in."
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full",
                mfa?.enabled
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "bg-hover-surface text-muted-foreground",
              )}
              aria-hidden
            >
              {mfa?.enabled ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
            </span>
            <div>
              <div className="text-sm font-medium">{mfa?.enabled ? "Enabled" : "Not enabled"}</div>
              <p className="text-xs text-muted-foreground">
                {mfa?.enabled
                  ? "You'll be asked for a 6-digit code at sign-in."
                  : "Recommended for accounts with sensitive scan history."}
              </p>
            </div>
          </div>
          {mfa?.enabled ? (
            <button
              type="button"
              onClick={() => setMfaDisableOpen(true)}
              className="ring-focus h-9 rounded-md border border-destructive/40 px-4 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              Disable
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMfaSetupOpen(true)}
              className="ring-focus h-9 rounded-md bg-foreground px-4 text-sm font-semibold text-background hover:scale-[1.01]"
            >
              Enable 2FA
            </button>
          )}
        </div>
      </PanelCard>

      <PanelCard title="Active sessions" description="Devices currently signed in to your account.">
        <ul className="divide-y divide-border">
          {(sessions ?? []).map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-hover-surface"
                  aria-hidden
                >
                  {/iphone|android|mobile/i.test(s.device) ? (
                    <Smartphone className="h-4 w-4" />
                  ) : (
                    <Laptop className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{s.device}</span>
                    {s.current && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                        This device
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.browser} · {s.location} · {timeAgo(s.lastActive)}
                  </p>
                </div>
              </div>
              {!s.current && (
                <button
                  type="button"
                  onClick={() => handleRevoke(s.id)}
                  className="ring-focus h-8 rounded-md border border-border px-3 text-xs font-medium hover:bg-hover-surface"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
        {(sessions?.length ?? 0) > 1 && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setRevokeAllOpen(true)}
              className="ring-focus h-9 rounded-md border border-destructive/40 px-4 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              Revoke all other sessions
            </button>
          </div>
        )}
      </PanelCard>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
      <MfaSetupDialog
        open={mfaSetupOpen}
        onOpenChange={setMfaSetupOpen}
        onDone={async () => {
          await refresh();
        }}
      />
      <ConfirmDialog
        open={mfaDisableOpen}
        onOpenChange={setMfaDisableOpen}
        title="Disable two-factor authentication?"
        description="Your account will only be protected by your password. You can re-enable 2FA at any time."
        confirmLabel="Disable 2FA"
        destructive
        onConfirm={handleDisableMfa}
      />
      <ConfirmDialog
        open={revokeAllOpen}
        onOpenChange={setRevokeAllOpen}
        title="Sign out other sessions?"
        description="You will remain signed in on this device. All other sessions will need to sign in again."
        confirmLabel="Revoke all"
        destructive
        onConfirm={handleRevokeAll}
      />
    </div>
  );
}

// ---------- about ----------

function AboutPanel() {
  const navigate = useNavigate();
  const version = "1.0.0";
  const build = `build.${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;

  async function handleLogout() {
    logActivity("logout", "Signed out");
    toast.success("Signed out");
    await navigate("/login");
  }

  const links = [
    { label: "Terms of Service", href: "#", icon: FileText },
    { label: "Privacy Policy", href: "#", icon: Shield },
    { label: "Support & Contact", href: "mailto:support@urldefender.io", icon: LifeBuoy },
  ];

  return (
    <div className="space-y-6">
      <PanelCard title="About URL Defender">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Version</dt>
            <dd className="mt-0.5 font-mono">{version}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Build</dt>
            <dd className="mt-0.5 font-mono text-xs">{build}</dd>
          </div>
        </dl>
      </PanelCard>

      <PanelCard title="Resources">
        <ul className="divide-y divide-border">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <li key={l.label}>
                <a
                  href={l.href}
                  className="ring-focus flex items-center justify-between gap-3 py-3 hover:text-foreground"
                >
                  <span className="flex items-center gap-3 text-sm">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {l.label}
                  </span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </li>
            );
          })}
        </ul>
      </PanelCard>

      <PanelCard title="Session">
        <button
          type="button"
          onClick={handleLogout}
          className="ring-focus inline-flex h-9 items-center gap-2 rounded-md border border-destructive/40 px-4 text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </PanelCard>

      <div className="text-center text-xs text-muted-foreground">
        <Link
          to="/home"
          className="ring-focus inline-flex items-center gap-1 hover:text-foreground"
        >
          Back to dashboard <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ---------- dialogs ----------

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ring-focus h-9 rounded-md border border-border px-4 text-sm font-medium hover:bg-hover-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm();
              setBusy(false);
            }}
            className={cn(
              "ring-focus h-9 rounded-md px-4 text-sm font-semibold",
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-foreground text-background hover:scale-[1.01]",
            )}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const strong = strengthScore(next) >= 3;

  async function handleSave() {
    if (!current || !next) return toast.error("Fill in both password fields");
    if (next !== confirm) return toast.error("Passwords don't match");
    if (!strong) return toast.error("Choose a stronger password");
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    logActivity("password_changed", "Password updated");
    setSaving(false);
    setCurrent("");
    setNext("");
    setConfirm("");
    onOpenChange(false);
    toast.success("Password updated");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Use at least 8 characters with a mix of cases and numbers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field
            label="Current password"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
          <Field
            label="New password"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
          />
          <PasswordStrength value={next} />
          <Field
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ring-focus h-9 rounded-md border border-border px-4 text-sm font-medium hover:bg-hover-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="ring-focus h-9 rounded-md bg-foreground px-4 text-sm font-semibold text-background hover:scale-[1.01] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Update password"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MfaSetupDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void | Promise<void>;
}) {
  const [step, setStep] = useState<"scan" | "verify" | "codes">("scan");
  const [state, setState] = useState<MfaState | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (open) {
      setStep("scan");
      setCode("");
      // pre-generate for QR preview
      const secret = randomBase32Preview();
      setState({ enabled: false, secret });
    }
  }, [open]);

  const otpauth = state?.secret
    ? `otpauth://totp/URLDefender:alex@urldefender.io?secret=${state.secret}&issuer=URLDefender`
    : "";
  const qrUrl = otpauth
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauth)}`
    : "";

  async function handleVerify() {
    if (code.trim().length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    const persisted = await enableMfa();
    setState(persisted);
    setStep("codes");
  }

  function handleClose(v: boolean) {
    onOpenChange(v);
    if (!v && step === "codes") onDone();
  }

  function copyBackupCodes() {
    if (!state?.backupCodes) return;
    navigator.clipboard?.writeText(state.backupCodes.join("\n"));
    toast.success("Backup codes copied");
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enable two-factor authentication</DialogTitle>
          <DialogDescription>
            {step === "scan" &&
              "Scan the QR with any authenticator app (Google Authenticator, 1Password, Authy)."}
            {step === "verify" && "Enter the 6-digit code from your authenticator app."}
            {step === "codes" &&
              "Save these backup codes somewhere safe. You'll need them if you lose your device."}
          </DialogDescription>
        </DialogHeader>

        {step === "scan" && (
          <div className="space-y-3">
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-background p-4">
              {qrUrl && (
                <img
                  src={qrUrl}
                  alt="Scan this QR code with your authenticator app"
                  width={180}
                  height={180}
                  className="rounded-md bg-white p-2"
                />
              )}
              <div className="w-full">
                <p className="text-xs text-muted-foreground">Or enter this key manually</p>
                <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5">
                  <code className="flex-1 truncate font-mono text-xs">{state?.secret}</code>
                  <button
                    type="button"
                    onClick={() => {
                      if (state?.secret) navigator.clipboard?.writeText(state.secret);
                      toast.success("Copied");
                    }}
                    className="ring-focus rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Copy setup key"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="ring-focus h-9 rounded-md border border-border px-4 text-sm font-medium hover:bg-hover-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep("verify")}
                className="ring-focus h-9 rounded-md bg-foreground px-4 text-sm font-semibold text-background hover:scale-[1.01]"
              >
                Continue
              </button>
            </DialogFooter>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-3">
            <Field
              label="Verification code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
            />
            <DialogFooter>
              <button
                type="button"
                onClick={() => setStep("scan")}
                className="ring-focus h-9 rounded-md border border-border px-4 text-sm font-medium hover:bg-hover-surface"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleVerify}
                className="ring-focus h-9 rounded-md bg-foreground px-4 text-sm font-semibold text-background hover:scale-[1.01]"
              >
                Verify & enable
              </button>
            </DialogFooter>
          </div>
        )}

        {step === "codes" && state?.backupCodes && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-background p-4">
              {state.backupCodes.map((c) => (
                <code key={c} className="text-center font-mono text-sm">
                  {c}
                </code>
              ))}
            </div>
            <button
              type="button"
              onClick={copyBackupCodes}
              className="ring-focus inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border text-sm font-medium hover:bg-hover-surface"
            >
              <Copy className="h-4 w-4" /> Copy all codes
            </button>
            <DialogFooter>
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="ring-focus h-9 rounded-md bg-foreground px-4 text-sm font-semibold text-background hover:scale-[1.01]"
              >
                Done
              </button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- helpers ----------

function randomBase32Preview(): string {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let s = "";
  for (let i = 0; i < 16; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// unused import guard so `Mail` stays available for future notification channels
export const _unused = Mail;
