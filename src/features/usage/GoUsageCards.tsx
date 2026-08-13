import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription } from "@/components/ui/card";
import { getGoUsage } from "@/lib/api";
import { fmtCost, fmtDuration, fmtRelative } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/cn";
import { navigate } from "@/lib/navigate";
import type { GoUsage } from "@/types";

const WINDOWS = [
  { key: "rolling", label: "5h window", icon: Timer, limitKey: "rolling" },
  { key: "weekly", label: "weekly", icon: CalendarDays, limitKey: "weekly" },
  {
    key: "monthly",
    label: "monthly",
    icon: CalendarRange,
    limitKey: "monthly",
  },
] as const;

type WindowKey = (typeof WINDOWS)[number]["key"];

/*
 * OpenCode Go plan cards: the official rolling-5h / weekly / monthly usage
 * windows (percent + spent/limit + reset countdown) from the /zen/go/v1/usage
 * API, proxied through the local server. The 4th card highlights whichever
 * window is closest to its cap. Countdowns tick every 30s.
 */
export function GoUsageSection({
  apiKey,
  refreshKey,
}: {
  apiKey: string;
  refreshKey: number;
}) {
  const q = useQuery(() => getGoUsage(apiKey), [apiKey, refreshKey]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="mb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          opencode go plan
        </h2>
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
          {q.data
            ? `official usage API · synced ${fmtRelative(new Date(q.data.fetchedAt).getTime())}`
            : "official usage API"}
        </span>
      </div>
      {q.loading ? (
        <div className="flex animate-pulse items-center gap-3 rounded-lg border border-border bg-surface/75 p-5 text-sm text-muted-foreground">
          <span className="inline-block size-2 animate-blink bg-accent" />
          querying opencode.ai usage…
        </div>
      ) : q.error ? (
        <div className="rounded-lg border border-border bg-surface/75 p-5 text-sm">
          <p className="font-medium text-foreground">
            Could not read the Go plan.
          </p>
          <p className="mt-1 text-negative">✕ {q.error}</p>
          <p className="mt-2 text-muted-foreground">
            Check the key in{" "}
            <a
              href="/settings"
              onClick={(e) => {
                e.preventDefault();
                navigate("/settings");
              }}
              className="text-accent underline underline-offset-4 hover:text-foreground"
            >
              settings
            </a>{" "}
            or{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] text-foreground">
              OPENCODE_GO_API_KEY
            </code>
            .
          </p>
        </div>
      ) : q.data ? (
        <GoUsageCards data={q.data} now={now} />
      ) : null}
    </div>
  );
}

function GoUsageCards({ data, now }: { data: GoUsage; now: number }) {
  const nearest = useMemo(() => {
    let best: {
      label: string;
      limitKey: WindowKey;
      percent: number;
      resetsAt: string | null;
      rateLimited: boolean;
    } | null = null;
    for (const w of WINDOWS) {
      const window = data.usage[w.key];
      if (!window || window.percent == null) continue;
      if (!best || window.percent > best.percent) {
        best = {
          label: w.label,
          limitKey: w.limitKey,
          percent: window.percent,
          resetsAt: window.resetsAt,
          rateLimited: window.status === "rate-limited",
        };
      }
    }
    return best;
  }, [data]);

  return (
    <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {WINDOWS.map((w) => {
        const window = data.usage[w.key];
        return (
          <GoCard
            key={w.key}
            label={w.label}
            icon={w.icon}
            percent={window?.percent ?? null}
            limit={data.limits[w.limitKey]}
            resetsAt={window?.resetsAt ?? null}
            rateLimited={window?.status === "rate-limited"}
            now={now}
          />
        );
      })}
      {nearest && (
        <GoCard
          label="nearest cap"
          icon={TriangleAlert}
          percent={nearest.percent}
          limit={data.limits[nearest.limitKey]}
          resetsAt={nearest.resetsAt}
          rateLimited={nearest.rateLimited}
          now={now}
        />
      )}
    </section>
  );
}

function GoCard({
  label,
  icon: Icon,
  percent,
  limit,
  resetsAt,
  rateLimited,
  now,
}: {
  label: string;
  icon: typeof Timer;
  percent: number | null;
  limit: number;
  resetsAt: string | null;
  rateLimited: boolean;
  now: number;
}) {
  const spent = percent != null ? limit * (percent / 100) : null;
  const resetMs = resetsAt ? new Date(resetsAt).getTime() : null;
  const countdown =
    resetMs != null ? fmtDuration(Math.max(0, resetMs - now)) : null;
  const hot = percent != null && percent >= 90;

  return (
    <Card className="group transition-colors duration-200 hover:border-accent/40">
      <CardDescription className="flex items-center gap-1.5 transition-colors duration-200 group-hover:text-accent">
        <Icon className="size-3.5" />
        {label}
        {rateLimited && <Badge variant="negative">rate limited</Badge>}
      </CardDescription>
      <p
        className={cn(
          "num mt-2 text-[26px] font-semibold leading-none tracking-tight transition-all duration-200",
          rateLimited || hot ? "text-negative" : "text-accent",
          "group-hover:text-accent group-hover:[text-shadow:0_0_6px_hsl(var(--accent)/0.45),0_0_28px_hsl(var(--accent)/0.3)]",
        )}
      >
        {percent != null ? `${Math.round(percent)}%` : "—"}
      </p>
      <p className="mt-2 text-[12px] text-muted-foreground">
        {spent != null ? (
          <>
            {fmtCost(spent)}{" "}
            <span className="text-muted-foreground/50">/ {fmtCost(limit)}</span>
          </>
        ) : (
          "—"
        )}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-accent/80">
        {countdown != null ? `▸ resets in ${countdown}` : "▸ reset —"}
      </p>
    </Card>
  );
}
