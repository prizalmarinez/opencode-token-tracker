import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Leaderboard } from "./Leaderboard";

interface Row {
  id: string;
  name: string;
  installs: string;
}

const tabs = [
  { key: "all", label: "all-time" },
  { key: "hot", label: "hot" },
] as const;

const row: Row = { id: "a", name: "alpha", installs: "1.2M" };

function renderBoard(
  overrides: {
    activeTab?: (typeof tabs)[number]["key"];
    onTabChange?: (key: (typeof tabs)[number]["key"]) => void;
    loading?: boolean;
    error?: string | null;
    body?: ReactNode;
    toolbarEnd?: ReactNode;
    footnote?: ReactNode;
  } = {},
) {
  return render(
    <Leaderboard
      eyebrow="catalog"
      title="Skills"
      description="desc"
      tabs={[...tabs]}
      activeTab={overrides.activeTab ?? "all"}
      onTabChange={overrides.onTabChange ?? vi.fn()}
      toolbarEnd={overrides.toolbarEnd}
      footnote={overrides.footnote}
      loading={overrides.loading ?? false}
      error={overrides.error ?? null}
      loadingLabel="loading…"
      errorTitle="Failed to load"
      body={overrides.body}
      items={[row]}
      columns={[
        {
          header: "installs",
          headerClass: "",
          cellClass: "",
          render: (r: Row) => r.installs,
        },
      ]}
      rowKey={(r) => r.id}
      nameHeader="skill"
      rank={(_, i) => i + 1}
      name={(r) => r.name}
      subtitle={() => "sub"}
      countLabel="10 results"
    />,
  );
}

describe("Leaderboard", () => {
  it("renders the header, tabs and data table", async () => {
    renderBoard();
    expect(screen.getByText("catalog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Skills/ })).toBeInTheDocument();
    expect(screen.getByText("desc")).toBeInTheDocument();

    const allTab = screen.getByRole("button", { name: "all-time" });
    const hotTab = screen.getByRole("button", { name: "hot" });
    expect(allTab).toHaveAttribute("aria-pressed", "true");
    expect(hotTab).toHaveAttribute("aria-pressed", "false");

    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("1.2M")).toBeInTheDocument();
  });

  it("reports tab changes", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    renderBoard({ onTabChange });
    await user.click(screen.getByRole("button", { name: "hot" }));
    expect(onTabChange).toHaveBeenCalledWith("hot");
  });

  it("shows the loading fallback while loading", () => {
    renderBoard({ loading: true });
    expect(screen.getByText("loading…")).toBeInTheDocument();
    expect(screen.queryByText("alpha")).not.toBeInTheDocument();
  });

  it("shows the error fallback when an error is set", () => {
    renderBoard({ error: "boom" });
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
    expect(screen.getByText(/boom/)).toBeInTheDocument();
    expect(screen.queryByText("alpha")).not.toBeInTheDocument();
  });

  it("renders the body slot instead of loading/error/table", () => {
    renderBoard({ loading: true, body: <p>custom body</p> });
    expect(screen.getByText("custom body")).toBeInTheDocument();
    expect(screen.queryByText("loading…")).not.toBeInTheDocument();
  });

  it("renders toolbarEnd and footnote", () => {
    renderBoard({
      toolbarEnd: <button type="button">filter</button>,
      footnote: "the footnote",
    });
    expect(screen.getByRole("button", { name: "filter" })).toBeInTheDocument();
    expect(screen.getByText("the footnote")).toBeInTheDocument();
  });
});
