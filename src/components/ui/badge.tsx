import * as React from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "accent" | "positive" | "negative" | "outline";

export function Badge({
  variant = "default",
  className,
  children,
  style,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const styles: Record<BadgeVariant, string> = {
    default: "bg-muted text-muted-foreground border-border",
    accent: "bg-accent/10 text-accent border-accent/25",
    positive: "bg-positive/10 text-positive border-positive/25",
    negative: "bg-negative/10 text-negative border-negative/25",
    outline: "bg-transparent border-border text-foreground",
  };
  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
