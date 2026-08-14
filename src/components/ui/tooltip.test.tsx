import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

describe("Tooltip", () => {
  it("shows the content when the trigger is hovered", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button>hover me</button>
          </TooltipTrigger>
          <TooltipContent>tooltip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await user.hover(screen.getByRole("button", { name: "hover me" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "tooltip text",
    );
  });
});
