import { Card, CardDescription } from "@/components/ui/card";
import { DollarSign, Activity, Cpu } from "lucide-react";
import { cn } from "@/lib/cn";
import { fmtCompact, fmtCost } from "@/lib/format";

type Totals = {
  cost: number;
  sessions: number;
  input: number;
  output: number;
  reasoning: number;
};

export function UsageStats({ totals }: { totals: Totals }) {
  const cards = [
    {
      key: "cost",
      icon: <DollarSign className="size-3.5" />,
      label: "Total cost",
      value: fmtCost(totals.cost),
      accent: true,
    },
    {
      key: "sessions",
      icon: <Activity className="size-3.5" />,
      label: "Sessions",
      value: String(totals.sessions),
      accent: false,
    },
    {
      key: "input",
      icon: <Cpu className="size-3.5" />,
      label: "Input tokens",
      value: fmtCompact(totals.input),
      accent: false,
    },
    {
      key: "output",
      icon: <Cpu className="size-3.5" />,
      label: "Output + reasoning",
      value: fmtCompact(totals.output + totals.reasoning),
      accent: false,
    },
  ];

  return (
    <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((c) => (
        <Card
          key={c.key}
          className="group transition-colors duration-200 hover:border-accent/40"
        >
          <CardDescription className="flex items-center gap-1.5 transition-colors duration-200 group-hover:text-accent">
            {c.icon}
            {c.label}
          </CardDescription>
          <p
            className={cn(
              "num mt-2 text-[26px] font-semibold leading-none tracking-tight transition-all duration-200",
              c.accent && "glow-text text-accent",
              "group-hover:text-accent group-hover:[text-shadow:0_0_6px_hsl(var(--accent)/0.45),0_0_28px_hsl(var(--accent)/0.3)]",
            )}
          >
            {c.value}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
            ▸ {c.key}
          </p>
        </Card>
      ))}
    </section>
  );
}
