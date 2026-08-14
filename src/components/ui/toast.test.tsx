import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "./toast";

function Harness({
  variant,
}: {
  variant?: "default" | "positive" | "negative";
}) {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        toast({
          title: "Saved",
          description: "All good",
          ...(variant ? { variant } : {}),
        })
      }
    >
      fire
    </button>
  );
}

describe("ToastProvider", () => {
  it("renders a toast with title and description", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "fire" }));
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("supports multiple toasts", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    const fire = screen.getByRole("button", { name: "fire" });
    await user.click(fire);
    await user.click(fire);
    expect(screen.getAllByText("Saved")).toHaveLength(2);
  });

  it("dismisses a toast via its close button", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "fire" }));
    await user.click(
      screen.getByRole("button", { name: "Dismiss notification" }),
    );
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("applies the negative variant class", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Harness variant="negative" />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "fire" }));
    expect(screen.getByRole("status").className).toContain(
      "border-negative/30",
    );
  });

  it("throws when used outside a provider", () => {
    expect(() => render(<Harness />)).toThrow(/ToastProvider/);
  });
});
