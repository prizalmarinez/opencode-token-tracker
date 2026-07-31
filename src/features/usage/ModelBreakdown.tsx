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
import { fmtCost } from "@/features/usage/usage-utils";
import { ChartTooltip } from "@/features/usage/ChartTooltip";

type ModelRow = {
  modelId: string;
  cost: number;
  count: number;
};

export function ModelBreakdown({ data }: { data: ModelRow[] }) {
  const nonzero = data.filter((m) => m.cost > 0);
  const total = nonzero.reduce((s, m) => s + m.cost, 0);
  const shown = nonzero.slice(0, 8);
  const rest = nonzero.slice(8);
  const restCost = rest.reduce((s, m) => s + m.cost, 0);
  const chart =
    rest.length > 0 && restCost > 0.0005
      ? [
          ...shown,
          {
            modelId: "other",
            cost: restCost,
            count: rest.reduce((s, m) => s + m.count, 0),
          },
        ]
      : shown;

  return (
    <Card>
      <CardHeader>
        <CardDescription>cost</CardDescription>
        <CardTitle>By model</CardTitle>
      </CardHeader>
      {chart.length === 0 ? (
        <p className="px-5 pb-5 text-[12px] text-muted-foreground">
          No model data.
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
                  dataKey="modelId"
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
                      valueFormatter={(v) =>
                        `${fmtCost(v)} (${total ? Math.round((v / total) * 100) : 0}%)`
                      }
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
          {nonzero.length > shown.length && (
            <p className="px-5 pb-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
              top {shown.length} by cost · +{nonzero.length - shown.length} more
            </p>
          )}
        </>
      )}
    </Card>
  );
}
