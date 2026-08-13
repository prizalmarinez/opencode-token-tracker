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
  EXPORT_MARKERS,
  exportDomPdf,
  exportReport,
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

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
      // The PDF fork resolves here, at the seam that owns the ref: DOM capture
      // when a capture element is provided, jsPDF table otherwise.
      const blob =
        format === "pdf" && captureRef?.current
          ? await exportDomPdf(captureRef.current)
          : await exportReport({
              format,
              dbPath,
              project,
              overview,
              title,
              subtitle,
            });
      downloadBlob(blob, `${filenameBase}.${format}`);
    } catch (e) {
      console.error("export failed:", e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div {...{ [EXPORT_MARKERS.hide]: true }}>
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
