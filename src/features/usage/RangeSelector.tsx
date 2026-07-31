import type { Range } from "@/features/usage/usage-utils";
import { cn } from "@/lib/cn";

const OPTIONS = [
  { key: "24h" as Range, label: "24h" },
  { key: "7d" as Range, label: "7d" },
  { key: "30d" as Range, label: "30d" },
  { key: "all" as Range, label: "All" },
];

export function RangeSelector({
  range,
  setRange,
}: {
  range: Range;
  setRange: (r: Range) => void;
}) {
  return (
    <div className="mb-4 inline-flex items-center gap-0.5 rounded-md border border-border bg-surface/60 p-0.5">
      {OPTIONS.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => setRange(r.key)}
          className={cn(
            "rounded px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] transition-all duration-200",
            range === r.key
              ? "bg-accent text-accent-foreground shadow-glow"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
