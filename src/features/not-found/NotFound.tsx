import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Route, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { navigate } from "@/lib/navigate";

const ROUTES = [
  { href: "/usage", hint: "tokens · cost · sessions" },
  { href: "/projects", hint: "per-project buckets" },
  { href: "/sessions", hint: "browse · search sessions" },
  { href: "/skills", hint: "skills.sh leaderboard" },
  { href: "/chat", hint: "chat threads" },
  { href: "/models", hint: "openrouter model leaderboard" },
  { href: "/status", hint: "opencode health probe" },
  { href: "/settings", hint: "db path · theme · layout" },
] as const;

function visibleRoutes(
  searchVisible: boolean,
  modelsVisible: boolean,
  skillsVisible: boolean,
) {
  return ROUTES.filter(
    (r) =>
      (r.href !== "/chat" || searchVisible) &&
      (r.href !== "/models" || modelsVisible) &&
      (r.href !== "/skills" || skillsVisible),
  );
}

const TYPE_SPEED = 14;
const CMD_START = 320;

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function truncateMiddle(value: string, max = 42): string {
  if (value.length <= max) return value;
  const head = Math.ceil((max - 1) / 2);
  return `${value.slice(0, head)}…${value.slice(-(max - 1 - head))}`;
}

function useTypewriter(text: string, startMs: number, speedMs: number) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await sleep(startMs);
      for (let i = 1; i <= text.length; i++) {
        if (cancelled) return;
        setCount(i);
        await sleep(speedMs);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [text, startMs, speedMs]);
  return text.slice(0, count);
}

function Cursor({ color }: { color: "accent" | "destructive" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "ml-0.5 inline-block h-3.5 w-2 translate-y-0.5 animate-blink align-baseline",
        color === "accent" ? "bg-accent" : "bg-destructive",
      )}
    />
  );
}

export function NotFound({
  route,
  searchVisible = true,
  modelsVisible = true,
  skillsVisible = true,
}: {
  route: string;
  searchVisible?: boolean;
  modelsVisible?: boolean;
  skillsVisible?: boolean;
}) {
  const routes = visibleRoutes(searchVisible, modelsVisible, skillsVisible);
  const short = truncateMiddle(route);
  const cmd = `open ${short}`;
  const err = `no such route — '${short}' (exit 404)`;
  const cmdDone = CMD_START + cmd.length * TYPE_SPEED;
  const errStart = cmdDone + 200;
  const errDone = errStart + err.length * TYPE_SPEED;
  const hintDelay = errDone + 240;

  const typedCmd = useTypewriter(cmd, CMD_START, TYPE_SPEED);
  const typedErr = useTypewriter(err, errStart, TYPE_SPEED);

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 animate-rise">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
          signal fault · no such route
        </p>
        <h1 className="flex flex-wrap items-baseline gap-x-3 text-3xl tracking-tight md:text-4xl">
          <span className="font-semibold text-foreground">404</span>
          <span className="text-muted-foreground">/ not found</span>
          <span className="ml-1 inline-block h-5 w-2.5 animate-blink bg-destructive align-middle shadow-[0_0_16px_hsl(var(--negative)/0.5)] md:h-6" />
        </h1>
      </header>

      <div className="relative z-10 grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        {/* crashed terminal session */}
        <section className="animate-rise" style={{ animationDelay: "120ms" }}>
          <div className="relative overflow-hidden rounded-lg border border-border bg-black/50 shadow-glow-lg">
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3.5 py-2.5">
              <span className="size-2.5 rounded-full bg-destructive/80" />
              <span className="size-2.5 rounded-full bg-foreground/25" />
              <span className="size-2.5 rounded-full bg-positive/70" />
              <span className="ml-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <Terminal className="size-3" />
                oct@tracker — /bin/bash
              </span>
            </div>

            <div className="space-y-3.5 px-5 py-5 font-mono text-[13px] leading-relaxed">
              <p className="flex flex-wrap gap-2">
                <span className="shrink-0 text-accent">oct@tracker:~$</span>
                <span className="text-foreground">
                  {typedCmd}
                  {typedCmd.length < cmd.length && <Cursor color="accent" />}
                </span>
              </p>

              <p className="flex flex-wrap gap-2 text-destructive">
                <span className="shrink-0 font-medium">fatal:</span>
                <span className="break-all">
                  {typedErr}
                  {typedErr.length < err.length && (
                    <Cursor color="destructive" />
                  )}
                </span>
              </p>

              <p
                className="flex animate-rise flex-wrap gap-2"
                style={{ animationDelay: `${hintDelay}ms` }}
              >
                <span className="shrink-0 text-accent">hint:</span>
                <span className="text-muted-foreground">
                  valid routes —{" "}
                  {routes.map((r, i) => (
                    <button
                      key={r.href}
                      type="button"
                      onClick={() => navigate(r.href)}
                      className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
                    >
                      {r.href}
                      {i < routes.length - 1 && (
                        <span className="text-muted-foreground">,</span>
                      )}
                    </button>
                  ))}
                </span>
              </p>

              <p
                className="flex animate-rise items-center gap-2"
                style={{ animationDelay: `${hintDelay + 220}ms` }}
              >
                <span className="shrink-0 text-accent">oct@tracker:~$</span>
                <span className="inline-block h-4 w-2.5 animate-blink bg-accent shadow-glow" />
              </p>
            </div>

            {/* CRT refresh sweep */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 h-1/3 animate-sweep bg-gradient-to-b from-transparent via-accent/[0.06] to-transparent"
            />
          </div>
        </section>

        {/* route table */}
        <section className="animate-rise" style={{ animationDelay: "280ms" }}>
          <div className="flex h-full flex-col rounded-lg border border-border bg-surface/75 p-5 backdrop-blur-sm">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <Route className="size-3.5" />
              route table
            </div>
            <div className="flex flex-1 flex-col">
              {routes.map((r) => (
                <button
                  key={r.href}
                  type="button"
                  onClick={() => navigate(r.href)}
                  className="group flex w-full items-center gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <span className="font-mono text-[13px] text-accent group-hover:[text-shadow:0_0_10px_hsl(var(--accent)/0.5)]">
                    {r.href}
                  </span>
                  <span className="truncate text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                    {r.hint}
                  </span>
                  <ArrowRight className="ml-auto size-3.5 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-accent" />
                </button>
              ))}
            </div>
            <Button
              variant="accent"
              size="lg"
              className="mt-4 w-full"
              onClick={() => navigate("/usage")}
            >
              <ArrowLeft className="size-4" />
              back to usage
            </Button>
          </div>
        </section>
      </div>

      <p
        className="relative z-10 mt-8 flex animate-rise flex-wrap items-center gap-3 text-[11px] text-muted-foreground"
        style={{ animationDelay: `${hintDelay + 460}ms` }}
      >
        <span className="inline-block size-1.5 rounded-full bg-negative/80" />
        lost packet — re-route from the table above
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          exit code <span className="num text-destructive">404</span>
        </span>
      </p>
    </div>
  );
}
