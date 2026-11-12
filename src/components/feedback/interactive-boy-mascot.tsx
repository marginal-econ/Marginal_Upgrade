import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Lightbulb, Bug, HelpCircle, ThumbsUp, Send } from "lucide-react";
import { type FeedbackCategory } from "@/lib/feedback.functions";
import { cn } from "@/lib/utils";

interface InteractiveBoyMascotProps {
  category: FeedbackCategory;
  isTyping?: boolean;
  isSubmitting?: boolean;
  isHoveringSend?: boolean;
  activeField?: "category" | "subject" | "message" | "name" | "email" | null;
  className?: string;
  onBugClick?: () => void;
}

export function InteractiveBoyMascot({
  category,
  isTyping = false,
  isSubmitting = false,
  isHoveringSend = false,
  activeField = null,
  className,
  onBugClick,
}: InteractiveBoyMascotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bugRef = useRef<HTMLDivElement>(null);
  const pointerPosRef = useRef({ x: 0, y: 0, active: false });

  const [normPos, setNormPos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [bugSquashed, setBugSquashed] = useState(false);
  const [bugCaption, setBugCaption] = useState("~bzz!~");
  const [isBugEvading, setIsBugEvading] = useState(false);
  const [trailParticles, setTrailParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  // Track cursor relative to the mascot container
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      pointerPosRef.current = {
        x: localX,
        y: localY,
        active: true,
      };

      const centerX = rect.width / 2;
      const centerY = rect.height / 3; // Focus on the boy's head

      const rawDx = (localX - centerX) / (window.innerWidth / 2);
      const rawDy = (localY - centerY) / (window.innerHeight / 2);

      // Clamp to -1 .. 1
      const clampedX = Math.max(-1, Math.min(1, rawDx));
      const clampedY = Math.max(-1, Math.min(1, rawDy));

      setNormPos({ x: clampedX, y: clampedY });
    };

    const handlePointerLeave = () => {
      pointerPosRef.current.active = false;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  // ── Procedural Random Flight Physics Loop ─────────────────────────────
  useEffect(() => {
    if (category !== "bug" || bugSquashed) {
      return;
    }

    let animId: number;
    let posX = 20;
    let posY = -25;
    let vx = 0.5;
    let vy = -0.3;
    let currentAngle = 15;

    // Boundary flight limits inside the mascot stage
    const minX = -30;
    const maxX = 175;
    const minY = -55;
    const maxY = 95;

    let targetX = 60 + (Math.random() - 0.5) * 80;
    let targetY = -20 + (Math.random() - 0.5) * 60;
    let mode: "cruising" | "hovering" | "darting" | "evading" = "cruising";
    let modeTimer = 0;
    let lastTime = performance.now();
    let nextSparkleTime = 0;
    let lastCaptionTime = 0;

    const pickNewWaypoint = (forceDart = false) => {
      targetX = minX + Math.random() * (maxX - minX);
      targetY = minY + Math.random() * (maxY - minY);

      if (forceDart || Math.random() < 0.22) {
        mode = "darting";
        modeTimer = 450 + Math.random() * 400; // brief burst
        setBugCaption(Math.random() < 0.5 ? "~zoom!~" : "!zip!");
      } else {
        mode = "cruising";
        modeTimer = 1600 + Math.random() * 1400;
        setBugCaption("~bzz!~");
      }
      setIsBugEvading(false);
    };

    const flightLoop = (currentTime: number) => {
      const dt = Math.min(48, currentTime - lastTime);
      lastTime = currentTime;
      modeTimer -= dt;

      // 1. Check distance to user cursor (Interactive Evasion / Dodge)
      if (pointerPosRef.current.active) {
        // Bug's visual center in container coordinates (wrapper is offset by -24px, -32px)
        const bugCenterX = posX - 4;
        const bugCenterY = posY - 12;
        const distToCursor = Math.hypot(
          pointerPosRef.current.x - bugCenterX,
          pointerPosRef.current.y - bugCenterY,
        );

        if (distToCursor < 68) {
          // Cursor is dangerously close! Evasive reflex dart away
          const awayX = bugCenterX - pointerPosRef.current.x;
          const awayY = bugCenterY - pointerPosRef.current.y;
          const len = Math.hypot(awayX, awayY) || 1;

          targetX = Math.max(minX, Math.min(maxX, posX + (awayX / len) * 110 + (Math.random() - 0.5) * 40));
          targetY = Math.max(minY, Math.min(maxY, posY + (awayY / len) * 95 + (Math.random() - 0.5) * 40));

          vx += (awayX / len) * 6.5;
          vy += (awayY / len) * 6.5;

          mode = "evading";
          modeTimer = 650;
          setIsBugEvading(true);
          if (currentTime - lastCaptionTime > 500) {
            setBugCaption(Math.random() < 0.5 ? "!eep!" : "~WHOOSH!~");
            lastCaptionTime = currentTime;
          }
        }
      }

      // 2. State Machine: Cruising / Hovering / Darting / Evading
      if (mode === "evading") {
        if (modeTimer <= 0) {
          pickNewWaypoint();
        }
      } else if (mode === "hovering") {
        // Gentle organic micro-hover buzz (figure-8 Lissajous wobble)
        const hoverWobbleX = Math.sin(currentTime * 0.009) * 3.2;
        const hoverWobbleY = Math.cos(currentTime * 0.014) * 2.4;
        posX += hoverWobbleX * 0.12;
        posY += hoverWobbleY * 0.12;
        currentAngle += (0 - currentAngle) * 0.1;

        if (modeTimer <= 0) {
          pickNewWaypoint();
        }
      } else {
        // Cruising or Darting
        const distToTarget = Math.hypot(targetX - posX, targetY - posY);

        if (distToTarget < 20 || modeTimer <= 0) {
          // Reached waypoint: 35% chance to pause & hover, otherwise pick new waypoint
          if (Math.random() < 0.35) {
            mode = "hovering";
            modeTimer = 1200 + Math.random() * 1200;
            vx *= 0.2;
            vy *= 0.2;
            setBugCaption(Math.random() < 0.5 ? "~bzz!~" : "~flutter~");
            setIsBugEvading(false);
          } else {
            pickNewWaypoint();
          }
        } else {
          // Smooth steering towards waypoint
          const speedFactor = mode === "darting" ? 0.085 : 0.042;
          const maxSpeed = mode === "darting" ? 5.8 : 2.5;

          vx += (targetX - posX) * speedFactor;
          vy += (targetY - posY) * speedFactor;

          const speed = Math.hypot(vx, vy);
          if (speed > maxSpeed) {
            vx = (vx / speed) * maxSpeed;
            vy = (vy / speed) * maxSpeed;
          }

          posX += vx;
          posY += vy;
          vx *= 0.91;
          vy *= 0.91;

          // Heading banking angle
          const targetAngle = Math.atan2(vy, vx) * (180 / Math.PI) + 90;
          let diff = targetAngle - currentAngle;
          while (diff < -180) diff += 360;
          while (diff > 180) diff -= 360;
          currentAngle += diff * 0.14;
        }
      }

      // 3. Keep strictly in bounds
      if (posX < minX) { posX = minX; vx = Math.abs(vx) * 0.8; }
      if (posX > maxX) { posX = maxX; vx = -Math.abs(vx) * 0.8; }
      if (posY < minY) { posY = minY; vy = Math.abs(vy) * 0.8; }
      if (posY > maxY) { posY = maxY; vy = -Math.abs(vy) * 0.8; }

      // 4. Update DOM transform directly for butter-smooth 60fps performance
      if (bugRef.current) {
        bugRef.current.style.transform = `translate3d(${posX}px, ${posY}px, 0) rotate(${currentAngle}deg)`;
      }

      // 5. Emit subtle fairy sparkles along the flight trail
      if (currentTime > nextSparkleTime && (mode === "darting" || mode === "evading" || Math.random() < 0.35)) {
        nextSparkleTime = currentTime + 160;
        setTrailParticles((prev) => [
          ...prev.slice(-3),
          { id: currentTime, x: posX + 16, y: posY + 20 },
        ]);
      }

      animId = requestAnimationFrame(flightLoop);
    };

    animId = requestAnimationFrame(flightLoop);
    return () => cancelAnimationFrame(animId);
  }, [category, bugSquashed]);

  // Natural blinking every ~3.6s
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 160);
    }, 3600);
    return () => clearInterval(blinkInterval);
  }, []);

  // Reset squashed state if category changes
  useEffect(() => {
    if (category !== "bug") {
      setBugSquashed(false);
    }
  }, [category]);

  // Auto-revive bug after 4.5 seconds so user can catch it again!
  useEffect(() => {
    if (bugSquashed) {
      const timer = setTimeout(() => {
        setBugSquashed(false);
        setBugCaption("~bzz!~");
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [bugSquashed]);

  // Dynamic reaction line based on context
  const getReactionText = () => {
    if (isSubmitting) {
      return "Launching your message straight to the team! 🚀";
    }
    if (isHoveringSend) {
      return "Looks solid! Click send and we'll review it!";
    }
    if (isTyping || activeField === "message") {
      return "I'm listening! Tell us all the juicy details... ✍️";
    }
    if (activeField === "subject") {
      return "Give it a clear, catchy subject line!";
    }

    switch (category) {
      case "bug":
        return bugSquashed
          ? "🎯 Bullseye! Bug caught! Tell us where it happened."
          : "🐛 Ahh, a bug in the wild! Help our engineers squash it!";
      case "feature_request":
        return "💡 Ooh, a brilliant new idea! Tell us what to build!";
      case "grading_question":
        return "🔍 Examiner Intel mode! Let's check those mark schemes.";
      case "feedback":
        return "✨ We love hearing from you! Every tip shapes Marginal.";
      case "general":
      default:
        return "👋 Hey there! Ask us anything, we read every note.";
    }
  };

  // Eyes and head tracking offsets
  const pupilOffsetX = normPos.x * 6;
  const pupilOffsetY = normPos.y * 4;
  const headRotate = normPos.x * 4;
  const headTranslateX = normPos.x * 3;
  const headTranslateY = normPos.y * 2;

  const isBugCategory = category === "bug";
  const isFeatureCategory = category === "feature_request";
  const isGradingCategory = category === "grading_question";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex flex-col items-center justify-end select-none pointer-events-auto",
        className,
      )}
    >
      <style>{`
        @keyframes beetleWingLeft {
          0%, 100% { transform: rotate(-25deg) scaleY(1); }
          50% { transform: rotate(45deg) scaleY(0.7); }
        }
        @keyframes beetleWingRight {
          0%, 100% { transform: rotate(25deg) scaleY(1); }
          50% { transform: rotate(-45deg) scaleY(0.7); }
        }
        @keyframes beetleWingHindLeft {
          0%, 100% { transform: rotate(-15deg) scale(0.9); }
          50% { transform: rotate(35deg) scale(0.65); }
        }
        @keyframes beetleWingHindRight {
          0%, 100% { transform: rotate(15deg) scale(0.9); }
          50% { transform: rotate(-35deg) scale(0.65); }
        }
        @keyframes fireflyLantern {
          0%, 100% { opacity: 0.95; filter: drop-shadow(0 0 5px rgba(250, 204, 21, 0.8)); }
          50% { opacity: 0.45; filter: drop-shadow(0 0 1px rgba(250, 204, 21, 0.2)); }
        }
        @keyframes dazedStars {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes floatBulb {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.05); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.15); }
        }
        @keyframes boyBreathe {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>

      {/* ── Interactive Speech Bubble ──────────────────────────────────── */}
      <div className="relative z-20 mb-3 max-w-[210px] sm:max-w-[240px] animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="relative rounded-2xl border border-primary/30 bg-card/95 px-3.5 py-2 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-primary/60">
          <p className="text-[11.5px] leading-snug font-medium text-foreground">
            {getReactionText()}
          </p>
          {/* Cartoon speech bubble pointer */}
          <div className="absolute -bottom-2 left-8 size-3 rotate-45 border-r border-b border-primary/30 bg-card" />
        </div>
      </div>

      {/* ── Glowing Flight Sparkles Trail ────────────────────────────── */}
      {isBugCategory && !bugSquashed && (
        <div className="pointer-events-none absolute inset-0 z-25 overflow-visible">
          {trailParticles.map((p) => (
            <div
              key={p.id}
              className="absolute size-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.9)] animate-ping duration-700"
              style={{ left: p.x, top: p.y }}
            />
          ))}
        </div>
      )}

      {/* ── Procedural Flying Bug (when category === 'bug') ─────────────── */}
      {isBugCategory && (
        <div
          ref={bugRef}
          className="pointer-events-auto absolute -top-8 -left-6 z-30 cursor-pointer will-change-transform select-none"
          style={{
            transform: "translate3d(20px, -25px, 0px) rotate(15deg)",
            transition: bugSquashed ? "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" : undefined,
          }}
          onClick={() => {
            if (bugSquashed) {
              setBugSquashed(false);
              setBugCaption("~bzz!~");
            } else {
              setBugSquashed(true);
              onBugClick?.();
            }
          }}
          title={bugSquashed ? "Click to release bug!" : "Click to catch the bug!"}
        >
          <div className="group relative flex flex-col items-center justify-center p-1.5 transition-transform hover:scale-125 active:scale-95">
            {/* Jewel Beetle SVG Vector */}
            <svg
              viewBox="0 0 44 48"
              className="size-11 overflow-visible drop-shadow-md select-none pointer-events-none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="beetle-carapace" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="45%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
                <linearGradient id="beetle-wing-fore" x1="0" y1="0" x2="0.8" y2="1">
                  <stop offset="0%" stopColor="rgba(224, 242, 254, 0.9)" />
                  <stop offset="100%" stopColor="rgba(56, 189, 248, 0.4)" />
                </linearGradient>
                <linearGradient id="beetle-wing-hind" x1="0" y1="0" x2="0.8" y2="1">
                  <stop offset="0%" stopColor="rgba(186, 230, 253, 0.75)" />
                  <stop offset="100%" stopColor="rgba(14, 165, 233, 0.35)" />
                </linearGradient>
                <radialGradient id="beetle-lantern" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="60%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#d97706" />
                </radialGradient>
              </defs>

              {/* Soft ambient glow behind firefly */}
              <circle cx="22" cy="28" r="14" fill="#34d399" opacity="0.25" filter="blur(4px)" />

              {/* Jointed Insect Legs */}
              <g stroke="#064e3b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
                <path d="M16 20 L10 17 L5 21" />
                <path d="M16 24 L9 25 L4 29" />
                <path d="M17 28 L10 32 L6 37" />
                <path d="M28 20 L34 17 L39 21" />
                <path d="M28 24 L35 25 L40 29" />
                <path d="M27 28 L34 32 L38 37" />
              </g>

              {/* Glowing Abdomen Lantern */}
              <g style={{ animation: "fireflyLantern 1.4s infinite ease-in-out" }}>
                <ellipse cx="22" cy="30" rx="7.5" ry="8.5" fill="url(#beetle-lantern)" />
                <ellipse cx="22" cy="30" rx="4.5" ry="5.5" fill="#fef9c3" opacity="0.8" />
              </g>

              {/* 4 Translucent Flying Wings */}
              {!bugSquashed && (
                <g id="beetle-wings">
                  {/* Hindwings */}
                  <path
                    d="M20 23 C13 18 8 20 11 29 C13 32 18 29 20 25 Z"
                    fill="url(#beetle-wing-hind)"
                    stroke="#0284c7"
                    strokeWidth="0.8"
                    style={{
                      transformOrigin: "20px 23px",
                      animation: isBugEvading
                        ? "beetleWingHindLeft 0.035s infinite alternate ease-in-out"
                        : "beetleWingHindLeft 0.05s infinite alternate ease-in-out",
                    }}
                  />
                  <path
                    d="M24 23 C31 18 36 20 33 29 C31 32 26 29 24 25 Z"
                    fill="url(#beetle-wing-hind)"
                    stroke="#0284c7"
                    strokeWidth="0.8"
                    style={{
                      transformOrigin: "24px 23px",
                      animation: isBugEvading
                        ? "beetleWingHindRight 0.035s infinite alternate ease-in-out"
                        : "beetleWingHindRight 0.05s infinite alternate ease-in-out",
                    }}
                  />

                  {/* Forewings */}
                  <g
                    style={{
                      transformOrigin: "19px 20px",
                      animation: isBugEvading
                        ? "beetleWingLeft 0.04s infinite alternate ease-in-out"
                        : "beetleWingLeft 0.06s infinite alternate ease-in-out",
                    }}
                  >
                    <path
                      d="M19 20 C11 5 3 4 5 19 C6 26 14 26 19 21 Z"
                      fill="url(#beetle-wing-fore)"
                      stroke="#0284c7"
                      strokeWidth="1.2"
                    />
                    <path d="M18 20 C13 11 7 8 6 18" stroke="#38bdf8" strokeWidth="0.7" fill="none" opacity="0.8" />
                    <path d="M12 14 Q9 17 7 21" stroke="#38bdf8" strokeWidth="0.5" fill="none" opacity="0.6" />
                  </g>
                  <g
                    style={{
                      transformOrigin: "25px 20px",
                      animation: isBugEvading
                        ? "beetleWingRight 0.04s infinite alternate ease-in-out"
                        : "beetleWingRight 0.06s infinite alternate ease-in-out",
                    }}
                  >
                    <path
                      d="M25 20 C33 5 41 4 39 19 C38 26 30 26 25 21 Z"
                      fill="url(#beetle-wing-fore)"
                      stroke="#0284c7"
                      strokeWidth="1.2"
                    />
                    <path d="M26 20 C31 11 37 8 38 18" stroke="#38bdf8" strokeWidth="0.7" fill="none" opacity="0.8" />
                    <path d="M32 14 Q35 17 37 21" stroke="#38bdf8" strokeWidth="0.5" fill="none" opacity="0.6" />
                  </g>
                </g>
              )}

              {/* Metallic Split Carapace (Wing Covers / Elytra) */}
              <g id="beetle-carapace-shell">
                <path
                  d="M21.5 17 C16 17 13 22 13 29 C13 33 17 35.5 21 34.5 Z"
                  fill="url(#beetle-carapace)"
                  stroke="#064e3b"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path d="M15 21 C14.5 25 15 31 19 33" stroke="#6ee7b7" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.8" />
                <circle cx="18" cy="24" r="0.9" fill="#fef08a" />
                <circle cx="17" cy="28" r="0.7" fill="#fef08a" />

                <path
                  d="M22.5 17 C28 17 31 22 31 29 C31 33 27 35.5 23 34.5 Z"
                  fill="url(#beetle-carapace)"
                  stroke="#064e3b"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path d="M29 21 C29.5 25 29 31 25 33" stroke="#6ee7b7" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.8" />
                <circle cx="26" cy="24" r="0.9" fill="#fef08a" />
                <circle cx="27" cy="28" r="0.7" fill="#fef08a" />
              </g>

              {/* Thorax */}
              <rect
                x="17"
                y="13"
                width="10"
                height="6"
                rx="3"
                fill="#1e1b4b"
                stroke="#064e3b"
                strokeWidth="1.4"
              />

              {/* Head */}
              <circle cx="22" cy="10" r="5.5" fill="#1e1b4b" stroke="#064e3b" strokeWidth="1.4" />

              {/* Antennae with glowing neon sensor tips */}
              <path d="M19 7 Q15 1 10 3" stroke="#1e1b4b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <circle cx="10" cy="3" r="1.5" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" />
              <path d="M25 7 Q29 1 34 3" stroke="#1e1b4b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <circle cx="34" cy="3" r="1.5" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" />

              {/* Cute Eyes (Responsive to state) */}
              {bugSquashed ? (
                <g stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round" fill="none">
                  <path d="M18 9 Q19 11 20 9.5 Q20.5 8 19 8" />
                  <path d="M24 9 Q25 11 26 9.5 Q26.5 8 25 8" />
                </g>
              ) : (
                <g>
                  <ellipse cx="19" cy="9.5" rx="2.2" ry="2" fill="#ffffff" stroke="#1e1b4b" strokeWidth="0.8" />
                  <circle cx={isBugEvading ? 18.5 : 19} cy="9.5" r={isBugEvading ? 1.6 : 1.3} fill="#0f172a" />
                  <circle cx="18.3" cy="8.8" r="0.6" fill="#ffffff" />

                  <ellipse cx="25" cy="9.5" rx="2.2" ry="2" fill="#ffffff" stroke="#1e1b4b" strokeWidth="0.8" />
                  <circle cx={isBugEvading ? 25.5 : 25} cy="9.5" r={isBugEvading ? 1.6 : 1.3} fill="#0f172a" />
                  <circle cx="24.3" cy="8.8" r="0.6" fill="#ffffff" />
                </g>
              )}

              {/* Squashed Stars Halo */}
              {bugSquashed && (
                <g style={{ transformOrigin: "22px 5px", animation: "dazedStars 2.5s infinite linear" }}>
                  <text x="12" y="2" fontSize="7" fill="#facc15">⭐</text>
                  <text x="26" y="2" fontSize="6" fill="#38bdf8">✨</text>
                  <text x="19" y="-2" fontSize="5" fill="#f43f5e">⭐</text>
                </g>
              )}
            </svg>

            {/* Interactive Dynamic Badge (Maintains "bzz!" in static render for tests) */}
            <span
              className={cn(
                "mt-0.5 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-xs transition-all duration-200 select-none",
                bugSquashed
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-extrabold"
                  : isBugEvading
                  ? "bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 scale-105"
                  : "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
              )}
            >
              {bugSquashed ? "🎯 SQUASHED!" : bugCaption}
            </span>
          </div>
        </div>
      )}

      {/* ── Glowing Lightbulb (when category === 'feature_request') ─────── */}
      {isFeatureCategory && (
        <div
          className="absolute -top-10 right-8 z-20 flex flex-col items-center"
          style={{ animation: "floatBulb 3s ease-in-out infinite" }}
        >
          <div
            className="absolute -inset-2 rounded-full bg-amber-400/30 blur-md"
            style={{ animation: "pulseGlow 2s ease-in-out infinite" }}
          />
          <div className="relative flex size-8 items-center justify-center rounded-full border border-amber-400/60 bg-amber-400/20 text-amber-500 shadow-md">
            <Lightbulb className="size-5 fill-amber-400 text-amber-500" />
          </div>
        </div>
      )}

      {/* ── The Animated Boy (Vector Character) ────────────────────────── */}
      <div
        className="relative w-48 sm:w-56 h-56 sm:h-64"
        style={{ animation: "boyBreathe 4s ease-in-out infinite" }}
      >
        <svg
          viewBox="0 0 240 300"
          className="h-full w-full overflow-visible drop-shadow-md"
          role="img"
          aria-label="Illustration of Marginal student mascot boy"
        >
          <defs>
            <linearGradient id="boy-cap-grad" x1="0" y1="0" x2="1" y2="0.6">
              <stop offset="0%" stopColor="var(--mascot-cap, #7c3aed)" />
              <stop offset="100%" stopColor="var(--mascot-cap-shade, #5b21b6)" />
            </linearGradient>
            <linearGradient id="boy-sweater-grad" x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor="var(--mascot-sweater, #0d9488)" />
              <stop offset="100%" stopColor="var(--mascot-sweater-2, #0f766e)" />
            </linearGradient>
            <linearGradient id="boy-skin-grad" x1="0" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="var(--mascot-skin, #fed7aa)" />
              <stop offset="100%" stopColor="var(--mascot-skin-shade, #fcd34d)" />
            </linearGradient>
            <linearGradient id="jogger-grad" x1="0" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#242057" />
              <stop offset="100%" stopColor="#18153b" />
            </linearGradient>
            <linearGradient id="iris-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4338ca" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
          </defs>

          {/* Ground Shadow */}
          <ellipse
            cx="120"
            cy="286"
            rx="66"
            ry="8.5"
            fill="var(--mascot-line, #1e1b4b)"
            opacity="0.2"
          />

          {/* ── Body & Clothing ────────────────────────────────────────── */}
          <g id="boy-body">
            {/* Slim Athletic Joggers (Athletic Stance) */}
            {/* Left Jogger Leg */}
            <path
              d="M93 211c-2 16-5 34-7 51h15c2-17 4-34 6-51z"
              fill="url(#jogger-grad)"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {/* Left Knee crease detail */}
            <path d="M89 238q4-2 7 0" fill="none" stroke="#3730a3" strokeWidth="2" strokeLinecap="round" />
            {/* Left Jogger Ankle Cuff */}
            <rect x="85" y="260" width="17" height="4.5" rx="2" fill="#312e81" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="2.5" />

            {/* Right Jogger Leg */}
            <path
              d="M126 211c2 17 4 34 6 51h15c-2-17-5-35-7-51z"
              fill="url(#jogger-grad)"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {/* Right Knee crease detail */}
            <path d="M136 238q4-2 7 0" fill="none" stroke="#3730a3" strokeWidth="2" strokeLinecap="round" />
            {/* Right Jogger Ankle Cuff */}
            <rect x="138" y="260" width="17" height="4.5" rx="2" fill="#312e81" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="2.5" />

            {/* Athletic Streetwear Sneakers */}
            {/* Left Sneaker */}
            <g id="shoe-left">
              <ellipse cx="91" cy="283" rx="16" ry="3" fill="var(--mascot-line, #1e1b4b)" opacity="0.22" />
              <path d="M75 280h32c2 0 3.5-1.5 3.5-3v-1H74v1c0 1.5 1.5 3 3.5 3z" fill="var(--mascot-line, #1e1b4b)" />
              <path
                d="M74 276.5h34c2 0 3.5-1.5 3.5-3.5 0-1-1-2-2.5-2H77c-2 0-3 1-3 3.5v2z"
                fill="#ffffff"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="2.6"
                strokeLinejoin="round"
              />
              <rect x="77" y="274.5" width="28" height="2" fill="var(--mascot-sweater, #0d9488)" rx="0.5" />
              <path
                d="M80 271c0-4 3-7 8-7.5h10c3.5 0 6.5 2.5 7.5 6l1 2H79z"
                fill="#ffffff"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="2.6"
                strokeLinejoin="round"
              />
              <path d="M85 270c3-1.5 6-1 10 1" fill="none" stroke="var(--mascot-cap, #7c3aed)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="89" cy="266" r="0.9" fill="var(--mascot-line, #1e1b4b)" />
              <circle cx="93" cy="267" r="0.9" fill="var(--mascot-line, #1e1b4b)" />
            </g>

            {/* Right Sneaker */}
            <g id="shoe-right">
              <ellipse cx="149" cy="283" rx="16" ry="3" fill="var(--mascot-line, #1e1b4b)" opacity="0.22" />
              <path d="M133 280h32c2 0 3.5-1.5 3.5-3v-1h-34v1c0 1.5 1.5 3 3.5 3z" fill="var(--mascot-line, #1e1b4b)" />
              <path
                d="M132.5 276.5h34c2 0 3.5-1.5 3.5-3.5 0-1-1-2-2.5-2h-31.5c-2 0-3 1-3 3.5v2z"
                fill="#ffffff"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="2.6"
                strokeLinejoin="round"
              />
              <rect x="135" y="274.5" width="28" height="2" fill="var(--mascot-sweater, #0d9488)" rx="0.5" />
              <path
                d="M134.5 271c0-4 3-7 8-7.5h10c3.5 0 6.5 2.5 7.5 6l1 2h-27z"
                fill="#ffffff"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="2.6"
                strokeLinejoin="round"
              />
              <path d="M141 270c3-1.5 6-1 10 1" fill="none" stroke="var(--mascot-cap, #7c3aed)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="145" cy="266" r="0.9" fill="var(--mascot-line, #1e1b4b)" />
              <circle cx="149" cy="267" r="0.9" fill="var(--mascot-line, #1e1b4b)" />
            </g>

            {/* Trim, Fit Neck */}
            <rect
              x="110"
              y="137"
              width="20"
              height="20"
              rx="4"
              fill="var(--mascot-skin-shade, #f59e0b)"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="4"
            />
            <path d="M110 141q10 4 20 0v-4h-20z" fill="#d97706" opacity="0.45" />

            {/* ── Athletic Slim Hoodie (V-Taper) ── */}
            {/* Broad shoulders (72 to 168) tapering to slim waist (89 to 151) */}
            <path
              d="M72 156c4-12 22-16 48-16s44 4 48 16l-9 47c-1 5-4 7-9 7H90c-5 0-8-2-9-7z"
              fill="url(#boy-sweater-grad)"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />

            {/* Athletic Raglan Shoulder Seams */}
            <path d="M84 148l16 16" fill="none" stroke="var(--mascot-sweater-2, #0f766e)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M156 148l-16 16" fill="none" stroke="var(--mascot-sweater-2, #0f766e)" strokeWidth="2.5" strokeLinecap="round" />

            {/* Curved Athletic Waistband */}
            <path
              d="M81 204q39 5 78 0v7q-39 5-78 0z"
              fill="var(--mascot-sweater-2, #0f766e)"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />

            {/* Kangaroo Pouch Pocket */}
            <path
              d="M94 186q26 3 52 0l-5 16q-21 2-42 0z"
              fill="var(--mascot-sweater-2, #0f766e)"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="2.8"
              strokeLinejoin="round"
              opacity="0.95"
            />
            {/* Pocket entry slits */}
            <path d="M96 189l-4 10" fill="none" stroke="#134e4a" strokeWidth="2" strokeLinecap="round" />
            <path d="M144 189l4 10" fill="none" stroke="#134e4a" strokeWidth="2" strokeLinecap="round" />

            {/* Sporty Hoodie Neckline Collar */}
            <path
              d="M102 143c10 10 26 10 36 0"
              fill="none"
              stroke="var(--mascot-collar, #6d28d9)"
              strokeWidth="6.5"
              strokeLinecap="round"
            />

            {/* Sporty White Drawstrings */}
            <path d="M113 147v15 M127 147v15" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
            <circle cx="113" cy="163" r="1.5" fill="var(--mascot-cap, #7c3aed)" />
            <circle cx="127" cy="163" r="1.5" fill="var(--mascot-cap, #7c3aed)" />

            {/* Marginal Modern Athletic Crest 'm' */}
            <g transform="translate(120, 172)">
              <circle cx="0" cy="0" r="10" fill="rgba(255,255,255,0.18)" />
              <circle cx="0" cy="0" r="9.5" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
              <text
                x="0"
                y="4.5"
                textAnchor="middle"
                fontSize="12.5"
                fontWeight="900"
                fontFamily="sans-serif"
                fill="#ffffff"
              >
                m
              </text>
            </g>

            {/* ── Arms & Hands (Volumetric Streetwear Sleeves & Fit Poses) ── */}
            {isBugCategory ? (
              // Bug reaction: Athletic dodge / swat ready to catch
              <g id="arms-surprised">
                {/* Left arm dodging up */}
                <path
                  d="M72 156c-12-8-22-20-24-34l-4-8"
                  fill="none"
                  stroke="var(--mascot-line, #1e1b4b)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M72 156c-12-8-22-20-24-34l-4-8"
                  fill="none"
                  stroke="var(--mascot-sweater, #0d9488)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="42" cy="112" r="7.5" fill="var(--mascot-skin, #fcd34d)" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="3" />
                <path d="M40 106l-3-4 M43 105l0-5 M47 107l3-3" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="2" strokeLinecap="round" />

                {/* Right arm raised to swat/catch */}
                <path
                  d="M168 156c12-8 22-20 24-34l4-8"
                  fill="none"
                  stroke="var(--mascot-line, #1e1b4b)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M168 156c12-8 22-20 24-34l4-8"
                  fill="none"
                  stroke="var(--mascot-sweater, #0d9488)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="198" cy="112" r="7.5" fill="var(--mascot-skin, #fcd34d)" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="3" />
                <path d="M194 107l-3-3 M198 105l0-5 M202 106l3-4" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="2" strokeLinecap="round" />
              </g>
            ) : isFeatureCategory ? (
              // Feature Request: Left hand on hip, right arm pointing up dynamically to lightbulb!
              <g id="arms-pointing">
                {/* Left arm on hip */}
                <path
                  d="M73 158c-6 12-10 24-8 32l14 8"
                  fill="none"
                  stroke="var(--mascot-line, #1e1b4b)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M73 158c-6 12-10 24-8 32l14 8"
                  fill="none"
                  stroke="var(--mascot-sweater, #0d9488)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect x="73" y="196" width="7" height="4.5" rx="1.5" fill="var(--mascot-sweater-2, #0f766e)" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="2" />
                <circle cx="82" cy="203" r="6" fill="var(--mascot-skin, #fcd34d)" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="3" />

                {/* Right arm pointing up to lightbulb */}
                <path
                  d="M168 156c12-10 18-24 16-38l6-14"
                  fill="none"
                  stroke="var(--mascot-line, #1e1b4b)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M168 156c12-10 18-24 16-38l6-14"
                  fill="none"
                  stroke="var(--mascot-sweater, #0d9488)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="191" cy="104" r="6.5" fill="var(--mascot-skin, #fcd34d)" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="3" />
                {/* Index finger pointing */}
                <path d="M191 100v-8" fill="none" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M191 100v-8" fill="none" stroke="var(--mascot-skin, #fcd34d)" strokeWidth="1.8" strokeLinecap="round" />
              </g>
            ) : (
              // Default: Athletic sleeve contour with hand on waist and confident thumbs-up!
              <g id="arms-default">
                {/* Left Arm: Athletic sleeve contour with hand resting on waist/pocket */}
                <path
                  d="M72 157c-8 10-14 26-10 36 2 5 6 9 12 11l4-6c-4-2-7-5-8-8-2-7 2-20 8-28z"
                  fill="url(#boy-sweater-grad)"
                  stroke="var(--mascot-line, #1e1b4b)"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
                <rect x="73" y="196" width="7" height="4.5" rx="1.5" fill="var(--mascot-sweater-2, #0f766e)" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="2" />
                <circle cx="82" cy="203" r="6" fill="var(--mascot-skin, #fcd34d)" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="3" />
                <path d="M80 202q2 2 4 2" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" />

                {/* Right Arm: Athletic sleeve with confident thumbs up */}
                <path
                  d="M168 157c8 10 14 26 10 36-2 5-6 9-12 11l-4-6c4-2 7-5 8-8 2-7-2-20-8-28z"
                  fill="url(#boy-sweater-grad)"
                  stroke="var(--mascot-line, #1e1b4b)"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
                <rect x="160" y="196" width="7" height="4.5" rx="1.5" fill="var(--mascot-sweater-2, #0f766e)" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="2" />
                <circle cx="158" cy="203" r="6" fill="var(--mascot-skin, #fcd34d)" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="3" />
                {/* Thumb up */}
                <path
                  d="M157 199c0-3 1.5-6 3.5-6s2.5 2 2.5 5"
                  fill="var(--mascot-skin, #fcd34d)"
                  stroke="var(--mascot-line, #1e1b4b)"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              </g>
            )}
          </g>

          {/* ── Head (Tilts & Moves with Pointer) ───────────────────────── */}
          <g
            id="boy-head"
            style={{
              transform: `translate(${headTranslateX}px, ${headTranslateY}px) rotate(${headRotate}deg)`,
              transformOrigin: "120px 120px",
              transition: "transform 0.12s ease-out",
            }}
          >
            {/* Back Hair behind neck and ears */}
            <path
              d="M74 96 C70 114 74 130 84 136 C82 126 80 112 82 96 Z"
              fill="var(--mascot-hair, #1e1b4b)"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            <path
              d="M166 96 C170 114 166 130 156 136 C158 126 160 112 158 96 Z"
              fill="var(--mascot-hair, #1e1b4b)"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            <path
              d="M88 136 Q120 144 152 136 Q120 140 88 136 Z"
              fill="var(--mascot-hair, #1e1b4b)"
            />

            {/* 3D Snapback Cap Visor (Backwards Tilted Brim) */}
            <g id="cap-brim">
              {/* Visor Underside Shadow */}
              <path
                d="M150 74 C166 80 186 85 200 85 C194 89 178 91 154 87 Z"
                fill="#2e1065"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              {/* Visor Top Aerodynamic Curved Surface */}
              <path
                d="M148 62 C168 56 196 60 208 70 C210 75 206 81 198 85 C180 85 160 80 146 72 Z"
                fill="url(#boy-cap-grad)"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              {/* Visor Rim Highlight */}
              <path
                d="M150 64 C170 58 196 62 206 71"
                fill="none"
                stroke="#c084fc"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.85"
              />
              {/* Visor Precision Double Stitching */}
              <path
                d="M152 68 C168 64 190 68 198 75"
                fill="none"
                stroke="#a855f7"
                strokeWidth="1.2"
                strokeDasharray="3 2"
                strokeLinecap="round"
              />
            </g>

            {/* Handsome Face Shape (Youthful Tapered Jawline) */}
            <path
              d="M82 86 C80 66 94 56 120 56 C146 56 160 66 158 86 C158 110 148 138 120 138 C92 138 82 110 82 86 Z"
              fill="url(#boy-skin-grad)"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />

            {/* Left Ear & Detail */}
            <ellipse
              cx="78"
              cy="104"
              rx="7.5"
              ry="9.5"
              fill="var(--mascot-skin, #fed7aa)"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="3.5"
            />
            <path d="M78 101 Q75 104 77 108" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />

            {/* Right Ear & Detail */}
            <ellipse
              cx="162"
              cy="104"
              rx="7.5"
              ry="9.5"
              fill="var(--mascot-skin, #fed7aa)"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="3.5"
            />
            <path d="M162 101 Q165 104 163 108" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />

            {/* ── Cap Crown & Front Band (Sits On Top of Skull) ── */}
            <g id="cap">
              {/* Cap Main 6-Panel Dome */}
              <path
                d="M78 72 C76 34 94 20 120 20 C146 20 164 34 162 72 C148 76 134 78 120 78 C106 78 92 76 78 72 Z"
                fill="url(#boy-cap-grad)"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="4.5"
                strokeLinejoin="round"
              />

              {/* Front Cap Sweatband / Trim */}
              <path
                d="M78 72 C92 76 106 78 120 78 C134 78 148 76 162 72 L162 76 C148 80 134 82 120 82 C106 82 92 80 78 76 Z"
                fill="#4c1d95"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />

              {/* Back snapback arch cutout (since worn backwards) */}
              <path
                d="M110 78 C110 67 130 67 130 78 Z"
                fill="url(#boy-skin-grad)"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="2"
              />
              {/* Snapback adjustment plastic strap */}
              <rect
                x="108"
                y="73"
                width="24"
                height="3.5"
                rx="1.5"
                fill="#2e1065"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="1.5"
              />
              <circle cx="114" cy="74.8" r="0.8" fill="#a855f7" />
              <circle cx="118" cy="74.8" r="0.8" fill="#a855f7" />
              <circle cx="122" cy="74.8" r="0.8" fill="#a855f7" />
              <circle cx="126" cy="74.8" r="0.8" fill="#a855f7" />

              {/* Cap Panel Seams */}
              <path d="M120 23 V67" fill="none" stroke="#4c1d95" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="4 2" />
              <path d="M120 23 C106 35 94 48 86 68" fill="none" stroke="#4c1d95" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M120 23 C134 35 146 48 154 68" fill="none" stroke="#4c1d95" strokeWidth="1.5" strokeLinecap="round" />

              {/* Cap Eyelets */}
              <circle cx="102" cy="44" r="2" fill="#2e1065" stroke="#7c3aed" strokeWidth="0.8" />
              <circle cx="138" cy="44" r="2" fill="#2e1065" stroke="#7c3aed" strokeWidth="0.8" />

              {/* Cap Top Squatchee (Button) */}
              <ellipse cx="120" cy="20.5" rx="5" ry="3.5" fill="#4c1d95" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="3" />
              <ellipse cx="119" cy="19.5" rx="2" ry="1" fill="#a855f7" opacity="0.8" />

              {/* Mini Embroidered 'm' Logo Badge on Cap */}
              <g transform="translate(93, 50) scale(0.65)">
                <circle cx="0" cy="0" r="7.5" fill="rgba(255,255,255,0.22)" />
                <text x="0" y="3.5" textAnchor="middle" fontSize="9" fontWeight="900" fontFamily="sans-serif" fill="#ffffff">m</text>
              </g>
            </g>

            {/* ── Stylish Front Hair Bangs & Sideburns (No More Bald Forehead!) ── */}
            <g id="hair-front">
              {/* Left Sideburn */}
              <path
                d="M80 82 L76 102 C76 106 82 108 84 103 L86 86 Z"
                fill="var(--mascot-hair, #1e1b4b)"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              {/* Right Sideburn */}
              <path
                d="M160 82 L164 102 C164 106 158 108 156 103 L154 86 Z"
                fill="var(--mascot-hair, #1e1b4b)"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />

              {/* Main Bangs cascading naturally across forehead */}
              <path
                d="M78 77 C77 86 83 95 90 97 C87 90 85 84 86 78 Z"
                fill="var(--mascot-hair, #1e1b4b)"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M86 78 C88 88 98 97 105 97 C101 88 97 82 96 78 Z"
                fill="var(--mascot-hair, #1e1b4b)"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M98 78 C106 90 116 99 122 100 C118 89 114 82 112 78 Z"
                fill="var(--mascot-hair, #1e1b4b)"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M116 78 C124 90 134 97 141 98 C135 88 130 82 128 78 Z"
                fill="var(--mascot-hair, #1e1b4b)"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M136 78 C144 87 154 95 160 97 C156 89 152 83 148 78 Z"
                fill="var(--mascot-hair, #1e1b4b)"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />

              {/* Hair Lustre Streaks */}
              <path d="M88 84 Q94 88 100 87" fill="none" stroke="#4338ca" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M104 84 Q112 90 118 88" fill="none" stroke="#4338ca" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M122 84 Q130 89 136 87" fill="none" stroke="#4338ca" strokeWidth="1.8" strokeLinecap="round" />
            </g>

            {/* ── Eyebrows ── */}
            {isBugCategory ? (
              // Bug shock: Raised angled brows
              <g stroke="var(--mascot-line, #1e1b4b)" strokeWidth="3.5" strokeLinecap="round" fill="none">
                <path d="M92 90 L106 86" />
                <path d="M148 90 L134 86" />
              </g>
            ) : (
              // Confident friendly arched brows
              <g stroke="var(--mascot-line, #1e1b4b)" strokeWidth="3.5" strokeLinecap="round" fill="none">
                <path d="M92 91 Q100 86 108 89" />
                <path d="M148 91 Q140 86 132 89" />
              </g>
            )}

            {/* ── Expressive Eyes (Sclera + Dynamic Pupils + Dual Sparkles) ── */}
            {isBlinking ? (
              // Happy creased-shut eyes when blinking
              <g stroke="var(--mascot-line, #1e1b4b)" strokeWidth="3.5" strokeLinecap="round" fill="none">
                <path d="M92 107 Q100 114 108 107" />
                <path d="M132 107 Q140 114 148 107" />
              </g>
            ) : (
              <g id="eyes">
                {/* Sclera (White eye background with subtle shading) */}
                <ellipse cx="100" cy="107" rx="10" ry="11" fill="#ffffff" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="2.5" />
                <ellipse cx="140" cy="107" rx="10" ry="11" fill="#ffffff" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="2.5" />
                {/* Upper eyelid soft shadow inside sclera */}
                <path d="M91 103 Q100 106 109 103" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                <path d="M131 103 Q140 106 149 103" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />

                {/* Irises & Pupils tracking mouse cursor */}
                {/* Left Eye Pupil Group */}
                <g transform={`translate(${pupilOffsetX}, ${pupilOffsetY})`}>
                  <circle cx="100" cy="107" r={isBugCategory ? 7.5 : 6.5} fill="url(#iris-grad)" />
                  <circle cx="100" cy="107" r={isBugCategory ? 5.5 : 4.5} fill="#0f172a" />
                  <circle cx="98" cy="104.5" r="2.2" fill="#ffffff" />
                  <circle cx="102" cy="109" r="1.1" fill="#ffffff" opacity="0.85" />
                </g>

                {/* Right Eye Pupil Group */}
                <g transform={`translate(${pupilOffsetX}, ${pupilOffsetY})`}>
                  <circle cx="140" cy="107" r={isBugCategory ? 7.5 : 6.5} fill="url(#iris-grad)" />
                  <circle cx="140" cy="107" r={isBugCategory ? 5.5 : 4.5} fill="#0f172a" />
                  <circle cx="138" cy="104.5" r="2.2" fill="#ffffff" />
                  <circle cx="142" cy="109" r="1.1" fill="#ffffff" opacity="0.85" />
                </g>

                {/* Upper Eyelash Contour */}
                <path d="M90 104 Q100 99 110 104" fill="none" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="3" strokeLinecap="round" />
                <path d="M130 104 Q140 99 150 104" fill="none" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="3" strokeLinecap="round" />
              </g>
            )}

            {/* ── Designer Smart Glasses (Clear Transparent Lenses & Reflection) ── */}
            <g id="glasses">
              {/* Frame Temple Bars to Ears */}
              <path d="M86 106 L78 103" fill="none" stroke="var(--mascot-frame, #4c1d95)" strokeWidth="3" strokeLinecap="round" />
              <path d="M154 106 L162 103" fill="none" stroke="var(--mascot-frame, #4c1d95)" strokeWidth="3" strokeLinecap="round" />

              {/* Center Bridge */}
              <path d="M113 105 Q120 102 127 105" fill="none" stroke="var(--mascot-frame, #4c1d95)" strokeWidth="3.5" strokeLinecap="round" />

              {/* Left Lens Frame */}
              <circle
                cx="100"
                cy="107"
                r="15"
                fill="rgba(240, 245, 255, 0.12)"
                stroke="var(--mascot-frame, #4c1d95)"
                strokeWidth="3.5"
              />
              {/* Left Lens Light Glare */}
              <path d="M92 100 A12 12 0 0 1 104 94" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />

              {/* Right Lens Frame */}
              <circle
                cx="140"
                cy="107"
                r="15"
                fill="rgba(240, 245, 255, 0.12)"
                stroke="var(--mascot-frame, #4c1d95)"
                strokeWidth="3.5"
              />
              {/* Right Lens Light Glare */}
              <path d="M132 100 A12 12 0 0 1 144 94" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
            </g>

            {/* ── Cute Clean Nose ── */}
            <path
              d="M119 114 Q121 117 123 116"
              fill="none"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <ellipse cx="120" cy="117.5" rx="2" ry="1" fill="#f59e0b" opacity="0.35" />

            {/* ── Mouth (Responsive to context) ── */}
            {isBugCategory ? (
              // Surprised "O" mouth
              <g id="mouth-shock">
                <ellipse
                  cx="120"
                  cy="129"
                  rx="5.5"
                  ry="7"
                  fill="var(--mascot-line, #1e1b4b)"
                  stroke="var(--mascot-line, #1e1b4b)"
                  strokeWidth="2"
                />
                <ellipse cx="120" cy="131" rx="3" ry="4" fill="var(--mascot-tongue, #f43f5e)" />
              </g>
            ) : isFeatureCategory || isHoveringSend ? (
              // Enthusiastic open grin!
              <g id="mouth-grin">
                <path
                  d="M110 126 C111 138 129 138 130 126 Z"
                  fill="var(--mascot-line, #1e1b4b)"
                  stroke="var(--mascot-line, #1e1b4b)"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path d="M115 133 C118 131 122 131 125 133" fill="var(--mascot-tongue, #f43f5e)" stroke="none" />
                <path d="M112 126 H128 V128 H112 Z" fill="#ffffff" />
              </g>
            ) : (
              // Charming, friendly warm smile
              <g id="mouth-smile">
                <path
                  d="M111 127 Q120 135 129 127"
                  fill="none"
                  stroke="var(--mascot-line, #1e1b4b)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path d="M130 126 Q132 127 131 129" fill="none" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="2" strokeLinecap="round" />
              </g>
            )}

            {/* ── Rosy Cheek Blush ── */}
            <ellipse cx="90" cy="120" rx="5" ry="3" fill="var(--mascot-blush, #f43f5e)" opacity="0.3" />
            <ellipse cx="150" cy="120" rx="5" ry="3" fill="var(--mascot-blush, #f43f5e)" opacity="0.3" />
          </g>
        </svg>
      </div>
    </div>
  );
}
