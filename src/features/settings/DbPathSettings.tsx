import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ServerStatus } from "@/types";

export function DbPathSettings({
  value,
  onChange,
  status,
  error,
  loading,
}: {
  value: string;
  onChange: (path: string) => void;
  status: ServerStatus | null;
  error: string | null;
  loading: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [blurred, setBlurred] = useState(true);

  const resolved = status?.dbPath;
  const sessions = status?.ok ? status.sessionCount : null;

  return (
    <div className="rounded-lg border border-border bg-surface/75 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        <span className="inline-block size-1.5 rounded-full bg-accent shadow-glow" />
        database source
        <span className="ml-auto flex items-center gap-1.5 text-muted-foreground/60">
          {loading ? (
            <>
              <span className="inline-block size-1.5 animate-pulse rounded-full bg-muted-foreground" />
              reading…
            </>
          ) : status?.ok ? (
            <>
              <span className="inline-block size-1.5 rounded-full bg-positive" />
              connected
            </>
          ) : (
            <>
              <span className="inline-block size-1.5 rounded-full bg-negative" />
              offline
            </>
          )}
        </span>
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onChange(draft);
        }}
      >
        <span className="text-sm text-accent">db://</span>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="~/.local/share/opencode/opencode.db"
          className="min-w-64 flex-1 font-mono text-[13px]"
          spellCheck={false}
          autoComplete="off"
        />
        <Button
          type="submit"
          variant={
            draft.trim() && draft.trim() !== value ? "accent" : "outline"
          }
          disabled={loading}
        >
          {loading ? "Scanning…" : "Apply path"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Reset to server default"
          disabled={!draft.trim()}
          onClick={() => {
            setDraft("");
            onChange("");
          }}
        >
          <RotateCcw />
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-relaxed text-muted-foreground">
        <span className="text-muted-foreground/60">resolved › </span>
        <span
          className={cn(
            "font-medium",
            status?.ok ? "text-foreground" : "text-negative",
            blurred && "select-none blur-[6px]",
          )}
        >
          {resolved ?? "—"}
        </span>
        <button
          type="button"
          onClick={() => setBlurred((v) => !v)}
          aria-pressed={!blurred}
          title={blurred ? "Reveal path" : "Blur path"}
          className="inline-flex items-center text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          {blurred ? (
            <Eye className="size-3.5" />
          ) : (
            <EyeOff className="size-3.5" />
          )}
        </button>
        {sessions !== null && (
          <span className="ml-2 text-muted-foreground/60">
            ({sessions} sessions in range)
          </span>
        )}
        {!value.trim() && (
          <span className="ml-2 text-muted-foreground/50">
            — leave blank to use server default
          </span>
        )}
        {error && <span className="mt-1 block text-negative">✕ {error}</span>}
      </div>
    </div>
  );
}
