import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  LeaderboardTable,
  type LeaderboardColumn,
} from "@/components/leaderboard/LeaderboardTable";

export interface LeaderboardTab<K extends string> {
  key: K;
  label: string;
}

export function LeaderboardLoading({ label }: { label: string }) {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-lg border border-border bg-surface/75 p-5 text-sm text-muted-foreground">
      <span className="inline-block size-2 animate-blink bg-accent" />
      {label}
    </div>
  );
}

export function LeaderboardError({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/75 p-6 text-sm">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 break-words text-negative">✕ {message}</p>
    </div>
  );
}

/*
 * Shared leaderboard page scaffold: eyebrow/header, segmented tabs (plus a
 * toolbarEnd slot for per-page filters), footnote, and the loading/error/table
 * body. Pages pass column definitions and cell renderers; quirks (skills'
 * search view via `body`, models' free filter via `toolbarEnd`) stay in the
 * pages.
 */
export function Leaderboard<K extends string, T>({
  eyebrow,
  title,
  description,
  tabs,
  activeTab,
  onTabChange,
  toolbarStart,
  toolbarEnd,
  footnote,
  loading,
  error,
  loadingLabel,
  errorTitle,
  body,
  items,
  columns,
  rowKey,
  nameHeader,
  rank,
  name,
  subtitle,
  countLabel,
  cardTitle,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
  tabs: LeaderboardTab<K>[];
  activeTab: K;
  onTabChange: (key: K) => void;
  toolbarStart?: ReactNode;
  toolbarEnd?: ReactNode;
  footnote?: ReactNode;
  loading: boolean;
  error: string | null;
  loadingLabel: string;
  errorTitle: string;
  body?: ReactNode;
  items: T[];
  columns: LeaderboardColumn<T>[];
  rowKey: (item: T) => string;
  nameHeader: string;
  rank: (item: T, index: number) => ReactNode;
  name: (item: T) => ReactNode;
  subtitle: (item: T) => ReactNode;
  countLabel: string;
  cardTitle?: string;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 animate-rise">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="flex flex-wrap items-baseline gap-x-3 text-3xl tracking-tight md:text-4xl">
            <span className="font-semibold text-foreground">{title}</span>
            <span className="text-muted-foreground">/ leaderboard</span>
            <span className="ml-1 inline-block h-5 w-2.5 animate-blink bg-accent align-middle shadow-glow md:h-6" />
          </h1>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </header>

      <div className="mb-6 flex animate-rise flex-col gap-3 sm:flex-row sm:items-center">
        {toolbarStart && <div className="relative flex-1">{toolbarStart}</div>}
        <div className="flex items-center gap-1">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onTabChange(key)}
              aria-pressed={activeTab === key}
              className={cn(
                "inline-flex items-center rounded px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] transition-colors",
                activeTab === key
                  ? "bg-accent text-accent-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
          {toolbarEnd}
        </div>
      </div>

      {footnote && (
        <p className="mb-4 animate-rise text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {footnote}
        </p>
      )}

      {body ??
        (loading ? (
          <LeaderboardLoading label={loadingLabel} />
        ) : error ? (
          <LeaderboardError title={errorTitle} message={error} />
        ) : (
          <div className="animate-rise">
            <LeaderboardTable
              items={items}
              columns={columns}
              rowKey={rowKey}
              nameHeader={nameHeader}
              rank={rank}
              name={name}
              subtitle={subtitle}
              countLabel={countLabel}
              cardTitle={cardTitle}
            />
          </div>
        ))}
    </div>
  );
}
