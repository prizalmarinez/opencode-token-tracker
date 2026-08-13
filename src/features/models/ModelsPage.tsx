import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { ModelRow, ModelsSort } from "@/types";
import { getModelsLeaderboard } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { Badge } from "@/components/ui/badge";
import { fmtCompact } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Leaderboard, type LeaderboardColumn } from "@/components/leaderboard";

const SORTS: { key: ModelsSort; label: string }[] = [
  { key: "top-weekly", label: "popular" },
  { key: "pricing-low-to-high", label: "cheapest" },
  { key: "context-high-to-low", label: "longest" },
];

function fmtPerMillion(p: number | null): string {
  if (p === null) return "·";
  const perM = p * 1_000_000;
  if (perM === 0) return "$0";
  if (perM < 0.01) return "$" + perM.toFixed(4);
  return "$" + perM.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const modelColumns: LeaderboardColumn<ModelRow>[] = [
  {
    header: "context",
    headerClass: "w-16 shrink-0 text-right",
    cellClass: "num w-16 shrink-0 text-right text-[12px] text-foreground",
    render: (m) =>
      m.contextLength !== null ? fmtCompact(m.contextLength) : "·",
  },
  {
    header: "prompt /M",
    headerClass: "hidden w-20 shrink-0 text-right sm:block",
    cellClass:
      "num hidden w-20 shrink-0 text-right text-[12px] text-foreground sm:block",
    render: (m) => fmtPerMillion(m.promptPrice),
  },
  {
    header: "output /M",
    headerClass: "hidden w-20 shrink-0 text-right sm:block",
    cellClass:
      "num hidden w-20 shrink-0 text-right text-[12px] text-foreground sm:block",
    render: (m) => fmtPerMillion(m.completionPrice),
  },
  {
    header: "arena",
    headerClass: "hidden w-24 shrink-0 md:block",
    cellClass: "hidden w-24 shrink-0 md:block",
    render: (m) =>
      m.arenaRank !== null ? (
        <Badge variant="accent">
          #{m.arenaRank} {m.arenaCategory}
        </Badge>
      ) : null,
  },
  {
    header: "",
    headerClass: "w-8 shrink-0",
    cellClass: "flex w-8 shrink-0 items-center justify-end",
    render: (m) => (
      <a
        href={m.url}
        target="_blank"
        rel="noopener noreferrer"
        title="View on OpenRouter"
        aria-label={`View ${m.name} on OpenRouter`}
        className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ExternalLink className="size-3.5" />
      </a>
    ),
  },
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
    <Leaderboard<ModelsSort, ModelRow>
      eyebrow="llm models · openrouter"
      title="models"
      description={
        <>
          The{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] text-foreground">
            openrouter
          </code>{" "}
          catalog, ranked server-side. Browse by weekly popularity, cheapest
          pricing, or longest context, and flip on the free filter for the
          zero-cost <code className="font-mono">:free</code> variants.
        </>
      }
      tabs={SORTS}
      activeTab={sort}
      onTabChange={setSort}
      toolbarEnd={
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
      }
      footnote={
        leaderboard.data ? (
          <>
            <span className="num text-foreground">{freeCount}</span> free models
            in the catalog
          </>
        ) : undefined
      }
      loading={leaderboard.loading && !leaderboard.data}
      error={leaderboard.error}
      loadingLabel={`fetching ${sort} model ranking…`}
      errorTitle="Could not load the OpenRouter model catalog."
      items={models}
      columns={modelColumns}
      rowKey={(m) => m.id}
      nameHeader="model"
      rank={(_, i) => i + 1}
      name={(m) => (
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{m.name}</span>
          {m.isFree && (
            <Badge variant="positive" className="shrink-0">
              free
            </Badge>
          )}
        </span>
      )}
      subtitle={(m) => m.id}
      countLabel={`${models.length} models`}
      cardTitle="Leaderboard"
    />
  );
}
