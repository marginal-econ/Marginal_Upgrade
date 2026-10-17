import React from "react";
import { cn } from "@/lib/utils";

interface CosmicAtmosphereProps {
  className?: string;
  variant?: "hero" | "emerald" | "purple" | "cyan" | "amber" | "default";
  sparkles?: boolean;
  density?: "low" | "medium" | "high";
}

/**
 * 4-point twinkling star SVG with native CSS twinkle animation.
 */
function TwinkleStar({
  top,
  left,
  size = 14,
  delay = "0s",
  duration = "3.5s",
  color = "currentColor",
  className,
}: {
  top: string;
  left: string;
  size?: number;
  delay?: string;
  duration?: string;
  color?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("pointer-events-none absolute", className)}
      style={{
        top,
        left,
        animation: `twinkle ${duration} ease-in-out infinite`,
        animationDelay: delay,
      }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={color}
        className="drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]"
      >
        <path d="M12 0c.6 6.3 5.7 11.4 12 12-6.3.6-11.4 5.7-12 12-.6-6.3-5.7-11.4-12-12C6.3 11.4 11.4 6.3 12 0Z" />
      </svg>
    </div>
  );
}

const STAR_CONFIGS = [
  { top: "8%", left: "6%", size: 12, delay: "0s", duration: "3.8s", color: "text-amber-400/70" },
  { top: "14%", left: "88%", size: 16, delay: "1.2s", duration: "4.2s", color: "text-primary/75" },
  { top: "28%", left: "18%", size: 10, delay: "2.1s", duration: "3.2s", color: "text-emerald-400/60" },
  { top: "35%", left: "78%", size: 14, delay: "0.6s", duration: "4.5s", color: "text-violet-400/80" },
  { top: "52%", left: "8%", size: 14, delay: "1.8s", duration: "3.6s", color: "text-cyan-400/70" },
  { top: "60%", left: "92%", size: 11, delay: "2.7s", duration: "4.0s", color: "text-amber-400/70" },
  { top: "72%", left: "24%", size: 15, delay: "0.9s", duration: "4.4s", color: "text-primary/80" },
  { top: "84%", left: "82%", size: 13, delay: "1.5s", duration: "3.7s", color: "text-emerald-400/70" },
  { top: "90%", left: "48%", size: 10, delay: "2.3s", duration: "3.4s", color: "text-violet-300/60" },
  { top: "42%", left: "46%", size: 8, delay: "3.1s", duration: "4.1s", color: "text-amber-300/50" },
];

export function CosmicAtmosphere({
  className,
  variant = "default",
  sparkles = true,
  density = "medium",
}: CosmicAtmosphereProps) {
  const gradientStyles = {
    hero: (
      <>
        <div className="absolute top-[-10%] left-[10%] size-[500px] rounded-full bg-primary/15 blur-[120px] dark:bg-primary/25" />
        <div className="absolute top-[20%] right-[5%] size-[450px] rounded-full bg-violet-600/15 blur-[130px] dark:bg-violet-600/25" />
        <div className="absolute bottom-[5%] left-[30%] size-[400px] rounded-full bg-amber-500/10 blur-[110px] dark:bg-amber-500/15" />
      </>
    ),
    emerald: (
      <>
        <div className="absolute top-[5%] left-[15%] size-[480px] rounded-full bg-emerald-500/12 blur-[120px] dark:bg-emerald-500/20" />
        <div className="absolute bottom-[10%] right-[10%] size-[420px] rounded-full bg-primary/12 blur-[110px] dark:bg-primary/20" />
      </>
    ),
    purple: (
      <>
        <div className="absolute top-[10%] right-[15%] size-[520px] rounded-full bg-purple-600/15 blur-[130px] dark:bg-purple-600/25" />
        <div className="absolute bottom-[5%] left-[10%] size-[420px] rounded-full bg-indigo-500/12 blur-[110px] dark:bg-indigo-500/20" />
      </>
    ),
    cyan: (
      <>
        <div className="absolute top-[5%] left-[20%] size-[450px] rounded-full bg-cyan-500/12 blur-[120px] dark:bg-cyan-500/20" />
        <div className="absolute bottom-[10%] right-[15%] size-[450px] rounded-full bg-primary/12 blur-[120px] dark:bg-primary/20" />
      </>
    ),
    amber: (
      <>
        <div className="absolute top-[10%] left-[15%] size-[420px] rounded-full bg-amber-500/12 blur-[110px] dark:bg-amber-500/20" />
        <div className="absolute bottom-[5%] right-[20%] size-[480px] rounded-full bg-primary/12 blur-[120px] dark:bg-primary/20" />
      </>
    ),
    default: (
      <>
        <div className="absolute top-[10%] left-[12%] size-[460px] rounded-full bg-primary/10 blur-[120px] dark:bg-primary/20" />
        <div className="absolute bottom-[10%] right-[8%] size-[480px] rounded-full bg-violet-600/10 blur-[130px] dark:bg-violet-600/20" />
      </>
    ),
  }[variant];

  const starsToRender =
    density === "low"
      ? STAR_CONFIGS.slice(0, 4)
      : density === "high"
      ? STAR_CONFIGS
      : STAR_CONFIGS.slice(0, 7);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 -z-0 overflow-hidden select-none",
        className,
      )}
      aria-hidden="true"
    >
      {/* Background Mesh Gradient Orbs */}
      <div className="pointer-events-none absolute inset-0 opacity-80 transition-opacity duration-1000">
        {gradientStyles}
      </div>

      {/* Subtle Starfield Mesh */}
      <div className="starfield pointer-events-none absolute inset-0" />

      {/* Floating Sparkle Stars */}
      {sparkles && (
        <div className="pointer-events-none absolute inset-0">
          {starsToRender.map((star, idx) => (
            <TwinkleStar
              key={idx}
              top={star.top}
              left={star.left}
              size={star.size}
              delay={star.delay}
              duration={star.duration}
              className={star.color}
            />
          ))}
        </div>
      )}
    </div>
  );
}
