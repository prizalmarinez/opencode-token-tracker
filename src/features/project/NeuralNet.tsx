import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import type { OpencodeSession } from "@/types";
import { chartColor } from "@/features/usage/chart-colors";
import { fmtCost, fmtDate } from "@/lib/format";

type TooltipState = {
  x: number;
  y: number;
  title: string;
  sub: string;
};

const MAX_SHOWN = 80;
const VIEW_W = 960;

function seedOf(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function NeuralNet({
  sessions,
  project,
}: {
  sessions: OpencodeSession[];
  project: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tickerRef = useRef<(() => void) | null>(null);
  const scaleTweensRef = useRef<gsap.core.Tween[]>([]);
  const resumeDelayRef = useRef<gsap.core.Tween | null>(null);

  const pauseNodes = () => {
    if (resumeDelayRef.current) {
      resumeDelayRef.current.kill();
      resumeDelayRef.current = null;
    }
    const u = tickerRef.current;
    if (u) gsap.ticker.remove(u);
    scaleTweensRef.current.forEach((t) => t.pause());
  };
  const playNodes = () => {
    resumeDelayRef.current = gsap.delayedCall(2, () => {
      resumeDelayRef.current = null;
      const u = tickerRef.current;
      if (u) gsap.ticker.add(u);
      scaleTweensRef.current.forEach((t) => t.play());
    });
  };

  const layout = useMemo(() => {
    const shown = sessions.slice(0, MAX_SHOWN);
    if (shown.length === 0) return null;

    const H = Math.min(620, Math.max(340, shown.length * 9 + 160));
    const cx = VIEW_W / 2;
    const cy = H / 2;
    const R = Math.max(120, Math.min(cy - 36, 250));

    const maxCost = Math.max(...shown.map((s) => s.cost), 0.001);

    const groups = new Map<string, OpencodeSession[]>();
    for (const s of shown) {
      const list = groups.get(s.modelId) ?? [];
      list.push(s);
      groups.set(s.modelId, list);
    }
    const modelList = [...groups.entries()].sort(
      (a, b) => b[1].length - a[1].length,
    );
    const colorOf = new Map(
      modelList.map(([id], i) => [id, chartColor(i)] as const),
    );

    const total = shown.length;
    let angleCursor = -Math.PI / 2;
    const nodes: {
      session: OpencodeSession;
      x: number;
      y: number;
      r: number;
      color: string;
    }[] = [];
    const bands: {
      id: string;
      mid: number;
      count: number;
    }[] = [];

    for (const [id, list] of modelList) {
      const width = (list.length / total) * Math.PI * 2;
      const mid = angleCursor + width / 2;
      bands.push({ id, mid, count: list.length });
      list.forEach((s, i) => {
        const t = list.length === 1 ? 0.5 : i / (list.length - 1);
        const seed = seedOf(s.id);
        const angle = angleCursor + width * (t + (rand(seed) - 0.5) * 0.14);
        const radius = R * (0.42 + 0.45 * t + (rand(seed + 1) - 0.5) * 0.16);
        nodes.push({
          session: s,
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
          r: 2.5 + 2.6 * Math.sqrt(s.cost / maxCost),
          color: colorOf.get(id) ?? "hsl(var(--accent))",
        });
      });
      angleCursor += width;
    }

    return { H, cx, cy, R, nodes, modelList, bands, colorOf, maxCost };
  }, [sessions]);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const svg = svgRef.current;
    if (!svg || !layout) return;
    const { cx, cy, nodes } = layout;

    const dots = Array.from(
      svg.querySelectorAll<SVGCircleElement>("circle[data-dot]"),
    );
    const spokes = Array.from(
      svg.querySelectorAll<SVGLineElement>("line[data-spoke]"),
    );
    const hubDot = svg.querySelector<SVGCircleElement>("circle[data-hubdot]");
    const hubRing = svg.querySelector<SVGCircleElement>("circle[data-hubring]");
    const hubText = svg.querySelector<SVGTextElement>("text[data-hubtext]");
    if (dots.length === 0 || !hubDot || !hubRing || !hubText) return;

    const TAU = Math.PI * 2;
    const params = nodes.map((n) => {
      const s = seedOf(n.session.id);
      return {
        ax: 10 + rand(s + 7) * 14,
        ay: 10 + rand(s + 13) * 14,
        fx: TAU / (2 + rand(s + 17) * 2.2),
        fy: TAU / (2.6 + rand(s + 29) * 2.4),
        px: rand(s + 51) * TAU,
        py: rand(s + 53) * TAU,
      };
    });
    const hub = {
      ax: 8 + rand(3) * 12,
      ay: 8 + rand(9) * 12,
      fx: TAU / 2.8,
      fy: TAU / 3.4,
    };
    const t0 = gsap.ticker.time;
    const update = () => {
      const t = gsap.ticker.time - t0;
      const hx = hub.ax * Math.sin(hub.fx * t);
      const hy = hub.ay * Math.sin(hub.fy * t);
      const hcx = cx + hx;
      const hcy = cy + hy;
      hubDot.setAttribute("cx", String(hcx));
      hubDot.setAttribute("cy", String(hcy));
      hubRing.setAttribute("cx", String(hcx));
      hubRing.setAttribute("cy", String(hcy));
      hubText.setAttribute("x", String(hcx));
      hubText.setAttribute("y", String(hcy + 26));
      nodes.forEach((n, i) => {
        const p = params[i];
        const nx = n.x + p.ax * Math.sin(p.fx * t + p.px);
        const ny = n.y + p.ay * Math.sin(p.fy * t + p.py);
        const dot = dots[i];
        const line = spokes[i];
        dot.setAttribute("cx", String(nx));
        dot.setAttribute("cy", String(ny));
        line.setAttribute("x1", String(hcx));
        line.setAttribute("y1", String(hcy));
        line.setAttribute("x2", String(nx));
        line.setAttribute("y2", String(ny));
      });
    };

    const scaleTweens: gsap.core.Tween[] = [];
    const groups = Array.from(
      svg.querySelectorAll<SVGGElement>("g[data-node]"),
    );
    groups.forEach((g, i) => {
      const node = nodes[i];
      const s = seedOf(node.session.id);
      scaleTweens.push(
        gsap.to(g, {
          scale: 1 + 0.08 * rand(s + 37),
          svgOrigin: `${node.x} ${node.y}`,
          duration: 1.8 + rand(s + 41) * 2,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        }),
      );
    });

    tickerRef.current = update;
    scaleTweensRef.current = scaleTweens;
    gsap.ticker.add(update);
    update();

    return () => {
      if (resumeDelayRef.current) {
        resumeDelayRef.current.kill();
        resumeDelayRef.current = null;
      }
      gsap.ticker.remove(update);
      tickerRef.current = null;
      scaleTweens.forEach((t) => t.kill());
      scaleTweensRef.current = [];
    };
  }, [layout]);

  if (!layout) return null;

  const { H, cx, cy, nodes, modelList, bands, colorOf } = layout;

  const edgeActive = (sessionId: string, modelId: string) =>
    hover === `s:${sessionId}` || hover === `m:${modelId}`;

  const syncPos = (e: React.MouseEvent) => {
    const rect = (
      e.currentTarget as SVGElement
    ).ownerSVGElement?.getBoundingClientRect();
    if (!rect) return;
    setTooltip((t) =>
      t ? { ...t, x: e.clientX - rect.left, y: e.clientY - rect.top } : t,
    );
  };

  const textAnchor = (a: number) =>
    Math.cos(a) > 0.35 ? "start" : Math.cos(a) < -0.35 ? "end" : "middle";

  return (
    <div
      className="relative"
      onMouseLeave={() => {
        setHover(null);
        setTooltip(null);
      }}
    >
      <div className="overflow-hidden rounded-lg border border-border/60">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${H}`}
          width="100%"
          className="block"
          role="img"
          aria-label="Neural net of sessions around the project"
        >
          <defs>
            <radialGradient id="netbg" cx="50%" cy="50%" r="62%">
              <stop
                offset="0%"
                stopColor="hsl(var(--accent))"
                stopOpacity="0.12"
              />
              <stop
                offset="100%"
                stopColor="hsl(var(--accent))"
                stopOpacity="0"
              />
            </radialGradient>
          </defs>
          <rect width={VIEW_W} height={H} fill="url(#netbg)" />

          {nodes.map(({ session, x, y, r, color }, i) => {
            const active = edgeActive(session.id, session.modelId);
            return (
              <g
                key={session.id}
                data-node={i}
                onMouseEnter={(e) => {
                  pauseNodes();
                  setHover(`s:${session.id}`);
                  const rect =
                    e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  setTooltip({
                    x: rect ? e.clientX - rect.left : 0,
                    y: rect ? e.clientY - rect.top : 0,
                    title: session.title || "(untitled)",
                    sub: `${session.modelId} · ${fmtCost(session.cost)} · ${fmtDate(session.timeCreated)}`,
                  });
                }}
                onMouseMove={syncPos}
                onMouseLeave={() => {
                  playNodes();
                  setHover(null);
                  setTooltip(null);
                }}
              >
                <line
                  data-spoke
                  x1={cx}
                  y1={cy}
                  x2={x}
                  y2={y}
                  stroke={color}
                  strokeWidth={active ? 1.4 : 1}
                  opacity={hover ? (active ? 0.95 : 0.05) : 0.16}
                  style={{ transition: "opacity 150ms" }}
                />
                <circle
                  data-dot
                  cx={x}
                  cy={y}
                  r={active ? r + 1.5 : r}
                  fill={color}
                  opacity={hover ? (active ? 1 : 0.12) : 0.72}
                  style={{
                    filter: `drop-shadow(0 0 3px ${color})`,
                    transition: "opacity 150ms",
                  }}
                />
              </g>
            );
          })}

          <g data-hub className="pointer-events-none">
            <circle
              data-hubring
              cx={cx}
              cy={cy}
              r={hover ? 22 : 18}
              fill="none"
              stroke="hsl(var(--accent))"
              strokeWidth={1}
              opacity={0.25}
              style={{ transition: "r 150ms, opacity 150ms" }}
            />
            <circle
              data-hubdot
              cx={cx}
              cy={cy}
              r={9}
              fill="hsl(var(--accent))"
              style={{
                filter: "drop-shadow(0 0 6px hsl(var(--accent) / 0.7))",
              }}
            />
            <text
              data-hubtext
              x={cx}
              y={cy + 26}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-mono)"
              letterSpacing="0.18em"
              fill="hsl(var(--muted-foreground))"
              opacity={0.75}
            >
              {project}
            </text>
          </g>

          {bands.map(({ id, mid, count }) => {
            const color = colorOf.get(id) ?? "hsl(var(--accent))";
            const active = hover === `m:${id}`;
            const lx = cx + (layout.R + 18) * Math.cos(mid);
            const ly = cy + (layout.R + 18) * Math.sin(mid);
            return (
              <g
                key={id}
                onMouseEnter={(e) => {
                  setHover(`m:${id}`);
                  const rect =
                    e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  setTooltip({
                    x: rect ? e.clientX - rect.left : 0,
                    y: rect ? e.clientY - rect.top : 0,
                    title: id,
                    sub: `${count} sessions`,
                  });
                }}
                onMouseMove={syncPos}
                onMouseLeave={() => {
                  setHover(null);
                  setTooltip(null);
                }}
                style={{ cursor: "default" }}
              >
                <circle
                  cx={lx}
                  cy={ly}
                  r={10}
                  fill="transparent"
                  style={{ pointerEvents: "all" }}
                />
                <text
                  x={lx}
                  y={ly + 3.5}
                  textAnchor={textAnchor(mid)}
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  fill={color}
                  opacity={hover ? (active ? 1 : 0.2) : 0.55}
                  style={{ transition: "opacity 150ms" }}
                >
                  {id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs uppercase tracking-[0.16em] text-muted-foreground/70">
        <span>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-accent align-middle" />
          project
        </span>
        {modelList.map(([id]) => (
          <span key={id} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: colorOf.get(id) }}
            />
            {id}
          </span>
        ))}
        {sessions.length > MAX_SHOWN && (
          <span className="text-muted-foreground/50">
            +{sessions.length - MAX_SHOWN} more sessions
          </span>
        )}
      </div>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 max-w-[280px] rounded-md border border-border bg-background/95 px-2.5 py-1.5 text-[11px] shadow-lg backdrop-blur-sm"
          style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
        >
          <div className="truncate font-medium text-foreground">
            {tooltip.title}
          </div>
          <div className="num text-muted-foreground">{tooltip.sub}</div>
        </div>
      )}
    </div>
  );
}
