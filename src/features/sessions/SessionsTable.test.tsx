import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OpencodeSession } from "@/types";
import { navigate } from "@/lib/navigate";
import { SessionsTable } from "./SessionsTable";

vi.mock("@/lib/navigate", () => ({ navigate: vi.fn() }));

const session: OpencodeSession = {
  id: "s1",
  timeCreated: Date.now() - 3_600_000,
  title: "implement the thing",
  modelId: "anthropic/claude-4.6",
  providerId: null,
  variant: null,
  agent: "build",
  directory: "/dev/proj",
  projectName: "github.com/user/proj",
  projectDir: "/dev/proj",
  cost: 0.42,
  tokensInput: 1200,
  tokensOutput: 800,
  tokensReasoning: 300,
  tokensCacheRead: 0,
  tokensCacheWrite: 0,
};

describe("SessionsTable", () => {
  it("renders session rows with short project name", () => {
    render(<SessionsTable sessions={[session]} />);
    expect(screen.getByText("implement the thing")).toBeInTheDocument();
    expect(screen.getByText("anthropic/claude-4.6")).toBeInTheDocument();
    expect(screen.getByText("build")).toBeInTheDocument();
    expect(screen.getByText("proj")).toBeInTheDocument();
    expect(screen.getByText("1h ago")).toBeInTheDocument();
    expect(screen.getByText("2.3K")).toBeInTheDocument();
    expect(screen.getByText("$0.4200")).toBeInTheDocument();
  });

  it("renders a dash for sessions without a project", () => {
    render(<SessionsTable sessions={[{ ...session, projectName: null }]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("navigates to the project page from the project link", async () => {
    const user = userEvent.setup();
    render(<SessionsTable sessions={[session]} />);
    await user.click(screen.getByRole("link", { name: "proj" }));
    expect(navigate).toHaveBeenCalledWith("/project/github.com%2Fuser%2Fproj");
  });

  it("shows the empty state", () => {
    render(<SessionsTable sessions={[]} />);
    expect(screen.getByText("No sessions found.")).toBeInTheDocument();
  });
});
