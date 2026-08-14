import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTypewriter } from "./use-typewriter";

describe("useTypewriter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reveals the text progressively when animate is true", () => {
    const { result } = renderHook(() => useTypewriter("hello", true));
    expect(result.current.shown).toBe("");
    expect(result.current.typing).toBe(true);
    act(() => vi.advanceTimersByTime(32));
    expect(result.current.shown).toBe("hello");
    expect(result.current.typing).toBe(false);
  });

  it("shows the full text immediately when animate is false", () => {
    const { result } = renderHook(() => useTypewriter("hello", false));
    expect(result.current.shown).toBe("hello");
    expect(result.current.typing).toBe(false);
  });

  it("continues from the current position when the text grows mid-stream", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriter(text, true),
      { initialProps: { text: "abc" } },
    );
    act(() => vi.advanceTimersByTime(16));
    expect(result.current.shown).toBe("abc");
    rerender({ text: "abcdef" });
    expect(result.current.shown).toBe("abc");
    expect(result.current.typing).toBe(true);
    act(() => vi.advanceTimersByTime(16));
    expect(result.current.shown).toBe("abcdef");
    expect(result.current.typing).toBe(false);
  });

  it("never overshoots the text length", () => {
    const { result } = renderHook(() => useTypewriter("hi", true));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.shown).toBe("hi");
    expect(result.current.typing).toBe(false);
  });
});
