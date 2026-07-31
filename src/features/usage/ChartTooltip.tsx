const NAMES: Record<string, string> = {
  input: "Input",
  output: "Output",
  reasoning: "Reasoning",
  cost: "Cost",
};

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: {
  active?: boolean;
  payload?: {
    dataKey?: string | number;
    value?: number;
    color?: string;
    fill?: string;
    name?: string | number;
  }[];
  label?: string | number;
  labelFormatter?: (label: string | number) => string;
  valueFormatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const heading =
    labelFormatter && label !== undefined ? labelFormatter(label) : label;

  return (
    <div className="min-w-36 rounded-md border border-border bg-surface/95 px-3 py-2 text-xs shadow-glow backdrop-blur-sm">
      {heading !== undefined && heading !== "" && (
        <div className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {heading}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((p) => {
          const key = String(p.name ?? p.dataKey ?? "");
          const name = NAMES[key] ?? key;
          const color = p.fill ?? p.color ?? "hsl(var(--accent))";
          return (
            <div key={key} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ background: color }}
              />
              <span className="text-muted-foreground">{name}</span>
              <span className="num ml-auto pl-4 font-semibold text-foreground">
                {valueFormatter ? valueFormatter(p.value ?? 0, name) : p.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
