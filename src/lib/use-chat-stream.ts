import { useEffect, useRef, useState } from "react";
import type {
  Event as OpenCodeEvent,
  Message,
  Part,
  Permission,
} from "@opencode-ai/sdk/client";
import { opencode } from "@/lib/opencode-client";

const SESSION_KEY = "oct-search-session";
const THREADS_KEY = "oct-search-threads";
const TITLES_KEY = "oct-thread-titles";

// A busy session that stops emitting events for this long is presumed hung
// (the server reported busy but nothing is flowing), so the UI can warn
// instead of showing an eternal "running…".
const STALE_AFTER_MS = 90_000;
// How long "keep waiting" extends the stale deadline past a real event.
const SNOOZE_MS = 5 * 60_000;

export interface SearchModel {
  providerID: string;
  modelID: string;
  variant?: string;
}

export interface ChatMessage {
  info: Message;
  parts: Part[];
  // True when the message first arrived over the live SSE stream (a new
  // answer), false when it came from the loaded thread history — used to gate
  // the typewriter effect to new answers only.
  fresh: boolean;
}

export interface ThreadInfo {
  id: string;
  title: string;
  updated: number;
}

export interface SearchChat {
  sessionId: string | null;
  messages: ChatMessage[];
  threads: ThreadInfo[];
  busy: boolean;
  stale: boolean;
  pendingPermission: Permission | null;
  error: string | null;
  send: (text: string, model?: SearchModel) => Promise<void>;
  abort: () => Promise<void>;
  snooze: () => void;
  respondPermission: (
    permissionID: string,
    response: "once" | "always" | "reject",
  ) => Promise<void>;
  selectThread: (id: string) => Promise<void>;
  newThread: () => Promise<void>;
  deleteThread: (id: string) => Promise<void>;
}

function readThreadIds(): string[] {
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function writeThreadIds(ids: string[]) {
  localStorage.setItem(THREADS_KEY, JSON.stringify(ids));
}

function extractText(parts: Part[]): string {
  return parts
    .filter((p): p is Extract<Part, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim();
}

// Pulls the owning session id out of any event shape so liveness tracking only
// counts events that belong to the active session or its subagent descendants
// (never heartbeats, which have no session id and would otherwise keep a hung
// session looking alive).
function eventSessionID(ev: OpenCodeEvent): string | null {
  const props = ev.properties as {
    sessionID?: string;
    info?: { sessionID?: string };
    part?: { sessionID?: string };
  };
  return (
    props.sessionID ?? props.info?.sessionID ?? props.part?.sessionID ?? null
  );
}

// True when `id` is the active session or any of its subagent descendants
// (walking the parentID chain captured from session.list()).
function isOwnActivity(
  id: string,
  active: string,
  parentOf: Map<string, string>,
) {
  let cur: string | undefined = id;
  const seen = new Set<string>();
  while (cur) {
    if (cur === active) return true;
    if (seen.has(cur)) return false;
    seen.add(cur);
    cur = parentOf.get(cur);
  }
  return false;
}

// Keep titles useful for sessions created by the former research prompt.
function extractQuestion(text: string): string {
  const marker = "\n\nResearch question:\n";
  const idx = text.indexOf(marker);
  return (idx === -1 ? text : text.slice(idx + marker.length)).trim();
}

function readTitles(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TITLES_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    const titles =
      parsed && typeof parsed === "object"
        ? (parsed as Record<string, string>)
        : {};
    return titles;
  } catch {
    return {};
  }
}

function writeTitles(titles: Record<string, string>) {
  localStorage.setItem(TITLES_KEY, JSON.stringify(titles));
}

// StrictMode double-runs effects in dev; share the in-flight create so the
// mount effect never opens two scratch sessions.
let pendingSessionCreate: Promise<string> | null = null;

async function getOrCreateSession(): Promise<string> {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  if (pendingSessionCreate) return pendingSessionCreate;
  pendingSessionCreate = (async () => {
    const created = await opencode.session.create({
      body: { title: "chat" },
    });
    if (created.error) throw created.error;
    const sid = created.data?.id;
    if (!sid) throw new Error("server returned no session id");
    localStorage.setItem(SESSION_KEY, sid);
    return sid;
  })().finally(() => {
    pendingSessionCreate = null;
  });
  return pendingSessionCreate;
}

/*
 * Streaming chat against the opencode server (via the /api/chat proxy). Owns
 * one active session per thread, plus a registry of every thread created through this app
 * (localStorage oct-search-threads). The active session id lives in state so
 * the load/subscribe effect re-runs when you switch threads. Same discipline
 * as useQuery: all setState happens after an await inside run(), never
 * synchronously in the effect body.
 *
 * The event stream is global (all sessions) so every event is filtered by the
 * owning sessionID. Parts are accumulated by messageID → partID and flushed to
 * state on the next animation frame so token deltas batch into one render.
 */
export function useSearchChat(): SearchChat {
  const [sessionId, setSessionId] = useState<string | null>(() =>
    localStorage.getItem(SESSION_KEY),
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const [pendingPermission, setPendingPermission] = useState<Permission | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // Lazy-initialized, then kept in sync only inside the effect/handlers — the
  // react-hooks/refs rule forbids reading or writing refs during render.
  const sessionIdRef = useRef<string | null>(localStorage.getItem(SESSION_KEY));
  const infoRef = useRef(new Map<string, Message>());
  const partsRef = useRef(new Map<string, Map<string, Part>>());
  // Message ids that arrived over the live SSE stream (as opposed to thread
  // history loaded from session.messages()). Cleared whenever the active
  // thread (re)loads, so restored history is never mistaken for new output.
  const liveIdsRef = useRef(new Set<string>());
  // Message ids present in the loaded thread history. A message is only
  // "fresh" if it was never part of the history, so SSE events replayed on
  // subscribe never mark a restored answer as new (and a resumed in-flight
  // answer stays non-fresh instead of re-typing from scratch).
  const historyIdsRef = useRef(new Set<string>());
  const flushScheduled = useRef(false);
  const lastActivityAtRef = useRef<number>(0);
  // sessionID → parentID, refreshed from session.list(). Subagents (task tool)
  // report under their own sessionID, so liveness must count descendant
  // sessions or a healthy chat run with a working subagent looks stuck.
  const parentOfRef = useRef(new Map<string, string>());
  // Timestamp until which "keep waiting" suppresses the stale warning.
  const snoozeUntilRef = useRef<number>(0);

  const scheduleFlush = () => {
    if (flushScheduled.current) return;
    flushScheduled.current = true;
    requestAnimationFrame(() => {
      flushScheduled.current = false;
      const ids = [...infoRef.current.keys()];
      ids.sort((a, b) => {
        const ta = infoRef.current.get(a)?.time.created ?? 0;
        const tb = infoRef.current.get(b)?.time.created ?? 0;
        return ta - tb;
      });
      setMessages(
        ids.map((id) => ({
          info: infoRef.current.get(id)!,
          parts: [...(partsRef.current.get(id)?.values() ?? [])],
          fresh: liveIdsRef.current.has(id),
        })),
      );
    });
  };

  const addThreadId = (id: string) => {
    const ids = readThreadIds();
    if (!ids.includes(id)) writeThreadIds([...ids, id]);
  };

  const refreshThreads = async () => {
    try {
      const res = await opencode.session.list();
      if (res.error || !res.data) return;
      const byId = new Map(res.data.map((s) => [s.id, s]));
      // Snapshot the parent chain so liveness can follow subagent events.
      parentOfRef.current = new Map(
        res.data.filter((s) => s.parentID).map((s) => [s.id, s.parentID!]),
      );
      // Registry is the source of truth. Backfill sessions the app created
      // before the registry existed (they start titled "web search") — but only
      // ones that actually have messages. Empty scratch sessions are never real
      // threads. The registry persists, so this check runs once per session.
      const registered = new Set(readThreadIds());
      const candidates = res.data.filter(
        (s) =>
          (s.title === "web search" ||
            s.title === "deep research" ||
            s.title === "chat") &&
          !registered.has(s.id),
      );
      await Promise.all(
        candidates.map(async (s) => {
          try {
            const msgs = await opencode.session.messages({
              path: { id: s.id },
            });
            if (!msgs.error && msgs.data && msgs.data.length > 0) {
              registered.add(s.id);
            }
          } catch {
            /* skip unreadable session */
          }
        }),
      );
      const merged = [...registered].filter((id) => byId.has(id));
      writeThreadIds(merged);

      // Card title = the thread's first question. Fetch each thread's history
      // once, then cache the derived title in localStorage so later refreshes
      // (thread switch, new/delete) don't re-fetch every history.
      const titles = readTitles();
      const untitled = merged.filter((id) => !titles[id]);
      await Promise.all(
        untitled.map(async (id) => {
          try {
            const msgs = await opencode.session.messages({
              path: { id },
            });
            const first = msgs.data?.find((m) => m.info.role === "user");
            const text = first ? extractQuestion(extractText(first.parts)) : "";
            if (text) titles[id] = text;
          } catch {
            /* skip unreadable session */
          }
        }),
      );
      writeTitles(titles);

      setThreads(
        merged
          .map((id) => {
            const s = byId.get(id)!;
            return {
              id,
              title: titles[id] ?? "chat",
              updated: s.time.updated ?? s.time.created,
            };
          })
          .sort((a, b) => b.updated - a.updated),
      );
    } catch {
      /* thread list is best-effort */
    }
  };

  // Session lifecycle: create one if none, otherwise load that thread's
  // history. Re-runs when the active thread switches. The SSE subscription is
  // separate (mount-only) so switching threads never opens a second stream.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      let sid = sessionId;
      if (!sid) {
        try {
          sid = await getOrCreateSession();
          if (!cancelled) setSessionId(sid);
        } catch (e) {
          if (!cancelled) {
            setError(
              e instanceof Error
                ? e.message
                : "cannot reach the opencode server",
            );
          }
          return;
        }
      }
      sessionIdRef.current = sid;
      // Any history restored below is old output; live events re-add their
      // message ids as they stream in.
      liveIdsRef.current = new Set();
      historyIdsRef.current = new Set();

      addThreadId(sid);
      void refreshThreads();

      // Load existing history so a reload or thread switch restores the thread.
      try {
        const hist = await opencode.session.messages({
          path: { id: sid },
        });
        if (!cancelled && !hist.error && hist.data) {
          infoRef.current = new Map(hist.data.map((m) => [m.info.id, m.info]));
          partsRef.current = new Map(
            hist.data.map((m) => [
              m.info.id,
              new Map(m.parts.map((p) => [p.id, p])),
            ]),
          );
          // History ids can never be fresh: replayed events that raced ahead
          // of this load (the SSE subscription starts at mount) are unmarked.
          historyIdsRef.current = new Set(hist.data.map((m) => m.info.id));
          for (const id of historyIdsRef.current) liveIdsRef.current.delete(id);
          scheduleFlush();
          lastActivityAtRef.current = Date.now();
        }
      } catch {
        /* history is best-effort; the live stream fills in */
      }

      // Reflect the restored thread's real status (e.g. resumed from a reload
      // while the agent is still working) so the busy UI isn't stale until the
      // next session.status event arrives.
      try {
        const st = await opencode.session.status();
        if (!cancelled && !st.error && st.data) {
          const status = st.data[sid];
          if (status) setBusy(status.type === "busy");
        }
      } catch {
        /* status is best-effort */
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // One SSE subscription for the hook's lifetime. The SDK's generator retries
  // forever and only stops when the AbortSignal fires, so we must pass a signal
  // and abort on unmount — breaking out of the for-await loop alone leaks the
  // connection. Events are filtered by the live active session.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      let stream;
      try {
        stream = await opencode.event.subscribe({ signal: controller.signal });
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "cannot reach the opencode server",
          );
        }
        return;
      }

      for await (const ev of stream.stream) {
        if (cancelled) break;
        handleEvent(ev);
      }
    };

    void run();
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Busy-but-silent detection: the SSE stream is the only liveness signal, so
  // a busy session that stops emitting events for STALE_AFTER_MS is presumed
  // hung — unless the user explicitly chose to keep waiting (snooze). Polls
  // on a tick; state writes happen inside the interval callback (async), never
  // synchronously in the effect body.
  useEffect(() => {
    const id = setInterval(() => {
      setStale(
        busy &&
          Date.now() > snoozeUntilRef.current &&
          Date.now() - lastActivityAtRef.current > STALE_AFTER_MS,
      );
    }, 5_000);
    return () => clearInterval(id);
  }, [busy]);

  const handleEvent = (ev: OpenCodeEvent) => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    const evSid = eventSessionID(ev);
    if (evSid && isOwnActivity(evSid, sid, parentOfRef.current)) {
      lastActivityAtRef.current = Date.now();
    }
    switch (ev.type) {
      case "message.updated": {
        const info = ev.properties.info;
        if (info.sessionID !== sid) break;
        if (!historyIdsRef.current.has(info.id))
          liveIdsRef.current.add(info.id);
        infoRef.current.set(info.id, info);
        scheduleFlush();
        // Card title = the first question; refresh it as soon as the user's
        // message lands so a brand-new thread titles itself without waiting
        // for a manual refresh.
        if (info.role === "user" && !readTitles()[sid]) {
          void refreshThreads();
        }
        break;
      }
      case "message.part.updated": {
        const part = ev.properties.part;
        if (part.sessionID !== sid) break;
        if (!historyIdsRef.current.has(part.messageID))
          liveIdsRef.current.add(part.messageID);
        let parts = partsRef.current.get(part.messageID);
        if (!parts) {
          parts = new Map();
          partsRef.current.set(part.messageID, parts);
        }
        parts.set(part.id, part);
        if (!infoRef.current.has(part.messageID)) {
          infoRef.current.set(part.messageID, {
            id: part.messageID,
            sessionID: part.sessionID,
            role: "assistant",
            time: { created: 0 },
          } as Message);
        }
        scheduleFlush();
        break;
      }
      case "message.part.removed": {
        const { sessionID, messageID, partID } = ev.properties;
        if (sessionID !== sid) break;
        partsRef.current.get(messageID)?.delete(partID);
        scheduleFlush();
        break;
      }
      case "message.removed": {
        const { sessionID, messageID } = ev.properties;
        if (sessionID !== sid) break;
        infoRef.current.delete(messageID);
        partsRef.current.delete(messageID);
        scheduleFlush();
        break;
      }
      case "session.status": {
        if (ev.properties.sessionID !== sid) break;
        const isBusy = ev.properties.status.type === "busy";
        setBusy(isBusy);
        if (!isBusy) setStale(false);
        break;
      }
      case "session.idle": {
        if (ev.properties.sessionID !== sid) break;
        setBusy(false);
        setStale(false);
        break;
      }
      case "permission.updated": {
        const perm = ev.properties;
        if (perm.sessionID !== sid) break;
        setPendingPermission(perm);
        break;
      }
      case "permission.replied": {
        setPendingPermission(null);
        break;
      }
      case "session.error": {
        const err = ev.properties.error;
        setBusy(false);
        if (err && "message" in err.data) setError(String(err.data.message));
        break;
      }
      default:
        break;
    }
  };

  const send = async (text: string, model?: SearchModel) => {
    const sid = sessionIdRef.current;
    if (!sid || busy) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    setStale(false);
    setError(null);
    lastActivityAtRef.current = Date.now();
    try {
      const res = await opencode.session.promptAsync({
        path: { id: sid },
        body: {
          parts: [
            {
              type: "text",
              text: trimmed,
            },
          ],
          ...(model
            ? {
                model: {
                  providerID: model.providerID,
                  modelID: model.modelID,
                },
                ...(model.variant ? { variant: model.variant } : {}),
              }
            : {}),
        },
      });
      if (res.error) throw res.error;
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "failed to send");
    }
  };

  const abort = async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    await opencode.session.abort({ path: { id: sid } });
    setBusy(false);
    setStale(false);
  };

  // "Keep waiting": suppress the stale warning for SNOOZE_MS without touching
  // the chat. The session keeps running; real events still clear stale.
  const snooze = () => {
    snoozeUntilRef.current = Date.now() + SNOOZE_MS;
    setStale(false);
  };

  const respondPermission = async (
    permissionID: string,
    response: "once" | "always" | "reject",
  ) => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    await opencode.postSessionIdPermissionsPermissionId({
      path: { id: sid, permissionID },
      body: { response },
    });
    setPendingPermission(null);
  };

  const selectThread = async (id: string) => {
    if (id === sessionIdRef.current) return;
    setMessages([]);
    infoRef.current = new Map();
    partsRef.current = new Map();
    sessionIdRef.current = id;
    localStorage.setItem(SESSION_KEY, id);
    setBusy(false);
    setStale(false);
    setError(null);
    setPendingPermission(null);
    setSessionId(id);
    // Reflect the target thread's real status (e.g. resumed from a reload).
    try {
      const st = await opencode.session.status();
      if (!st.error && st.data) {
        const status = st.data[id];
        if (status) {
          setBusy(status.type === "busy");
          if (status.type === "busy") lastActivityAtRef.current = Date.now();
        }
      }
    } catch {
      /* status is best-effort */
    }
  };

  const newThread = async () => {
    try {
      const created = await opencode.session.create({
        body: { title: "chat" },
      });
      if (created.error) throw created.error;
      const sid = created.data?.id;
      if (!sid) throw new Error("server returned no session id");
      addThreadId(sid);
      setMessages([]);
      infoRef.current = new Map();
      partsRef.current = new Map();
      sessionIdRef.current = sid;
      localStorage.setItem(SESSION_KEY, sid);
      setBusy(false);
      setStale(false);
      setError(null);
      setPendingPermission(null);
      setSessionId(sid);
      void refreshThreads();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to start a thread");
    }
  };

  const deleteThread = async (id: string) => {
    try {
      await opencode.session.delete({ path: { id } });
    } catch {
      /* deletion is best-effort; prune locally regardless */
    }
    writeThreadIds(readThreadIds().filter((x) => x !== id));
    const titles = readTitles();
    if (titles[id]) {
      delete titles[id];
      writeTitles(titles);
    }
    if (sessionIdRef.current === id) {
      const next = threads.find((t) => t.id !== id);
      if (next) {
        await selectThread(next.id);
      } else {
        await newThread();
      }
    }
    void refreshThreads();
  };

  return {
    sessionId,
    messages,
    threads,
    busy,
    stale,
    pendingPermission,
    error,
    send,
    abort,
    snooze,
    respondPermission,
    selectThread,
    newThread,
    deleteThread,
  };
}
