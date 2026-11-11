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
              <stop offset="0%" stopColor="var(--mascot-skin, #fcd34d)" />
              <stop offset="100%" stopColor="var(--mascot-skin-shade, #fbbf24)" />
            </linearGradient>
            <linearGradient id="jogger-grad" x1="0" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#242057" />
              <stop offset="100%" stopColor="#18153b" />
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

            {/* Trendy hair tuft peeking under cap */}
            <path d="M84 76q8 6 12 1" fill="none" stroke="var(--mascot-hair, #2e1065)" strokeWidth="3.5" strokeLinecap="round" />

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
            <path d="M78 107q-2 3 0 6" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
            <ellipse
              cx="164"
              cy="110"
              rx="8"
              ry="10"
              fill="var(--mascot-skin, #fcd34d)"
              stroke="var(--mascot-line, #1e1b4b)"
              strokeWidth="4"
            />
            <path d="M164 107q2 3 0 6" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />

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
              <path d="M92 98a12 12 0 0 1 10-5" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
              <circle
                cx="142"
                cy="105"
                r="16"
                fill="var(--mascot-lens, #fef08a)"
                stroke="var(--mascot-frame, #4c1d95)"
                strokeWidth="4.5"
              />
              <path d="M134 98a12 12 0 0 1 10-5" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
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
