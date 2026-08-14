import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}

const navClass =
  "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] font-medium uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPrev,
  onNext,
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-t border-border/50 px-5 py-3",
        className,
      )}
    >
      <span className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground/60">
        showing{" "}
        <span className="num text-foreground">
          {from}–{to}
        </span>{" "}
        of <span className="num text-foreground">{total}</span>
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
          aria-label="Previous page"
          className={navClass}
        >
          <ChevronLeft className="size-4" /> prev
        </button>
        <span className="num px-1 text-[13px] text-muted-foreground">
          {page} / {pageCount}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= pageCount}
          aria-label="Next page"
          className={navClass}
        >
          next <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
