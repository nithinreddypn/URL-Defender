import { lazy, Suspense, useEffect, useState } from "react";
import { Search, ScanLine } from "lucide-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "./notifications";
import { UserMenu } from "./user-menu";
import { LiveClock } from "./live-clock";
import { ThemeToggle } from "@/components/theme-toggle";
import { fetchCurrentUser } from "@/lib/dashboard-store";
import type { MockUser } from "@/lib/mock/user";

const CommandPalette = lazy(() =>
  import("./command-palette").then((m) => ({ default: m.CommandPalette })),
);

export function TopNav() {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [user, setUser] = useState<MockUser | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const refresh = () => {
      void fetchCurrentUser()
        .then(setUser)
        .catch(() => setUser(null));
    };
    refresh();
    window.addEventListener("url-defender:user-changed", refresh);
    return () => window.removeEventListener("url-defender:user-changed", refresh);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Rotating hint inside the search trigger — simple crossfade, no typing
  const HINTS = [
    "Search Dashboard",
    "Search Scan URL page",
    "Search Alerts",
    "Search Settings",
    "Search Profile",
    "Search Recent scans",
  ];
  const [hintIndex, setHintIndex] = useState(0);
  const [hintVisible, setHintVisible] = useState(true);
  useEffect(() => {
    if (reduceMotion) return;
    let changeTimer: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      setHintVisible(false);
      changeTimer = setTimeout(() => {
        setHintIndex((i) => (i + 1) % HINTS.length);
        setHintVisible(true);
      }, 450);
    }, 3200);
    return () => {
      clearInterval(interval);
      if (changeTimer) clearTimeout(changeTimer);
    };
  }, [reduceMotion]);

  return (
    <header className="sticky top-0 z-30 h-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="flex h-full items-center gap-3 px-4 md:px-6">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

        <button
          type="button"
          onClick={() => setCmdOpen(true)}
          className="ring-focus group hidden md:inline-flex h-10 max-w-md flex-1 items-center gap-3 rounded-md border border-border bg-card px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-hover-surface"
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 truncate">
            <span
              className={`inline-block transition-all duration-500 ease-out ${
                hintVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
            >
              {HINTS[hintIndex]}
            </span>
          </span>

          <kbd className="ml-auto inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            <span className="text-[11px]">⌘</span>K
          </kbd>
        </button>

        {/* Mobile search shortcut */}
        <button
          type="button"
          onClick={() => setCmdOpen(true)}
          className="ring-focus md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          {user && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold">
              <ScanLine className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Scans:</span>
              <span className="font-mono text-foreground">{user.scan_count}</span>
              <span className="text-muted-foreground">/ 50</span>
            </span>
          )}
          <LiveClock />
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {cmdOpen && (
        <Suspense fallback={null}>
          <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
        </Suspense>
      )}
    </header>
  );
}
