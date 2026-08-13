import { useCallback, useEffect, useState } from "react";
import { getOpencodeHealth } from "@/lib/api";
import type { OpencodeHealth } from "@/types";

const MAX_HISTORY = 40; // 40 samples ≈ 10 minutes at the default 15s interval

export interface OpencodeHealthState {
  /** Latest known health, null until the first probe completes. */
  sample: OpencodeHealth | null;
  /** True while a probe is in flight. */
  checking: boolean;
  /** Ring buffer of recent probes for the sparkline (oldest → newest). */
  history: OpencodeHealth[];
  /** True while polling is paused (tab hidden). */
  paused: boolean;
  /** Fire a probe immediately and reset the poll timer. */
  recheck: () => void;
}

/*
 * Health poller for the opencode server (:4096), queried through the API
 * server's /api/opencode-health proxy. Refreshes on an interval, pauses while
 * the tab is hidden, cancels on unmount, and exposes recheck() for manual
 * retries (nav pip click, /status retry button). Same discipline as useQuery:
 * all setState happens after an await inside run(), never synchronously in an
 * effect body. History lives in state (a ring buffer) so renders always see
 * the latest samples.
 */
export function useOpencodeHealth(options?: {
  intervalMs?: number;
}): OpencodeHealthState {
  const intervalMs = options?.intervalMs ?? 15_000;
  const [sample, setSample] = useState<OpencodeHealth | null>(null);
  const [checking, setChecking] = useState(true);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(() => document.hidden);
  const [history, setHistory] = useState<OpencodeHealth[]>([]);

  const pushSample = (next: OpencodeHealth) => {
    setHistory((prev) => [...prev.slice(-(MAX_HISTORY - 1)), next]);
  };

  const recheck = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setChecking(true);
      let next: OpencodeHealth;
      try {
        next = await getOpencodeHealth();
      } catch (e) {
        next = {
          ok: false,
          latencyMs: null,
          checkedAt: new Date().toISOString(),
          error: e instanceof Error ? e.message : "cannot reach the API server",
        };
      }
      if (cancelled) return;
      pushSample(next);
      setSample(next);
      setChecking(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, paused]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return {
    sample,
    checking,
    history,
    paused,
    recheck,
  };
}
