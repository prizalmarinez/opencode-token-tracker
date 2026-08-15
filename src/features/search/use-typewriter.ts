import { useEffect, useRef, useState } from "react";

const TICK_MS = 16;
const CHARS_PER_TICK = 8;

/*
 * Reveals text progressively (typewriter effect). `animate` gates the effect:
 * when false the full text renders instantly, so only the newest fresh
 * assistant message types. Streaming text (parts growing as tokens arrive)
 * continues from the current position instead of restarting. The interval
 * stops once it catches up and restarts when the text grows (the effect's
 * `text` dependency re-arms it). All setState happens inside the interval
 * callback — the react-hooks/set-state-in-effect rule forbids synchronous
 * state writes in the effect body.
 */
export function useTypewriter(text: string, animate: boolean) {
  const textRef = useRef(text);
  const countRef = useRef(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    if (!animate) return;
    const id = window.setInterval(() => {
      const len = textRef.current.length;
      if (countRef.current >= len) {
        window.clearInterval(id);
        return;
      }
      // Skip the animation when the tab is hidden or reduced motion is
      // preferred — jump straight to the end.
      if (
        document.hidden ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        countRef.current = len;
        setCount(len);
        window.clearInterval(id);
        return;
      }
      countRef.current = Math.min(countRef.current + CHARS_PER_TICK, len);
      setCount(countRef.current);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [animate, text]);

  return {
    shown: animate ? text.slice(0, count) : text,
    typing: animate && count < text.length,
  };
}
