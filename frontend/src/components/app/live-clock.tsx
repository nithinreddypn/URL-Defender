import { useEffect, useState } from "react";

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <span className="tabular-nums text-muted-foreground text-xs">--:--</span>;
  const time = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return (
    <span
      className="hidden lg:inline tabular-nums text-xs text-muted-foreground"
      aria-label={`Current time ${time}`}
    >
      {time}
    </span>
  );
}
