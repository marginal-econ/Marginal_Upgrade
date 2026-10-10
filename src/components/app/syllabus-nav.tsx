import { Link, useRouterState } from "@tanstack/react-router";
import { BookText, CircleHelp, Flame, LineChart, Sliders, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export const SYLLABUS_TABS = [
  { to: "/definitions", label: "Definitions Hub", icon: BookText },
  { to: "/diagrams", label: "Diagram Library", icon: LineChart },
  { to: "/diagram-lab", label: "Diagram CAD Lab", icon: Sliders },
  { to: "/paper-matrix", label: "Past Paper Predictor", icon: Flame },
  { to: "/command-words", label: "Command Words", icon: CircleHelp },
  { to: "/showcase", label: "Exemplars Showcase", icon: Trophy },
] as const;

export function SyllabusNavTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Syllabus resources navigation"
      className="flex items-center gap-1 overflow-x-auto border-b border-border/70 bg-card/50 px-5 pt-1.5 pb-0 md:px-8"
    >
      {SYLLABUS_TABS.map((tab) => {
        const active = pathname === tab.to;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-medium whitespace-nowrap transition-colors",
              active
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            <tab.icon className={cn("size-3.5", active ? "text-primary" : "text-muted-foreground")} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
