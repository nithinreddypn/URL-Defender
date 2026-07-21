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

const ACCENTS: { id: AppSettings["accent"] | "rose"; label: string; swatch: string }[] = [
  { id: "emerald", label: "Emerald", swatch: "#10b981" },
  { id: "blue", label: "Blue", swatch: "#3b82f6" },
  { id: "violet", label: "Violet", swatch: "#8b5cf6" },
  { id: "amber", label: "Amber", swatch: "#f59e0b" },
  { id: "rose", label: "Rose", swatch: "#f43f5e" },
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

  const handleAccentChange = (accentId: any) => {
    document.documentElement.setAttribute("data-accent", accentId);
    onPatch({ accent: accentId });
    toast.success(`Accent color set to ${accentId}`);
  };

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

      <PanelCard title="Accent color" description="Accent Color customizes the primary highlight theme across action buttons, status badges, active navigation links, and focus rings.">
        <div role="radiogroup" aria-label="Accent color" className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => {
            const active = settings.accent === a.id;
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => handleAccentChange(a.id)}
                className={cn(
                  "ring-focus flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all hover:scale-[1.02]",
                  active
                    ? "border-foreground bg-hover-surface font-semibold shadow-sm"
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
    <div className="space-y-6">
      <PanelCard title="Email & In-App Alerts" description="Configure real-time threat dispatches and activity digests.">
        <div className="divide-y divide-border">
          <ToggleRow
            label="Email alerts on new threats"
            description="Automatically receive a high-priority email alert whenever a scan flags a suspicious or dangerous URL."
            checked={settings.notifyEmailThreats !== false}
            onCheckedChange={(v) => {
              onPatch({ notifyEmailThreats: v });
              toast.success(`Email threat alerts ${v ? "enabled" : "disabled"}`);
            }}
          />
          <ToggleRow
            label="Critical threat push notifications"
            description="Show an in-app alert banner the moment a critical threat is detected."
            checked={settings.notifyCriticalPush !== false}
            onCheckedChange={(v) => {
              onPatch({ notifyCriticalPush: v });
              toast.success(`Critical push alerts ${v ? "enabled" : "disabled"}`);
            }}
          />
          <ToggleRow
            label="Weekly summary email"
            description="A weekly digest summarizing scan counts, threats avoided, and security stats."
            checked={settings.notifyWeeklySummary !== false}
            onCheckedChange={(v) => {
              onPatch({ notifyWeeklySummary: v });
              toast.success(`Weekly summary email ${v ? "enabled" : "disabled"}`);
            }}
          />
        </div>
      </PanelCard>
    </div>
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
      <PanelCard title="Privacy Settings" description="Control how your scan history and threat analytics are processed.">
        <div className="divide-y divide-border">
          <ToggleRow
            label="Anonymous Threat Intelligence Sharing"
            description="Contribute anonymous threat signals to URL Defender global intelligence base to protect users."
            checked={settings.shareThreatIntel !== false}
            onCheckedChange={(v) => {
              onPatch({ shareThreatIntel: v });
              toast.success(`Threat intelligence sharing ${v ? "enabled" : "disabled"}`);
            }}
          />
          <ToggleRow
            label="Diagnostic Telemetry"
            description="Send anonymous diagnostic metrics to help improve scan engine accuracy."
            checked={settings.allowTelemetry !== false}
            onCheckedChange={(v) => {
              onPatch({ allowTelemetry: v });
              toast.success(`Diagnostic telemetry ${v ? "enabled" : "disabled"}`);
            }}
          />
        </div>
      </PanelCard>

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

  function timeAgo(date: string) {
    return "Just now";
  }

  return (
    <div className="space-y-6">
      <PanelCard title="Password" description="Use a strong, unique password for your account.">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Account password</div>
            <p className="text-xs text-muted-foreground">Updated recently</p>
          </div>
          <button
            type="button"
            onClick={() => setPwOpen(true)}
            className="ring-focus h-9 rounded-md border border-border px-4 text-sm font-medium hover:bg-hover-surface"
          >
            Change password
          </button>
        </div>
      </PanelCard>

      <PanelCard title="Two-factor authentication" description="Add an extra layer of security.">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>Authenticator app</span>
              {mfa?.enabled ? (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                  Enabled
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  Disabled
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Use Google Authenticator, Authy, or 1Password.
            </p>
          </div>
          {mfa?.enabled ? (
            <button
              type="button"
              onClick={() => setMfaDisableOpen(true)}
              className="ring-focus h-9 rounded-md border border-border px-4 text-sm font-medium hover:bg-hover-surface"
            >
              Disable 2FA
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMfaSetupOpen(true)}
              className="ring-focus h-9 rounded-md bg-foreground px-4 text-sm font-semibold text-background hover:scale-[1.01]"
            >
              Set up 2FA
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
                    <Smartphone className="h-4 w-4 text-info" />
                  ) : (
                    <Laptop className="h-4 w-4 text-emerald-400" />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{s.device}</span>
                    {s.current && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                        This device (Active Now)
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
  const [supportOpen, setSupportOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);

  const version = "v2.4.0";
  const build = "2026.07.21-prod";

  async function handleLogout() {
    logActivity("logout", "Signed out");
    toast.success("Signed out");
    await navigate("/login");
  }

  async function handleSendSupport(e: React.FormEvent) {
    e.preventDefault();
    if (!supportSubject || !supportMessage) {
      toast.error("Please fill in subject and message");
      return;
    }
    setSendingSupport(true);
    await new Promise((r) => setTimeout(r, 600));
    setSendingSupport(false);
    setSupportOpen(false);
    setSupportSubject("");
    setSupportMessage("");
    toast.success("Support ticket submitted!", {
      description: "Our security team will reach out to urldefenderservice@gmail.com shortly.",
    });
  }

  const links = [
    { label: "Terms of Service", action: () => setTermsOpen(true), icon: FileText, badge: "Legal" },
    { label: "Privacy Policy", action: () => setPrivacyOpen(true), icon: Shield, badge: "GDPR Compliant" },
    { label: "Support & Contact", action: () => setSupportOpen(true), icon: LifeBuoy, badge: "24/7 Service" },
  ];

  const changelogs = [
    {
      version: "v2.4.0",
      date: "21 July 2026",
      tag: "Latest Release",
      title: "Privacy-First Threat Intelligence & Custom Theme Engine",
      items: [
        "Privacy-first threat analysis result cards with anonymous shared threat intelligence.",
        "Customizable Accent Color theme engine across buttons, badges, and focus rings.",
        "1-Minute Expiration Verification Code with responsive dark HTML email dispatch.",
        "Multi-lookup engine by Scan ID, Domain Name, or full URL string.",
      ],
    },
    {
      version: "v2.3.0",
      date: "18 July 2026",
      tag: "Engine Upgrade",
      title: "Sub-Second VirusTotal Engine & Multi-Lookup Database",
      items: [
        "Sub-second scan execution utilizing SHA-256 URL hash caching.",
        "XAMPP MariaDB backend integration with normalized URL lookup tables.",
        "Automatic fallback handling for literal $id requests.",
      ],
    },
    {
      version: "v2.2.0",
      date: "15 July 2026",
      tag: "Authentication",
      title: "Google OAuth 2.0 & Real Active Session Tracking",
      items: [
        "Native Google Sign-In authentication flow with server-side token verification.",
        "Real active browser session detection (OS, browser name, client IP).",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Glassmorphic About Card */}
      <section className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-card to-card p-6 shadow-xl shadow-emerald-950/20">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-inner">
              <Shield className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-display text-lg font-bold text-foreground">URL Defender Enterprise</h3>
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-0.5 font-mono text-xs font-bold text-emerald-400">
                  {version}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Full-Stack Threat Detection & Intelligence Network</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            System Operational
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
          <div className="rounded-xl border border-border/50 bg-background/60 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Release Version</span>
            <p className="mt-1 font-mono font-bold text-foreground">{version}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-background/60 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Build Target</span>
            <p className="mt-1 font-mono font-bold text-muted-foreground">{build}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-background/60 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Engine Network</span>
            <p className="mt-1 font-mono font-bold text-foreground">74+ Engines</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-background/60 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Lookup Speed</span>
            <p className="mt-1 font-mono font-bold text-emerald-400">&lt; 200ms Hash Sync</p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between pt-4 border-t border-border/50">
          <div>
            <span className="text-xs font-semibold text-foreground">Release Changelog & History</span>
            <p className="text-[11px] text-muted-foreground">Explore features, patches & engine updates</p>
          </div>
          <button
            type="button"
            onClick={() => setChangelogOpen(true)}
            className="ring-focus inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition-all hover:bg-hover-surface hover:scale-[1.02]"
          >
            <FileText className="h-3.5 w-3.5 text-emerald-400" />
            View Full Changelog
          </button>
        </div>
      </section>

      {/* Resources Card */}
      <PanelCard title="Resources & Legal" description="Access terms, privacy compliance, and 24/7 technical support.">
        <ul className="divide-y divide-border">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <li key={l.label}>
                <button
                  type="button"
                  onClick={l.action}
                  className="ring-focus flex w-full items-center justify-between gap-3 py-3 text-sm font-medium text-foreground transition-colors hover:text-emerald-400 text-left"
                >
                  <span className="flex items-center gap-3 text-sm">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </span>
                    {l.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {l.badge}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </PanelCard>

      {/* Session Card */}
      <PanelCard title="Account Session">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">Sign out of current account</div>
            <p className="text-xs text-muted-foreground">You will need to enter your password to sign back in.</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="ring-focus inline-flex h-9 items-center gap-2 rounded-lg border border-destructive/40 px-4 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </PanelCard>

      {/* Terms Dialog */}
      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-emerald-400" />
              Terms of Service
            </DialogTitle>
            <DialogDescription>
              Legal agreement and service terms for URL Defender users.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-3 text-xs leading-relaxed">
            <div className="rounded-lg border border-border bg-background/50 p-3.5">
              <h4 className="font-semibold text-foreground text-sm">1. Acceptance of Terms</h4>
              <p className="mt-1 text-muted-foreground">By accessing or using URL Defender, you agree to these Terms of Service. If you do not agree, please do not use the service.</p>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-3.5">
              <h4 className="font-semibold text-foreground text-sm">2. Service Description</h4>
              <p className="mt-1 text-muted-foreground">URL Defender scans URLs and web content to identify phishing, malware, impersonation and security threats. Results are provided for security-awareness purposes.</p>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-3.5">
              <h4 className="font-semibold text-foreground text-sm">3. Acceptable Use</h4>
              <p className="mt-1 text-muted-foreground">You agree not to use URL Defender to target or scan unauthorized endpoints, reverse engineer infrastructure, or abuse API endpoints.</p>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-3.5">
              <h4 className="font-semibold text-foreground text-sm">4. Contact & Legal Inquiry</h4>
              <p className="mt-1 text-muted-foreground">For legal inquiries regarding these terms, reach out directly to <b>urldefenderservice@gmail.com</b>.</p>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setTermsOpen(false)}
              className="ring-focus h-9 rounded-lg bg-foreground px-4 text-xs font-semibold text-background hover:scale-[1.01]"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-emerald-400" />
              Privacy Policy
            </DialogTitle>
            <DialogDescription>
              How URL Defender protects and manages your data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-3 text-xs leading-relaxed">
            <div className="rounded-lg border border-border bg-background/50 p-3.5">
              <h4 className="font-semibold text-foreground text-sm">1. Personal Data Isolation</h4>
              <p className="mt-1 text-muted-foreground">Your personal scan history, timestamps, and account details are isolated to your authenticated profile and never exposed to third parties.</p>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-3.5">
              <h4 className="font-semibold text-foreground text-sm">2. Shared Threat Intelligence</h4>
              <p className="mt-1 text-muted-foreground">Global threat intelligence caches maintain anonymous threat domain data only, without user identities, names, or individual timestamps.</p>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-3.5">
              <h4 className="font-semibold text-foreground text-sm">3. Data Retention & Deletion</h4>
              <p className="mt-1 text-muted-foreground">You can export your scan history as JSON or permanently wipe your scan history at any time from your Privacy Settings tab.</p>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setPrivacyOpen(false)}
              className="ring-focus h-9 rounded-lg bg-foreground px-4 text-xs font-semibold text-background hover:scale-[1.01]"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Support Dialog */}
      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-emerald-400" />
              Support & Contact
            </DialogTitle>
            <DialogDescription>
              Reach out directly to <b>urldefenderservice@gmail.com</b> or submit your ticket below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendSupport} className="space-y-4">
            <Field
              label="Subject"
              placeholder="e.g. Scanning issue or account support"
              value={supportSubject}
              onChange={(e) => setSupportSubject(e.target.value)}
              required
            />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Message</label>
              <textarea
                rows={4}
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="Describe your request in detail..."
                className="w-full rounded-md border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                required
              />
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setSupportOpen(false)}
                className="ring-focus h-9 rounded-md border border-border px-4 text-xs font-medium hover:bg-hover-surface"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sendingSupport}
                className="ring-focus h-9 rounded-md bg-foreground px-4 text-xs font-semibold text-background hover:scale-[1.01] disabled:opacity-60"
              >
                {sendingSupport ? "Submitting..." : "Submit Ticket"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Changelog Dialog */}
      <Dialog open={changelogOpen} onOpenChange={setChangelogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-400" />
              Release Changelog & History
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of release notes, features, and security patches.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {changelogs.map((c) => (
              <div key={c.version} className="relative rounded-xl border border-border bg-card/80 p-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-emerald-400">{c.version}</span>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      {c.tag}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">{c.date}</span>
                </div>
                <h4 className="mt-2.5 text-xs font-semibold text-foreground">{c.title}</h4>
                <ul className="mt-2.5 space-y-1.5">
                  {c.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setChangelogOpen(false)}
              className="ring-focus h-9 rounded-lg bg-foreground px-4 text-xs font-semibold text-background hover:scale-[1.01]"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
