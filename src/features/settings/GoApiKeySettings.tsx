import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Gauge } from "lucide-react";

/*
 * OpenCode Go API key field. The key is stored in the browser (localStorage),
 * sent to the local API server as X-OpenCode-Go-Key, and used only to query
 * the official /zen/go/v1/usage endpoint — it never crosses the network in a
 * URL and never leaves localhost. Leave blank to use OPENCODE_GO_API_KEY.
 */
export function GoApiKeySettings({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [revealed, setRevealed] = useState(false);
  const dirty = draft.trim() !== value;

  return (
    <div className="card-surface p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        <Gauge className="size-3.5 text-accent" />
        opencode go plan
        <span
          className={
            value.trim()
              ? "ml-auto flex items-center gap-1.5 text-positive"
              : "ml-auto flex items-center gap-1.5 text-muted-foreground/60"
          }
        >
          <span
            className={
              value.trim()
                ? "inline-block size-1.5 rounded-full bg-positive"
                : "inline-block size-1.5 rounded-full bg-muted-foreground/40"
            }
          />
          {value.trim() ? "key set" : "no key"}
        </span>
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onChange(draft.trim());
        }}
      >
        <span className="text-sm text-accent">go://</span>
        <Input
          type={revealed ? "text" : "password"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="sk-… (opencode.ai console → API key)"
          className="min-w-64 flex-1 font-mono text-[13px]"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-pressed={revealed}
          title={revealed ? "Hide key" : "Reveal key"}
          className="shrink-0 rounded border border-border bg-surface px-2 py-1.5 text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          {revealed ? (
            <EyeOff className="size-3.5" />
          ) : (
            <Eye className="size-3.5" />
          )}
        </button>
        <Button
          type="submit"
          variant={dirty ? "accent" : "outline"}
          disabled={!dirty}
        >
          Save key
        </Button>
      </form>

      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground/70">
        Powers the <span className="text-foreground">go plan</span> cards on the
        usage page — rolling 5h / weekly / monthly windows straight from{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground">
          opencode.ai/zen/go/v1/usage
        </code>
        . Stored only in your browser; leave blank to use the{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground">
          OPENCODE_GO_API_KEY
        </code>{" "}
        env var.
      </p>
    </div>
  );
}
