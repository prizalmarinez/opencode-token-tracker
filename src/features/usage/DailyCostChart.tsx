import {
  Area,
  AreaChart,
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

type DailyPoint = { date: string; cost: number };

export function DailyCostChart({ data }: { data: DailyPoint[] }) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardDescription>cost / day</CardDescription>
        <CardTitle>Daily cost (last 30 days)</CardTitle>
      </CardHeader>
      <div className="h-[200px] px-2 pb-4">
        <ResponsiveContainer>
          <AreaChart
            data={data}
            margin={{ left: -12, right: 8, top: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="oct-area-fill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="hsl(var(--accent))"
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor="hsl(var(--accent))"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="0"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{
                fill: "hsl(var(--muted-foreground))",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
              }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
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
              cursor={{
                stroke: "hsl(var(--accent) / 0.4)",
                strokeWidth: 1,
              }}
              content={<ChartTooltip valueFormatter={(v) => fmtCost(v)} />}
            />
            <Area
              type="monotone"
              dataKey="cost"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              fill="url(#oct-area-fill)"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--accent))" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
