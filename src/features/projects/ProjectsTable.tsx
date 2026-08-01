import { useMemo, useState } from "react";
import type { ProjectOverview } from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { fmtCost, fmtDay, fmtDuration } from "@/lib/format";
import { navigate } from "@/lib/navigate";

type SortKey = "cost" | "sessions" | "prompt";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "cost", label: "cost" },
  { key: "sessions", label: "sessions" },
  { key: "prompt", label: "prompt time" },
];

export function ProjectsTable({ projects }: { projects: ProjectOverview[] }) {
  const [sort, setSort] = useState<SortKey>("cost");

  const rows = useMemo(() => {
    const sorted = [...projects];
    if (sort === "sessions") sorted.sort((a, b) => b.sessions - a.sessions);
    else if (sort === "prompt")
      sorted.sort((a, b) => b.totalDurationMs - a.totalDurationMs);
    else sorted.sort((a, b) => b.cost - a.cost);
    return sorted;
  }, [projects, sort]);

  const maxDuration = useMemo(
    () => Math.max(...projects.map((p) => p.totalDurationMs), 1),
    [projects],
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardDescription>{projects.length} projects</CardDescription>
          <CardTitle>Overview</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          {SORTS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={cn(
                "rounded px-2 py-1 text-[10px] font-medium uppercase tracking-[0.15em] transition-colors",
                sort === key
                  ? "bg-accent font-semibold text-accent-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>

      <div className="hidden items-center gap-x-5 border-t border-border/50 px-5 pb-2 pt-4 text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60 sm:flex">
        <div className="w-40 flex-1 sm:w-56">project</div>
        <div className="w-10 shrink-0 text-right">sessions</div>
        <div className="w-16 shrink-0 text-right">cost</div>
        <div className="hidden w-16 shrink-0 text-right md:block">
          avg/session
        </div>
        <div className="hidden w-36 shrink-0 text-right md:block">
          prompt time
        </div>
        <div className="hidden w-24 shrink-0 text-right lg:block">
          active span
        </div>
      </div>

      <div className="divide-y divide-border/50 border-t border-border/50">
        {rows.map((p) => {
          const shortName = p.name.replace(/^.*\//, "…/");
          const days = Math.max(
            0,
            Math.round((p.lastMs - p.firstMs) / 86_400_000),
          );
          const barPct = (p.totalDurationMs / maxDuration) * 100;
          const href = `/project/${encodeURIComponent(p.name)}`;
          return (
            <a
              key={p.name}
              href={href}
              onClick={(e) => {
                e.preventDefault();
                navigate(href);
              }}
              className="group block px-5 transition-colors hover:bg-muted/40"
            >
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 py-3 text-[12px]">
                <div className="w-40 min-w-0 flex-1 sm:w-56">
                  <div className="truncate font-medium text-foreground transition-colors duration-150 group-hover:text-accent">
                    {shortName}
                  </div>
                  <div className="num mt-0.5 truncate text-[10px] text-muted-foreground/70">
                    {p.name}
                  </div>
                </div>
                <div className="num hidden w-10 shrink-0 text-right text-muted-foreground sm:block">
                  {p.sessions}
                </div>
                <div className="num w-16 shrink-0 text-right text-foreground">
                  {fmtCost(p.cost)}
                </div>
                <div className="num hidden w-16 shrink-0 text-right text-muted-foreground md:block">
                  {fmtCost(p.avgCost)}
                </div>
                <div className="hidden w-36 shrink-0 md:block">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full origin-left rounded-full bg-accent/70 transition-all duration-500"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <span className="num text-foreground">
                      {fmtDuration(p.totalDurationMs)}
                    </span>
                  </div>
                  <div className="num mt-0.5 text-right text-[10px] text-muted-foreground/70">
                    avg {fmtDuration(p.avgDurationMs)}/session
                  </div>
                </div>
                <div className="hidden w-24 shrink-0 text-right lg:block">
                  <div className="num text-[11px] text-muted-foreground">
                    {fmtDay(p.firstMs)} → {fmtDay(p.lastMs)}
                  </div>
                  <div className="num mt-0.5 text-[10px] text-muted-foreground/70">
                    active {days}d
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </Card>
  );
}
