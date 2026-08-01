import { fmtCost } from "@/lib/format";

/*
 * Aggregates a cost row list into "top N + other" for charts. Pure — no React,
 * no recharts. Shared by the usage and project features so the slice threshold
 * and the "other" bucket are defined exactly once.
 */
export function topWithOther<T extends { cost: number; count?: number }>(
  items: T[],
  labelKey: keyof T,
  topN = 8,
  threshold = 0.0005,
): { chart: T[]; total: number; hidden: number } {
  const total = items.reduce((s, i) => s + i.cost, 0);
  const top = items.slice(0, topN);
  const rest = items.slice(topN);
  const restCost = rest.reduce((s, i) => s + i.cost, 0);
  const restCount = rest.reduce((s, i) => s + (i.count ?? 0), 0);
  const other =
    rest.length > 0 && restCost > threshold
      ? [{ [labelKey]: "other", cost: restCost, count: restCount } as T]
      : [];
  return {
    chart: [...top, ...other],
    total,
    hidden: rest.length - other.length,
  };
}

export function fmtShare(value: number, total: number): string {
  return `${fmtCost(value)} (${total ? Math.round((value / total) * 100) : 0}%)`;
}
