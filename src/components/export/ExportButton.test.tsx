import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportButton } from "./ExportButton";
import { exportDomPdf, exportReport } from "@/lib/export";

vi.mock("@/lib/export", () => ({
  EXPORT_MARKERS: { hide: "data-export-hide" },
  exportReport: vi.fn(),
  exportDomPdf: vi.fn(),
}));

const baseProps = {
  dbPath: "/path/to.db",
  filenameBase: "report",
  title: "Report title",
  subtitle: "Report subtitle",
};

describe("ExportButton", () => {
  beforeEach(() => {
    vi.mocked(exportReport).mockClear();
    vi.mocked(exportDomPdf).mockClear();
    vi.mocked(exportReport).mockResolvedValue(new Blob(["x"]));
    vi.mocked(exportDomPdf).mockResolvedValue(new Blob(["x"]));
  });

  it("lists the three formats in the dropdown", async () => {
    const user = userEvent.setup();
    render(<ExportButton {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByRole("menuitem", { name: /PDF/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /XLSX/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /CSV/ })).toBeInTheDocument();
  });

  it("exports CSV through exportReport", async () => {
    const user = userEvent.setup();
    render(<ExportButton {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("menuitem", { name: /CSV/ }));
    await waitFor(() =>
      expect(exportReport).toHaveBeenCalledWith({
        format: "csv",
        dbPath: "/path/to.db",
        project: undefined,
        overview: undefined,
        title: "Report title",
        subtitle: "Report subtitle",
      }),
    );
  });

  it("uses the DOM capture fork when a captureRef is provided", async () => {
    const user = userEvent.setup();
    const captureRef = createRef<HTMLDivElement>();
    render(
      <div ref={captureRef}>
        <ExportButton {...baseProps} captureRef={captureRef} />
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("menuitem", { name: /PDF/ }));
    await waitFor(() => expect(exportDomPdf).toHaveBeenCalledTimes(1));
    expect(exportReport).not.toHaveBeenCalled();
  });

  it("applies the export-hide marker to its root", () => {
    const { container } = render(<ExportButton {...baseProps} />);
    expect(container.firstElementChild).toHaveAttribute(
      "data-export-hide",
      "true",
    );
  });
});
