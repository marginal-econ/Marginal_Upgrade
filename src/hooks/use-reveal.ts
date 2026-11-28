import { useEffect, useRef } from "react";

/** Reveals an element once when it first enters the viewport. */
export function useReveal<T extends HTMLElement>(options?: { rootMargin?: string }) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reveal = () => {
      element.dataset["revealed"] = "true";
    };

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      reveal();
      return;
    }

    // Immediately reveal elements already in the initial viewport so above-the-fold
    // hero copy and CTA buttons never stall on bottom-inset IntersectionObserver margins.
    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      const raf = window.requestAnimationFrame(reveal);
      return () => window.cancelAnimationFrame(raf);
    }

    // Cross-browser safety net: guarantees content becomes visible after 1.2s
    // even if Safari / WebKit or mobile low-power mode delays or drops IO callbacks.
    const timer = window.setTimeout(reveal, 1200);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            window.clearTimeout(timer);
            reveal();
            observer.disconnect();
          }
        }
      },
      { rootMargin: options?.rootMargin ?? "0px 0px -12% 0px", threshold: 0.05 },
    );

    observer.observe(element);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [options?.rootMargin]);

  return ref;
}
