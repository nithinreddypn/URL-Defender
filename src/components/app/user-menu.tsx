import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Settings, User as UserIcon, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchCurrentUser } from "@/lib/dashboard-store";
import { initials, type MockUser } from "@/lib/mock/user";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, clearAuthToken, resolveApiAssetUrl } from "@/lib/api";

export function UserMenu() {
  const [user, setUser] = useState<MockUser | null>(null);
  const navigate = useNavigate();
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
  const logout = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch {
      /* session may already be expired */
    }
    clearAuthToken();
    navigate("/login", { replace: true });
  };

  if (!user) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1">
        <Skeleton className="h-7 w-7 rounded-full" />
        <Skeleton className="hidden md:block h-3 w-20" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="ring-focus inline-flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 hover:bg-hover-surface transition-colors"
        aria-label="Account menu"
      >
        <Avatar user={user} />
        <span className="hidden md:inline text-sm font-medium">{user.full_name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="text-sm font-semibold">{user.full_name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            void logout();
          }}
          className="flex items-center gap-2 text-destructive"
        >
          <LogOut className="h-4 w-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Avatar({ user }: { user: MockUser }) {
  const url = resolveApiAssetUrl(user.avatar_url);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [url]);

  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold text-background"
      style={{ background: "linear-gradient(135deg,#22c55e 0%,#3b82f6 100%)" }}
      aria-hidden
    >
      {url && !failed ? (
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(user.full_name)
      )}
    </span>
  );
}
