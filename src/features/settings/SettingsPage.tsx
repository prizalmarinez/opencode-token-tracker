import { useState } from "react";
import {
  ArrowLeft,
  Database,
  Eye,
  EyeOff,
  PanelLeft,
  PanelTop,
  Palette,
} from "lucide-react";
import { DbPathSettings } from "@/features/settings/DbPathSettings";
import { THEMES, useTheme } from "@/features/settings/theme";
import { LAYOUTS, useLayout } from "@/features/settings/layout";
import { API_BASE, getStatus } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/cn";
import { fmtBytes } from "@/lib/format";
import { navigate } from "@/lib/navigate";

const LAYOUT_ICON: Record<"PanelTop" | "PanelLeft", typeof PanelTop> = {
  PanelTop,
  PanelLeft,
};

function sectionDelay(i: number) {
  return { animationDelay: `${0.06 * i}s` };
}

export function SettingsPage({
  value,
  onChange,
  refreshKey,
}: {
  value: string;
  onChange: (path: string) => void;
  refreshKey: number;
}) {
  const { theme, setTheme } = useTheme();
  const { layout, setLayout } = useLayout();
  const [blurred, setBlurred] = useState(true);
  const {
    data: status,
    error,
    loading,
  } = useQuery(() => getStatus(value), [value, refreshKey]);

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
          configuration · read-only
        </p>
        <h1 className="flex flex-wrap items-baseline gap-x-3 text-3xl tracking-tight md:text-4xl">
          <span className="font-semibold text-foreground">settings</span>
          <span className="ml-1 inline-block h-5 w-2.5 animate-blink bg-accent align-middle shadow-glow md:h-6" />
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Point the API at any local{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] text-foreground">
            opencode.db
          </code>{" "}
          — all queries are read-only, nothing is written or uploaded.
        </p>
      </header>

      <section className="animate-rise" style={sectionDelay(1)}>
        <DbPathSettings
          value={value}
          onChange={onChange}
          status={status}
          error={error}
          loading={loading}
        />
      </section>

      <section
        className="card-surface mt-4 animate-rise p-4"
        style={sectionDelay(2)}
      >
        <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <Database className="size-3.5 text-accent" />
          connection
        </div>
        <dl className="grid gap-x-6 gap-y-3 text-[12px] sm:grid-cols-2">
          <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2">
            <dt className="text-muted-foreground">api endpoint</dt>
            <dd className="font-medium text-foreground">
              {API_BASE.replace(/^https?:\/\//, "")}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2">
            <dt className="text-muted-foreground">status</dt>
            <dd className="font-medium text-foreground">
              {loading ? (
                <span className="animate-pulse text-muted-foreground">
                  scanning…
                </span>
              ) : status?.ok ? (
                <span className="text-positive">connected</span>
              ) : (
                <span className="text-negative">offline</span>
              )}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2">
            <dt className="text-muted-foreground">resolved path</dt>
            <dd className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  "truncate font-medium text-foreground",
                  blurred && "select-none blur-[6px]",
                )}
                title={status?.dbPath}
              >
                {status?.dbPath ?? "—"}
              </span>
              <button
                type="button"
                onClick={() => setBlurred((v) => !v)}
                aria-pressed={!blurred}
                title={blurred ? "Reveal path" : "Blur path"}
                className="shrink-0 text-muted-foreground/60 transition-colors hover:text-foreground"
              >
                {blurred ? (
                  <Eye className="size-3.5" />
                ) : (
                  <EyeOff className="size-3.5" />
                )}
              </button>
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2">
            <dt className="text-muted-foreground">database size</dt>
            <dd className="font-medium text-foreground">
              {status?.dbSize != null ? fmtBytes(status.dbSize) : "—"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2">
            <dt className="text-muted-foreground">sessions in range</dt>
            <dd className="font-medium text-foreground">
              {status?.ok && status.sessionCount !== null
                ? status.sessionCount.toLocaleString()
                : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section
        className="card-surface mt-4 animate-rise p-4"
        style={sectionDelay(3)}
      >
        <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <span className="inline-block size-1.5 rounded-full bg-accent shadow-glow" />
          path resolution
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-[12px] leading-relaxed text-muted-foreground">
          <li>
            <span className="text-foreground">Path in the field</span> — sent
            per request, takes precedence over everything else.
          </li>
          <li>
            <span className="text-foreground">OPENCODE_DB</span> — environment
            variable read by the API server at request time.
          </li>
          <li>
            <span className="text-foreground">Server default</span> —{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground">
              ~/.local/share/opencode/opencode.db
            </code>
          </li>
        </ol>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground/70">
          Leave the field blank to fall back to the server default. The{" "}
          <span className="text-foreground">resolved</span> path reflects which
          database was actually read.
        </p>
      </section>

      <section
        className="card-surface mt-4 animate-rise p-4"
        style={sectionDelay(4)}
      >
        <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <Palette className="size-3.5 text-accent" />
          color theme
        </div>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={theme === t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                "flex items-center gap-2 rounded border px-3 py-1.5 text-[12px] tracking-tight transition-colors",
                theme === t.id
                  ? "border-accent/60 bg-accent/10 text-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
              )}
            >
              <span
                className="size-2.5 rounded-full"
                style={{
                  background: t.swatch,
                  boxShadow:
                    theme === t.id ? `0 0 10px -1px ${t.swatch}` : undefined,
                }}
              />
              {t.name}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground/70">
          Applies instantly and is stored in your browser.{" "}
          <span className="text-foreground">ember</span> is the default.
        </p>
      </section>

      <section
        className="card-surface mt-4 animate-rise p-4"
        style={sectionDelay(5)}
      >
        <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <PanelLeft className="size-3.5 text-accent" />
          navigation
        </div>
        <div className="flex flex-wrap gap-2">
          {LAYOUTS.map((l) => {
            const Icon = LAYOUT_ICON[l.icon];
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={layout === l.id}
                onClick={() => setLayout(l.id)}
                className={cn(
                  "flex items-center gap-2 rounded border px-3 py-1.5 text-[12px] tracking-tight transition-colors",
                  layout === l.id
                    ? "border-accent/60 bg-accent/10 text-foreground"
                    : "border-border bg-surface text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {l.name}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground/70">
          Applies instantly and is stored in your browser.{" "}
          <span className="text-foreground">header</span> is the default. On
          narrow screens the header is always used.
        </p>
      </section>
    </div>
  );
}
