import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface DropdownMenuItem {
  key: string;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  onSelect: () => void;
}

export function DropdownMenu({
  trigger,
  items,
  align = "end",
}: {
  trigger: React.ReactElement;
  items: DropdownMenuItem[];
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const triggerElement = React.Children.only(trigger) as React.ReactElement<
    Record<string, unknown>
  >;
  const originalOnClick = triggerElement.props.onClick as
    ((e: React.MouseEvent<HTMLButtonElement>) => void) | undefined;
  const triggerWithProps = React.cloneElement(triggerElement, {
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
      originalOnClick?.(e);
      setOpen((v) => !v);
    },
    "aria-haspopup": "menu",
    "aria-expanded": open,
  });

  return (
    <div ref={rootRef} className="relative inline-block">
      {triggerWithProps}
      {open && (
        <div
          role="menu"
          className={cn(
            "card-surface absolute top-full z-50 mt-1.5 min-w-44 animate-rise overflow-hidden p-1",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-[12px] text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {item.icon && (
                <span className="text-muted-foreground">{item.icon}</span>
              )}
              <span>{item.label}</span>
              {item.hint && (
                <span className="ml-auto text-[9px] uppercase tracking-[0.14em] text-muted-foreground/60">
                  {item.hint}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
