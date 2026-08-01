import { useMemo } from "react";
import { DollarSign, FolderGit2, Gauge, Timer } from "lucide-react";
import type { ProjectOverview } from "@/types";
import { Card, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { fmtCost, fmtDuration } from "@/lib/format";

export function ProjectsOverview({
  projects,
}: {
  projects: ProjectOverview[];
}) {
  const stats = useMemo(() => {
    const cost = projects.reduce((s, p) => s + p.cost, 0);
    const sessions = projects.reduce((s, p) => s + p.sessions, 0);
    const promptMs = projects.reduce((s, p) => s + p.totalDurationMs, 0);
    return {
      projects: projects.length,
      cost,
      avgCost: sessions ? cost / sessions : 0,
      promptMs,
    };
  }, [projects]);

  const cards = [
    {
      key: "projects",
      icon: <FolderGit2 className="size-3.5" />,
      label: "Projects",
      value: String(stats.projects),
      accent: false,
    },
    {
      key: "total cost",
      icon: <DollarSign className="size-3.5" />,
      label: "Total cost",
      value: fmtCost(stats.cost),
      accent: true,
    },
    {
      key: "avg / session",
      icon: <Gauge className="size-3.5" />,
      label: "Avg cost / session",
      value: fmtCost(stats.avgCost),
      accent: false,
    },
    {
      key: "prompt time",
      icon: <Timer className="size-3.5" />,
      label: "Total prompt time",
      value: fmtDuration(stats.promptMs),
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
