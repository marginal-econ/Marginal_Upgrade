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
  const [normPos, setNormPos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [bugSquashed, setBugSquashed] = useState(false);

  // Track cursor relative to the mascot
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 3; // Focus on the boy's head

      const rawDx = (e.clientX - centerX) / (window.innerWidth / 2);
      const rawDy = (e.clientY - centerY) / (window.innerHeight / 2);

      // Clamp to -1 .. 1
      const clampedX = Math.max(-1, Math.min(1, rawDx));
      const clampedY = Math.max(-1, Math.min(1, rawDy));

      setNormPos({ x: clampedX, y: clampedY });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

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
        @keyframes flutterLeft {
          0%, 100% { transform: rotate(-25deg); }
          50% { transform: rotate(35deg); }
        }
        @keyframes flutterRight {
          0%, 100% { transform: rotate(25deg); }
          50% { transform: rotate(-35deg); }
        }
        @keyframes erraticFlight {
          0% {
            transform: translate(0px, 0px) rotate(0deg);
          }
          20% {
            transform: translate(140px, -60px) rotate(25deg);
          }
          40% {
            transform: translate(260px, 30px) rotate(-15deg);
          }
          60% {
            transform: translate(180px, 120px) rotate(40deg);
          }
          80% {
            transform: translate(40px, 40px) rotate(-20deg);
          }
          100% {
            transform: translate(0px, 0px) rotate(0deg);
          }
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

      {/* ── Flying Bug (when category === 'bug') ────────────────────────── */}
      {isBugCategory && (
        <div
          className="pointer-events-auto absolute -top-8 -left-6 z-30 cursor-pointer"
          style={{ animation: "erraticFlight 9s infinite ease-in-out" }}
          onClick={() => {
            setBugSquashed(true);
            onBugClick?.();
          }}
          title="Click to squash the bug!"
        >
          <div className="group relative flex items-center justify-center p-2 transition-transform hover:scale-125 active:scale-95">
            {/* Wing Left */}
            <div
              className="absolute -top-1 left-1.5 h-3.5 w-2 rounded-full border border-sky-400/40 bg-sky-200/80 shadow-xs origin-bottom"
              style={{ animation: "flutterLeft 0.08s infinite ease-in-out" }}
            />
            {/* Wing Right */}
            <div
              className="absolute -top-1 right-1.5 h-3.5 w-2 rounded-full border border-sky-400/40 bg-sky-200/80 shadow-xs origin-bottom"
              style={{ animation: "flutterRight 0.08s infinite ease-in-out" }}
            />
            {/* Beetle Body */}
            <div
              className={cn(
                "relative flex h-5 w-4 items-center justify-center rounded-full border-2 border-border shadow-md transition-colors",
                bugSquashed
                  ? "bg-amber-500 border-amber-600 rotate-45"
                  : "bg-emerald-600 border-emerald-950",
              )}
            >
              <div className="size-1 rounded-full bg-yellow-300 animate-ping opacity-75" />
            </div>
            {/* Antennae */}
            <div className="absolute -top-2 flex gap-1">
              <div className="h-2 w-0.5 -rotate-25 rounded-full bg-emerald-900" />
              <div className="h-2 w-0.5 rotate-25 rounded-full bg-emerald-900" />
            </div>
            <span className="absolute -bottom-3 text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap opacity-80">
              {bugSquashed ? "SQUASHED!" : "~bzz!~"}
            </span>
          </div>
        </div>
      )}

      {/* ── Glowing Lightbulb (when category === 'feature_request') ─────── */}
      {isFeatureCategory && (
        <div
          className="absolute -top-10 left-12 z-20 flex flex-col items-center"
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
              <stop offset="0%" stopColor="var(--mascot-skin, #fcd34d)" />
              <stop offset="100%" stopColor="var(--mascot-skin-shade, #fbbf24)" />
            </linearGradient>
          </defs>

          {/* Ground Shadow */}
          <ellipse
            cx="120"
            cy="288"
            rx="56"
            ry="10"
            fill="var(--mascot-line, #1e1b4b)"
            opacity="0.22"
          />

          {/* ── Body & Clothing ────────────────────────────────────────── */}
          <g id="boy-body">
            {/* Legs & Shoes */}
            <path
              d="M96 220v48h16v-48z M128 220v48h16v-48z"
              fill="#1e1b4b"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            {/* Sneakers */}
            <path
              d="M86 268h30c2 5-2 10-10 10h-24c-4 0-6-5 4-10z M124 268h30c2 5-2 10-10 10h-24c-4 0-6-5 4-10z"
              fill="#fff"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* Neck */}
            <rect
              x="106"
              y="136"
              width="28"
              height="28"
              rx="4"
              fill="var(--mascot-skin-shade, #f59e0b)"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="4.5"
            />

            {/* Marginal Cambridge Jumper */}
            <path
              d="M62 164c6-20 28-26 58-26s52 6 58 26l14 48c1 6-4 12-10 12h-124c-6 0-11-6-10-12z"
              fill="url(#boy-sweater-grad)"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="5"
              strokeLinejoin="round"
            />

            {/* Jumper Collar */}
            <path
              d="M98 144c10 12 34 12 44 0"
              fill="none"
              stroke="var(--mascot-collar, #6d28d9)"
              strokeWidth="7"
              strokeLinecap="round"
            />

            {/* Marginal Emblem 'm' on chest */}
            <text
              x="120"
              y="184"
              textAnchor="middle"
              fontSize="16"
              fontWeight="900"
              fontFamily="sans-serif"
              fill="rgba(255,255,255,0.85)"
            >
              m
            </text>

            {/* Arms & Hands */}
            {isBugCategory ? (
              // Bug reaction: Hands thrown up in surprise!
              <g id="arms-surprised">
                <path
                  d="M64 168c-14-16-24-32-24-42 M176 168c14-16 24-32 24-42"
                  fill="none"
                  stroke="var(--mascot-line, #1e1b4b)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle cx="40" cy="124" r="8" fill="var(--mascot-skin, #fcd34d)" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="4" />
                <circle cx="200" cy="124" r="8" fill="var(--mascot-skin, #fcd34d)" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="4" />
              </g>
            ) : isFeatureCategory ? (
              // Feature Request: Pointing up towards lightbulb!
              <g id="arms-pointing">
                <path
                  d="M66 172c-12 12-16 28-14 38"
                  fill="none"
                  stroke="var(--mascot-line, #1e1b4b)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle cx="52" cy="214" r="7" fill="var(--mascot-skin, #fcd34d)" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="4" />
                <path
                  d="M174 170c14-14 18-36 14-52"
                  fill="none"
                  stroke="var(--mascot-line, #1e1b4b)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                {/* Pointing index finger */}
                <circle cx="188" cy="116" r="6.5" fill="var(--mascot-skin, #fcd34d)" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="4" />
              </g>
            ) : (
              // Default: Casual pose holding notebook / thumbs up
              <g id="arms-default">
                <path
                  d="M66 172c-12 16-16 32-12 42"
                  fill="none"
                  stroke="var(--mascot-line, #1e1b4b)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle cx="54" cy="216" r="7" fill="var(--mascot-skin, #fcd34d)" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="4" />
                <path
                  d="M174 172c10 16 12 32 8 42"
                  fill="none"
                  stroke="var(--mascot-line, #1e1b4b)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle cx="182" cy="216" r="7" fill="var(--mascot-skin, #fcd34d)" stroke="var(--mascot-line, #1e1b4b)" strokeWidth="4" />
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
            {/* Back Hair */}
            <path
              d="M78 96c0-36 20-56 42-56s42 20 42 56v20H78z"
              fill="var(--mascot-hair, #2e1065)"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="5"
            />

            {/* Backwards Cap (Crown & Back Brim) */}
            <g id="cap">
              <path
                d="M162 68c18-4 30 2 32 12s-14 14-28 10z"
                fill="var(--mascot-cap-shade, #5b21b6)"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="5"
                strokeLinejoin="round"
              />
              <path
                d="M80 82c-2-34 18-52 42-52s46 18 42 52c-14-12-28-16-44-16s-28 4-40 16z"
                fill="url(#boy-cap-grad)"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="5"
                strokeLinejoin="round"
              />
              <circle
                cx="122"
                cy="32"
                r="4.5"
                fill="var(--mascot-cap-shade, #5b21b6)"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="3.5"
              />
            </g>

            {/* Face Shape */}
            <path
              d="M84 92c0-26 16-40 38-40s38 14 38 40v20c0 22-16 34-38 34s-38-12-38-34z"
              fill="var(--mascot-skin, #fcd34d)"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="5"
              strokeLinejoin="round"
            />

            {/* Ears */}
            <ellipse
              cx="78"
              cy="110"
              rx="8"
              ry="10"
              fill="var(--mascot-skin, #fcd34d)"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="4"
            />
            <ellipse
              cx="164"
              cy="110"
              rx="8"
              ry="10"
              fill="var(--mascot-skin, #fcd34d)"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="4"
            />

            {/* Eyebrows */}
            {isBugCategory ? (
              // Shocked raised/slanted brows
              <g stroke="var(--mascot-line, #1e1b4b)" strokeWidth="4.5" strokeLinecap="round" fill="none">
                <path d="M92 84l12-4" />
                <path d="M148 84l-12-4" />
              </g>
            ) : (
              // Neutral confident brows
              <g stroke="var(--mascot-line, #1e1b4b)" strokeWidth="4.5" strokeLinecap="round" fill="none">
                <path d="M92 86q8-4 15-1" />
                <path d="M148 86q-8-4-15-1" />
              </g>
            )}

            {/* Glasses Frames */}
            <g id="glasses">
              <path
                d="M88 102l-10-2 M154 102l10-2 M114 104h14"
                fill="none"
                stroke="var(--mascot-frame, #4c1d95)"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              <circle
                cx="100"
                cy="105"
                r="16"
                fill="var(--mascot-lens, #fef08a)"
                stroke="var(--mascot-frame, #4c1d95)"
                strokeWidth="4.5"
              />
              <circle
                cx="142"
                cy="105"
                r="16"
                fill="var(--mascot-lens, #fef08a)"
                stroke="var(--mascot-frame, #4c1d95)"
                strokeWidth="4.5"
              />
            </g>

            {/* Eyes (Pupils track cursor!) */}
            {isBlinking ? (
              // Blinking creased shut
              <g stroke="var(--mascot-line, #1e1b4b)" strokeWidth="4" strokeLinecap="round" fill="none">
                <path d="M93 105h14" />
                <path d="M135 105h14" />
              </g>
            ) : isBugCategory ? (
              // Bug shock: Wide pupils tracking
              <g id="pupils-shocked">
                <circle
                  cx={100 + pupilOffsetX}
                  cy={105 + pupilOffsetY}
                  r="6.5"
                  fill="var(--mascot-line, #1e1b4b)"
                />
                <circle
                  cx={100 + pupilOffsetX - 2}
                  cy={105 + pupilOffsetY - 2}
                  r="2"
                  fill="#fff"
                />
                <circle
                  cx={142 + pupilOffsetX}
                  cy={105 + pupilOffsetY}
                  r="6.5"
                  fill="var(--mascot-line, #1e1b4b)"
                />
                <circle
                  cx={142 + pupilOffsetX - 2}
                  cy={105 + pupilOffsetY - 2}
                  r="2"
                  fill="#fff"
                />
              </g>
            ) : (
              // Normal animated pupils tracking mouse cursor
              <g id="pupils-normal">
                <circle
                  cx={100 + pupilOffsetX}
                  cy={105 + pupilOffsetY}
                  r="5"
                  fill="var(--mascot-line, #1e1b4b)"
                />
                <circle
                  cx={100 + pupilOffsetX - 1.5}
                  cy={105 + pupilOffsetY - 1.5}
                  r="1.5"
                  fill="#fff"
                />
                <circle
                  cx={142 + pupilOffsetX}
                  cy={105 + pupilOffsetY}
                  r="5"
                  fill="var(--mascot-line, #1e1b4b)"
                />
                <circle
                  cx={142 + pupilOffsetX - 1.5}
                  cy={105 + pupilOffsetY - 1.5}
                  r="1.5"
                  fill="#fff"
                />
              </g>
            )}

            {/* Nose */}
            <path
              d="M120 114q5 6-2 8"
              fill="none"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Mouth */}
            {isBugCategory ? (
              // Shocked "O" mouth
              <ellipse
                cx="120"
                cy="132"
                rx="6"
                ry="8"
                fill="var(--mascot-line, #1e1b4b)"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="3"
              />
            ) : isFeatureCategory || isHoveringSend ? (
              // Excited big open grin!
              <g id="mouth-grin">
                <path
                  d="M107 126c10-4 18-4 27 0-2 16-24 16-27 0z"
                  fill="var(--mascot-line, #1e1b4b)"
                  stroke="var(--mascot-line, #1e1b4b)"
                  strokeWidth="3"
                />
                <path
                  d="M114 136c4-2 9-2 12 0"
                  fill="var(--mascot-tongue, #f43f5e)"
                  stroke="none"
                />
                <rect x="112" y="127" width="16" height="5" rx="2" fill="#fff" />
              </g>
            ) : (
              // Warm confident smile
              <path
                d="M110 128q10 9 20 0"
                fill="none"
                stroke="var(--mascot-line, #1e1b4b)"
                strokeWidth="4"
                strokeLinecap="round"
              />
            )}

            {/* Cute Cheek Blush */}
            <circle cx="92" cy="120" r="4" fill="var(--mascot-blush, #f43f5e)" opacity="0.3" />
            <circle cx="150" cy="120" r="4" fill="var(--mascot-blush, #f43f5e)" opacity="0.3" />
          </g>
        </svg>
      </div>
    </div>
  );
}
