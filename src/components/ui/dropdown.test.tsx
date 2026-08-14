import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropdownMenu } from "./dropdown";
import { Button } from "./button";

const item = (overrides?: Partial<{ disabled: boolean; hint: string }>) => ({
  key: "a",
  label: "Alpha",
  onSelect: vi.fn(),
  ...overrides,
});

describe("DropdownMenu", () => {
  it("is closed until the trigger is clicked, then lists the items", async () => {
    const user = userEvent.setup();
    render(<DropdownMenu trigger={<Button>menu</Button>} items={[item()]} />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "menu" }));
    const menu = screen.getByRole("menu");
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Alpha" })).toBeInTheDocument();
  });

  it("calls onSelect and closes when an item is chosen", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DropdownMenu
        trigger={<Button>menu</Button>}
        items={[{ key: "a", label: "Alpha", onSelect }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Alpha" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("keeps disabled items inert", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DropdownMenu
        trigger={<Button>menu</Button>}
        items={[{ key: "a", label: "Alpha", disabled: true, onSelect }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "menu" }));
    const menuitem = screen.getByRole("menuitem", { name: "Alpha" });
    expect(menuitem).toBeDisabled();
    await user.click(menuitem);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<DropdownMenu trigger={<Button>menu</Button>} items={[item()]} />);
    await user.click(screen.getByRole("button", { name: "menu" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("aligns the menu start or end", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu
        trigger={<Button>menu</Button>}
        align="start"
        items={[item()]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "menu" }));
    expect(screen.getByRole("menu").className).toContain("left-0");
  });

  it("renders item hints", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu
        trigger={<Button>menu</Button>}
        items={[item({ hint: "h" })]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "menu" }));
    expect(screen.getByText("h")).toBeInTheDocument();
  });
});
