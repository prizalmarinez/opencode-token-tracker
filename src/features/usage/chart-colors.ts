export const CHART_COLORS = [
  "hsl(var(--accent))",
  "hsl(var(--positive))",
  "hsl(var(--accent-muted))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--secondary-foreground))",
];

export function chartColor(i: number) {
  return CHART_COLORS[i % CHART_COLORS.length];
}
