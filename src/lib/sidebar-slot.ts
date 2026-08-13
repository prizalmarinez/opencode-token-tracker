import { createContext, useContext } from "react";

/*
 * The App-level sidebar owns a scrollable slot. /chat portals its thread
 * list into that slot so the threads feel native to the nav sidebar instead
 * of a second floating column. The value is the slot DOM element itself
 * (state, not a ref) so a portal can target it during render.
 */
export const SidebarSlotContext = createContext<HTMLDivElement | null>(null);

export function useSidebarSlot(): HTMLDivElement | null {
  return useContext(SidebarSlotContext);
}
