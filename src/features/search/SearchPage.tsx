import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  ExternalLink,
  FileText,
  Globe,
  Plus,
  RotateCcw,
  Send,
  Square,
  Trash2,
} from "lucide-react";
import type { Part, Permission } from "@opencode-ai/sdk/client";
import { opencode } from "@/lib/opencode-client";
import { useSearchChat } from "@/lib/use-chat-stream";
import type { ThreadInfo } from "@/lib/use-chat-stream";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/cn";
import { fmtRelative } from "@/lib/format";
import { useSidebarSlot } from "@/lib/sidebar-slot";
import { Markdown } from "@/features/search/Markdown";
import {
  prepareReportHtml,
  reportBlob,
  reportFileName,
  splitReport,
} from "@/features/search/report";

interface ProviderOption {
  providerID: string;
  name: string;
  modelID: string;
}

// Prefer DeepSeek V4 Flash on the default provider over its configured default.
const DEFAULT_SEARCH_MODEL = {
  providerID: "opencode-go",
  modelID: "deepseek-v4-flash",
};

interface Source {
  url: string;
}

function extractSources(parts: Part[]): Source[] {
  const out: Source[] = [];
  for (const p of parts) {
    if (p.type !== "tool") continue;
    if (p.tool !== "webfetch" && p.tool !== "websearch") continue;
    if (p.state.status !== "completed") continue;
    const url = (p.state.input as { url?: string }).url;
    if (url) out.push({ url });
  }
  return out;
}

function extractText(parts: Part[]): string {
  return parts
    .filter((p): p is Extract<Part, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function SourceChips({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;
  const seen = new Set<string>();
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      <Globe className="size-3 text-accent" aria-hidden />
      {sources.map((s) => {
        if (seen.has(s.url)) return null;
        seen.add(s.url);
        return (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] tracking-tight text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
          >
            {hostOf(s.url)}
          </a>
        );
      })}
    </div>
  );
}

function ReportCard({ html, title }: { html: string; title: string }) {
  const prepared = useMemo(() => prepareReportHtml(html), [html]);

  const download = () => {
    const url = URL.createObjectURL(reportBlob(prepared));
    const a = document.createElement("a");
    a.href = url;
    a.download = reportFileName(title);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const openInTab = () => {
    const url = URL.createObjectURL(reportBlob(prepared));
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <div className="card-surface mt-3 overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <FileText className="size-4 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-accent">
              deep research report
            </div>
            <div className="truncate text-[13px] font-medium tracking-tight text-foreground">
              {title}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={openInTab}
            title="Open the report in a new tab"
            className="inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
          >
            <ExternalLink className="size-3" />
            open
          </button>
          <button
            type="button"
            onClick={download}
            title="Download the report as an HTML file"
            className="inline-flex items-center gap-1.5 rounded bg-accent px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-accent-foreground transition-all hover:brightness-110"
          >
            <Download className="size-3" />
            download
          </button>
        </div>
      </div>
      <iframe
        title={`Deep research report: ${title}`}
        sandbox="allow-scripts allow-popups"
        srcDoc={prepared}
        className="h-[70vh] w-full bg-white"
      />
    </div>
  );
}

function PermissionPrompt({
  permission,
  onRespond,
}: {
  permission: Permission;
  onRespond: (
    permissionID: string,
    response: "once" | "always" | "reject",
  ) => void;
}) {
  return (
    <div className="card-surface mb-4 p-4">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-accent">
        permission required
      </div>
      <p className="mb-3 text-[13px] leading-relaxed text-foreground">
        {permission.title}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onRespond(permission.id, "once")}
          className="rounded border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] uppercase tracking-wider text-foreground transition-colors hover:bg-accent/20"
        >
          allow once
        </button>
        <button
          type="button"
          onClick={() => onRespond(permission.id, "always")}
          className="rounded border border-border bg-muted px-3 py-1 text-[11px] uppercase tracking-wider text-foreground transition-colors hover:bg-muted/70"
        >
          always allow
        </button>
        <button
          type="button"
          onClick={() => onRespond(permission.id, "reject")}
          className="rounded border border-negative/30 bg-negative/10 px-3 py-1 text-[11px] uppercase tracking-wider text-negative transition-colors hover:bg-negative/20"
        >
          deny
        </button>
      </div>
    </div>
  );
}

function ThreadSidebar({
  threads,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: {
  threads: ThreadInfo[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          threads
        </span>
        <button
          type="button"
          onClick={onNew}
          title="Start a new thread"
          aria-label="Start a new thread"
          className="rounded p-1 text-accent transition-colors hover:bg-accent/10"
        >
          <Plus className="size-4" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {threads.length === 0 ? (
          <p className="px-1 text-[12px] text-muted-foreground/70">
            no previous threads
          </p>
        ) : (
          threads.map((t) => {
            const active = t.id === activeId;
            return (
              <div
                key={t.id}
                className={cn(
                  "group flex items-center gap-1 rounded border px-2 py-1.5 transition-colors",
                  active
                    ? "border-accent/40 bg-accent/10"
                    : "border-transparent hover:bg-muted/60",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(t.id)}
                  aria-current={active ? "true" : undefined}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-[12px] tracking-tight text-foreground">
                    {t.title}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {fmtRelative(t.updated)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(t.id)}
                  title="Delete thread"
                  aria-label={`Delete thread ${t.title}`}
                  className="rounded p-1 text-muted-foreground opacity-0 transition-all hover:text-negative group-hover:opacity-100"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function SearchPage() {
  const chat = useSearchChat();
  const sidebarSlot = useSidebarSlot();
  const [query, setQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const providers = useQuery(async () => {
    const res = await opencode.config.providers();
    if (res.error) throw new Error("cannot reach the opencode server");
    return res.data;
  }, []);

  const options: ProviderOption[] = (providers.data?.providers ?? [])
    .map((p) => {
      const modelID =
        p.id === DEFAULT_SEARCH_MODEL.providerID &&
        p.models?.[DEFAULT_SEARCH_MODEL.modelID]
          ? DEFAULT_SEARCH_MODEL.modelID
          : (providers.data?.default[p.id] ?? "");
      return { providerID: p.id, name: p.name, modelID };
    })
    .filter((o) => o.modelID);

  const active =
    options.find((o) => o.providerID === selectedProvider) ?? options[0];
  const model = active
    ? { providerID: active.providerID, modelID: active.modelID }
    : undefined;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || chat.busy) return;
    void chat.send(query, model);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) form.requestSubmit();
    }
  };

  const onNewThread = () => {
    void chat.newThread();
  };

  return (
    <>
      {sidebarSlot &&
        createPortal(
          <ThreadSidebar
            threads={chat.threads}
            activeId={chat.sessionId}
            onSelect={(id) => void chat.selectThread(id)}
            onNew={onNewThread}
            onDelete={(id) => void chat.deleteThread(id)}
          />,
          sidebarSlot,
        )}
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
        <header className="mb-8 animate-rise">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
            deep research · live agent
          </p>
          <h1 className="flex flex-wrap items-baseline gap-x-3 text-3xl tracking-tight md:text-4xl">
            <span className="font-semibold text-foreground">deep research</span>
            <span className="ml-1 inline-block h-5 w-2.5 animate-blink bg-accent align-middle shadow-glow md:h-6" />
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Give a topic or question — opencode plans the research, runs{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] text-foreground">
              websearch
            </code>{" "}
            +{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] text-foreground">
              webfetch
            </code>{" "}
            across many sources, then compiles a standalone HTML report you can
            preview and download. Each thread keeps its own context.
          </p>
        </header>

        {providers.error || (chat.error && !chat.sessionId) ? (
          <div className="card-surface mb-4 p-4">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-negative">
              opencode server offline
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Start the dev stack with{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] text-foreground">
                pnpm dev
              </code>{" "}
              (runs{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] text-foreground">
                opencode serve
              </code>{" "}
              on :4096) or{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] text-foreground">
                opencode serve --port 4096
              </code>{" "}
              in a separate terminal.
            </p>
          </div>
        ) : null}

        {chat.error && chat.sessionId ? (
          <div className="card-surface mb-4 p-4 text-[13px] text-negative">
            {chat.error}
          </div>
        ) : null}

        {chat.pendingPermission ? (
          <PermissionPrompt
            permission={chat.pendingPermission}
            onRespond={chat.respondPermission}
          />
        ) : null}

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {options.map((o) => (
            <button
              key={o.providerID}
              type="button"
              aria-pressed={active?.providerID === o.providerID}
              onClick={() => setSelectedProvider(o.providerID)}
              className={cn(
                "rounded border px-3 py-1.5 text-[12px] tracking-tight transition-colors",
                active?.providerID === o.providerID
                  ? "border-accent/60 bg-accent/10 text-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
              )}
            >
              {o.name}
              <span className="ml-2 text-[10px] text-muted-foreground/70">
                {o.modelID}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={onNewThread}
            title="Start a fresh thread"
            className="ml-auto inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            new thread
          </button>
        </div>

        <main className="space-y-4">
          {chat.messages.length === 0 && !chat.busy ? (
            <div className="card-surface p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Start a research task — e.g.{" "}
                <span className="text-foreground">
                  "what's new in the latest iPhone?"
                </span>
              </p>
            </div>
          ) : null}

          {chat.messages.map((m) => {
            const isUser = m.info.role === "user";
            if (isUser) {
              return (
                <div key={m.info.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg border border-border bg-muted/40 px-4 py-2 text-[13px] leading-relaxed text-foreground">
                    {extractText(m.parts) || "…"}
                  </div>
                </div>
              );
            }
            const sources = extractSources(m.parts);
            const { report, text } = splitReport(extractText(m.parts));
            return (
              <div key={m.info.id} className="card-surface p-5">
                <SourceChips sources={sources} />
                {text ? (
                  <Markdown text={text} />
                ) : report ? null : (
                  <p className="animate-pulse text-[13px] text-muted-foreground">
                    researching…
                  </p>
                )}
                {report ? (
                  <ReportCard
                    html={report}
                    title={
                      chat.threads.find((t) => t.id === chat.sessionId)
                        ?.title ?? "deep research report"
                    }
                  />
                ) : null}
              </div>
            );
          })}

          {chat.busy && (
            <div className="flex items-center gap-2 px-1 text-[12px] text-muted-foreground">
              <span className="inline-block size-1.5 animate-pulse rounded-full bg-accent shadow-glow" />
              running…
            </div>
          )}
        </main>

        <form
          onSubmit={onSubmit}
          className="card-surface sticky bottom-4 mt-6 p-3"
        >
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            disabled={chat.busy}
            placeholder={
              chat.busy ? "working…" : "describe a topic to research…"
            }
            className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-60"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] tracking-tight text-muted-foreground/70">
              enter to research · shift+enter for newline
            </span>
            {chat.busy ? (
              <button
                type="button"
                onClick={() => void chat.abort()}
                className="inline-flex items-center gap-1.5 rounded border border-negative/30 bg-negative/10 px-3 py-1.5 text-[11px] uppercase tracking-wider text-negative transition-colors hover:bg-negative/20"
              >
                <Square className="size-3" fill="currentColor" />
                stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!query.trim() || !active}
                className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-accent-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="size-3" />
                research
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
