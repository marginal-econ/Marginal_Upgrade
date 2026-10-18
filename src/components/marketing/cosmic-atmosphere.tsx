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
  { top: "6%", left: "8%", size: 14, delay: "0s", duration: "3.2s", color: "text-amber-400/90" },
  { top: "12%", left: "85%", size: 18, delay: "1.0s", duration: "4.0s", color: "text-primary/90" },
  { top: "18%", left: "42%", size: 10, delay: "2.4s", duration: "2.8s", color: "text-emerald-400/75" },
  { top: "24%", left: "15%", size: 12, delay: "1.8s", duration: "3.6s", color: "text-violet-400/85" },
  { top: "28%", left: "72%", size: 16, delay: "0.5s", duration: "4.4s", color: "text-amber-300/80" },
  { top: "36%", left: "92%", size: 12, delay: "2.1s", duration: "3.5s", color: "text-cyan-400/80" },
  { top: "44%", left: "5%", size: 14, delay: "1.3s", duration: "3.9s", color: "text-primary/85" },
  { top: "52%", left: "48%", size: 11, delay: "3.0s", duration: "3.1s", color: "text-emerald-300/75" },
  { top: "58%", left: "28%", size: 15, delay: "0.7s", duration: "4.2s", color: "text-violet-300/85" },
  { top: "65%", left: "88%", size: 13, delay: "2.5s", duration: "3.8s", color: "text-amber-400/80" },
  { top: "74%", left: "12%", size: 16, delay: "1.1s", duration: "4.5s", color: "text-primary/90" },
  { top: "78%", left: "62%", size: 10, delay: "2.8s", duration: "3.0s", color: "text-cyan-300/75" },
  { top: "85%", left: "38%", size: 14, delay: "1.6s", duration: "4.1s", color: "text-violet-400/85" },
  { top: "90%", left: "82%", size: 12, delay: "0.2s", duration: "3.4s", color: "text-amber-400/80" },
  { top: "94%", left: "20%", size: 10, delay: "2.9s", duration: "3.2s", color: "text-emerald-400/70" },
  { top: "32%", left: "34%", size: 8, delay: "1.4s", duration: "2.9s", color: "text-white/80" },
  { top: "68%", left: "75%", size: 9, delay: "3.3s", duration: "3.3s", color: "text-white/85" },
  { top: "15%", left: "25%", size: 8, delay: "0.9s", duration: "3.7s", color: "text-amber-200/70" },
];

const COMET_CONFIGS = [
  { top: "10%", left: "5%", delay: "0.8s", duration: "6.5s" },
  { top: "25%", left: "35%", delay: "3.8s", duration: "7.2s" },
  { top: "5%", left: "60%", delay: "6.0s", duration: "6.8s" },
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
        <div className="absolute top-[-10%] left-[10%] size-[550px] rounded-full bg-primary/18 blur-[120px] dark:bg-primary/30" />
        <div className="absolute top-[20%] right-[5%] size-[500px] rounded-full bg-violet-600/18 blur-[130px] dark:bg-violet-600/30" />
        <div className="absolute bottom-[5%] left-[25%] size-[450px] rounded-full bg-amber-500/12 blur-[110px] dark:bg-amber-500/20" />
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
      ? STAR_CONFIGS.slice(0, 6)
      : density === "high"
      ? STAR_CONFIGS
      : STAR_CONFIGS.slice(0, 12);

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

      {/* Extreme Shooting Comets (front page visual dynamism) */}
      {variant === "hero" && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {COMET_CONFIGS.map((comet, idx) => (
            <div
              key={idx}
              className="shooting-comet pointer-events-none"
              style={{
                top: comet.top,
                left: comet.left,
                animationDelay: comet.delay,
                animationDuration: comet.duration,
              }}
            />
          ))}
        </div>
      )}

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
