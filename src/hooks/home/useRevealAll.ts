import { useEffect } from "react";

/** Adds .rev to every .f-item under the container as it scrolls into view. */
export function useRevealAll<T extends HTMLElement>(
  container: React.RefObject<T | null>,
  deps: readonly unknown[] = [],
) {
  useEffect(() => {
    const root = container.current;
    if (!root) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const items = Array.from(root.querySelectorAll<HTMLElement>(".f-item:not(.rev)"));
    if (reduced || typeof IntersectionObserver === "undefined") {
      items.forEach((el) => el.classList.add("rev"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("rev");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18 },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, ...deps]);
}
