import { getAllSessions } from "@/lib/api";
import type { OpencodeSession, OpencodeSummary } from "@/types";
import { fmtDate } from "@/features/usage/usage-utils";

export type ExportFormat = "csv" | "xlsx" | "pdf";

export interface ExportOverview {
  title: string;
  path: string;
  exportedAt: string;
  dateRange: { from: number; to: number } | null;
  totals: OpencodeSummary["totals"];
  byModel: { modelId: string; cost: number; count: number }[];
}

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

function sanitizeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function cellValue(session: OpencodeSession, key: keyof OpencodeSession) {
  if (key === "timeCreated") return new Date(session.timeCreated).toISOString();
  const value = session[key];
  return value === null || value === undefined
    ? ""
    : sanitizeCell(String(value));
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function overviewRows(overview: ExportOverview): [string, string][] {
  return [
    ["Project", overview.title],
    ["Path", overview.path],
    ["Exported At", overview.exportedAt],
    [
      "Date Range",
      overview.dateRange
        ? `${fmtDate(overview.dateRange.from)} → ${fmtDate(overview.dateRange.to)}`
        : "all",
    ],
    ["Sessions", String(overview.totals.sessions)],
    ["Cost", String(overview.totals.cost)],
    ["Tokens Input", String(overview.totals.tokensInput)],
    ["Tokens Output", String(overview.totals.tokensOutput)],
    ["Tokens Reasoning", String(overview.totals.tokensReasoning)],
    ["Tokens Cache Read", String(overview.totals.tokensCacheRead)],
    ["Tokens Cache Write", String(overview.totals.tokensCacheWrite)],
  ];
}

export function buildCsv(
  sessions: OpencodeSession[],
  overview?: ExportOverview,
): string {
  const lines: string[] = [];
  if (overview) {
    lines.push(
      ...overviewRows(overview).map(([k, v]) =>
        [csvEscape(sanitizeCell(k)), csvEscape(sanitizeCell(v))].join(","),
      ),
    );
    lines.push("Model,Count,Cost");
    lines.push(
      ...overview.byModel.map((m) =>
        [m.modelId, String(m.count), String(m.cost)]
          .map((v) => csvEscape(sanitizeCell(v)))
          .join(","),
      ),
    );
    lines.push("");
  }
  const header = COLUMNS.map((c) => csvEscape(c.label)).join(",");
  const table = sessions.map((s) =>
    COLUMNS.map((c) => csvEscape(cellValue(s, c.key))).join(","),
  );
  return `\ufeff${[...lines, header, ...table].join("\r\n")}`;
}

export async function buildXlsx(
  sessions: OpencodeSession[],
  overview?: ExportOverview,
): Promise<Blob> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  if (overview) {
    const meta: (string | number)[][] = overviewRows(overview);
    const models: (string | number)[][] = [
      ["Model", "Count", "Cost"],
      ...overview.byModel.map((m) => [m.modelId, m.count, m.cost]),
    ];
    const overviewSheet = XLSX.utils.aoa_to_sheet([...meta, [], ...models]);
    overviewSheet["!cols"] = [{ wch: 20 }, { wch: 64 }];
    XLSX.utils.book_append_sheet(wb, overviewSheet, "Overview");
  }

  const aoa = [
    COLUMNS.map((c) => c.label),
    ...sessions.map((s) => COLUMNS.map((c) => cellValue(s, c.key))),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = COLUMNS.map((c) => ({
    wch: Math.max(c.label.length + 2, 12),
  }));
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

export async function buildPdfFromElement(element: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  if (document.fonts?.ready) await document.fonts.ready;

  const expandables = Array.from(
    element.querySelectorAll<HTMLElement>("[data-export-expand]"),
  );
  const untruncatables = Array.from(
    element.querySelectorAll<HTMLElement>("[data-export-untruncate]"),
  );
  const hidden = Array.from(
    element.querySelectorAll<HTMLElement>("[data-export-hide]"),
  );
  const restored: { el: HTMLElement; maxHeight: string; overflow: string }[] =
    [];
  const restoredTrunc: {
    el: HTMLElement;
    whiteSpace: string;
    overflow: string;
    textOverflow: string;
    minWidth: string;
    flex: string;
    width: string;
    display: string;
  }[] = [];
  const restoredVisibility: { el: HTMLElement; visibility: string }[] = [];
  expandables.forEach((el) => {
    restored.push({
      el,
      maxHeight: el.style.maxHeight,
      overflow: el.style.overflow,
    });
    el.style.maxHeight = "none";
    el.style.overflow = "visible";
  });
  untruncatables.forEach((el) => {
    restoredTrunc.push({
      el,
      whiteSpace: el.style.whiteSpace,
      overflow: el.style.overflow,
      textOverflow: el.style.textOverflow,
      minWidth: el.style.minWidth,
      flex: el.style.flex,
      width: el.style.width,
      display: el.style.display,
    });
    el.style.whiteSpace = "normal";
    el.style.overflow = "visible";
    el.style.textOverflow = "clip";
    el.style.minWidth = "0";
    el.style.flex = "0 0 auto";
    el.style.width = "auto";
    el.style.display = "block";
  });
  hidden.forEach((el) => {
    restoredVisibility.push({ el, visibility: el.style.visibility });
    el.style.visibility = "hidden";
  });

  const background =
    getComputedStyle(document.body).backgroundColor || "#0e0c09";
  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: background,
    });
  } finally {
    restored.forEach(({ el, maxHeight, overflow }) => {
      el.style.maxHeight = maxHeight;
      el.style.overflow = overflow;
    });
    restoredTrunc.forEach(
      ({
        el,
        whiteSpace,
        overflow,
        textOverflow,
        minWidth,
        flex,
        width,
        display,
      }) => {
        el.style.whiteSpace = whiteSpace;
        el.style.overflow = overflow;
        el.style.textOverflow = textOverflow;
        el.style.minWidth = minWidth;
        el.style.flex = flex;
        el.style.width = width;
        el.style.display = display;
      },
    );
    restoredVisibility.forEach(({ el, visibility }) => {
      el.style.visibility = visibility;
    });
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const imgW = pageW;
  const pxPerPt = canvas.width / imgW;

  const bgRgb = background.match(/\d+(?:\.\d+)?/g)?.map(Number);
  const [bgR, bgG, bgB] = bgRgb && bgRgb.length >= 3 ? bgRgb : [14, 12, 9];

  const paintBackground = () => {
    doc.setFillColor(bgR, bgG, bgB);
    doc.rect(0, 0, pageW, pageH, "F");
  };

  paintBackground();
  let y = 0;
  let page = 0;
  while (y < canvas.height) {
    if (page > 0) {
      doc.addPage();
      paintBackground();
    }
    const sliceH = Math.min(canvas.height - y, pageH * pxPerPt);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = Math.ceil(sliceH);
    const ctx = slice.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, -y);
    doc.addImage(
      slice.toDataURL("image/jpeg", 0.92),
      "JPEG",
      0,
      0,
      imgW,
      sliceH / pxPerPt,
    );
    y += sliceH;
    page += 1;
  }

  return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
}

export async function exportPdfFromElement(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const blob = await buildPdfFromElement(element);
  downloadBlob(blob, `${filename}.pdf`);
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
  overview,
}: {
  dbPath: string;
  project?: string;
  format: ExportFormat;
  filename: string;
  title: string;
  subtitle: string;
  overview?: ExportOverview;
}) {
  const sessions = await getAllSessions(dbPath.trim() || undefined, project);
  if (sessions.length === 0) throw new Error("No sessions to export.");

  let blob: Blob;
  if (format === "csv") {
    blob = new Blob([buildCsv(sessions, overview)], {
      type: "text/csv;charset=utf-8",
    });
  } else if (format === "xlsx") {
    blob = await buildXlsx(sessions, overview);
  } else {
    blob = await buildPdf(sessions, {
      title,
      subtitle: `${subtitle} · ${sessions.length} sessions`,
    });
  }
  downloadBlob(blob, `${filename}.${format}`);
}
