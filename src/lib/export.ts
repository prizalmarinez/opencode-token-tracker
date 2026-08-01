import { getAllSessions } from "@/lib/api";
import type { OpencodeSession } from "@/types";

export type ExportFormat = "csv" | "xlsx" | "pdf";

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "project";
}

const COLUMNS: { key: keyof OpencodeSession; label: string }[] = [
  { key: "timeCreated", label: "Time Created" },
  { key: "title", label: "Title" },
  { key: "modelId", label: "Model" },
  { key: "providerId", label: "Provider" },
  { key: "variant", label: "Variant" },
  { key: "agent", label: "Agent" },
  { key: "directory", label: "Directory" },
  { key: "projectName", label: "Project Name" },
  { key: "projectDir", label: "Project Dir" },
  { key: "tokensInput", label: "Tokens Input" },
  { key: "tokensOutput", label: "Tokens Output" },
  { key: "tokensReasoning", label: "Tokens Reasoning" },
  { key: "tokensCacheRead", label: "Tokens Cache Read" },
  { key: "tokensCacheWrite", label: "Tokens Cache Write" },
  { key: "cost", label: "Cost" },
];

function cellValue(session: OpencodeSession, key: keyof OpencodeSession) {
  if (key === "timeCreated") return new Date(session.timeCreated).toISOString();
  const value = session[key];
  return value === null || value === undefined ? "" : String(value);
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildCsv(sessions: OpencodeSession[]): string {
  const header = COLUMNS.map((c) => csvEscape(c.label)).join(",");
  const lines = sessions.map((s) =>
    COLUMNS.map((c) => csvEscape(cellValue(s, c.key))).join(","),
  );
  return `\ufeff${[header, ...lines].join("\r\n")}`;
}

export async function buildXlsx(sessions: OpencodeSession[]): Promise<Blob> {
  const XLSX = await import("xlsx");
  const aoa = [
    COLUMNS.map((c) => c.label),
    ...sessions.map((s) => COLUMNS.map((c) => cellValue(s, c.key))),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = COLUMNS.map((c) => ({
    wch: Math.max(c.label.length + 2, 12),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Sessions");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function buildPdf(
  sessions: OpencodeSession[],
  meta: { title: string; subtitle: string },
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 18, 13);
  doc.text(meta.title, 40, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 110, 95);
  doc.text(meta.subtitle, 40, 64);

  doc.setDrawColor(163, 230, 53);
  doc.setLineWidth(1.5);
  doc.line(40, 74, pageWidth - 40, 74);

  autoTable(doc, {
    startY: 90,
    head: [COLUMNS.map((c) => c.label)],
    body: sessions.map((s) => COLUMNS.map((c) => cellValue(s, c.key))),
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 4,
      textColor: [44, 40, 32],
    },
    headStyles: {
      fillColor: [44, 39, 30],
      textColor: [238, 230, 211],
      fontStyle: "bold",
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: [246, 244, 239] },
    margin: { left: 40, right: 40, bottom: 40 },
  });

  return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
}

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

export async function exportSessions({
  dbPath,
  project,
  format,
  filename,
  title,
  subtitle,
}: {
  dbPath: string;
  project?: string;
  format: ExportFormat;
  filename: string;
  title: string;
  subtitle: string;
}) {
  const sessions = await getAllSessions(dbPath.trim() || undefined, project);
  if (sessions.length === 0) throw new Error("No sessions to export.");

  let blob: Blob;
  if (format === "csv") {
    blob = new Blob([buildCsv(sessions)], {
      type: "text/csv;charset=utf-8",
    });
  } else if (format === "xlsx") {
    blob = await buildXlsx(sessions);
  } else {
    blob = await buildPdf(sessions, {
      title,
      subtitle: `${subtitle} · ${sessions.length} sessions`,
    });
  }
  downloadBlob(blob, `${filename}.${format}`);
}
