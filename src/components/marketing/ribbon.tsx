import { cn } from "@/lib/utils";

/**
 * Feature marquee ticker across the hero section.
 *
 * Displays key Cambridge 9708 Economics capabilities in an infinite,
 * smooth kinetic loop with dual edge fade masks and assessment-objective-specific
 * glowing indicators.
 */

function getDotColor(item: string): string {
  if (item.includes("AO1")) return "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]";
  if (item.includes("AO2")) return "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]";
  if (item.includes("AO3")) return "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.7)]";
  if (item.includes("Unlimited") || item.includes("Resume"))
    return "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]";
  return "bg-primary shadow-[0_0_8px_rgba(168,85,247,0.7)]";
}

export function Ribbon({ items, className }: { items: string[]; className?: string }) {
  const doubled = [...items, ...items];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "marquee-container group relative w-full overflow-hidden border-y border-border/70 bg-card/60 backdrop-blur-xl py-2.5 sm:py-3 select-none transition-colors",
        className,
      )}
    >
      {/* Subtle top & bottom edge cosmic ambient glow lines */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />

      {/* Smooth gradient fade masks on both edges prevent harsh letter clipping */}
      <div className="marquee-mask w-full overflow-hidden">
        <div className="marquee-track flex items-center">
          {doubled.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="flex shrink-0 items-center gap-2.5 px-4 sm:px-6 text-xs sm:text-[13px] font-semibold text-foreground/90 transition-colors group-hover:text-foreground"
            >
              <span className={cn("size-2 rounded-full shrink-0", getDotColor(item))} />
              <span className="tracking-wide whitespace-nowrap">{item}</span>
              <span
                className="text-primary/35 text-xs font-mono ml-2 sm:ml-3 select-none"
                aria-hidden="true"
              >
                ✦
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
