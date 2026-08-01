import { useEffect, useRef, useState } from "react";
import { getProjectSessions, getSummary } from "@/lib/api";
import type { OpencodeSession, OpencodeSummary } from "@/types";
import {
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { NeuralNet } from "@/features/project/NeuralNet";
import { ModelCostShare } from "@/features/project/ModelCostShare";
import { TokenUsageByModel } from "@/features/usage/TokenUsageByModel";
import { ModelBreakdown } from "@/features/usage/ModelBreakdown";
import { navigate } from "@/lib/navigate";
import { ExportButton } from "@/components/export/ExportButton";
import { slugify, type ExportOverview } from "@/lib/export";
import { fmtCompact, fmtCost, fmtDate } from "@/features/usage/usage-utils";

export function ProjectPage({
  project,
  dbPath,
}: {
  project: string;
  dbPath: string;
}) {
  const [summary, setSummary] = useState<OpencodeSummary | null>(null);
  const [sessions, setSessions] = useState<OpencodeSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [sum, rows] = await Promise.all([
          getSummary(dbPath || undefined, project),
          getProjectSessions(dbPath || undefined, project, 500, 0),
        ]);
        if (cancelled) return;
        setSummary(sum);
        setSessions(rows);
      } catch (e) {
        if (cancelled) return;
        setError(String(e instanceof Error ? e.message : e));
        setSummary(null);
        setSessions(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [project, dbPath]);

  const shortName = project.split("/").filter(Boolean).pop() ?? project;
  const totals = summary?.totals ?? null;
  const dateRange = summary?.dateRange ?? null;
  const byModel = summary?.byModel ?? [];

  const overview: ExportOverview | undefined = summary
    ? {
        title: shortName,
        path: project,
        exportedAt: summary.exportedAt,
        dateRange: summary.dateRange,
        totals: summary.totals,
        byModel: summary.byModel.map((m) => ({
          modelId: m.modelId,
          cost: m.cost,
          count: m.count,
        })),
      }
    : undefined;

  return (
    <main ref={mainRef} className="mx-auto max-w-6xl px-4 pb-16 pt-6 md:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <a
          href="/usage"
          onClick={(e) => {
            e.preventDefault();
            navigate("/usage");
          }}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent transition-colors hover:text-foreground"
        >
          <span aria-hidden>←</span> back to usage
        </a>
        <ExportButton
          dbPath={dbPath}
          project={project}
          filenameBase={`opencode-sessions-${slugify(shortName)}`}
          title={`opencode · token-tracker — ${shortName}`}
          subtitle={`${project} · ${dbPath.trim() ? dbPath.trim() : "local opencode.db"}`}
          captureRef={mainRef}
          overview={overview}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_2fr]">
        <Card>
          <CardDescription>project</CardDescription>
          <CardTitle className="truncate">{shortName}</CardTitle>
          <p className="num mt-1 truncate text-[12px] text-muted-foreground">
            {project}
          </p>
        </Card>
        <Card>
          <CardDescription>overview</CardDescription>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { label: "sessions", value: totals ? totals.sessions : "–" },
              {
                label: "cost",
                value: totals ? fmtCost(totals.cost) : "–",
              },
              {
                label: "tokens",
                value: totals
                  ? fmtCompact(
                      totals.tokensInput +
                        totals.tokensOutput +
                        totals.tokensReasoning,
                    )
                  : "–",
              },
              {
                label: "models",
                value: summary ? summary.byModel.length : "–",
              },
            ].map((s) => (
              <div key={s.label}>
                <div className="num text-[28px] leading-none text-foreground">
                  {s.value}
                </div>
                <div className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardDescription>sessions ↔ models</CardDescription>
          <CardTitle>Neural net</CardTitle>
        </CardHeader>
        {loading ? (
          <p className="px-5 pb-5 text-[12px] text-muted-foreground">
            Loading sessions…
          </p>
        ) : error ? (
          <p className="px-5 pb-5 text-[12px] text-muted-foreground">{error}</p>
        ) : sessions && sessions.length === 0 ? (
          <p className="px-5 pb-5 text-[12px] text-muted-foreground">
            No sessions found for this project.
          </p>
        ) : (
          <div className="px-5 pb-5">
            <NeuralNet sessions={sessions ?? []} project={shortName} />
          </div>
        )}
      </Card>

      <div className="mb-4">
        <ModelCostShare data={byModel} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <TokenUsageByModel data={byModel} />
        <ModelBreakdown data={byModel} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardDescription>
              {dateRange
                ? `${fmtDate(dateRange.from)} → ${fmtDate(dateRange.to)}`
                : "sessions"}
            </CardDescription>
            <CardTitle>Sessions</CardTitle>
          </div>
          <span className="num text-[11px] text-muted-foreground">
            {totals?.sessions ?? sessions?.length ?? 0}
          </span>
        </CardHeader>
        {loading ? (
          <p className="px-5 pb-5 text-[12px] text-muted-foreground">
            Loading sessions…
          </p>
        ) : error ? (
          <p className="px-5 pb-5 text-[12px] text-muted-foreground">{error}</p>
        ) : (
          <div
            data-export-expand
            className="max-h-[420px] overflow-y-auto px-5 pb-5"
          >
            <div className="divide-y divide-border/50">
              {(sessions ?? []).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 py-2 text-[12px] transition-colors hover:bg-muted/40"
                >
                  <div
                    data-export-untruncate
                    className="min-w-0 flex-1 truncate"
                  >
                    {s.title || "(untitled)"}
                  </div>
                  <div className="num hidden shrink-0 text-muted-foreground sm:block">
                    {fmtDate(s.timeCreated)}
                  </div>
                  <div
                    data-export-untruncate
                    className="hidden w-32 shrink-0 truncate font-mono text-[11px] text-muted-foreground md:block"
                  >
                    {s.modelId}
                  </div>
                  <div className="num shrink-0 text-muted-foreground">
                    {fmtCompact(
                      s.tokensInput + s.tokensOutput + s.tokensReasoning,
                    )}
                  </div>
                  <div className="num w-16 shrink-0 text-right text-muted-foreground">
                    {fmtCost(s.cost)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </main>
  );
}
