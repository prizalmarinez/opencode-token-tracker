import { useCallback, useEffect, useState } from "react";
import { getStatus, getSessions, getSummary } from "@/lib/api";
import type { OpencodeSession, OpencodeSummary, ServerStatus } from "@/types";

export function useDbSource() {
  const [dbPath, setDbPath] = useState<string>("");
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [summary, setSummary] = useState<OpencodeSummary | null>(null);
  const [sessions, setSessions] = useState<OpencodeSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      const [st, sum, sess] = await Promise.allSettled([
        getStatus(dbPath),
        getSummary(dbPath),
        getSessions(dbPath, 50, 0),
      ]);
      if (cancelled) return;
      setStatus(st.status === "fulfilled" ? st.value : null);
      if (sum.status === "fulfilled" && sess.status === "fulfilled") {
        setSummary(sum.value);
        setSessions(sess.value);
      } else {
        const reason =
          sum.status === "rejected"
            ? String(sum.reason?.message ?? sum.reason)
            : String(
                sess.status === "rejected"
                  ? (sess.reason?.message ?? sess.reason)
                  : "",
              );
        setError(reason || "Could not read database.");
        setSummary(null);
        setSessions([]);
      }
      setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [dbPath, refreshKey]);

  return { dbPath, setDbPath, status, summary, sessions, error, loading, refresh };
}
