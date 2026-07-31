import * as React from "react";
import { cn } from "@/lib/cn";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-surface/60 px-3 py-1 text-sm text-foreground shadow-inset transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
