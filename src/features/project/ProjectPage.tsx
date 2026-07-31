import { useEffect, useMemo, useState } from "react";
import { getProjectSessions } from "@/lib/api";
import type { OpencodeSession } from "@/types";
import {
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { NeuralNet } from "@/features/project/NeuralNet";
import { TokenUsageByModel } from "@/features/usage/TokenUsageByModel";
import { ModelBreakdown } from "@/features/usage/ModelBreakdown";
import { navigate } from "@/lib/navigate";
import {
  fmtCompact,
  fmtCost,
  fmtDate,
} from "@/features/usage/usage-utils";

export function ProjectPage({
  project,
  dbPath,
}: {
  project: string;
  dbPath: string;
}) {
  const [sessions, setSessions] = useState<OpencodeSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await getProjectSessions(
          dbPath || undefined,
          project,
          500,
          0,
        );
        if (cancelled) return;
        setSessions(rows);
      } catch (e) {
        if (cancelled) return;
        setError(String(e instanceof Error ? e.message : e));
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

  const stats = useMemo(() => {
    if (!sessions) return null;
    const cost = sessions.reduce((s, x) => s + x.cost, 0);
    const tokens = sessions.reduce(
      (s, x) => s + x.tokensInput + x.tokensOutput + x.tokensReasoning,
      0,
    );
    const models = new Set(sessions.map((x) => x.modelId)).size;
    const times = sessions.map((x) => x.timeCreated);
    return {
      cost,
      tokens,
      models,
      from: times.length ? Math.min(...times) : 0,
      to: times.length ? Math.max(...times) : 0,
    };
  }, [sessions]);

  const shortName = project.split("/").filter(Boolean).pop() ?? project;

  const byModel = useMemo(() => {
    if (!sessions) return [];
    const map = new Map<
      string,
      { modelId: string; cost: number; input: number; output: number; reasoning: number; count: number }
    >();
    for (const s of sessions) {
      const row = map.get(s.modelId) ?? {
        modelId: s.modelId,
        cost: 0,
        input: 0,
        output: 0,
        reasoning: 0,
        count: 0,
      };
      row.cost += s.cost;
      row.input += s.tokensInput;
      row.output += s.tokensOutput;
      row.reasoning += s.tokensReasoning;
      row.count += 1;
      map.set(s.modelId, row);
    }
    return [...map.values()].sort((a, b) => b.cost - a.cost);
  }, [sessions]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 md:px-8">
      <a
        href="/usage"
        onClick={(e) => {
          e.preventDefault();
          navigate("/usage");
        }}
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-accent transition-colors hover:text-foreground"
      >
        <span aria-hidden>←</span> back to usage
      </a>

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
              { label: "sessions", value: sessions?.length ?? "–" },
              { label: "cost", value: stats ? fmtCost(stats.cost) : "–" },
              {
                label: "tokens",
                value: stats ? fmtCompact(stats.tokens) : "–",
              },
              { label: "models", value: stats?.models ?? "–" },
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
          <p className="px-5 pb-5 text-[12px] text-muted-foreground">
            {error}
          </p>
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

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <TokenUsageByModel data={byModel} />
        <ModelBreakdown data={byModel} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardDescription>
              {stats
                ? `${stats.from ? fmtDate(stats.from) : "–"} → ${stats.to ? fmtDate(stats.to) : "–"}`
                : "sessions"}
            </CardDescription>
            <CardTitle>Sessions</CardTitle>
          </div>
          <span className="num text-[11px] text-muted-foreground">
            {sessions?.length ?? 0}
          </span>
        </CardHeader>
        {loading ? (
          <p className="px-5 pb-5 text-[12px] text-muted-foreground">
            Loading sessions…
          </p>
        ) : error ? (
          <p className="px-5 pb-5 text-[12px] text-muted-foreground">
            {error}
          </p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto px-5 pb-5">
            <div className="divide-y divide-border/50">
              {(sessions ?? []).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 py-2 text-[12px] transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1 truncate">
                    {s.title || "(untitled)"}
                  </div>
                  <div className="num hidden shrink-0 text-muted-foreground sm:block">
                    {fmtDate(s.timeCreated)}
                  </div>
                  <div className="hidden w-32 shrink-0 truncate font-mono text-[11px] text-muted-foreground md:block">
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
