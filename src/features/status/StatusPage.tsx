import { useState } from "react";
import { Activity, ArrowLeft, Database, RefreshCw, Server } from "lucide-react";
import { getStatus } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import type { OpencodeHealthState } from "@/lib/use-opencode-health";
import { cn } from "@/lib/cn";
import { fmtBytes, fmtRelative } from "@/lib/format";
import { navigate } from "@/lib/navigate";
import type { OpencodeHealth } from "@/types";

function sectionDelay(i: number) {
  return { animationDelay: `${0.06 * i}s` };
}

function fmtCheckedAt(iso: string): string {
  const ts = new Date(iso).getTime();
  return `${fmtRelative(ts)} (${new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })})`;
}

function statusOf(
  health: OpencodeHealthState,
): "checking" | "online" | "offline" {
  if (health.checking && !health.sample) return "checking";
  return health.sample?.ok ? "online" : "offline";
}

/*
 * Latency sparkline over the ring buffer. Down samples are skipped by the
 * line (drawn as separate runs) and marked with a red tick at the baseline,
 * so an outage reads as a flat line with breaks, not a false zero.
 */
function Sparkline({ history }: { history: OpencodeHealth[] }) {
  if (history.length < 2) return null;

  const W = 300;
  const H = 64;
  const PAD = 6;
  const n = history.length;
  const step = W / (n - 1);
  const xAt = (i: number) => i * step;

  const lats = history
    .filter((h) => h.ok && h.latencyMs != null)
    .map((h) => h.latencyMs as number);
  const maxLatency = Math.max(30, ...(lats.length ? lats : [1]));
  const yAt = (ms: number) => H - PAD - (ms / maxLatency) * (H - 2 * PAD);

  const runs: string[] = [];
  let current: string[] = [];
  for (let i = 0; i < n; i++) {
    const h = history[i];
    if (h.ok && h.latencyMs != null) {
      current.push(`${xAt(i).toFixed(1)},${yAt(h.latencyMs).toFixed(1)}`);
    } else if (current.length) {
      runs.push(current.join(" "));
      current = [];
    }
  }
  if (current.length) runs.push(current.join(" "));

  const downIdx = history.map((h, i) => (h.ok ? -1 : i)).filter((i) => i >= 0);

  return (
    <div className="flex items-end gap-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-16 w-full min-w-0 text-accent"
        role="img"
        aria-label="Latency over the last checks"
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            y1={H * f}
            x2={W}
            y2={H * f}
            stroke="hsl(var(--border) / 0.55)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
        ))}
        <line
          x1={0}
          y1={H - PAD}
          x2={W}
          y2={H - PAD}
          stroke="hsl(var(--border) / 0.9)"
          strokeWidth={1}
        />
        {runs.map((pts, i) => (
          <polyline
            key={i}
            points={pts}
            fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {downIdx.map((i) => (
          <path
            key={`down-${i}`}
            d={`M ${xAt(i) - 3} ${H - PAD - 3} L ${xAt(i) + 3} ${H - PAD + 3} M ${xAt(i) + 3} ${H - PAD - 3} L ${xAt(i) - 3} ${H - PAD + 3}`}
            stroke="hsl(var(--negative))"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="hidden shrink-0 text-right font-mono text-[10px] leading-relaxed text-muted-foreground sm:block">
        <div>{maxLatency}ms</div>
        <div>max</div>
        <div className="mt-3">0ms</div>
      </div>
    </div>
  );
}

function DetailRow({
  dt,
  dd,
  ddClassName,
}: {
  dt: string;
  dd: React.ReactNode;
  ddClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2 last:border-b-0 last:pb-0">
      <dt className="shrink-0 text-muted-foreground">{dt}</dt>
      <dd
        className={cn(
          "min-w-0 text-right font-medium text-foreground",
          ddClassName,
        )}
      >
        {dd}
      </dd>
    </div>
  );
}

export function StatusPage({
  health,
  dbPath,
  refreshKey,
}: {
  health: OpencodeHealthState;
  dbPath: string;
  refreshKey: number;
}) {
  const [blurred, setBlurred] = useState(true);
  const telemetry = useQuery(() => getStatus(dbPath), [dbPath, refreshKey]);
  const status = statusOf(health);
  const down = health.sample && !health.sample.ok;

  const wordmark =
    status === "checking" ? (
      <span className="animate-pulse text-muted-foreground">CHECKING…</span>
    ) : status === "online" ? (
      <span className="glow-text text-accent">ONLINE</span>
    ) : (
      <span
        className="text-negative"
        style={{ textShadow: "0 0 20px hsl(var(--negative) / 0.45)" }}
      >
        OFFLINE
      </span>
    );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
      <a
        href="/usage"
        onClick={(e) => {
          e.preventDefault();
          navigate("/usage");
        }}
        className="mb-6 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        back to usage
      </a>

      <header className="mb-8 animate-rise">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
          system health · live probe
        </p>
        <h1 className="flex flex-wrap items-baseline gap-x-3 text-3xl tracking-tight md:text-4xl">
          <span className="font-semibold text-foreground">status</span>
          <span className="ml-1 inline-block h-5 w-2.5 animate-blink bg-accent align-middle shadow-glow md:h-6" />
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Probes the opencode server behind{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] text-foreground">
            opencode serve
          </code>{" "}
          on :4096 every 15 seconds, so a crashed agent server shows up here
          instead of failing silently on the next chat message.
        </p>
      </header>

      <section
        className="card-surface animate-rise p-5 md:p-6"
        style={sectionDelay(1)}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <Activity className="size-3.5 text-accent" />
              opencode server
            </div>
            <div className="text-5xl font-semibold tracking-tight md:text-6xl">
              {wordmark}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
              {health.sample?.ok && health.sample.latencyMs != null ? (
                <span className="num text-accent">
                  {health.sample.latencyMs}ms round-trip
                </span>
              ) : null}
              <span className="num">
                last checked{" "}
                {health.sample ? fmtCheckedAt(health.sample.checkedAt) : "—"}
              </span>
              {health.paused ? (
                <span className="text-muted-foreground/70">
                  paused (tab hidden)
                </span>
              ) : null}
            </div>
          </div>
          <div className="w-full md:max-w-sm">
            <Sparkline history={health.history} />
          </div>
        </div>
      </section>

      <section
        className="card-surface mt-4 animate-rise p-4"
        style={sectionDelay(2)}
      >
        <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <Server className="size-3.5 text-accent" />
          probe detail · :4096
        </div>
        <dl className="grid gap-x-6 gap-y-3 text-[12px] sm:grid-cols-2">
          <DetailRow
            dt="endpoint"
            dd="http://127.0.0.1:4096/global/health"
            ddClassName="truncate"
          />
          <DetailRow
            dt="state"
            dd={
              status === "checking" ? (
                <span className="animate-pulse text-muted-foreground">
                  probing…
                </span>
              ) : health.sample?.ok ? (
                <span className="text-positive">reachable</span>
              ) : (
                <span className="text-negative">unreachable</span>
              )
            }
          />
          <DetailRow
            dt="last error"
            dd={down ? (health.sample?.error ?? "unknown") : "none"}
            ddClassName={down ? "text-negative" : "text-muted-foreground"}
          />
          <DetailRow
            dt="samples kept"
            dd={<span className="num">{health.history.length}</span>}
          />
        </dl>
      </section>

      <section
        className="card-surface mt-4 animate-rise p-4"
        style={sectionDelay(3)}
      >
        <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <Database className="size-3.5 text-accent" />
          telemetry api · :3100
        </div>
        <dl className="grid gap-x-6 gap-y-3 text-[12px] sm:grid-cols-2">
          <DetailRow
            dt="status"
            dd={
              telemetry.loading ? (
                <span className="animate-pulse text-muted-foreground">
                  scanning…
                </span>
              ) : telemetry.data?.ok ? (
                <span className="text-positive">connected</span>
              ) : (
                <span className="text-negative">offline</span>
              )
            }
          />
          <DetailRow
            dt="sessions in range"
            dd={
              telemetry.data?.ok && telemetry.data.sessionCount !== null ? (
                <span className="num">
                  {telemetry.data.sessionCount.toLocaleString()}
                </span>
              ) : (
                "—"
              )
            }
          />
          <DetailRow
            dt="database size"
            dd={
              telemetry.data?.dbSize != null
                ? fmtBytes(telemetry.data.dbSize)
                : "—"
            }
          />
          <DetailRow
            dt="resolved path"
            dd={
              <span className="flex items-center justify-end gap-1.5">
                <span
                  className={cn(
                    "truncate",
                    blurred && "select-none blur-[6px]",
                  )}
                  title={telemetry.data?.dbPath}
                >
                  {telemetry.data?.dbPath ?? "—"}
                </span>
                <button
                  type="button"
                  onClick={() => setBlurred((v) => !v)}
                  aria-pressed={!blurred}
                  title={blurred ? "Reveal path" : "Blur path"}
                  className="shrink-0 text-muted-foreground/60 transition-colors hover:text-foreground"
                >
                  {blurred ? "reveal" : "blur"}
                </button>
              </span>
            }
          />
        </dl>
      </section>

      <section
        className="card-surface mt-4 animate-rise p-4"
        style={sectionDelay(4)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Auto-checks every 15s and pauses while the tab is hidden. Start the
            stack with{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground">
              pnpm dev
            </code>
            .
          </p>
          <button
            type="button"
            onClick={health.recheck}
            disabled={health.checking}
            className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-accent-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw
              className={cn("size-3", health.checking && "animate-spin")}
            />
            retry now
          </button>
        </div>
      </section>
    </div>
  );
}
