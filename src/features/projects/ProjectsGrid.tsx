import { useState } from "react";
import type { ProjectOverview } from "@/types";
import { fmtCost, fmtDay, fmtDuration } from "@/lib/format";
import { navigate } from "@/lib/navigate";

const PAGE_SIZE = 6;

export function ProjectsGrid({ projects }: { projects: ProjectOverview[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = projects.slice(0, visible);
  const maxDuration = Math.max(...projects.map((p) => p.totalDurationMs), 1);

  return (
    <div className="mb-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {shown.map((p) => {
          const shortName = p.name.replace(/^.*\//, "…/");
          const href = `/project/${encodeURIComponent(p.name)}`;
          const days = Math.max(
            0,
            Math.round((p.lastMs - p.firstMs) / 86_400_000),
          );
          const barPct = (p.totalDurationMs / maxDuration) * 100;
          return (
            <a
              key={p.name}
              href={href}
              onClick={(e) => {
                e.preventDefault();
                navigate(href);
              }}
              className="card-surface group relative block overflow-hidden p-5 transition-colors duration-200 hover:border-accent/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold tracking-tight text-foreground transition-colors duration-150 group-hover:text-accent">
                    {shortName}
                  </div>
                  <div className="num mt-1 truncate text-[11px] text-muted-foreground/70">
                    {p.name}
                  </div>
                </div>
                <div className="num glow-text shrink-0 text-[20px] font-semibold leading-none text-accent">
                  {fmtCost(p.cost)}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/50 pt-3">
                <div>
                  <div className="num text-[15px] font-semibold leading-none text-foreground">
                    {p.sessions}
                  </div>
                  <div className="mt-1.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    sessions
                  </div>
                </div>
                <div>
                  <div className="num text-[15px] font-semibold leading-none text-foreground">
                    {fmtCost(p.avgCost)}
                  </div>
                  <div className="mt-1.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    avg/session
                  </div>
                </div>
                <div>
                  <div className="num text-[15px] font-semibold leading-none text-foreground">
                    {fmtDuration(p.avgDurationMs)}
                  </div>
                  <div className="mt-1.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    avg length
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    total prompt time
                  </span>
                  <span className="num text-[13px] font-medium text-foreground">
                    {fmtDuration(p.totalDurationMs)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent/70"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span className="num text-muted-foreground">
                  {fmtDay(p.firstMs)} → {fmtDay(p.lastMs)}
                </span>
                <span className="num text-muted-foreground/70">
                  active {days}d
                </span>
              </div>
            </a>
          );
        })}
      </div>

      {projects.length > shown.length && (
        <div className="mt-5 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/60 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.15em] text-accent transition-colors hover:border-accent/40 hover:text-foreground"
          >
            <span aria-hidden>▾</span>
            load more (+{projects.length - shown.length})
          </button>
          <span className="num text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
            {shown.length} / {projects.length} projects
          </span>
        </div>
      )}
    </div>
  );
}
