import { Link, Outlet } from "react-router-dom";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      {/* Aurora background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 40% at 10% 0%, rgba(59,130,246,0.20), transparent 60%)," +
            "radial-gradient(50% 40% at 100% 20%, rgba(34,197,94,0.18), transparent 60%)," +
            "radial-gradient(50% 60% at 50% 100%, rgba(139,92,246,0.16), transparent 60%)",
        }}
      />
      {/* Subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border-strong) 1px, transparent 1px), linear-gradient(90deg, var(--border-strong) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(circle at 50% 40%, black, transparent 70%)",
        }}
      />

      <header className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="ring-focus rounded-md">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="container-page flex min-h-[calc(100dvh-4rem)] items-center justify-center py-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
