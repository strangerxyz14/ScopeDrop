import { useEffect, useRef } from "react";

export function usePrefersReducedMotion(): boolean {
  const ref = useRef(false);
  if (typeof window !== "undefined" && window.matchMedia) {
    ref.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  return ref.current;
}

/**
 * Attaches an IntersectionObserver to `ref` that adds `revealClass` (default "rev")
 * on first intersection, then unobserves. Under prefers-reduced-motion the class is
 * applied immediately so contents never stay invisible.
 */
export function useReveal<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  options?: { threshold?: number; revealClass?: string },
): void {
  const threshold = options?.threshold ?? 0.18;
  const revealClass = options?.revealClass ?? "rev";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      el.classList.add(revealClass);
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      el.classList.add(revealClass);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add(revealClass);
            io.unobserve(e.target);
          }
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold, revealClass]);
}
