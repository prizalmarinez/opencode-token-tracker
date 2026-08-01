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
import { fmtCompact } from "@/lib/format";
import { ChartTooltip } from "@/features/usage/ChartTooltip";

type ModelRow = {
  modelId: string;
  cost: number;
  input: number;
  output: number;
  reasoning: number;
  count: number;
};

export function TokenUsageByModel({ data }: { data: ModelRow[] }) {
  const models = data.slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardDescription>tokens</CardDescription>
        <CardTitle>Token usage by model</CardTitle>
      </CardHeader>
      {models.length === 0 ? (
        <p className="px-5 pb-5 text-[12px] text-muted-foreground">
          No model data.
        </p>
      ) : (
        <>
          <div
            className="px-2 pb-4"
            style={{ height: Math.max(200, models.length * 32 + 16) }}
          >
            <ResponsiveContainer>
              <BarChart
                data={models}
                layout="vertical"
                margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="0"
                  stroke="hsl(var(--border))"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                  }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={fmtCompact}
                />
                <YAxis
                  type="category"
                  dataKey="modelId"
                  width={150}
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                  }}
                  tickLine={false}
                  axisLine={false}
                />
                <RTooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                  content={<ChartTooltip valueFormatter={fmtCompact} />}
                />
                <Bar
                  dataKey="input"
                  stackId="tokens"
                  fill="hsl(var(--accent))"
                  barSize={12}
                  radius={[3, 0, 0, 3]}
                />
                <Bar
                  dataKey="output"
                  stackId="tokens"
                  fill="hsl(var(--muted-foreground))"
                  barSize={12}
                />
                <Bar
                  dataKey="reasoning"
                  stackId="tokens"
                  fill="hsl(var(--border))"
                  barSize={12}
                  radius={[0, 3, 3, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-5 pb-4 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-[2px] bg-accent" />
              Input
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-[2px] bg-muted-foreground" />
              Output
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-[2px] bg-border" />
              Reasoning
            </span>
            {data.length > models.length && (
              <span className="text-muted-foreground/50">
                +{data.length - models.length} more
              </span>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
