import type { OpencodeSession } from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtCompact, fmtCost, fmtDate } from "@/lib/format";

export function RecentSessions({ sessions }: { sessions: OpencodeSession[] }) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardDescription>
          {sessions.length > 0 ? `latest ${sessions.length}` : "sessions"}
        </CardDescription>
        <CardTitle>Recent sessions</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <th className="w-10 px-5 pb-2.5 font-medium">#</th>
              <th className="pb-2.5 pr-4 font-medium">Title</th>
              <th className="pb-2.5 pr-4 font-medium">Model</th>
              <th className="pb-2.5 pr-4 font-medium">Agent</th>
              <th className="pb-2.5 pr-4 font-medium">Project</th>
              <th className="pb-2.5 pr-4 font-medium">Time</th>
              <th className="pb-2.5 pr-4 text-right font-medium">Tokens</th>
              <th className="pb-2.5 pr-5 text-right font-medium">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sessions.map((s, i) => (
              <tr
                key={s.id}
                className="text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
              >
                <td className="w-10 px-5 py-2 text-[10px] text-muted-foreground/40">
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className="max-w-64 truncate py-2 pr-4">{s.title}</td>
                <td className="py-2 pr-4">
                  <Badge
                    variant="outline"
                    className="max-w-40 truncate text-[9px]"
                  >
                    {s.modelId}
                  </Badge>
                </td>
                <td className="py-2 pr-4 capitalize">{s.agent || "—"}</td>
                <td
                  className="max-w-48 truncate py-2 pr-4"
                  title={s.projectName ?? undefined}
                >
                  {s.projectName
                    ? s.projectName.split("/").filter(Boolean).pop()
                    : "—"}
                </td>
                <td className="num whitespace-nowrap py-2 pr-4 text-muted-foreground">
                  {fmtDate(s.timeCreated)}
                </td>
                <td className="num py-2 pr-4 text-right">
                  {fmtCompact(
                    s.tokensInput + s.tokensOutput + s.tokensReasoning,
                  )}
                </td>
                <td className="num py-2 pr-5 text-right text-foreground">
                  {fmtCost(s.cost)}
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-8 text-center text-sm text-muted-foreground"
                >
                  No cost-bearing sessions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
