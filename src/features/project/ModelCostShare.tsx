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
import { fmtCost } from "@/features/usage/usage-utils";
import { chartColor } from "@/features/usage/chart-colors";
import { ChartTooltip } from "@/features/usage/ChartTooltip";

type ModelRow = {
  modelId: string;
  cost: number;
  count: number;
};

export function ModelCostShare({ data }: { data: ModelRow[] }) {
  const nonzero = data.filter((m) => m.cost > 0);
  const total = nonzero.reduce((s, m) => s + m.cost, 0);
  const top = nonzero.slice(0, 8);
  const rest = nonzero.slice(8);
  const restCost = rest.reduce((s, m) => s + m.cost, 0);
  const chart =
    rest.length > 0 && restCost > 0.0005
      ? [
          ...top,
          {
            modelId: "other",
            cost: restCost,
            count: rest.reduce((s, m) => s + m.count, 0),
          },
        ]
      : top;

  return (
    <Card>
      <CardHeader>
        <CardDescription>share of cost</CardDescription>
        <CardTitle>Cost by model</CardTitle>
      </CardHeader>
      {chart.length === 0 ? (
        <p className="px-5 pb-5 text-[12px] text-muted-foreground">
          No model data.
        </p>
      ) : (
        <div className="flex flex-col items-center gap-6 px-5 pb-5 sm:flex-row">
          <div className="h-[180px] w-[180px] shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={chart}
                  dataKey="cost"
                  nameKey="modelId"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={1}
                  strokeWidth={0}
                >
                  {chart.map((_, i) => (
                    <Cell key={i} fill={chartColor(i)} />
                  ))}
                </Pie>
                <RTooltip
                  content={
                    <ChartTooltip
                      valueFormatter={(v) =>
                        `${fmtCost(v)} (${total ? Math.round((v / total) * 100) : 0}%)`
                      }
                    />
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full space-y-1.5">
            {chart.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px]">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: chartColor(i) }}
                />
                <span className="min-w-0 flex-1 truncate">{m.modelId}</span>
                <span className="num text-[11px] text-muted-foreground">
                  {fmtCost(m.cost)}
                </span>
                <span className="num w-9 shrink-0 text-right text-[10px] text-muted-foreground/60">
                  {total ? Math.round((m.cost / total) * 100) : 0}%
                </span>
              </div>
            ))}
            {nonzero.length > 8 && (
              <p className="pt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
                +{nonzero.length - 8} more models
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
