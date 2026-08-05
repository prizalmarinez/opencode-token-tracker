import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { SkillsSkill } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { copyToClipboard } from "@/lib/copy";

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

export function SkillsTable({
  skills,
  installed,
  title = "Leaderboard",
}: {
  skills: SkillsSkill[];
  installed: Set<string>;
  title?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardDescription>{skills.length} skills</CardDescription>
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>

      <div className="hidden items-center gap-x-5 border-t border-border/50 px-5 pb-2 pt-4 text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60 sm:flex">
        <div className="w-8 shrink-0 text-right">#</div>
        <div className="min-w-0 flex-1">skill</div>
        <div className="w-16 shrink-0 text-right">installs</div>
        <div className="hidden w-24 shrink-0 md:block">installed</div>
        <div className="w-28 shrink-0" />
      </div>

      <div className="divide-y divide-border/50 border-t border-border/50">
        {skills.map((skill) => {
          const isInstalled = installed.has(skill.name.toLowerCase());
          return (
            <div
              key={skill.id}
              className="group/row flex items-center gap-x-5 px-5 py-2.5 transition-colors hover:bg-muted/40"
            >
              <div className="num w-8 shrink-0 text-right text-[11px] text-muted-foreground/70">
                {skill.rank ?? "·"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-foreground transition-colors duration-150 group-hover/row:text-accent">
                  {skill.name}
                </div>
                <div className="truncate font-mono text-[10px] text-muted-foreground/70">
                  {skill.source}
                </div>
              </div>
              <div className="num w-16 shrink-0 text-right text-[12px] text-foreground">
                {skill.installs}
              </div>
              <div className="hidden w-24 shrink-0 md:block">
                {isInstalled && (
                  <Badge variant="positive">
                    <Check className="size-2.5" /> installed
                  </Badge>
                )}
              </div>
              <div className="flex w-28 shrink-0 items-center justify-end gap-0.5">
                <a
                  href={skill.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View on skills.sh"
                  aria-label={`View ${skill.name} on skills.sh`}
                  className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ExternalLink className="size-3.5" />
                </a>
                {skill.installUrl && (
                  <a
                    href={skill.installUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Source repository"
                    aria-label={`Open ${skill.source} on GitHub`}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <GithubIcon className="size-3.5" />
                  </a>
                )}
                <InstallButton skill={skill} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
