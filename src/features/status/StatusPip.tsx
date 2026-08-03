import { cn } from "@/lib/cn";
import type { OpencodeHealthState } from "@/lib/use-opencode-health";

/*
 * Tiny global status dot in the nav. Click retries the probe immediately; the
 * tooltip carries the last result. online → accent glow, offline → pulsing
 * negative, checking (no sample yet) → muted.
 */
export function StatusPip({ health }: { health: OpencodeHealthState }) {
  const sample = health.sample;
  const title =
    !sample || health.checking
      ? "checking opencode server…"
      : sample.ok
        ? `opencode online · ${sample.latencyMs ?? "—"}ms · click to retry`
        : `opencode offline · ${sample.error ?? "unreachable"} · click to retry`;

  return (
    <button
      type="button"
      onClick={health.recheck}
      disabled={health.checking}
      title={title}
      aria-label={title}
      className="relative ml-1 flex size-[26px] items-center justify-center rounded p-1 text-accent transition-colors hover:bg-accent/10 hover:text-foreground disabled:cursor-wait"
    >
      <span
        className={cn(
          "size-2 rounded-full",
          !sample || health.checking
            ? "bg-muted-foreground/60"
            : sample.ok
              ? "bg-accent shadow-glow"
              : "animate-pulse bg-negative",
        )}
      />
    </button>
  );
}
