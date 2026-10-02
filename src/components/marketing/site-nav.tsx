/**
 * The marketing header's section navigation.
 *
 * Two things it fixes over a plain row of links:
 *
 *  - Below `lg` the links used to be hidden with nothing in their place, so
 *    on a phone — where most students will actually open this — there was no
 *    way to reach any section of the page at all. They now collapse into a
 *    real menu.
 *  - On desktop the current section is highlighted as you scroll, so the
 *    header doubles as a position indicator on a long page.
 *
 * The scroll-spy is an IntersectionObserver over the section elements rather
 * than a scroll listener doing getBoundingClientRect on every frame: same
 * result, none of the layout thrash.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  { id: "try", label: "Try it" },
  { id: "result", label: "What you get" },
  { id: "tools", label: "What's inside" },
  { id: "drill", label: "Drill" },
  { id: "faq", label: "FAQ" },
  { id: "join", label: "Join" },
] as const;

const SECTION_IDS = NAV_SECTIONS.map((section) => section.id);

/** Returns the id of the section currently occupying the viewport. */
function useScrollSpy(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    // Keyed by id rather than reduced on the fly: entries only arrive for
    // sections that changed, so the last-known ratio of the others has to be
    // remembered or the highlight flickers off on every scroll tick.
    const ratios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let best: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of ratios) {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }
        setActive(best);
      },
      {
        // Discounts the sticky header, and biases toward the section the
        // reader is actually looking at rather than one just entering.
        rootMargin: "-20% 0px -45% 0px",
        threshold: [0, 0.15, 0.35, 0.6, 0.9],
      },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

/** The desktop row of section links, with the current section marked. */
export function SiteNavLinks() {
  const active = useScrollSpy(SECTION_IDS);

  return (
    <nav aria-label="Sections" className="hidden items-center gap-7 text-sm font-medium lg:flex">
      {NAV_SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          aria-current={active === section.id ? "true" : undefined}
          className={cn(
            "nav-link transition-colors",
            active === section.id
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}

/**
 * The small-screen menu. Lives in the header's right-hand group next to the
 * call to action, and drops a panel across the full width of the header.
 */
export function SiteNavMobile() {
  const active = useScrollSpy(SECTION_IDS);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  // Escape closes, and focus goes back to the button that opened it rather
  // than being dumped at the top of the document.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (event.key === "Tab") {
        const focusable = panelRef.current?.querySelectorAll<HTMLElement>("a[href], button");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    panelRef.current?.querySelector<HTMLElement>("a[href], button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="site-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        className="pop-sm pop-press flex size-9 shrink-0 items-center justify-center bg-surface lg:hidden"
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>

      {/* Rendered always so the panel can animate; `hidden` keeps it out of
          the accessibility tree and out of the tab order when closed. */}
      <div
        ref={panelRef}
        id="site-nav-panel"
        hidden={!open}
        className="absolute inset-x-3 top-full z-50 lg:hidden"
      >
        <nav aria-label="Mobile sections" className="pop pop-in mt-2 overflow-hidden p-2">
          {NAV_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={close}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                active === section.id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {section.label}
              {active === section.id ? (
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              ) : null}
            </a>
          ))}
          <a
            href="/auth"
            onClick={close}
            className="mt-1 flex items-center justify-center rounded-lg border border-border bg-surface px-3 py-3 text-sm font-semibold text-foreground"
          >
            Sign in
          </a>
        </nav>
      </div>
    </>
  );
}
