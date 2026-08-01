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
import { fmtCost } from "@/lib/format";
import { fmtShare, topWithOther } from "@/lib/share";
import { ChartTooltip } from "@/features/usage/ChartTooltip";

type ModelRow = {
  modelId: string;
  cost: number;
  count: number;
};

export function ModelBreakdown({ data }: { data: ModelRow[] }) {
  const { chart, total, hidden } = topWithOther(data, "modelId");

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
                    <ChartTooltip valueFormatter={(v) => fmtShare(v, total)} />
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
          {hidden > 0 && (
            <p className="px-5 pb-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
              top 8 by cost · +{hidden} more
            </p>
          )}
        </>
      )}
    </Card>
  );
}
