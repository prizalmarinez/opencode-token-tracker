import { useMemo, useState } from "react";
import type { ModelsSort } from "@/types";
import { getModelsLeaderboard } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/cn";
import { ModelsTable } from "@/features/models/ModelsTable";

const SORTS: { key: ModelsSort; label: string }[] = [
  { key: "top-weekly", label: "popular" },
  { key: "pricing-low-to-high", label: "cheapest" },
  { key: "context-high-to-low", label: "longest" },
];

export function ModelsPage({ refreshKey }: { refreshKey: number }) {
  const [sort, setSort] = useState<ModelsSort>("top-weekly");
  const [freeOnly, setFreeOnly] = useState(false);

  const leaderboard = useQuery(
    () => getModelsLeaderboard(sort),
    [sort, refreshKey],
  );

  const models = useMemo(() => {
    const all = leaderboard.data?.models ?? [];
    return freeOnly ? all.filter((m) => m.isFree) : all;
  }, [leaderboard.data, freeOnly]);

  const freeCount = useMemo(
    () => (leaderboard.data?.models ?? []).filter((m) => m.isFree).length,
    [leaderboard.data],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 animate-rise">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
            llm models · openrouter
          </p>
          <h1 className="flex flex-wrap items-baseline gap-x-3 text-3xl tracking-tight md:text-4xl">
            <span className="font-semibold text-foreground">models</span>
            <span className="text-muted-foreground">/ leaderboard</span>
            <span className="ml-1 inline-block h-5 w-2.5 animate-blink bg-accent align-middle shadow-glow md:h-6" />
          </h1>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          The{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] text-foreground">
            openrouter
          </code>{" "}
          catalog, ranked server-side. Browse by weekly popularity, cheapest
          pricing, or longest context, and flip on the free filter for the
          zero-cost <code className="font-mono">:free</code> variants.
        </p>
      </header>

      <div className="mb-6 flex animate-rise flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-1">
          {SORTS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              aria-pressed={sort === key}
              className={cn(
                "inline-flex items-center rounded px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] transition-colors",
                sort === key
                  ? "bg-accent text-accent-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFreeOnly((v) => !v)}
          aria-pressed={freeOnly}
          className={cn(
            "inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] transition-colors",
            freeOnly
              ? "bg-accent text-accent-foreground shadow-glow"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <span
            className={cn(
              "inline-block size-2 rounded-full",
              freeOnly ? "bg-accent-foreground" : "bg-muted-foreground/40",
            )}
          />
          free only
        </button>
      </div>

      {leaderboard.data && (
        <p className="mb-4 animate-rise text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="num text-foreground">{freeCount}</span> free models
          in the catalog
        </p>
      )}

      {leaderboard.loading && !leaderboard.data ? (
        <div className="flex animate-pulse items-center gap-3 rounded-lg border border-border bg-surface/75 p-5 text-sm text-muted-foreground">
          <span className="inline-block size-2 animate-blink bg-accent" />
          fetching {sort} model ranking…
        </div>
      ) : leaderboard.error ? (
        <div className="rounded-lg border border-border bg-surface/75 p-6 text-sm">
          <p className="font-medium text-foreground">
            Could not load the OpenRouter model catalog.
          </p>
          <p className="mt-1 break-words text-negative">
            ✕ {leaderboard.error}
          </p>
        </div>
      ) : (
        <div className="animate-rise">
          <ModelsTable models={models} />
        </div>
      )}
    </div>
  );
}
