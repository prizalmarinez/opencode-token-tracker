import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import type { Part, Permission } from "@opencode-ai/sdk/client";
import { opencode } from "@/lib/opencode-client";
import { useSearchChat } from "@/lib/use-chat-stream";
import type { SearchModel, ThreadInfo } from "@/lib/use-chat-stream";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/cn";
import { fmtRelative } from "@/lib/format";
import { useSidebarSlot } from "@/lib/sidebar-slot";
import { DropdownMenu } from "@/components/ui/dropdown";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Markdown } from "@/features/search/Markdown";
interface ModelOption {
  providerID: string;
  modelID: string;
  name: string;
  providerName: string;
}

// Prefer DeepSeek V4 Flash on the default provider over its configured default.
const DEFAULT_CHAT_MODEL = {
  providerID: "opencode-go",
  modelID: "deepseek-v4-flash",
  variant: "medium",
};

function extractText(parts: Part[]): string {
  return parts
    .filter((p): p is Extract<Part, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("\n");
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
  busy,
  stale,
  onSelect,
  onNew,
  onDelete,
}: {
  threads: ThreadInfo[];
  activeId: string | null;
  busy: boolean;
  stale: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <TooltipProvider>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            chats
          </span>
          <button
            type="button"
            onClick={onNew}
            title="Start a new chat"
            aria-label="Start a new chat"
            className="rounded p-1 text-accent transition-colors hover:bg-accent/10"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {threads.length === 0 ? (
            <p className="px-1 text-[12px] text-muted-foreground/70">
              no previous chats
            </p>
          ) : (
            threads.map((t) => {
              const active = t.id === activeId;
              const responding = active && busy;
              const hung = active && stale;
              return (
                <div
                  key={t.id}
                  className={cn(
                    "group relative flex items-center gap-1 rounded border px-2 py-1.5 transition-colors",
                    hung
                      ? "snake-border-warning border-warning/50 bg-warning/10"
                      : responding
                        ? "snake-border border-accent/40 bg-accent/10"
                        : active
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block truncate text-[12px] tracking-tight text-foreground">
                          {t.title}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{t.title}</TooltipContent>
                    </Tooltip>
                    <span className="block text-[10px] text-muted-foreground">
                      {fmtRelative(t.updated)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(t.id)}
                    title="Delete chat"
                    aria-label={`Delete chat ${t.title}`}
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
    </TooltipProvider>
  );
}

export function SearchPage() {
  const chat = useSearchChat();
  const sidebarSlot = useSidebarSlot();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchModel | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const providers = useQuery(async () => {
    const res = await opencode.config.providers();
    if (res.error) throw new Error("cannot reach the opencode server");
    return res.data;
  }, []);

  const modelOptions: ModelOption[] = useMemo(() => {
    const out: ModelOption[] = [];
    for (const p of providers.data?.providers ?? []) {
      for (const [modelID, m] of Object.entries(p.models ?? {})) {
        out.push({
          providerID: p.id,
          modelID,
          name: m.name || modelID,
          providerName: p.name,
        });
      }
    }
    return out;
  }, [providers.data]);

  const defaultOption =
    modelOptions.find(
      (o) =>
        o.providerID === DEFAULT_CHAT_MODEL.providerID &&
        o.modelID === DEFAULT_CHAT_MODEL.modelID,
    ) ?? modelOptions[0];

  const active =
    modelOptions.find(
      (o) =>
        o.providerID === selected?.providerID &&
        o.modelID === selected?.modelID,
    ) ?? defaultOption;
  const model: SearchModel | undefined = active
    ? {
        providerID: active.providerID,
        modelID: active.modelID,
        ...(active.providerID === DEFAULT_CHAT_MODEL.providerID &&
        active.modelID === DEFAULT_CHAT_MODEL.modelID
          ? { variant: DEFAULT_CHAT_MODEL.variant }
          : {}),
      }
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
    inputRef.current?.focus();
  };

  return (
    <>
      {sidebarSlot &&
        createPortal(
          <ThreadSidebar
            threads={chat.threads}
            activeId={chat.sessionId}
            busy={chat.busy}
            stale={chat.stale}
            onSelect={(id) => void chat.selectThread(id)}
            onNew={onNewThread}
            onDelete={(id) => void chat.deleteThread(id)}
          />,
          sidebarSlot,
        )}
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
        <header className="mb-8 animate-rise">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
            chat · live agent
          </p>
          <h1 className="flex flex-wrap items-baseline gap-x-3 text-3xl tracking-tight md:text-4xl">
            <span className="font-semibold text-foreground">chat</span>
            <span className="ml-1 inline-block h-5 w-2.5 animate-blink bg-accent align-middle shadow-glow md:h-6" />
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Ask anything and get a direct response from opencode. Each
            conversation keeps its own context, so you can pick up where you
            left off.
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
          <DropdownMenu
            align="start"
            menuClassName="max-h-80 min-w-64 overflow-y-auto"
            trigger={
              <button
                type="button"
                aria-haspopup="listbox"
                className="inline-flex items-center gap-2 rounded border border-border bg-surface px-3 py-1.5 text-[12px] tracking-tight text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:text-foreground"
              >
                <Sparkles className="size-3.5 text-accent" />
                <span className="max-w-56 truncate text-foreground">
                  {active?.name ?? "select model"}
                </span>
                {active && (
                  <span className="shrink-0 text-[10px] text-muted-foreground/70">
                    {active.providerName}
                  </span>
                )}
                <ChevronDown className="size-3.5 shrink-0" />
              </button>
            }
            items={modelOptions.map((o) => ({
              key: `${o.providerID}:${o.modelID}`,
              label: o.name,
              hint: o.providerName,
              onSelect: () =>
                setSelected({ providerID: o.providerID, modelID: o.modelID }),
            }))}
          />
          <button
            type="button"
            onClick={onNewThread}
            title="Start a fresh chat"
            className="ml-auto inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            new chat
          </button>
        </div>

        <main className="space-y-4">
          {chat.messages.length === 0 && !chat.busy ? (
            <div className="card-surface p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Start a conversation — e.g.{" "}
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
            const text = extractText(m.parts);
            return (
              <div key={m.info.id} className="card-surface p-5">
                {text ? (
                  <Markdown text={text} />
                ) : (
                  <p className="animate-pulse text-[13px] text-muted-foreground">
                    thinking…
                  </p>
                )}
              </div>
            );
          })}

          {chat.busy && (
            <div
              className={cn(
                "flex items-center gap-2 px-1 text-[12px]",
                chat.stale ? "text-warning" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "inline-block size-1.5 rounded-full",
                  chat.stale
                    ? "animate-pulse bg-warning shadow-glow"
                    : "animate-pulse bg-accent shadow-glow",
                )}
              />
              {chat.stale ? (
                <>
                  <span>no activity — the session may be stuck</span>
                  <button
                    type="button"
                    onClick={chat.snooze}
                    title="Keep the chat running and suppress this warning for 5 minutes"
                    className="rounded border border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] uppercase tracking-wider text-warning transition-colors hover:bg-warning/20"
                  >
                    keep waiting
                  </button>
                </>
              ) : (
                <span>running…</span>
              )}
            </div>
          )}
        </main>

        <form
          onSubmit={onSubmit}
          className="card-surface sticky bottom-4 mt-6 p-3"
        >
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            disabled={chat.busy}
            placeholder={chat.busy ? "working…" : "Message opencode…"}
            className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-60"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] tracking-tight text-muted-foreground/70">
              enter to send · shift+enter for newline
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
                send
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
