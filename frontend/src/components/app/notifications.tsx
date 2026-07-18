import { useCallback, useEffect, useState } from "react";
import { Bell, ShieldAlert, Sparkles, Mail, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  clearAllNotifications,
  type Notification,
} from "@/lib/dashboard-store";
import { cn } from "@/lib/utils";

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const KIND_ICON = {
  threat: ShieldAlert,
  system: Sparkles,
  digest: Mail,
} as const;

const KIND_LABEL = {
  threat: "Threat alert",
  system: "System update",
  digest: "Digest",
} as const;

export function NotificationBell() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [active, setActive] = useState<Notification | null>(null);

  const refresh = useCallback(() => {
    fetchNotifications().then(setItems);
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("urldefender:")) refresh();
    };
    const interval = window.setInterval(refresh, 15_000);
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const unread = items?.filter((n) => !n.read).length ?? 0;

  const markAll = async () => {
    setItems((prev) => (prev ? prev.map((n) => ({ ...n, read: true })) : prev));
    await markAllNotificationsRead();
  };

  const clearAll = async () => {
    setItems([]);
    await clearAllNotifications();
  };

  const openItem = (n: Notification) => {
    setActive({ ...n, read: true });
    setItems((prev) => (prev ? prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)) : prev));
    if (!n.read) void markNotificationRead(n.id);
  };

  const ActiveIcon = active ? KIND_ICON[active.kind] : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="ring-focus relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card hover:bg-hover-surface transition-colors"
          aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground"
            >
              {unread}
            </span>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-[360px] p-0">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
            <p className="text-sm font-semibold">Notifications</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={markAll}
                disabled={!items || unread === 0}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Mark all as read
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={!items || items.length === 0}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Clear all
              </button>
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {items === null && (
              <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
              </div>
            )}
            {items && items.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
            )}
            {items?.map((n) => {
              const Icon = KIND_ICON[n.kind];
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openItem(n)}
                  className={cn(
                    "flex w-full gap-3 border-b border-border px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-hover-surface/60 focus:outline-none focus-visible:bg-hover-surface/60",
                    !n.read && "bg-hover-surface/40",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border",
                      n.kind === "threat" && "text-destructive",
                      n.kind === "system" && "text-info",
                      n.kind === "digest" && "text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-info" />}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      {relTime(n.created_at)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-md">
          {active && ActiveIcon && (
            <>
              <DialogHeader>
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className={cn(
                      "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border",
                      active.kind === "threat" && "text-destructive",
                      active.kind === "system" && "text-info",
                      active.kind === "digest" && "text-muted-foreground",
                    )}
                  >
                    <ActiveIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {KIND_LABEL[active.kind]}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      {relTime(active.created_at)}
                    </p>
                  </div>
                </div>
                <DialogTitle className="text-left">{active.title}</DialogTitle>
                <DialogDescription className="text-left">{active.body}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActive(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
