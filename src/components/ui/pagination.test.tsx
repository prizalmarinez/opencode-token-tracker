import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "./pagination";

describe("Pagination", () => {
  it("renders nothing when there is only one page", () => {
    const { container } = render(
      <Pagination
        page={1}
        pageCount={1}
        total={5}
        pageSize={10}
        onPrev={() => {}}
        onNext={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the current range and total", () => {
    render(
      <Pagination
        page={1}
        pageCount={3}
        total={25}
        pageSize={10}
        onPrev={() => {}}
        onNext={() => {}}
      />,
    );
    expect(screen.getByText("1–10")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("disables prev on the first page and next on the last", () => {
    render(
      <Pagination
        page={1}
        pageCount={3}
        total={25}
        pageSize={10}
        onPrev={() => {}}
        onNext={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
  });

  it("calls onPrev and onNext", async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <Pagination
        page={2}
        pageCount={3}
        total={25}
        pageSize={10}
        onPrev={onPrev}
        onNext={onNext}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Previous page" }));
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
