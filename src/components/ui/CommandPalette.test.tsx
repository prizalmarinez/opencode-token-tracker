import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "./CommandPalette";
import { getProjects } from "@/lib/api";
import { navigate } from "@/lib/navigate";
import type { ProjectOverview } from "@/types";

vi.mock("@/lib/api", () => ({ getProjects: vi.fn() }));
vi.mock("@/lib/navigate", () => ({ navigate: vi.fn() }));

const project = (name: string): ProjectOverview => ({
  name,
  sessions: 1,
  cost: 0,
  tokens: 0,
  firstMs: 0,
  lastMs: 0,
  totalDurationMs: 0,
  avgDurationMs: 0,
  avgCost: 0,
});

const projects = [project("alpha-project"), project("beta-project")];

function renderPalette(
  props: Partial<Parameters<typeof CommandPalette>[0]> = {},
) {
  return render(
    <CommandPalette
      dbPath=""
      refreshKey={0}
      searchVisible={false}
      modelsVisible={false}
      skillsVisible={false}
      onClose={vi.fn()}
      {...props}
    />,
  );
}

const queryInput = () => screen.getByLabelText("Search pages and projects");

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.mocked(getProjects).mockResolvedValue(projects);
    vi.mocked(navigate).mockClear();
  });

  it("renders the core pages and honors the visibility flags", async () => {
    renderPalette({
      searchVisible: true,
      modelsVisible: true,
      skillsVisible: true,
    });

    expect(screen.getByRole("button", { name: /usage/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /projects/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /status/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /settings/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /chat/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /models/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /skills/ })).toBeInTheDocument();

    expect(
      await screen.findByRole("button", { name: /alpha-project/ }),
    ).toBeInTheDocument();
  });

  it("hides gated pages when their flags are off", () => {
    renderPalette();
    expect(
      screen.queryByRole("button", { name: /chat/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /models/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /skills/ }),
    ).not.toBeInTheDocument();
  });

  it("filters pages and projects by query", async () => {
    const user = userEvent.setup();
    renderPalette();
    await screen.findByRole("button", { name: /alpha-project/ });

    await user.type(queryInput(), "beta");

    expect(
      screen.getByRole("button", { name: /beta-project/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /alpha-project/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /usage/ }),
    ).not.toBeInTheDocument();
  });

  it("navigates with arrow keys and Enter", async () => {
    const user = userEvent.setup();
    renderPalette();
    await screen.findByRole("button", { name: /alpha-project/ });

    queryInput().focus();
    await user.keyboard("{ArrowDown}{Enter}");

    expect(navigate).toHaveBeenCalledWith("/projects");
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderPalette({ onClose });

    queryInput().focus();
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows a no-matches message for an empty result set", async () => {
    const user = userEvent.setup();
    renderPalette();
    await screen.findByRole("button", { name: /alpha-project/ });

    await user.type(queryInput(), "zzz");

    expect(screen.getByText(/no matches/)).toBeInTheDocument();
  });
});
