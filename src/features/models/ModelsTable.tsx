import { ExternalLink } from "lucide-react";
import type { ModelRow } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { fmtCompact } from "@/lib/format";

function fmtPerMillion(p: number | null): string {
  if (p === null) return "·";
  const perM = p * 1_000_000;
  if (perM === 0) return "$0";
  if (perM < 0.01) return "$" + perM.toFixed(4);
  return "$" + perM.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function ModelsTable({
  models,
  title = "Leaderboard",
}: {
  models: ModelRow[];
  title?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardDescription>{models.length} models</CardDescription>
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>

      <div className="hidden items-center gap-x-5 border-t border-border/50 px-5 pb-2 pt-4 text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60 sm:flex">
        <div className="w-8 shrink-0 text-right">#</div>
        <div className="min-w-0 flex-1">model</div>
        <div className="w-16 shrink-0 text-right">context</div>
        <div className="hidden w-20 shrink-0 text-right sm:block">
          prompt /M
        </div>
        <div className="hidden w-20 shrink-0 text-right sm:block">
          output /M
        </div>
        <div className="hidden w-24 shrink-0 md:block">arena</div>
        <div className="w-8 shrink-0" />
      </div>

      <div className="divide-y divide-border/50 border-t border-border/50">
        {models.map((model, i) => (
          <div
            key={model.id}
            className="group/row flex items-center gap-x-5 px-5 py-2.5 transition-colors hover:bg-muted/40"
          >
            <div className="num w-8 shrink-0 text-right text-[11px] text-muted-foreground/70">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium text-white transition-colors duration-150 group-hover/row:text-accent">
                  {model.name}
                </span>
                {model.isFree && (
                  <Badge variant="positive" className="shrink-0">
                    free
                  </Badge>
                )}
              </div>
              <div className="truncate font-mono text-[10px] text-muted-foreground/70">
                {model.id}
              </div>
            </div>
            <div className="num w-16 shrink-0 text-right text-[12px] text-foreground">
              {model.contextLength !== null
                ? fmtCompact(model.contextLength)
                : "·"}
            </div>
            <div className="num hidden w-20 shrink-0 text-right text-[12px] text-foreground sm:block">
              {fmtPerMillion(model.promptPrice)}
            </div>
            <div className="num hidden w-20 shrink-0 text-right text-[12px] text-foreground sm:block">
              {fmtPerMillion(model.completionPrice)}
            </div>
            <div className="hidden w-24 shrink-0 text-right md:block">
              {model.arenaRank !== null && (
                <Badge variant="accent">
                  #{model.arenaRank} {model.arenaCategory}
                </Badge>
              )}
            </div>
            <div className="flex w-8 shrink-0 items-center justify-end">
              <a
                href={model.url}
                target="_blank"
                rel="noopener noreferrer"
                title="View on OpenRouter"
                aria-label={`View ${model.name} on OpenRouter`}
                className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
