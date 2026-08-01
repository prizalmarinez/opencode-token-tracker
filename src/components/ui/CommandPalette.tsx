import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  CornerDownLeft,
  FolderGit2,
  Gauge,
  LayoutGrid,
  Search,
  Settings,
} from "lucide-react";
import { getProjects } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/cn";
import { navigate } from "@/lib/navigate";
import type { ProjectOverview } from "@/types";

interface PaletteItem {
  key: string;
  group: "pages" | "projects";
  label: string;
  hint?: string;
  icon: React.ReactNode;
  href: string;
}

const MAX_PROJECTS = 12;

function buildItems(projects: ProjectOverview[], query: string): PaletteItem[] {
  const pages: PaletteItem[] = [
    {
      key: "usage",
      group: "pages",
      label: "usage",
      hint: "overview",
      icon: <Gauge className="size-4" />,
      href: "/usage",
    },
    {
      key: "projects",
      group: "pages",
      label: "projects",
      hint: "buckets",
      icon: <LayoutGrid className="size-4" />,
      href: "/projects",
    },
    {
      key: "settings",
      group: "pages",
      label: "settings",
      hint: "db path · theme",
      icon: <Settings className="size-4" />,
      href: "/settings",
    },
  ];
  const q = query.trim().toLowerCase();
  const matched = q
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.name.replace(/^.*\//, "").toLowerCase().includes(q),
      )
    : projects;
  const projectItems: PaletteItem[] = matched
    .slice(0, MAX_PROJECTS)
    .map((p) => ({
      key: `project:${p.name}`,
      group: "projects",
      label: p.name,
      icon: <FolderGit2 className="size-4" />,
      href: `/project/${encodeURIComponent(p.name)}`,
    }));
  return [...pages, ...projectItems];
}

function bestIndex(items: PaletteItem[], query: string): number {
  if (items.length === 0) return -1;
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const startsWith = (s: string) => s.toLowerCase().startsWith(q);
  const prefix = items.findIndex(
    (i) => startsWith(i.label) || startsWith(i.label.replace(/^.*\//, "")),
  );
  if (prefix !== -1) return prefix;
  const contains = items.findIndex((i) => i.label.toLowerCase().includes(q));
  return contains === -1 ? 0 : contains;
}

export function CommandPalette({
  dbPath,
  refreshKey,
  onClose,
}: {
  dbPath: string;
  refreshKey: number;
  onClose: () => void;
}) {
  const projectsQ = useQuery(
    () => getProjects(dbPath || undefined),
    [dbPath, refreshKey],
  );
  const projects = useMemo(() => projectsQ.data ?? [], [projectsQ.data]);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const items = useMemo<PaletteItem[]>(
    () => buildItems(projects, query),
    [projects, query],
  );

  const currentIndex = items.length
    ? Math.min(activeIndex, items.length - 1)
    : -1;

  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, currentIndex]);

  const onQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setQuery(next);
    setActiveIndex(bestIndex(buildItems(projects, next), next));
  };

  const selectItem = (item: PaletteItem) => {
    onClose();
    navigate(item.href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (items.length) setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (items.length)
        setActiveIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (currentIndex >= 0) selectItem(items[currentIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card-surface w-full max-w-xl animate-rise overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-border px-3.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={onQueryChange}
            onKeyDown={onKeyDown}
            placeholder="type a page or project…"
            aria-label="Search pages and projects"
            className="h-11 w-full bg-transparent font-mono text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            esc
          </kbd>
        </div>

        <div className="max-h-[42vh] overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">
              no matches for “{query.trim()}”
            </p>
          ) : (
            items.map((item, i) => {
              const current = i === currentIndex;
              const prev = items[i - 1];
              const showHeader = !prev || prev.group !== item.group;
              return (
                <Fragment key={item.key}>
                  {showHeader && (
                    <div className="px-2.5 pb-1 pt-2 text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/50">
                      {item.group}
                    </div>
                  )}
                  <button
                    ref={current ? activeRowRef : undefined}
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => selectItem(item)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-[13px] transition-colors",
                      current
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0",
                        current
                          ? "text-accent-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                    {item.hint && (
                      <span
                        className={cn(
                          "ml-auto shrink-0 text-[10px] uppercase tracking-[0.14em]",
                          current
                            ? "text-accent-foreground/80"
                            : "text-muted-foreground/60",
                        )}
                      >
                        {item.hint}
                      </span>
                    )}
                  </button>
                </Fragment>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-border px-3.5 py-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
          <span className="flex items-center gap-1">
            <CornerDownLeft className="size-3" /> select
          </span>
          <span>↑↓ navigate</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
