import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeaderboardTable, type LeaderboardColumn } from "./LeaderboardTable";

interface Row {
  id: string;
  name: string;
  repo: string;
  installs: string;
}

const columns: LeaderboardColumn<Row>[] = [
  {
    header: "installs",
    headerClass: "w-24 text-right",
    cellClass: "w-24 text-right",
    render: (r) => r.installs,
  },
];

const items: Row[] = [
  { id: "a", name: "alpha", repo: "org/alpha", installs: "1.2M" },
  { id: "b", name: "beta", repo: "org/beta", installs: "900" },
];

function renderTable(
  props: Partial<Parameters<typeof LeaderboardTable<Row>>[0]> = {},
) {
  return render(
    <LeaderboardTable
      items={items}
      columns={columns}
      rowKey={(r) => r.id}
      nameHeader="skill"
      rank={(_, i) => i + 1}
      name={(r) => r.name}
      subtitle={(r) => r.repo}
      countLabel="100 results"
      cardTitle="Skills"
      {...props}
    />,
  );
}

describe("LeaderboardTable", () => {
  it("renders the card chrome, header and rows", () => {
    renderTable();
    expect(screen.getByText("100 results")).toBeInTheDocument();
    expect(screen.getByText("Skills")).toBeInTheDocument();
    expect(screen.getByText("installs")).toBeInTheDocument();
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("org/alpha")).toBeInTheDocument();
    expect(screen.getByText("1.2M")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders a footer", () => {
    renderTable({ footer: <p>footnote</p> });
    expect(screen.getByText("footnote")).toBeInTheDocument();
  });

  it("renders no rows when items is empty", () => {
    renderTable({ items: [] });
    expect(screen.queryByText("alpha")).not.toBeInTheDocument();
  });
});
