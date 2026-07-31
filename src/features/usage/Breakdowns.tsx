import { useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { fmtCost } from "@/features/usage/usage-utils";
import { chartColor } from "@/features/usage/chart-colors";
import { ChartTooltip } from "@/features/usage/ChartTooltip";

type AgentRow = { agent: string; cost: number; count: number };
type ProjectRow = { name: string; cost: number; count: number };

function BreakdownBar({
  items,
  renderLabel,
  rowHref,
}: {
  items: { cost: number; count: number }[];
  renderLabel: (
    item: { cost: number; count: number },
    index: number,
  ) => React.ReactNode;
  rowHref?: (
    item: { cost: number; count: number },
    index: number,
  ) => string;
}) {
  const maxCost = items[0]?.cost ?? 1;
  return (
    <div className="space-y-1 px-5">
      {items.map((item, i) => {
        const pct = (item.cost / maxCost) * 100;
        const href = rowHref?.(item, i);
        const row = (
          <div className="flex items-center gap-3 py-1 transition-colors hover:bg-muted/40">
            {renderLabel(item, i)}
            <div className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full origin-left animate-grow rounded-full bg-accent/70",
                  )}
                  style={{ width: pct + "%", animationDelay: `${0.04 * i}s` }}
                />
              </div>
            </div>
            <span className="num w-20 shrink-0 text-right text-[13px] text-muted-foreground">
              {fmtCost(item.cost)}
            </span>
          </div>
        );
        return href ? (
          <a
            key={i}
            href={href}
            className="group block rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {row}
          </a>
        ) : (
          <div key={i}>{row}</div>
        );
      })}
    </div>
  );
}

export function Breakdowns({
  byAgent,
  byProject,
}: {
  byAgent: AgentRow[];
  byProject: ProjectRow[];
}) {
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  const visibleProjects = projectsExpanded
    ? byProject
    : byProject.slice(0, 10);

  const agentTotal = byAgent.reduce((s, a) => s + a.cost, 0);
  const agentTop = byAgent.slice(0, 8);
  const agentRest = byAgent.slice(8);
  const agentRestCost = agentRest.reduce((s, a) => s + a.cost, 0);
  const agentChart =
    agentRest.length > 0 && agentRestCost > 0.0005
      ? [
          ...agentTop,
          {
            agent: "other",
            cost: agentRestCost,
            count: agentRest.reduce((s, a) => s + a.count, 0),
          },
        ]
      : agentTop;

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardDescription>share of cost</CardDescription>
          <CardTitle>By agent</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-2 px-5 pb-5">
          <div className="mx-auto h-[160px] w-[160px] shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={agentChart}
                  dataKey="cost"
                  nameKey="agent"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={1}
                  strokeWidth={0}
                >
                  {agentChart.map((_, i) => (
                    <Cell key={i} fill={chartColor(i)} />
                  ))}
                </Pie>
                <RTooltip
                  content={
                    <ChartTooltip
                      valueFormatter={(v) =>
                        `${fmtCost(v)} (${agentTotal ? Math.round((v / agentTotal) * 100) : 0}%)`
                      }
                    />
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 pt-1">
            {agentChart.slice(0, 8).map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[12px]"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: chartColor(i) }}
                />
                <span className="min-w-0 flex-1 truncate capitalize">
                  {a.agent}
                </span>
                <span className="num text-[11px] text-muted-foreground">
                  {fmtCost(a.cost)}
                </span>
                <span className="num w-9 shrink-0 text-right text-[10px] text-muted-foreground/60">
                  {agentTotal ? Math.round((a.cost / agentTotal) * 100) : 0}%
                </span>
              </div>
            ))}
            {agentChart.length > 8 && (
              <p className="pt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
                +{byAgent.length - 8} more agents
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>top 10</CardDescription>
          <CardTitle>By project</CardTitle>
        </CardHeader>
        <BreakdownBar
          items={visibleProjects}
          rowHref={(item) =>
            `#/project/${encodeURIComponent((item as ProjectRow).name)}`
          }
          renderLabel={(item) => (
            <span className="w-40 shrink-0 truncate text-[13px]">
              {(item as ProjectRow).name.replace(/^.*\//, "…/")}
            </span>
          )}
        />
        {byProject.length > 10 && (
          <button
            type="button"
            onClick={() => setProjectsExpanded((v) => !v)}
            className="mx-5 mt-3 mb-5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-accent transition-colors hover:text-foreground"
          >
            <span
              className={cn(
                "transition-transform duration-200",
                projectsExpanded && "rotate-90",
              )}
            >
              ▸
            </span>
            {projectsExpanded
              ? "show less"
              : `show more (+${byProject.length - 10})`}
          </button>
        )}
      </Card>
    </div>
  );
}
