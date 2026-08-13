import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { OpencodeSession } from "@/types";
import { getSessions, getSummary } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { TokenUsageByModel } from "@/features/usage/TokenUsageByModel";
import { RangeSelector } from "@/features/usage/RangeSelector";
import { UsageStats } from "@/features/usage/UsageStats";
import { ModelBreakdown } from "@/features/usage/ModelBreakdown";
import { Breakdowns } from "@/features/usage/Breakdowns";
import { DailyCostChart } from "@/features/usage/DailyCostChart";
import { RecentSessions } from "@/features/usage/RecentSessions";
import { GoUsageSection } from "@/features/usage/GoUsageCards";
import { useGoApiKey } from "@/features/settings/go-api-key";
import { msAgo, type Range } from "@/lib/format";
import { navigate } from "@/lib/navigate";
import { ExportButton } from "@/components/export/ExportButton";
import { cn } from "@/lib/cn";

const RECENT_SESSIONS = 10;

function sectionDelay(i: number) {
  return { animationDelay: `${0.06 * i}s` };
}

export function Usage({
  dbPath,
  refreshKey,
  onRefresh,
}: {
  dbPath: string;
  refreshKey: number;
  onRefresh: () => void;
}) {
  const [range, setRange] = useState<Range>("24h");
  const [spinning, setSpinning] = useState(false);
  const { key: goApiKey } = useGoApiKey();
  const summaryQ = useQuery(() => getSummary(dbPath), [dbPath, refreshKey]);
  const sessionsQ = useQuery(
    () => getSessions(dbPath, RECENT_SESSIONS, 0),
    [dbPath, refreshKey],
  );
  const summary = summaryQ.data;
  const sessions: OpencodeSession[] = sessionsQ.data ?? [];
  const error = summaryQ.error ?? sessionsQ.error;
  const loading = summaryQ.loading || sessionsQ.loading;

  const handleRefresh = () => {
    onRefresh();
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 700);
  };

  const totals = useMemo(() => {
    if (!summary) return null;
    const d = summary.daily;
    const cutoff =
      range === "24h"
        ? msAgo(24, "h")
        : range === "7d"
          ? msAgo(7, "d")
          : range === "30d"
            ? msAgo(30, "d")
            : 0;
    if (cutoff === 0) {
      const t = summary.totals;
      return {
        cost: t.cost,
        sessions: t.sessions,
        input: t.tokensInput,
        output: t.tokensOutput,
        reasoning: t.tokensReasoning,
      };
    }
    const cutoffDate = new Date(cutoff).toISOString().slice(0, 10);
    const filtered = d.filter((day) => day.date >= cutoffDate);
    return {
      cost: filtered.reduce((s, day) => s + day.cost, 0),
      sessions: filtered.reduce((s, day) => s + day.sessions, 0),
      input: filtered.reduce((s, day) => s + day.input, 0),
      output: filtered.reduce((s, day) => s + day.output, 0),
      reasoning: filtered.reduce((s, day) => s + day.reasoning, 0),
    };
  }, [summary, range]);

  const dailyChart = useMemo(() => {
    if (!summary) return [];
    return summary.daily.slice(-30).map((d) => ({
      date: d.date.slice(5),
      cost: Math.round(d.cost * 1000) / 1000,
    }));
  }, [summary]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 animate-rise">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
              local telemetry · read-only
            </p>
            <h1 className="flex flex-wrap items-baseline gap-x-3 text-3xl tracking-tight md:text-4xl">
              <span className="font-semibold text-foreground">opencode</span>
              <span className="text-muted-foreground">/ token-tracker</span>
              <span className="ml-1 inline-block h-5 w-2.5 animate-blink bg-accent align-middle shadow-glow md:h-6" />
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              title="Fetch latest data"
              aria-label="Fetch latest data"
              className="flex items-center gap-1.5 rounded p-1.5 text-accent transition-colors hover:bg-accent/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={cn(
                  "size-4",
                  (loading || spinning) && "animate-spin",
                )}
              />
              <span className="text-[12px] tracking-tight">sync</span>
            </button>
            <ExportButton
              dbPath={dbPath}
              filenameBase="opencode-sessions"
              title="opencode · token-tracker — session log"
              subtitle={dbPath.trim() ? dbPath.trim() : "local opencode.db"}
            />
          </div>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Usage, cost and sessions queried straight from your local{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] text-foreground">
            opencode.db
          </code>{" "}
          — nothing is uploaded or stored.
        </p>
      </header>

      {goApiKey.trim() && (
        <div className="animate-rise" style={sectionDelay(0.5)}>
          <GoUsageSection apiKey={goApiKey} refreshKey={refreshKey} />
        </div>
      )}

      {summary ? (
        <>
          <div className="animate-rise" style={sectionDelay(1)}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {range === "all" ? "All time" : `Last ${range}`}
              </h2>
              <RangeSelector range={range} setRange={setRange} />
            </div>
            {totals && <UsageStats totals={totals} />}
          </div>
          <div
            className="mb-4 grid animate-rise grid-cols-1 gap-4 md:grid-cols-2"
            style={sectionDelay(2)}
          >
            <TokenUsageByModel data={summary.byModel} />
            <ModelBreakdown data={summary.byModel} />
          </div>
          <div className="animate-rise" style={sectionDelay(3)}>
            <Breakdowns
              byAgent={summary.byAgent}
              byProject={summary.byProject}
            />
          </div>
          <div className="animate-rise" style={sectionDelay(4)}>
            <DailyCostChart data={dailyChart} />
          </div>
          <div className="animate-rise" style={sectionDelay(5)}>
            <RecentSessions sessions={sessions} />
          </div>
        </>
      ) : loading ? (
        <div className="flex animate-pulse items-center gap-3 rounded-lg border border-border bg-surface/75 p-5 text-sm text-muted-foreground">
          <span className="inline-block size-2 animate-blink bg-accent" />
          initializing telemetry channel…
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface/75 p-6 text-sm">
          <p className="font-medium text-foreground">
            {error ? "Could not read the database." : "No data in range."}
          </p>
          {error ? (
            <p className="mt-1 break-words text-negative">✕ {error}</p>
          ) : (
            <p className="mt-1 text-muted-foreground">
              Point the database source at a valid{" "}
              <code className="text-foreground">opencode.db</code> — set it in{" "}
              <a
                href="/settings"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/settings");
                }}
                className="text-accent underline underline-offset-4 hover:text-foreground"
              >
                settings
              </a>
              .
            </p>
          )}
        </div>
      )}
    </div>
  );
}
