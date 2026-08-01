import * as React from "react";
import { cn } from "@/lib/cn";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("card-surface group relative overflow-hidden p-5", className)}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 pb-4", className)} {...props} />
);

const CardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn("text-[15px] font-semibold tracking-tight", className)}
    {...props}
  />
);

const CardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn(
      "text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground",
      className,
    )}
    {...props}
  />
);

export { Card, CardHeader, CardTitle, CardDescription };
