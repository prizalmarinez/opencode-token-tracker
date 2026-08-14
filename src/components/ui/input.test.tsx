import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./input";

describe("Input", () => {
  it("renders with type and placeholder", () => {
    render(<Input type="search" placeholder="Search…" />);
    const input = screen.getByPlaceholderText("Search…");
    expect(input).toHaveAttribute("type", "search");
  });

  it("forwards a ref", () => {
    const ref: { current: HTMLInputElement | null } = { current: null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("fires onChange while typing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input onChange={onChange} />);
    await user.type(screen.getByRole("textbox"), "hi");
    expect(onChange).toHaveBeenCalled();
  });

  it("merges extra className", () => {
    render(<Input className="custom" />);
    expect(screen.getByRole("textbox").className).toContain("custom");
  });
});
