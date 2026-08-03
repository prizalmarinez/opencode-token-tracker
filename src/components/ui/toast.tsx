import * as React from "react";
import { useCallback, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastVariant = "default" | "positive" | "negative";

interface ToastData {
  id: number;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toast: (opts: {
    title: string;
    description?: string;
    variant?: ToastVariant;
  }) => void;
  dismiss: (id: number) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  default: "border-accent/30",
  positive: "border-accent/30",
  negative: "border-negative/30",
};

const iconStyles: Record<ToastVariant, string> = {
  default: "text-accent",
  positive: "text-accent",
  negative: "text-negative",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    (opts) => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, variant: "default", ...opts }]);
      window.setTimeout(() => dismiss(id), 3500);
    },
    [dismiss],
  );

  const value = React.useMemo(
    () => ({ toast, dismiss }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-[70] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "card-surface animate-rise flex items-start gap-2.5 border p-3 shadow-glow/50",
              variantStyles[t.variant ?? "default"],
            )}
          >
            <CheckCircle2
              className={cn(
                "mt-0.5 size-4 shrink-0",
                iconStyles[t.variant ?? "default"],
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium tracking-tight text-foreground">
                {t.title}
              </p>
              {t.description && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
