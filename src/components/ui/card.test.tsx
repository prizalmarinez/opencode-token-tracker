import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardDescription, CardHeader, CardTitle } from "./card";

describe("Card", () => {
  it("renders children in a div with the card-surface class", () => {
    render(<Card>hello</Card>);
    const card = screen.getByText("hello");
    expect(card.tagName).toBe("DIV");
    expect(card.className).toContain("card-surface");
  });

  it("merges extra className", () => {
    render(<Card className="custom-card">x</Card>);
    expect(screen.getByText("x").className).toContain("custom-card");
  });
});

describe("Card subcomponents", () => {
  it("renders a header, title and description", () => {
    render(
      <CardHeader>
        <CardTitle>My title</CardTitle>
        <CardDescription>My description</CardDescription>
      </CardHeader>,
    );
    expect(screen.getByText("My title").tagName).toBe("H3");
    expect(screen.getByText("My description").tagName).toBe("P");
  });

  it("merges className on each subcomponent", () => {
    render(
      <CardHeader className="hdr">
        <CardTitle className="ttl">t</CardTitle>
        <CardDescription className="dsc">d</CardDescription>
      </CardHeader>,
    );
    expect(screen.getByText("t").className).toContain("ttl");
    expect(screen.getByText("d").className).toContain("dsc");
  });
});
