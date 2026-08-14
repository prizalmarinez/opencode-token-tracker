import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Search } from "lucide-react";
import type { SkillsSkill, SkillsView } from "@/types";
import {
  getInstalledSkills,
  getSkillsLeaderboard,
  searchSkills,
} from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { usePagination } from "@/lib/use-pagination";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { copyToClipboard } from "@/lib/copy";
import {
  Leaderboard,
  LeaderboardError,
  LeaderboardLoading,
  LeaderboardTable,
  type LeaderboardColumn,
} from "@/components/leaderboard";

const VIEWS: { key: SkillsView; label: string }[] = [
  { key: "all-time", label: "all-time" },
  { key: "trending", label: "trending" },
  { key: "hot", label: "hot" },
];

const PAGE_SIZE = 25;

function installCommandFor(skill: SkillsSkill): string {
  const source = skill.source.replace(/^site\//, "");
  return `npx skills add ${source}`;
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

function InstallButton({ skill }: { skill: SkillsSkill }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={installCommandFor(skill)}
      aria-label={`Copy install command for ${skill.name}`}
      onClick={async () => {
        const ok = await copyToClipboard(installCommandFor(skill));
        if (!ok) return;
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      className="inline-flex items-center gap-1 rounded px-1.5 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? (
        <Check className="size-3 text-positive" />
      ) : (
        <Copy className="size-3" />
      )}
      <span className="hidden lg:inline">{copied ? "copied" : "install"}</span>
    </button>
  );
}

function skillColumns(
  installed: Set<string>,
): LeaderboardColumn<SkillsSkill>[] {
  return [
    {
      header: "installs",
      headerClass: "w-16 shrink-0 text-right",
      cellClass: "num w-16 shrink-0 text-right text-[12px] text-foreground",
      render: (s) => s.installs,
    },
    {
      header: "installed",
      headerClass: "hidden w-24 shrink-0 md:block",
      cellClass: "hidden w-24 shrink-0 md:block",
      render: (s) =>
        installed.has(s.name.toLowerCase()) ? (
          <Badge variant="positive">
            <Check className="size-2.5" /> installed
          </Badge>
        ) : null,
    },
    {
      header: "",
      headerClass: "w-28 shrink-0",
      cellClass: "flex w-28 shrink-0 items-center justify-end gap-0.5",
      render: (s) => (
        <>
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            title="View on skills.sh"
            aria-label={`View ${s.name} on skills.sh`}
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
          </a>
          {s.installUrl && (
            <a
              href={s.installUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Source repository"
              aria-label={`Open ${s.source} on GitHub`}
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <GithubIcon className="size-3.5" />
            </a>
          )}
          <InstallButton skill={s} />
        </>
      ),
    },
  ];
}

function SkillsSearch({
  term,
  installed,
}: {
  term: string;
  installed: Set<string>;
}) {
  const results = useQuery(() => searchSkills(term), [term]);
  const allSkills = results.data?.skills ?? [];
  const pagination = usePagination(allSkills.length, PAGE_SIZE);
  if (results.error)
    return <LeaderboardError title="Search failed." message={results.error} />;
  if (results.loading || !results.data)
    return <LeaderboardLoading label={`searching skills.sh for “${term}”…`} />;
  const { searchType, count } = results.data;
  const skills = allSkills.slice(
    (pagination.page - 1) * PAGE_SIZE,
    pagination.page * PAGE_SIZE,
  );
  return (
    <div className="animate-rise">
      <LeaderboardTable
        items={skills}
        columns={skillColumns(installed)}
        rowKey={(s) => s.id}
        nameHeader="skill"
        rank={(s) => s.rank ?? "·"}
        name={(s) => s.name}
        subtitle={(s) => s.source}
        countLabel={`${allSkills.length} skills`}
        cardTitle={`${count} results · ${searchType}`}
        footer={
          <Pagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            total={allSkills.length}
            pageSize={PAGE_SIZE}
            onPrev={pagination.prev}
            onNext={pagination.next}
          />
        }
      />
    </div>
  );
}

export function SkillsPage({ refreshKey }: { refreshKey: number }) {
  const [view, setView] = useState<SkillsView>("all-time");
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setTerm(query.trim()), 400);
    return () => window.clearTimeout(t);
  }, [query]);

  const leaderboard = useQuery(
    () => getSkillsLeaderboard(view),
    [view, refreshKey],
  );
  const installedQ = useQuery(() => getInstalledSkills(), [refreshKey]);

  const installed = useMemo(
    () => new Set((installedQ.data?.names ?? []).map((n) => n.toLowerCase())),
    [installedQ.data],
  );

  const allSkills = leaderboard.data?.skills ?? [];
  const pagination = usePagination(allSkills.length, PAGE_SIZE);
  const pageSkills = allSkills.slice(
    (pagination.page - 1) * PAGE_SIZE,
    pagination.page * PAGE_SIZE,
  );

  const searching = term.length >= 2;

  return (
    <Leaderboard<SkillsView, SkillsSkill>
      eyebrow="agent skills · skills.sh"
      title="skills"
      description={
        <>
          The open agent skills ecosystem, ranked by installs. Browse the{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[12px] text-foreground">
            skills.sh
          </code>{" "}
          leaderboard, search the catalog, and spot what you already have
          installed locally.
        </>
      }
      tabs={VIEWS}
      activeTab={view}
      onTabChange={(v) => {
        setView(v);
        pagination.reset();
      }}
      toolbarStart={
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search the skills catalog…"
            aria-label="Search skills"
            className="pl-9 font-mono text-[13px]"
          />
        </div>
      }
      footnote={
        installedQ.data && !searching ? (
          <>
            <span className="num text-foreground">{installed.size}</span> skills
            installed locally — marked in the table
          </>
        ) : undefined
      }
      loading={!searching && leaderboard.loading && !leaderboard.data}
      error={!searching ? leaderboard.error : null}
      loadingLabel={`fetching ${view} leaderboard…`}
      errorTitle="Could not load the skills leaderboard."
      body={
        searching ? (
          <SkillsSearch term={term} installed={installed} />
        ) : undefined
      }
      items={pageSkills}
      columns={skillColumns(installed)}
      rowKey={(s) => s.id}
      nameHeader="skill"
      rank={(s) => s.rank ?? "·"}
      name={(s) => s.name}
      subtitle={(s) => s.source}
      countLabel={`${allSkills.length} skills`}
      cardTitle="Leaderboard"
      footer={
        <Pagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          total={allSkills.length}
          pageSize={PAGE_SIZE}
          onPrev={pagination.prev}
          onNext={pagination.next}
        />
      }
    />
  );
}
