import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge>ready</Badge>);
    expect(screen.getByText("ready")).toBeInTheDocument();
  });

  it("applies the variant class", () => {
    render(<Badge variant="positive">ok</Badge>);
    expect(screen.getByText("ok").className).toContain("text-positive");
  });

  it("merges extra className", () => {
    render(<Badge className="custom">x</Badge>);
    expect(screen.getByText("x").className).toContain("custom");
  });

  it("passes style through", () => {
    render(<Badge style={{ color: "red" }}>x</Badge>);
    expect(screen.getByText("x")).toHaveAttribute("style", "color: red;");
  });
});
