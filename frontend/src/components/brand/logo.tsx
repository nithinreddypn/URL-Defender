import { cn } from "@/lib/utils";

export function Logo({
  className,
  iconOnly = false,
  size = 28,
}: {
  className?: string;
  iconOnly?: boolean;
  size?: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-display font-semibold tracking-tight",
        className,
      )}
    >
      <img
        src="/favicon.png"
        alt="URL Defender"
        width={size}
        height={size}
        className="shrink-0"
        style={{ width: size, height: size }}
      />
      {!iconOnly && (
        <span className="text-[15px]">
          URL <span className="text-muted-foreground">Defender</span>
        </span>
      )}
    </span>
  );
}
