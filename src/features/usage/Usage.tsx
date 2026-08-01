import { useMemo, useState } from "react";
import type { OpencodeSession } from "@/types";
import { getSessions, getSummary } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { TokenUsageByModel } from "@/features/usage/TokenUsageByModel";
import { LimitCards } from "@/features/usage/LimitCards";
import { RangeSelector } from "@/features/usage/RangeSelector";
import { UsageStats } from "@/features/usage/UsageStats";
import { ModelBreakdown } from "@/features/usage/ModelBreakdown";
import { Breakdowns } from "@/features/usage/Breakdowns";
import { DailyCostChart } from "@/features/usage/DailyCostChart";
import { RecentSessions } from "@/features/usage/RecentSessions";
import { msAgo, type Range } from "@/lib/format";
import { navigate } from "@/lib/navigate";
import { ExportButton } from "@/components/export/ExportButton";

const RECENT_SESSIONS = 50;

function sectionDelay(i: number) {
  return { animationDelay: `${0.06 * i}s` };
}

export function Usage({
  dbPath,
  refreshKey,
}: {
  dbPath: string;
  refreshKey: number;
}) {
  const [range, setRange] = useState<Range>("24h");
  const summaryQ = useQuery(() => getSummary(dbPath), [dbPath, refreshKey]);
  const sessionsQ = useQuery(
    () => getSessions(dbPath, RECENT_SESSIONS, 0),
    [dbPath, refreshKey],
  );
  const summary = summaryQ.data;
  const sessions: OpencodeSession[] = sessionsQ.data ?? [];
  const error = summaryQ.error ?? sessionsQ.error;
  const loading = summaryQ.loading || sessionsQ.loading;

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

  const limits = useMemo(() => {
    if (!summary) return [];
    const d = summary.daily;
    const periods = [
      {
        period: "24h" as Range,
        label: "24-hr limit",
        limitCost: 12,
        hours: 24,
      },
      {
        period: "7d" as Range,
        label: "Weekly limit",
        limitCost: 30,
        hours: 7 * 24,
      },
      {
        period: "30d" as Range,
        label: "Monthly limit",
        limitCost: 60,
        hours: 30 * 24,
      },
    ];
    return periods.map((p) => {
      const cutoff = msAgo(p.hours, "h");
      const cutoffDate = new Date(cutoff).toISOString().slice(0, 10);
      const cost = d
        .filter((day) => day.date >= cutoffDate)
        .reduce((sum, day) => sum + day.cost, 0);
      const pct = Math.min((cost / p.limitCost) * 100, 100);
      return {
        period: p.period,
        label: p.label,
        limitCost: p.limitCost,
        cost,
        pct,
      };
    });
  }, [summary]);

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
          <ExportButton
            dbPath={dbPath}
            filenameBase="opencode-sessions"
            title="opencode · token-tracker — session log"
            subtitle={dbPath.trim() ? dbPath.trim() : "local opencode.db"}
          />
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Usage, cost and sessions queried straight from your local{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] text-foreground">
            opencode.db
          </code>{" "}
          — nothing is uploaded or stored.
        </p>
      </header>

      {summary ? (
        <>
          <div className="animate-rise" style={sectionDelay(1)}>
            <LimitCards limits={limits} />
          </div>
          <div className="animate-rise" style={sectionDelay(2)}>
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
            style={sectionDelay(3)}
          >
            <TokenUsageByModel data={summary.byModel} />
            <ModelBreakdown data={summary.byModel} />
          </div>
          <div className="animate-rise" style={sectionDelay(4)}>
            <Breakdowns
              byAgent={summary.byAgent}
              byProject={summary.byProject}
            />
          </div>
          <div className="animate-rise" style={sectionDelay(5)}>
            <DailyCostChart data={dailyChart} />
          </div>
          <div className="animate-rise" style={sectionDelay(6)}>
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
