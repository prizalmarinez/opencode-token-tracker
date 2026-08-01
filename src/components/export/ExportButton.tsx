import { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileType,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown";
import {
  exportPdfFromElement,
  exportSessions,
  type ExportFormat,
  type ExportOverview,
} from "@/lib/export";

const FORMATS: {
  format: ExportFormat;
  label: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  {
    format: "pdf",
    label: "PDF",
    hint: "report",
    icon: <FileText className="size-3.5" />,
  },
  {
    format: "xlsx",
    label: "XLSX",
    hint: "sheet",
    icon: <FileSpreadsheet className="size-3.5" />,
  },
  {
    format: "csv",
    label: "CSV",
    hint: "table",
    icon: <FileType className="size-3.5" />,
  },
];

export function ExportButton({
  dbPath,
  project,
  filenameBase,
  title,
  subtitle,
  captureRef,
  overview,
}: {
  dbPath: string;
  project?: string;
  filenameBase: string;
  title: string;
  subtitle: string;
  captureRef?: React.RefObject<HTMLElement | null>;
  overview?: ExportOverview;
}) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const handle = async (format: ExportFormat) => {
    if (busy) return;
    setBusy(format);
    try {
      if (format === "pdf" && captureRef?.current) {
        await exportPdfFromElement(captureRef.current, filenameBase);
        return;
      }
      await exportSessions({
        dbPath,
        project,
        format,
        filename: filenameBase,
        title,
        subtitle,
        overview,
      });
    } catch (e) {
      console.error("export failed:", e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div data-export-hide>
      <DropdownMenu
        trigger={
          <Button variant="outline" size="sm" disabled={busy !== null}>
            {busy ? (
              <RefreshCw className="animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            {busy ? busy.toUpperCase() : "Export"}
          </Button>
        }
        items={FORMATS.map(({ format, label, hint, icon }) => ({
          key: format,
          label,
          hint,
          icon,
          disabled: busy !== null,
          onSelect: () => void handle(format),
        }))}
      />
    </div>
  );
}
