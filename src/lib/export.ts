import { getAllSessions } from "@/lib/api";
import type { OpencodeSession, OpencodeSummary } from "@/types";
import { fmtDate } from "@/lib/format";

export type ExportFormat = "csv" | "xlsx" | "pdf";

export interface ExportOverview {
  title: string;
  path: string;
  exportedAt: string;
  dateRange: { from: number; to: number } | null;
  totals: OpencodeSummary["totals"];
  byModel: { modelId: string; cost: number; count: number }[];
}

/*
 * The DOM-capture PDF contract. Pages author these attributes on the elements
 * that must be un-truncated, expanded or hidden before html2canvas; the names
 * live here so the capture code and the callers share one source of truth.
 */
export const EXPORT_MARKERS = {
  expand: "data-export-expand",
  untruncate: "data-export-untruncate",
  hide: "data-export-hide",
} as const;

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "project";
}

/** Narrows a summary down to the overview block the CSV/XLSX embed. */
export function buildExportOverview(
  summary: OpencodeSummary,
  title: string,
  path: string,
): ExportOverview {
  return {
    title,
    path,
    exportedAt: summary.exportedAt,
    dateRange: summary.dateRange,
    totals: summary.totals,
    byModel: summary.byModel.map((m) => ({
      modelId: m.modelId,
      cost: m.cost,
      count: m.count,
    })),
  };
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

function buildCsv(
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

async function buildXlsx(
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

function cssVarToRgb(name: string): [number, number, number] | null {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const parts = raw.split(/\s+/).map((v) => parseFloat(v));
  if (parts.length < 3 || parts.some((v) => Number.isNaN(v))) return null;
  const [h, s, l] = parts;
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

async function buildPdf(
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
  doc.setTextColor(...(cssVarToRgb("--muted-foreground") ?? [120, 110, 95]));
  doc.text(meta.subtitle, 40, 64);

  doc.setDrawColor(...(cssVarToRgb("--accent") ?? [163, 230, 53]));
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

export async function exportDomPdf(element: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  if (document.fonts?.ready) await document.fonts.ready;

  const expandables = Array.from(
    element.querySelectorAll<HTMLElement>(`[${EXPORT_MARKERS.expand}]`),
  );
  const untruncatables = Array.from(
    element.querySelectorAll<HTMLElement>(`[${EXPORT_MARKERS.untruncate}]`),
  );
  const hidden = Array.from(
    element.querySelectorAll<HTMLElement>(`[${EXPORT_MARKERS.hide}]`),
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

export interface ExportReportOptions {
  format: ExportFormat;
  dbPath: string;
  project?: string;
  overview?: ExportOverview;
  title: string;
  subtitle: string;
}

/**
 * The export module's table path: CSV / XLSX / PDF (jsPDF table) from the
 * session log, fetched internally. The other PDF adapter — DOM capture of a
 * page element — is a separate entry point, exportDomPdf, so the interface
 * names which adapter runs instead of hiding the fork behind a ref.
 */
export async function exportReport({
  format,
  dbPath,
  project,
  overview,
  title,
  subtitle,
}: ExportReportOptions): Promise<Blob> {
  const sessions = await getAllSessions(dbPath.trim() || undefined, project);
  if (sessions.length === 0) throw new Error("No sessions to export.");

  if (format === "csv")
    return new Blob([buildCsv(sessions, overview)], {
      type: "text/csv;charset=utf-8",
    });
  if (format === "xlsx") return buildXlsx(sessions, overview);
  return buildPdf(sessions, {
    title,
    subtitle: `${subtitle} · ${sessions.length} sessions`,
  });
}
