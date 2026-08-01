import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { ProjectOverview } from "@/types";
import { fmtCost } from "@/lib/format";
import { fmtShare, topWithOther } from "@/lib/share";
import { chartColor } from "@/features/usage/chart-colors";
import { ChartTooltip } from "@/features/usage/ChartTooltip";

const shorten = (name: string) => name.replace(/^.*\//, "…/");

export function ProjectSpendChart({
  projects,
}: {
  projects: ProjectOverview[];
}) {
  const { chart, total, hidden } = useMemo(
    () =>
      topWithOther(
        projects.map((p) => ({
          name: p.name,
          cost: p.cost,
          count: p.sessions,
        })),
        "name",
      ),
    [projects],
  );

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardDescription>spend by project · top 8</CardDescription>
        <CardTitle>Where the money goes</CardTitle>
      </CardHeader>
      {chart.length === 0 ? (
        <p className="px-5 pb-5 text-[12px] text-muted-foreground">
          No project data.
        </p>
      ) : (
        <>
          <div className="h-[220px] px-2 pb-2">
            <ResponsiveContainer>
              <BarChart
                data={chart}
                margin={{ left: -12, right: 8, top: 8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="0"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                  }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-25}
                  height={56}
                  textAnchor="end"
                  tickFormatter={shorten}
                />
                <YAxis
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                  }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(v) => fmtCost(v)}
                />
                <RTooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                  content={
                    <ChartTooltip
                      labelFormatter={(l) => shorten(String(l))}
                      valueFormatter={(v) => fmtShare(v, total)}
                    />
                  }
                />
                <Bar
                  dataKey="cost"
                  fill="hsl(var(--accent))"
                  radius={[3, 3, 0, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 pb-4 text-xs uppercase tracking-[0.16em] text-muted-foreground/70">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: chartColor(0) }}
              />
              cost
            </span>
            {hidden > 0 && (
              <span className="text-muted-foreground/50">
                top 8 by cost · +{hidden} more
              </span>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
