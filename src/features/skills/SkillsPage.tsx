import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { SkillsView } from "@/types";
import {
  getInstalledSkills,
  getSkillsLeaderboard,
  searchSkills,
} from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { SkillsTable } from "@/features/skills/SkillsTable";

const VIEWS: { key: SkillsView; label: string }[] = [
  { key: "all-time", label: "all-time" },
  { key: "trending", label: "trending" },
  { key: "hot", label: "hot" },
];

function SkillsSearch({
  term,
  installed,
}: {
  term: string;
  installed: Set<string>;
}) {
  const results = useQuery(() => searchSkills(term), [term]);
  if (results.error) {
    return (
      <div className="rounded-lg border border-border bg-surface/75 p-6 text-sm">
        <p className="font-medium text-foreground">Search failed.</p>
        <p className="mt-1 break-words text-negative">✕ {results.error}</p>
      </div>
    );
  }
  if (results.loading || !results.data) {
    return (
      <div className="flex animate-pulse items-center gap-3 rounded-lg border border-border bg-surface/75 p-5 text-sm text-muted-foreground">
        <span className="inline-block size-2 animate-blink bg-accent" />
        searching skills.sh for “{term}”…
      </div>
    );
  }
  const { skills, searchType, count } = results.data;
  return (
    <SkillsTable
      skills={skills}
      installed={installed}
      title={`${count} results · ${searchType}`}
    />
  );
}

export function SkillsPage({ refreshKey }: { refreshKey: number }) {
  const [view, setView] = useState<SkillsView>("all-time");
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setTerm(query.trim()), 400);
    return () => window.clearTimeout(t);
  }, [query]);

  const leaderboard = useQuery(
    () => getSkillsLeaderboard(view),
    [view, refreshKey],
  );
  const installedQ = useQuery(() => getInstalledSkills(), [refreshKey]);

  const installed = useMemo(
    () => new Set((installedQ.data?.names ?? []).map((n) => n.toLowerCase())),
    [installedQ.data],
  );

  const searching = term.length >= 2;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 animate-rise">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
            agent skills · skills.sh
          </p>
          <h1 className="flex flex-wrap items-baseline gap-x-3 text-3xl tracking-tight md:text-4xl">
            <span className="font-semibold text-foreground">skills</span>
            <span className="text-muted-foreground">/ leaderboard</span>
            <span className="ml-1 inline-block h-5 w-2.5 animate-blink bg-accent align-middle shadow-glow md:h-6" />
          </h1>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          The open agent skills ecosystem, ranked by installs. Browse the{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] text-foreground">
            skills.sh
          </code>{" "}
          leaderboard, search the catalog, and spot what you already have
          installed locally.
        </p>
      </header>

      <div className="mb-6 flex animate-rise flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search the skills catalog…"
            aria-label="Search skills"
            className="pl-9 font-mono text-[13px]"
          />
        </div>
        <div className="flex items-center gap-1">
          {VIEWS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={cn(
                "inline-flex items-center rounded px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] transition-colors",
                view === key
                  ? "bg-accent text-accent-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {installedQ.data && !searching && (
        <p className="mb-4 animate-rise text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="num text-foreground">{installed.size}</span> skills
          installed locally — marked in the table
        </p>
      )}

      {searching ? (
        <div className="animate-rise">
          <SkillsSearch term={term} installed={installed} />
        </div>
      ) : leaderboard.loading && !leaderboard.data ? (
        <div className="flex animate-pulse items-center gap-3 rounded-lg border border-border bg-surface/75 p-5 text-sm text-muted-foreground">
          <span className="inline-block size-2 animate-blink bg-accent" />
          fetching {view} leaderboard…
        </div>
      ) : leaderboard.error ? (
        <div className="rounded-lg border border-border bg-surface/75 p-6 text-sm">
          <p className="font-medium text-foreground">
            Could not load the skills leaderboard.
          </p>
          <p className="mt-1 break-words text-negative">
            ✕ {leaderboard.error}
          </p>
        </div>
      ) : (
        <div className="animate-rise">
          <SkillsTable
            skills={leaderboard.data?.skills ?? []}
            installed={installed}
          />
        </div>
      )}
    </div>
  );
}
