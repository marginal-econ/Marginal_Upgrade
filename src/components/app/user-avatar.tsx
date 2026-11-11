import React from "react";
import {
  GraduationCap,
  Landmark,
  TrendingUp,
  PenLine,
  Sparkles,
  Award,
  Globe,
  Zap,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type AcademicAvatarPreset = {
  id: string;
  name: string;
  title: string;
  bg: string;
  border: string;
  text: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

export const ACADEMIC_AVATAR_PRESETS: AcademicAvatarPreset[] = [
  {
    id: "preset:scholar",
    name: "Cambridge Scholar",
    title: "Tripos Candidate",
    bg: "bg-indigo-500/15",
    border: "border-indigo-500/30",
    text: "text-indigo-600 dark:text-indigo-400",
    icon: GraduationCap,
    description: "Traditional Cambridge blue academic cap for aspiring top-tier university scholars.",
  },
  {
    id: "preset:classic",
    name: "Classical Economist",
    title: "Adam Smith Tradition",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    icon: Landmark,
    description: "Classic Wealth of Nations inspired emblem celebrating market foundations.",
  },
  {
    id: "preset:analyst",
    name: "Market Analyst",
    title: "Equilibrium Strategist",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: TrendingUp,
    description: "Supply, demand, and elasticities master specializing in price mechanism dynamics.",
  },
  {
    id: "preset:examiner",
    name: "Cambridge Examiner",
    title: "Mark Scheme Calibrator",
    bg: "bg-violet-500/15",
    border: "border-violet-500/30",
    text: "text-violet-600 dark:text-violet-400",
    icon: PenLine,
    description: "Rigorous evaluator with an eye for Band 1 analytical precision and evaluation.",
  },
  {
    id: "preset:researcher",
    name: "Policy Thinker",
    title: "Macroeconomic Researcher",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    text: "text-amber-500",
    icon: Sparkles,
    description: "Dedicated to solving real-world market failures and crafting fiscal remedies.",
  },
  {
    id: "preset:lion",
    name: "King's College Herald",
    title: "Royal Honours Candidate",
    bg: "bg-rose-500/15",
    border: "border-rose-500/30",
    text: "text-rose-600 dark:text-rose-400",
    icon: Award,
    description: "Centuries-old Cambridge heraldic distinction for ambitious high-flyers.",
  },
  {
    id: "preset:global",
    name: "Global Macro Pioneer",
    title: "International Trade",
    bg: "bg-sky-500/15",
    border: "border-sky-500/30",
    text: "text-sky-600 dark:text-sky-400",
    icon: Globe,
    description: "Focused on exchange rates, terms of trade, and macroeconomic coordination.",
  },
  {
    id: "preset:quant",
    name: "Econometrician",
    title: "Quantitative Modeller",
    bg: "bg-fuchsia-500/15",
    border: "border-fuchsia-500/30",
    text: "text-fuchsia-600 dark:text-fuchsia-400",
    icon: Zap,
    description: "Data-driven empirical insights, causal models, and statistical rigor.",
  },
];

export function getPresetById(id?: string | null): AcademicAvatarPreset | undefined {
  if (!id) return undefined;
  return ACADEMIC_AVATAR_PRESETS.find((p) => p.id === id);
}

interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  fallbackInitials?: string;
  className?: string;
  showStatusDot?: boolean;
  shape?: "circle" | "rounded";
}

export function UserAvatar({
  avatarUrl,
  name,
  fallbackInitials,
  className,
  showStatusDot = false,
  shape = "rounded",
}: UserAvatarProps) {
  const isCircle = shape === "circle";
  const roundedCls = isCircle ? "rounded-full" : "rounded-xl";

  const initials =
    fallbackInitials ||
    (name
      ? name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase() ?? "")
          .join("")
      : "CA");

  const preset = getPresetById(avatarUrl);
  const isMarginal =
    avatarUrl === "/marginal-m-icon-clean.png" ||
    avatarUrl === "marginal" ||
    (typeof avatarUrl === "string" && avatarUrl.includes("marginal-m-icon")) ||
    (!avatarUrl && (name?.trim().toLowerCase() === "marginal" || initials === "M"));

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      {preset ? (
        <div
          className={cn(
            "flex size-full items-center justify-center border shadow-xs transition-transform",
            roundedCls,
            preset.bg,
            preset.border,
            preset.text,
          )}
          title={preset.name}
        >
          <preset.icon className="size-1/2 shrink-0" />
        </div>
      ) : isMarginal ? (
        <div
          className={cn(
            "flex size-full items-center justify-center border border-primary/25 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent shadow-xs overflow-hidden p-1 transition-transform group-hover:scale-105",
            roundedCls,
          )}
          title="Marginal Economics"
        >
          <img
            src="/marginal-m-icon-clean.png"
            alt="Marginal"
            className="size-full object-contain drop-shadow-xs"
          />
        </div>
      ) : avatarUrl && (avatarUrl.startsWith("http") || avatarUrl.startsWith("data:") || avatarUrl.startsWith("/")) ? (
        <Avatar className={cn("size-full border border-border/80 shadow-xs", roundedCls)}>
          <AvatarImage src={avatarUrl} alt={name || "User avatar"} className="object-cover" />
          <AvatarFallback className={cn("bg-primary/10 text-primary font-bold text-xs", roundedCls)}>
            {initials}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div
          className={cn(
            "flex size-full items-center justify-center border border-primary/20 bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold shadow-xs",
            roundedCls,
          )}
        >
          {initials || <User className="size-1/2" />}
        </div>
      )}

      {showStatusDot && (
        <span
          className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-background ring-1 ring-emerald-500/20"
          title="Active online"
        />
      )}
    </div>
  );
}
