import { useMemo, useState } from "react";
import { LayoutGrid, List, Search } from "lucide-react";
import { getProjects } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { ProjectsOverview } from "@/features/projects/ProjectsOverview";
import { ProjectSpendChart } from "@/features/projects/ProjectSpendChart";
import { ProjectsGrid } from "@/features/projects/ProjectsGrid";
import { ProjectsTable } from "@/features/projects/ProjectsTable";

function sectionDelay(i: number) {
  return { animationDelay: `${0.06 * i}s` };
}

export function Projects({
  dbPath,
  refreshKey,
}: {
  dbPath: string;
  refreshKey: number;
}) {
  const projectsQ = useQuery(
    () => getProjects(dbPath || undefined),
    [dbPath, refreshKey],
  );
  const projects = useMemo(() => projectsQ.data ?? [], [projectsQ.data]);
  const loading = projectsQ.loading;
  const error = projectsQ.error;

  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.name.replace(/^.*\//, "").toLowerCase().includes(q),
    );
  }, [projects, query]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 animate-rise">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
            local telemetry · read-only
          </p>
          <h1 className="flex flex-wrap items-baseline gap-x-3 text-3xl tracking-tight md:text-4xl">
            <span className="font-semibold text-foreground">projects</span>
            <span className="text-muted-foreground">/ overview</span>
            <span className="ml-1 inline-block h-5 w-2.5 animate-blink bg-accent align-middle shadow-glow md:h-6" />
          </h1>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Every project bucketed from your local{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] text-foreground">
            opencode.db
          </code>{" "}
          — spend, sessions, and how long you actually prompt on each. Click a
          row for the full project view.
        </p>
      </header>

      {projects.length > 0 ? (
        <>
          <div className="animate-rise" style={sectionDelay(1)}>
            <ProjectsOverview projects={projects} />
          </div>
          <div className="animate-rise" style={sectionDelay(2)}>
            <ProjectSpendChart projects={projects} />
          </div>

          <div
            className="mb-6 flex animate-rise flex-col gap-3 sm:flex-row sm:items-center"
            style={sectionDelay(3)}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search projects…"
                aria-label="Search projects"
                className="pl-9 font-mono text-[13px]"
              />
            </div>
            {query.trim() && (
              <span className="num text-[11px] text-muted-foreground">
                {filtered.length} / {projects.length}
              </span>
            )}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setView("grid")}
                aria-pressed={view === "grid"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] transition-colors",
                  view === "grid"
                    ? "bg-accent text-accent-foreground shadow-glow"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <LayoutGrid className="size-3.5" />
                grid
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] transition-colors",
                  view === "list"
                    ? "bg-accent text-accent-foreground shadow-glow"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <List className="size-3.5" />
                list
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface/75 p-6 text-sm">
              <p className="font-medium text-foreground">
                No projects match your search.
              </p>
              <p className="mt-1 text-muted-foreground">
                Try a shorter name or clear the filter.
              </p>
            </div>
          ) : (
            <div className="animate-rise" style={sectionDelay(4)}>
              {view === "grid" ? (
                <ProjectsGrid key={query} projects={filtered} />
              ) : (
                <ProjectsTable projects={filtered} />
              )}
            </div>
          )}
        </>
      ) : loading ? (
        <div className="flex animate-pulse items-center gap-3 rounded-lg border border-border bg-surface/75 p-5 text-sm text-muted-foreground">
          <span className="inline-block size-2 animate-blink bg-accent" />
          reading project buckets…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-border bg-surface/75 p-6 text-sm">
          <p className="font-medium text-foreground">
            Could not read projects.
          </p>
          <p className="mt-1 break-words text-negative">✕ {error}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface/75 p-6 text-sm text-muted-foreground">
          No projects found.
        </div>
      )}
    </div>
  );
}
