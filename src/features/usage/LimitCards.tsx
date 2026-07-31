import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { fmtCost } from "@/features/usage/usage-utils";

type Limit = {
  period: string;
  label: string;
  limitCost: number;
  cost: number;
  pct: number;
};

export function LimitCards({ limits }: { limits: Limit[] }) {
  return (
    <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {limits.map((l) => {
        const pct = l.pct;
        const color =
          pct >= 90 ? "bg-negative" : pct >= 70 ? "bg-amber-400" : "bg-accent";
        const glow = pct >= 90 ? "shadow-glow" : "";
        return (
          <Card key={l.period}>
            <CardHeader>
              <CardDescription>{l.label}</CardDescription>
              <CardTitle className={cn("num", glow)}>
                {fmtCost(l.cost)}
              </CardTitle>
            </CardHeader>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full origin-left animate-grow rounded-full",
                  color,
                )}
                style={{ width: pct + "%", animationDelay: "0.15s" }}
              />
            </div>
            <p className="mt-2.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {pct.toFixed(1)}% of {fmtCost(l.limitCost)} limit
            </p>
          </Card>
        );
      })}
    </section>
  );
}
