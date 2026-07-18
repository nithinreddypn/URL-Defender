import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { TopNav } from "@/components/app/topnav";
import { clearAuthToken, fetchBackendUser } from "@/lib/api";

export default function AppLayout() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    fetchBackendUser()
      .then(() => setAuthorized(true))
      .catch(() => {
        clearAuthToken();
        navigate("/login", { replace: true });
      });
  }, [navigate]);

  if (!authorized) return <div className="min-h-dvh bg-background" />;

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-dvh w-full bg-background">
        <AppSidebar />
        <SidebarInset className="min-w-0 flex-1">
          <TopNav />
          <main className="flex-1">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
