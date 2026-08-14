import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { getSessions } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { SessionsTable } from "@/features/sessions/SessionsTable";

const PAGE_SIZE = 50;
const SEARCH_DELAY = 400;

function sectionDelay(i: number) {
  return { animationDelay: `${0.06 * i}s` };
}

export function Sessions({
  dbPath,
  refreshKey,
}: {
  dbPath: string;
  refreshKey: number;
}) {
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);

  const sessionsQ = useQuery(
    () =>
      getSessions(
        dbPath || undefined,
        PAGE_SIZE,
        (page - 1) * PAGE_SIZE,
        term,
      ),
    [dbPath, refreshKey, page, term],
  );
  const data = sessionsQ.data;
  const sessions = useMemo(() => data?.sessions ?? [], [data]);
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const loading = sessionsQ.loading;
  const error = sessionsQ.error;

  useEffect(() => {
    const t = window.setTimeout(() => {
      setTerm(query.trim());
      setPage(1);
    }, SEARCH_DELAY);
    return () => window.clearTimeout(t);
  }, [query]);

  const hasResults = total > 0;
  const searching = term.trim().length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 animate-rise">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
            local telemetry · read-only
          </p>
          <h1 className="flex flex-wrap items-baseline gap-x-3 text-3xl tracking-tight md:text-4xl">
            <span className="font-semibold text-foreground">sessions</span>
            <span className="text-muted-foreground">/ browse</span>
            <span className="ml-1 inline-block h-5 w-2.5 animate-blink bg-accent align-middle shadow-glow md:h-6" />
          </h1>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Every session straight from your local{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] text-foreground">
            opencode.db
          </code>{" "}
          — search the full history and page through it. Filtering happens
          server-side; only the visible page is ever loaded.
        </p>
      </header>

      <div
        className="mb-4 flex animate-rise flex-col gap-3 sm:flex-row sm:items-center"
        style={sectionDelay(1)}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search title or project…"
            aria-label="Search sessions"
            className="pl-9 font-mono text-[13px]"
          />
        </div>
        {loading ? (
          <span className="num flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-block size-1.5 animate-blink bg-accent" />
            searching…
          </span>
        ) : (
          <span className="num text-[11px] text-muted-foreground">
            {searching
              ? `${total} match${total === 1 ? "" : "es"}`
              : `${total} sessions`}
          </span>
        )}
      </div>

      {hasResults ? (
        <div className="animate-rise" style={sectionDelay(2)}>
          <div className="overflow-hidden rounded-lg border border-border bg-surface/75">
            <SessionsTable sessions={sessions} />
            <Pagination
              page={page}
              pageCount={pageCount}
              total={total}
              pageSize={PAGE_SIZE}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(pageCount, p + 1))}
            />
          </div>
        </div>
      ) : loading ? (
        <div className="flex animate-pulse items-center gap-3 rounded-lg border border-border bg-surface/75 p-5 text-sm text-muted-foreground">
          <span className="inline-block size-2 animate-blink bg-accent" />
          reading session log…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-border bg-surface/75 p-6 text-sm">
          <p className="font-medium text-foreground">Could not read sessions.</p>
          <p className="mt-1 break-words text-negative">✕ {error}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface/75 p-6 text-sm text-muted-foreground">
          No sessions found.
        </div>
      )}
    </div>
  );
}
