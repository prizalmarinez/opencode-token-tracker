import { lazy, Suspense, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Usage } from "@/features/usage/Usage";
import { Projects } from "@/features/projects/Projects";
import { SkillsPage } from "@/features/skills/SkillsPage";
import { ModelsPage } from "@/features/models/ModelsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { ProjectPage } from "@/features/project/ProjectPage";
import { StatusPage } from "@/features/status/StatusPage";
import { StatusPip } from "@/features/status/StatusPip";
import { useAnyQueryLoading } from "@/lib/use-query";
import { useOpencodeHealth } from "@/lib/use-opencode-health";
import { useCommandPalette } from "@/lib/use-command-palette";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { NotFound } from "@/features/not-found/NotFound";
import { cn } from "@/lib/cn";
import { navigate } from "@/lib/navigate";
import { useLayout } from "@/features/settings/layout";
import { useSearchVisibility } from "@/features/settings/search-visibility";
import { useModelsVisibility } from "@/features/settings/models-visibility";
import { SidebarSlotContext } from "@/lib/sidebar-slot";
import { useToast } from "@/components/ui/toast";

// The /search feature pulls in react-markdown + the opencode SDK client —
// keep it out of the usage bundle by splitting it on first navigation.
const SearchPage = lazy(() =>
  import("@/features/search/SearchPage").then((m) => ({
    default: m.SearchPage,
  })),
);

function getRoute() {
  const path = window.location.pathname;
  if (path === "" || path === "/" || path === "/index.html") return "/usage";
  return path;
}

function parseProject(route: string): string | null {
  if (!route.startsWith("/project/")) return null;
  try {
    return decodeURIComponent(route.slice("/project/".length));
  } catch {
    return null;
  }
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        navigate(href);
      }}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded px-3 py-1.5 text-[12px] tracking-tight transition-colors",
        active
          ? "bg-accent font-medium text-accent-foreground shadow-glow"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </a>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export default function App() {
  const [route, setRoute] = useState(getRoute);
  const [dbPath, setDbPath] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const loading = useAnyQueryLoading();
  const { toast } = useToast();

  const refresh = () => {
    setRefreshKey((k) => k + 1);
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 700);
    toast({
      title: "Synced",
      description: "Fetched the latest data",
      variant: "positive",
    });
  };
  const { open, closePalette } = useCommandPalette();
  const { layout } = useLayout();
  const { visible: searchVisible } = useSearchVisibility();
  const { visible: modelsVisible } = useModelsVisibility();
  const [sidebarSlot, setSidebarSlot] = useState<HTMLDivElement | null>(null);
  const opencodeHealth = useOpencodeHealth();

  useEffect(() => {
    const onPop = () => setRoute(getRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    // Landing on the bare origin redirects to the usage page. getRoute()
    // normalizes the render; this rewrites the address bar without a reload.
    const path = window.location.pathname;
    if (path === "" || path === "/" || path === "/index.html") {
      window.history.replaceState({}, "", "/usage");
    }
  }, []);

  const onUsage = route === "/usage" || route.startsWith("/project/");
  const project = parseProject(route);

  const searchRoute = route === "/search" && searchVisible;
  const modelsRoute = route === "/models" && modelsVisible;

  // /search renders its thread list inside the nav sidebar, so the sidebar
  // layout is required there regardless of the user's stored preference.
  const effectiveLayout = searchRoute ? "sidebar" : layout;

  const page = project ? (
    <ProjectPage project={project} dbPath={dbPath} refreshKey={refreshKey} />
  ) : route === "/projects" ? (
    <Projects dbPath={dbPath} refreshKey={refreshKey} />
  ) : route === "/skills" ? (
    <SkillsPage refreshKey={refreshKey} />
  ) : modelsRoute ? (
    <ModelsPage refreshKey={refreshKey} />
  ) : route === "/settings" ? (
    <SettingsPage value={dbPath} onChange={setDbPath} refreshKey={refreshKey} />
  ) : route === "/status" ? (
    <StatusPage
      health={opencodeHealth}
      dbPath={dbPath}
      refreshKey={refreshKey}
    />
  ) : searchRoute ? (
    <Suspense
      fallback={
        <div className="px-4 py-16 text-center text-sm text-muted-foreground">
          loading research…
        </div>
      }
    >
      <SearchPage />
    </Suspense>
  ) : route === "/usage" ? (
    <Usage dbPath={dbPath} refreshKey={refreshKey} />
  ) : (
    <NotFound
      route={route}
      searchVisible={searchVisible}
      modelsVisible={modelsVisible}
    />
  );

  return (
    <SidebarSlotContext.Provider value={sidebarSlot}>
      <div className="grain min-h-screen">
        {/*
        Two nav render paths share the same handlers; CSS controls visibility.
        On md+ the chosen layout applies; below md always use the header.
      */}
        <nav
          className={cn(
            "sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-sm",
            effectiveLayout === "sidebar" && "md:hidden",
          )}
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 md:px-8">
            <a
              href="/usage"
              onClick={(e) => {
                e.preventDefault();
                navigate("/usage");
              }}
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              opencode
              <span className="text-muted-foreground">/token-tracker</span>
            </a>
            <div className="ml-auto flex items-center gap-1 font-mono">
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                title="Fetch latest data"
                aria-label="Fetch latest data"
                className="ml-1 flex items-center gap-1.5 rounded p-1.5 text-accent transition-colors hover:bg-accent/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={cn(
                    "size-4",
                    (loading || spinning) && "animate-spin",
                  )}
                />
                <span className="text-[12px] tracking-tight">sync</span>
              </button>
              <StatusPip health={opencodeHealth} />
              <NavLink href="/usage" active={onUsage}>
                usage
              </NavLink>
              <NavLink href="/projects" active={route === "/projects"}>
                projects
              </NavLink>
              <NavLink href="/skills" active={route === "/skills"}>
                skills
              </NavLink>
              {modelsVisible && (
                <NavLink href="/models" active={route === "/models"}>
                  models
                </NavLink>
              )}
              {searchVisible && (
                <NavLink href="/search" active={route === "/search"}>
                  deep research
                </NavLink>
              )}
              <NavLink href="/status" active={route === "/status"}>
                status
              </NavLink>
              <NavLink href="/settings" active={route === "/settings"}>
                settings
              </NavLink>
              <a
                href="https://github.com/prizalmarinez/opencode-token-tracker"
                target="_blank"
                rel="noopener noreferrer"
                title="GitHub repository"
                className="ml-1 rounded p-1.5 text-accent transition-colors hover:bg-accent/10 hover:text-foreground"
              >
                <GithubIcon className="size-4" />
              </a>
            </div>
          </div>
        </nav>

        {effectiveLayout === "sidebar" ? (
          <div className="flex min-h-screen">
            <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-4 border-r border-border/70 bg-background/80 px-4 py-6 backdrop-blur-sm md:flex">
              <a
                href="/usage"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/usage");
                }}
                className="text-sm font-semibold leading-tight tracking-tight text-foreground"
              >
                opencode
                <span className="block text-muted-foreground">
                  /token-tracker
                </span>
              </a>
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                title="Fetch latest data"
                aria-label="Fetch latest data"
                className="flex items-center gap-1.5 self-start rounded p-1.5 text-accent transition-colors hover:bg-accent/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={cn(
                    "size-4",
                    (loading || spinning) && "animate-spin",
                  )}
                />
                <span className="text-[12px] tracking-tight">sync</span>
              </button>
              <nav className="flex flex-col gap-1 font-mono">
                <NavLink href="/usage" active={onUsage}>
                  usage
                </NavLink>
                <NavLink href="/projects" active={route === "/projects"}>
                  projects
                </NavLink>
                <NavLink href="/skills" active={route === "/skills"}>
                  skills
                </NavLink>
                {modelsVisible && (
                  <NavLink href="/models" active={route === "/models"}>
                    models
                  </NavLink>
                )}
                {searchVisible && (
                  <NavLink href="/search" active={route === "/search"}>
                    deep research
                  </NavLink>
                )}
                <NavLink href="/status" active={route === "/status"}>
                  status
                </NavLink>
                <NavLink href="/settings" active={route === "/settings"}>
                  settings
                </NavLink>
              </nav>
              <StatusPip health={opencodeHealth} />
              <div
                ref={setSidebarSlot}
                className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border/40 pt-3"
              />
              <a
                href="https://github.com/prizalmarinez/opencode-token-tracker"
                target="_blank"
                rel="noopener noreferrer"
                title="GitHub repository"
                className="self-start rounded p-1.5 text-accent transition-colors hover:bg-accent/10 hover:text-foreground"
              >
                <GithubIcon className="size-4" />
              </a>
            </aside>
            <main className="min-w-0 flex-1">{page}</main>
          </div>
        ) : (
          page
        )}

        {open && (
          <CommandPalette
            dbPath={dbPath}
            refreshKey={refreshKey}
            onClose={closePalette}
          />
        )}
      </div>
    </SidebarSlotContext.Provider>
  );
}
