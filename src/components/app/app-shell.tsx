import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PenLine,
  Target,
  Dumbbell,
  ShieldCheck,
  BookMarked,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  UsersRound,
  BookText,
  ChevronDown,
  ChevronRight,
  Menu,
  GraduationCap,
  Flame,
  Sliders,
  Settings,
  CreditCard,
  Zap,
  Lock,
  LineChart,
  Trophy,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LockedFeatureModal, type LockedFeatureType } from "@/components/app/locked-feature-modal";
import { usePresenceHeartbeat } from "@/hooks/use-presence";
import { supabase } from "@/integrations/backend/client";
import type { UserSubscriptionDetails } from "@/lib/usage-limits";
import { cn } from "@/lib/utils";

export type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  staffOnly?: boolean;
  adminOnly?: boolean;
  requiresPaid?: boolean;
  requiresHigherTier?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  collapsible?: boolean;
  adminOnly?: boolean;
  staffOnly?: boolean;
  isExperimental?: boolean;
  items: NavItem[];
};

const SIDEBAR_COLLAPSED_STORAGE_KEY = "marginal.sidebarCollapsed";
const COLLAPSED_GROUPS_STORAGE_KEY = "marginal.collapsedNavGroups";

/**
 * Intuitive, Cambridge 9708 organized navigation:
 * 1. Essay Marking & Live: Grade Essay, Live Examiner (Chained for Free), Exemplars & Submissions
 * 2. Classroom & Progress: Dashboard, Classes, Review & Diagnostics (Together!)
 * 3. Syllabus & Knowledge: Definitions Hub, Diagram Library (Required!), Command Words, MCQ Past Papers, Question Bank
 * 4. Experimental Labs: Diagram CAD Lab, Past Paper Predictor, Teacher Examiner (Chained for Free, Unlocked for Pro/Mastery/Elite/Admin)
 * 5. Administration: Admin Console & Staff Console (Admin only)
 */
const NAV_GROUPS: NavGroup[] = [
  {
    id: "grading",
    label: "Essay Marking & Live",
    collapsible: true,
    items: [
      { to: "/grade", label: "Grade Essay", icon: PenLine },
      {
        to: "/live-examiner",
        label: "Live Examiner",
        icon: Sparkles,
        badge: "Live",
        requiresPaid: true,
      },
      { to: "/showcase", label: "Exemplars & Submissions", icon: Trophy },
    ],
  },
  {
    id: "classroom_progress",
    label: "Classroom & Progress",
    collapsible: true,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/classes", label: "Classes", icon: UsersRound },
      { to: "/review", label: "Review & Diagnostics", icon: ClipboardCheck },
    ],
  },
  {
    id: "syllabus",
    label: "Syllabus & Knowledge",
    collapsible: true,
    items: [
      { to: "/definitions", label: "Definitions Hub", icon: BookText },
      { to: "/diagrams", label: "Diagram Library", icon: LineChart },
      { to: "/command-words", label: "Command Words", icon: Target },
      { to: "/mcq-live", label: "MCQ Past Papers", icon: ListChecks },
      { to: "/question-bank", label: "Question Bank", icon: BookMarked },
    ],
  },
  {
    id: "experimental",
    label: "Experimental Labs",
    collapsible: true,
    isExperimental: true,
    items: [
      { to: "/paper-matrix", label: "Paper Predictor", icon: Flame, badge: "15-Yr", requiresHigherTier: true },
      { to: "/diagram-lab", label: "Diagram CAD Lab", icon: Sliders, badge: "Lab", requiresHigherTier: true },
      { to: "/examiner", label: "Teacher Examiner", icon: GraduationCap, badge: "Admin", adminOnly: true },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    adminOnly: true,
    collapsible: true,
    items: [
      { to: "/admin", label: "Admin Console", icon: ShieldCheck, badge: "Root" },
      { to: "/knowledge", label: "Staff Console", icon: BookOpen },
    ],
  },
];

function filterGroupForRole(
  group: NavGroup,
  role: "student" | "teacher" | "admin",
  subscription?: UserSubscriptionDetails,
): NavGroup | null {
  const isAdmin = role === "admin" || Boolean(subscription?.isAdmin);

  if (group.adminOnly && !isAdmin) return null;
  if (group.staffOnly && role !== "teacher" && !isAdmin) return null;

  const visibleItems = group.items.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.staffOnly && role !== "teacher" && !isAdmin) return false;
    return true;
  });

  if (visibleItems.length === 0) return null;
  return { ...group, items: visibleItems };
}

export function AppShell({
  children,
  role,
  name,
  userId,
  subscription,
}: {
  children: ReactNode;
  role: "student" | "teacher" | "admin";
  name: string | null;
  userId: string;
  subscription?: UserSubscriptionDetails;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  usePresenceHeartbeat(pathname, userId);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [lockedModalType, setLockedModalType] = useState<LockedFeatureType>(null);

  useEffect(() => {
    try {
      const isCollapsed = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
      setSidebarCollapsed(isCollapsed);

      const savedCollapsedGroups = window.localStorage.getItem(COLLAPSED_GROUPS_STORAGE_KEY);
      if (savedCollapsedGroups) {
        setCollapsedGroups(new Set(JSON.parse(savedCollapsedGroups)));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      try {
        window.localStorage.setItem(COLLAPSED_GROUPS_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // Ignore localStorage write error
      }
      return next;
    });
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // Ignore localStorage error
      }
      return next;
    });
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.map((g) => filterGroupForRole(g, role, subscription)).filter(
      (g): g is NavGroup => g !== null,
    );
  }, [role, subscription]);

  const classroomLabel = role === "student" ? "Join class" : "Classes";

  const isUserAdmin = role === "admin" || Boolean(subscription?.isAdmin);
  const isHigherTierUser = isUserAdmin || subscription?.tier === "mastery" || subscription?.tier === "elite";
  const canLiveExaminer = isUserAdmin || Boolean(subscription?.canUseLiveExaminer);

  const isItemActive = (to: string) => {
    if (to === "/dashboard") return pathname === "/dashboard";
    if (pathname === to) return true;
    if (to !== "/dashboard" && pathname.startsWith(to)) {
      if (to === "/grade") return pathname === "/grade" || pathname.startsWith("/essay");
      return true;
    }
    if ((to === "/admin" || to === "/knowledge") && ["/calibration", "/content-admin", "/mcq-papers-admin"].some((p) => pathname.startsWith(p))) {
      return true;
    }
    return false;
  };

  const renderNavGroup = (group: NavGroup, isMobile = false) => {
    const isGroupCollapsed = group.collapsible && collapsedGroups.has(group.id);
    const hasActiveItem = group.items.some((item) => isItemActive(item.to));
    const forceOpen = hasActiveItem || !isGroupCollapsed;

    return (
      <div key={group.id} className="space-y-0.5">
        {group.label ? (
          sidebarCollapsed && !isMobile ? (
            <div className="my-2 border-t border-sidebar-border/60" />
          ) : (
            <button
              type="button"
              onClick={() => group.collapsible && toggleGroup(group.id)}
              className="w-full flex items-center justify-between px-2.5 pt-3 pb-1 text-[10px] font-bold tracking-wider text-muted-foreground/70 uppercase select-none hover:text-foreground transition-colors group cursor-pointer text-left"
              title={forceOpen ? "Collapse section" : "Expand section"}
            >
              <span className="flex items-center gap-1.5 truncate">
                {group.isExperimental && !isHigherTierUser ? (
                  <Lock className="size-3 text-amber-500 shrink-0" />
                ) : null}
                <span>{group.label}</span>
              </span>
              {group.collapsible ? (
                <ChevronDown
                  className={cn(
                    "size-3 text-muted-foreground/50 transition-transform duration-200 group-hover:text-foreground shrink-0",
                    !forceOpen && "-rotate-90",
                  )}
                />
              ) : null}
            </button>
          )
        ) : null}

        {(forceOpen || (sidebarCollapsed && !isMobile)) && (
          <nav className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isItemActive(item.to);
              const label = item.to === "/classes" ? classroomLabel : item.label;

              const isChainedPaid = item.requiresPaid && !canLiveExaminer;
              const isLockedExperimental = item.requiresHigherTier && !isHigherTierUser;
              const isLocked = isChainedPaid || isLockedExperimental;

              if (isLocked) {
                return (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => {
                      if (isMobile) setMobileDrawerOpen(false);
                      setLockedModalType(isChainedPaid ? "live_examiner" : "experimental");
                    }}
                    className={cn(
                      "group relative flex w-full items-center rounded-lg py-1.5 text-xs font-medium text-sidebar-foreground/75 transition-all duration-150 text-left cursor-pointer",
                      sidebarCollapsed && !isMobile ? "justify-center px-2" : "gap-2.5 px-2.5",
                      "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
                    )}
                    title={`${label} (${isChainedPaid ? "Paid Only" : "Pro Plan"})`}
                  >
                    <item.icon
                      className={cn(
                        "size-4 shrink-0 transition-transform group-hover:scale-105",
                        isChainedPaid ? "text-amber-500/80" : "text-muted-foreground/70",
                      )}
                    />
                    <span className={cn("truncate", sidebarCollapsed && !isMobile && "sr-only")}>
                      {label}
                    </span>
                    {!sidebarCollapsed || isMobile ? (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                        <Lock className="size-2.5" />
                        {isChainedPaid ? "Chained" : "Locked"}
                      </span>
                    ) : null}
                  </button>
                );
              }

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => isMobile && setMobileDrawerOpen(false)}
                  className={cn(
                    "group relative flex items-center rounded-lg py-1.5 text-xs font-medium text-sidebar-foreground/80 transition-all duration-150",
                    sidebarCollapsed && !isMobile ? "justify-center px-2" : "gap-2.5 px-2.5",
                    "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
                    active && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-2xs",
                  )}
                  title={label}
                >
                  {active && (!sidebarCollapsed || isMobile) ? (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />
                  ) : null}
                  <item.icon
                    className={cn(
                      "size-4 shrink-0 transition-transform group-hover:scale-105",
                      active ? "text-primary" : "text-muted-foreground/80",
                    )}
                  />
                  <span className={cn("truncate", sidebarCollapsed && !isMobile && "sr-only")}>
                    {label}
                  </span>
                  {item.badge && (!sidebarCollapsed || isMobile) ? (
                    <span className="ml-auto rounded-full bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    );
  };

  const candidateInitials = useMemo(() => {
    if (!name) return "E";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    return (name[0] ?? "E").toUpperCase();
  }, [name]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Desktop Sidebar: Sticky, fixed-height, perfectly pinned ── */}
      <aside
        className={cn(
          "sticky top-0 h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-3 transition-[width,padding] duration-300 ease-out hidden md:flex z-30 select-none",
          sidebarCollapsed ? "w-[4.5rem] px-2" : "w-64 px-3",
        )}
      >
        {/* Brand Header */}
        <div
          className={cn(
            "mb-2.5 flex items-center pb-2.5 border-b border-sidebar-border/60 shrink-0",
            sidebarCollapsed ? "justify-center" : "gap-2 px-1.5",
          )}
        >
          <Link
            to="/dashboard"
            className="flex min-w-0 items-center gap-2.5 group"
            title="Marginal Economics Dashboard"
          >
            <img
              src="/marginal-m-icon-clean.png"
              alt=""
              aria-hidden="true"
              className="size-7 shrink-0 object-contain transition-transform group-hover:scale-105"
            />
            <span
              className={cn("text-sm leading-tight font-bold tracking-tight text-foreground", sidebarCollapsed && "hidden")}
            >
              Marginal
              <span className="block text-[10px] font-normal text-muted-foreground">
                Cambridge 9708
              </span>
            </span>
          </Link>
          {!sidebarCollapsed ? (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto size-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={toggleSidebar}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="size-3.5" />
            </Button>
          ) : null}
        </div>

        {sidebarCollapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="mb-2 size-8 self-center text-muted-foreground hover:text-foreground shrink-0"
            onClick={toggleSidebar}
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="size-3.5" />
          </Button>
        ) : null}

        {/* User Status & Credit Widget */}
        {!sidebarCollapsed && subscription ? (
          role === "admin" || subscription.isAdmin ? (
            <div className="mb-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {candidateInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate text-foreground leading-tight">
                      {name ?? "Vaquitavoid"}
                    </p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold leading-tight">
                      Administrator
                    </p>
                  </div>
                </div>
                <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[9px] font-extrabold uppercase">
                  Root
                </Badge>
              </div>
              <div className="mt-2 pt-2 border-t border-amber-500/20 text-[10.5px] text-muted-foreground flex items-center gap-1.5 font-medium">
                <ShieldCheck className="size-3.5 text-amber-500 shrink-0" />
                <span className="text-foreground">Uncapped Godmode · No Limits</span>
              </div>
            </div>
          ) : (
            <div className="mb-2.5 rounded-xl border border-border/80 bg-muted/40 p-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                    {candidateInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate text-foreground leading-tight">
                      {name ?? "Candidate"}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize leading-tight">
                      {role}
                    </p>
                  </div>
                </div>

                <Link to="/pricing">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9.5px] px-1.5 py-0 font-bold shrink-0 cursor-pointer transition-colors hover:opacity-80",
                      subscription.isPaid
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-primary/30 bg-primary/10 text-primary"
                    )}
                  >
                    {subscription.isPaid ? subscription.tierName.split(" ")[0] : "Free Tier"}
                  </Badge>
                </Link>
              </div>

              <div className="mt-2 pt-2 border-t border-border/50 space-y-1 text-[10.5px]">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <PenLine className="size-3 text-primary" /> Essays Left
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {subscription.essaysLimit === 9999 ? "Unlimited" : `${subscription.essaysRemaining} / ${subscription.essaysLimit}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Zap className="size-3 text-amber-500" /> Live Credits
                  </span>
                  {subscription.liveExaminerCredits > 0 ? (
                    <span className="font-semibold text-foreground tabular-nums">
                      {subscription.liveExaminerCredits}
                    </span>
                  ) : (
                    <Link to="/pricing" className="text-[10px] font-bold text-primary hover:underline">
                      Upgrade
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        ) : null}

        {/* Scrollable Navigation Groups */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden space-y-2 pr-0.5">
          {visibleGroups.map((group) => renderNavGroup(group))}
        </div>

        {/* ── User Footer: Cleanly pinned at the bottom, perfectly spaced ── */}
        <div className="shrink-0 pt-2.5 border-t border-sidebar-border/70 mt-auto space-y-1">
          <Link
            to="/pricing"
            className={cn(
              "flex items-center rounded-lg py-1.5 text-xs font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              sidebarCollapsed ? "justify-center px-1" : "gap-2.5 px-2.5",
              pathname.startsWith("/pricing") && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
            )}
            title="Revision plans & pricing"
          >
            <CreditCard className="size-4 shrink-0 text-primary" />
            <span className={cn("truncate", sidebarCollapsed && "sr-only")}>
              Plans & Pricing
            </span>
          </Link>

          <Link
            to="/settings"
            className={cn(
              "flex items-center rounded-lg py-1.5 text-xs font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              sidebarCollapsed ? "justify-center px-1" : "gap-2.5 px-2.5",
              pathname.startsWith("/settings") && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
            )}
            title="Account settings"
          >
            <Settings className="size-4 shrink-0 text-muted-foreground/80" />
            <span className={cn("truncate", sidebarCollapsed && "sr-only")}>
              Settings
            </span>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
              sidebarCollapsed ? "justify-center p-0" : "justify-start px-2.5 gap-2.5"
            )}
            onClick={signOut}
            title="Sign out of account"
          >
            <LogOut className="size-4 shrink-0" />
            <span className={cn(sidebarCollapsed && "sr-only")}>Sign out</span>
          </Button>
        </div>
      </aside>

      {/* ── Main Content & Mobile Header ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-2.5 backdrop-blur-sm md:hidden sticky top-0 z-40">
          <div className="flex items-center gap-2.5">
            <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <Menu className="size-4" />
                  <span className="sr-only">Open navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4 flex flex-col h-full">
                <SheetHeader className="mb-3 text-left shrink-0">
                  <SheetTitle className="flex items-center gap-2">
                    <img
                      src="/marginal-m-icon-clean.png"
                      alt=""
                      aria-hidden="true"
                      className="size-7 object-contain"
                    />
                    <span className="font-bold">Marginal 9708</span>
                  </SheetTitle>
                </SheetHeader>

                {subscription ? (
                  role === "admin" || subscription.isAdmin ? (
                    <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 shrink-0 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{name ?? "Vaquitavoid"}</span>
                        <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[9px] font-extrabold uppercase">
                          Root Admin
                        </Badge>
                      </div>
                      <div className="mt-2 pt-2 border-t border-amber-500/20 text-[10.5px] text-muted-foreground flex items-center gap-1.5 font-medium">
                        <ShieldCheck className="size-3.5 text-amber-500" />
                        <span>Uncapped Godmode · No Limits</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3 rounded-xl border border-border/80 bg-muted/40 p-2.5 shrink-0 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{name ?? "Candidate"}</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold">
                          {subscription.isPaid ? subscription.tierName : "Free Tier"}
                        </Badge>
                      </div>
                      <div className="mt-2 pt-2 border-t border-border/50 flex justify-between text-[11px] text-muted-foreground">
                        <span>Essays left: {subscription.essaysRemaining}</span>
                        <span>Credits: {subscription.liveExaminerCredits}</span>
                      </div>
                    </div>
                  )
                ) : null}

                <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1">
                  {visibleGroups.map((group) => renderNavGroup(group, true))}
                </div>

                <div className="mt-auto shrink-0 pt-3 border-t border-border space-y-1">
                  <Link
                    to="/pricing"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    <CreditCard className="size-4 text-primary" /> Plans &amp; Pricing
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    <Settings className="size-4 text-muted-foreground" /> Settings
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2.5 gap-2.5"
                    onClick={signOut}
                  >
                    <LogOut className="size-4" /> Sign out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/dashboard" className="flex items-center gap-2">
              <img
                src="/marginal-m-icon-clean.png"
                alt=""
                aria-hidden="true"
                className="size-6 object-contain"
              />
              <span className="text-sm font-bold">Marginal</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/pricing">
              <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30">
                {subscription?.isPaid ? subscription.tierName.split(" ")[0] : "Free Tier"}
              </Badge>
            </Link>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>

      <LockedFeatureModal
        open={lockedModalType !== null}
        onOpenChange={(open) => {
          if (!open) setLockedModalType(null);
        }}
        type={lockedModalType}
      />
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-b border-border bg-card/60 px-5 py-5 sm:px-6 md:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
