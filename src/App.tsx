import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Usage } from "@/features/usage/Usage";
import { Projects } from "@/features/projects/Projects";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { ProjectPage } from "@/features/project/ProjectPage";
import { useAnyQueryLoading } from "@/lib/use-query";
import { cn } from "@/lib/cn";
import { navigate } from "@/lib/navigate";

function getRoute() {
  return window.location.pathname || "/usage";
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
  const loading = useAnyQueryLoading();

  useEffect(() => {
    const onPop = () => setRoute(getRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const onUsage = route === "/usage" || route.startsWith("/project/");
  const project = parseProject(route);

  return (
    <div className="grain min-h-screen">
      <nav className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-sm">
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
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={loading}
              title="Fetch latest data"
              aria-label="Fetch latest data"
              className="ml-1 rounded p-1.5 text-accent transition-colors hover:bg-accent/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </button>
            <NavLink href="/usage" active={onUsage}>
              usage
            </NavLink>
            <NavLink href="/projects" active={route === "/projects"}>
              projects
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

      {project ? (
        <ProjectPage
          project={project}
          dbPath={dbPath}
          refreshKey={refreshKey}
        />
      ) : route === "/projects" ? (
        <Projects dbPath={dbPath} refreshKey={refreshKey} />
      ) : route === "/settings" ? (
        <SettingsPage
          value={dbPath}
          onChange={setDbPath}
          refreshKey={refreshKey}
        />
      ) : (
        <Usage dbPath={dbPath} refreshKey={refreshKey} />
      )}
    </div>
  );
}
