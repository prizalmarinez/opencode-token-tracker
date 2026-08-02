import { slugify } from "@/lib/export";

/*
 * Deep research: the prompt that turns a plain search into a multi-source
 * research pipeline, plus the parsers that pull the final HTML report out of
 * the streamed reply. The report contract (markers) lives here so the prompt
 * and the parser share one source of truth.
 */

export const REPORT_START_MARKER = "<!--OCT-REPORT-START-->";
export const REPORT_END_MARKER = "<!--OCT-REPORT-END-->";

export const DEEP_RESEARCH_INSTRUCTIONS = `You are a deep research assistant. Run the task end-to-end in one response, working through these phases in order:

1. PLAN — restate the question, break it into 3-7 sub-questions, and list the search queries you will run.
2. RESEARCH — run many websearch queries and fetch the most promising sources with webfetch. Prefer authoritative primary sources and cross-check facts across at least two independent sources. Collect concrete numbers, dates, names and quotes. Note disagreements between sources.
3. SYNTHESIZE — write the findings as ONE standalone HTML report, delivered as the final message.

The report must be a complete, self-contained HTML document:
- Open with <!DOCTYPE html> and include <html>, <head> (with <meta charset="utf-8"> and a <title>), and <body>.
- All styling in a single <style> block inside <head>. No external CSS, fonts, images or scripts — it must render fully offline.
- Layout: a title, an executive summary up front, a section per sub-question, tables for anything tabular, and a final "Sources" section listing every URL you actually used with a one-line annotation.
- Cite sources in the prose as [n], matching the numbered Sources section.
- Keep the design clean, readable and professional.

Wrap the ENTIRE report between these two markers, one per line, with nothing else on those lines:
${REPORT_START_MARKER}
<the full report here>
${REPORT_END_MARKER}

You may stream short progress notes while researching, but the FINAL message must contain ONLY the marked report. Do not wrap the report in code fences.`;

export interface SplitReport {
  report: string | null;
  text: string;
}

export function splitReport(text: string): SplitReport {
  const start = text.indexOf(REPORT_START_MARKER);
  const end = text.indexOf(REPORT_END_MARKER);
  if (start !== -1 && end !== -1 && end > start) {
    const html = text.slice(start + REPORT_START_MARKER.length, end).trim();
    return {
      report: html || null,
      text: (
        text.slice(0, start) +
        "\n" +
        text.slice(end + REPORT_END_MARKER.length)
      ).trim(),
    };
  }
  const fence = /```html\s*([\s\S]*?)```/i.exec(text);
  if (fence && /<!doctype html|<html[\s>]/i.test(fence[1])) {
    return {
      report: fence[1].trim(),
      text: (
        text.slice(0, fence.index) +
        "\n" +
        text.slice(fence.index + fence[0].length)
      ).trim(),
    };
  }
  if (/^\s*<!doctype html|<html[\s>]/i.test(text)) {
    return { report: text.trim(), text: "" };
  }
  return { report: null, text };
}

export function reportBlob(html: string): Blob {
  return new Blob([html], { type: "text/html;charset=utf-8" });
}

export function reportFileName(title: string): string {
  return `${slugify(title)}.html`;
}
