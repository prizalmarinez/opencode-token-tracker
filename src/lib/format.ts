export type Range = "24h" | "7d" | "30d" | "all";

export function msAgo(n: number, unit: "h" | "d"): number {
  const mul = unit === "h" ? 3_600_000 : 86_400_000;
  return Date.now() - n * mul;
}

export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export function fmtCost(n: number): string {
  if (n < 0.01) return "$0.00";
  if (n < 1) return "$" + n.toFixed(4);
  if (n < 100) return "$" + n.toFixed(2);
  return "$" + Math.round(n);
}

export function fmtBytes(n: number): string {
  if (n >= 1 << 30) return (n / (1 << 30)).toFixed(2) + " GB";
  if (n >= 1 << 20) return (n / (1 << 20)).toFixed(1) + " MB";
  if (n >= 1 << 10) return (n / (1 << 10)).toFixed(1) + " KB";
  return n + " B";
}

export function fmtDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
