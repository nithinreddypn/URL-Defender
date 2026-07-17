import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  ScanLine,
  BellRing,
  User,
  Settings,
  Sun,
  Moon,
  Download,
  Search,
} from "lucide-react";
import { fetchScans } from "@/lib/dashboard-store";
import type { Scan } from "@/lib/mock/scans";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [scans, setScans] = useState<Scan[]>([]);

  useEffect(() => {
    if (open && scans.length === 0) fetchScans().then(setScans);
  }, [open, scans.length]);

  const go = (to: string) => () => {
    onOpenChange(false);
    navigate(to);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, scans, or actions…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        <CommandGroup heading="Pages">
          <CommandItem onSelect={go("/home")}>
            <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
          </CommandItem>
          <CommandItem onSelect={go("/scan")}>
            <ScanLine className="mr-2 h-4 w-4" /> Scan URL
          </CommandItem>
          <CommandItem onSelect={go("/alerts")}>
            <BellRing className="mr-2 h-4 w-4" /> Alerts & History
          </CommandItem>
          <CommandItem onSelect={go("/profile")}>
            <User className="mr-2 h-4 w-4" /> Profile
          </CommandItem>
          <CommandItem onSelect={go("/settings")}>
            <Settings className="mr-2 h-4 w-4" /> Settings
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick actions">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              toast.success("Report queued", {
                description: "You'll get a download link when it's ready.",
              });
            }}
          >
            <Download className="mr-2 h-4 w-4" /> Export scan report
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              setTheme("light");
            }}
          >
            <Sun className="mr-2 h-4 w-4" /> Switch to light theme
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              setTheme("dark");
            }}
          >
            <Moon className="mr-2 h-4 w-4" /> Switch to dark theme
          </CommandItem>
        </CommandGroup>

        {scans.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent scans">
              {scans.slice(0, 6).map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.url}
                  onSelect={() => {
                    onOpenChange(false);
                    toast(s.url, { description: `Verdict: ${s.verdict} · score ${s.risk_score}` });
                  }}
                >
                  <Search className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{s.url}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
