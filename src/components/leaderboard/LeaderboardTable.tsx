import type { ReactNode } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export interface LeaderboardColumn<T> {
  header: string;
  headerClass: string;
  cellClass: string;
  render: (item: T) => ReactNode;
}

/*
 * Shared leaderboard table card. Owns the row chrome (rank cell, two-line name
 * cell, hover groups); the pages supply column definitions and the cell
 * contents. The last column is conventionally the actions cell (header ""
 * renders as a spacer).
 */
export function LeaderboardTable<T>({
  items,
  columns,
  rowKey,
  nameHeader,
  rank,
  name,
  subtitle,
  countLabel,
  cardTitle = "Leaderboard",
  footer,
}: {
  items: T[];
  columns: LeaderboardColumn<T>[];
  rowKey: (item: T) => string;
  nameHeader: string;
  rank: (item: T, index: number) => ReactNode;
  name: (item: T) => ReactNode;
  subtitle: (item: T) => ReactNode;
  countLabel: string;
  cardTitle?: string;
  footer?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardDescription>{countLabel}</CardDescription>
          <CardTitle>{cardTitle}</CardTitle>
        </div>
      </CardHeader>

      <div className="hidden items-center gap-x-5 border-t border-border/50 px-5 pb-2 pt-4 text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60 sm:flex">
        <div className="w-8 shrink-0 text-right">#</div>
        <div className="min-w-0 flex-1">{nameHeader}</div>
        {columns.map((c) => (
          <div key={c.header} className={c.headerClass}>
            {c.header}
          </div>
        ))}
      </div>

      <div className="divide-y divide-border/50 border-t border-border/50">
        {items.map((item, i) => (
          <div
            key={rowKey(item)}
            className="group/row flex items-center gap-x-5 px-5 py-2.5 transition-colors hover:bg-muted/40"
          >
            <div className="num w-8 shrink-0 text-right text-[11px] text-muted-foreground/70">
              {rank(item, i)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-foreground transition-colors duration-150 group-hover/row:text-accent">
                {name(item)}
              </div>
              <div className="truncate font-mono text-[10px] text-muted-foreground/70">
                {subtitle(item)}
              </div>
            </div>
            {columns.map((c) => (
              <div key={c.header} className={c.cellClass}>
                {c.render(item)}
              </div>
            ))}
          </div>
        ))}
      </div>
      {footer}
    </Card>
  );
}
