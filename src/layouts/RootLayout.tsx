import { Outlet } from "react-router-dom";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";
import { usePageTitle } from "@/hooks/use-page-title";

export default function RootLayout() {
  // Sync page title with active route handle.title on navigation
  usePageTitle();

  return (
    <ThemeProvider>
      <Outlet />
      <Toaster closeButton expand />
    </ThemeProvider>
  );
}
