import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
  MessageSquare,
  Send,
  Trophy,
  ArrowRight,
  FileSpreadsheet,
  Wand2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LockedFeatureModal, type LockedFeatureType } from "@/components/app/locked-feature-modal";
import { FeedbackDialog, FloatingFeedbackPill } from "@/components/feedback/feedback-dialog";
import { StudentMessagesDialog, playMessageNotificationChime } from "@/components/app/student-messages-dialog";
import { UserAvatar } from "@/components/app/user-avatar";
import { getUnreadMessageCount } from "@/lib/messages.functions";
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
 * 4. Administration: Admin Console & Staff Console (Admin only)

 */
const NAV_GROUPS: NavGroup[] = [
  {
    id: "dashboard_analytics",
    label: "Dashboard & Analytics",
    collapsible: true,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/review", label: "Analytics & Diagnostics", icon: ClipboardCheck },
      { to: "/classes", label: "Classes", icon: UsersRound },
    ],
  },
  {
    id: "grading",
    label: "Exam Practice",
    collapsible: true,
    items: [
      { to: "/grade", label: "Grade Unlimited Essays", icon: PenLine },
      { to: "/mcq-live", label: "MCQ Past Papers", icon: ListChecks, badge: "P1 & P3" },
      { to: "/data-response", label: "Data Response Papers", icon: FileSpreadsheet, badge: "P2 & P4" },
      { to: "/essay-generator", label: "Sample Essay Generator", icon: Wand2, badge: "AI Models" },
      { to: "/response-structure", label: "How to Write an Essay", icon: GraduationCap, badge: "Guide" },
      {
        to: "/live-examiner",
        label: "Live Examiner",
        icon: Sparkles,
        badge: "Under Building",
      },
    ],
  },
  {
    id: "syllabus",
    label: "Syllabus Resources",
    collapsible: true,
    items: [
      { to: "/paper-matrix", label: "Paper Predictor", icon: Flame, badge: "15-Yr" },
      { to: "/definitions", label: "Definitions Hub", icon: BookText },
      { to: "/question-bank", label: "Question Bank", icon: BookMarked },
      { to: "/diagrams", label: "Diagram Library", icon: LineChart },
      { to: "/command-words", label: "Command Words", icon: Target },
      { to: "/showcase", label: "Exemplars Showcase", icon: Trophy },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    adminOnly: true,
    collapsible: true,
    items: [
      { to: "/admin", label: "Admin Console", icon: ShieldCheck, badge: "Root" },
      {
        to: "/live-examiner",
        label: "Live Examiner Studio",
        icon: Sparkles,
        badge: "Under Building",
      },
    ],
  },
];

const TEACHER_NAV_GROUPS: NavGroup[] = [
  {
    id: "dashboard_analytics",
    label: "Dashboard & Classrooms",
    collapsible: true,
    items: [
      { to: "/dashboard", label: "Educator Dashboard", icon: LayoutDashboard },
      { to: "/classes", label: "My Classrooms", icon: UsersRound },
      { to: "/review", label: "Analytics & Diagnostics", icon: ClipboardCheck },
    ],
  },
  {
    id: "grading",
    label: "Exam Practice",
    collapsible: true,
    items: [
      { to: "/grade", label: "Grade Essays", icon: PenLine },
      { to: "/mcq-live", label: "MCQ Past Papers", icon: ListChecks, badge: "P1 & P3" },
      { to: "/data-response", label: "Data Response Papers", icon: FileSpreadsheet, badge: "P2 & P4" },
      { to: "/essay-generator", label: "Sample Essay Generator", icon: Wand2, badge: "AI Models" },
      { to: "/response-structure", label: "How to Write an Essay", icon: GraduationCap, badge: "Guide" },
      {
        to: "/live-examiner",
        label: "Live Examiner",
        icon: Sparkles,
        badge: "Under Building",
      },
    ],
  },
  {
    id: "syllabus",
    label: "Syllabus Resources",
    collapsible: true,
    items: [
      { to: "/paper-matrix", label: "Paper Predictor", icon: Flame, badge: "15-Yr" },
      { to: "/definitions", label: "Definitions Hub", icon: BookText },
      { to: "/question-bank", label: "Question Bank", icon: BookMarked },
      { to: "/diagrams", label: "Diagram Library", icon: LineChart },
      { to: "/command-words", label: "Command Words", icon: Target },
      { to: "/showcase", label: "Exemplars Showcase", icon: Trophy },
      { to: "/knowledge", label: "Knowledge Base", icon: BookOpen },
      { to: "/calibration", label: "Anchor Calibration", icon: ShieldCheck, adminOnly: true },
    ],
  },
];

function filterGroupForRole(
  group: NavGroup,
  role: "student" | "teacher" | "admin",
  subscription?: UserSubscriptionDetails,
): NavGroup | null {
  const isAdmin = role === "admin" || Boolean(subscription?.isAdmin);
  const isPaid = Boolean(subscription?.isPaid || isAdmin);

  if (group.adminOnly && !isAdmin) return null;
  if (group.staffOnly && role !== "teacher" && !isAdmin) return null;
  // Experimental labs and features are confidential and visible strictly to administrators
  if (group.isExperimental && !isAdmin) return null;

  const visibleItems = group.items.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.staffOnly && role !== "teacher" && !isAdmin) return false;
    if (item.requiresHigherTier && !isAdmin) return false;
    return true;
  });

  if (visibleItems.length === 0) return null;
  return { ...group, items: visibleItems };
}

const GROUP_META: Record<
  string,
  { dot: string; text: string; bg: string }
> = {
  dashboard_analytics: {
    dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "hover:bg-emerald-500/10",
  },
  grading: {
    dot: "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]",
    text: "text-indigo-600 dark:text-indigo-400",
    bg: "hover:bg-indigo-500/10",
  },
  syllabus: {
    dot: "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]",
    text: "text-sky-600 dark:text-sky-400",
    bg: "hover:bg-sky-500/10",
  },
  admin: {
    dot: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]",
    text: "text-purple-600 dark:text-purple-400",
    bg: "hover:bg-purple-500/10",
  },
};

export function AppShell({
  children,
  role,
  name,
  school,
  avatarUrl,
  bio,
  birthday,
  userId,
  subscription,
}: {
  children: ReactNode;
  role: "student" | "teacher" | "admin";
  name: string | null;
  school?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  birthday?: string | null;
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

  const isTeacherUser = role === "teacher" || Boolean(subscription?.isTeacher);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    const target = isTeacherUser ? "/teacher-auth" : "/auth";
    navigate({ to: target, replace: true });
  };

  const visibleGroups = useMemo(() => {
    if (isTeacherUser && role !== "admin" && !subscription?.isAdmin) {
      return TEACHER_NAV_GROUPS;
    }
    return NAV_GROUPS.map((g) => filterGroupForRole(g, role, subscription)).filter(
      (g): g is NavGroup => g !== null,
    );
  }, [role, subscription, isTeacherUser]);

  const classroomLabel = role === "student" ? "Classroom" : "Classes";

  const isUserAdmin = role === "admin" || Boolean(subscription?.isAdmin);
  const isHigherTierUser = isUserAdmin || subscription?.tier === "mastery" || subscription?.tier === "elite";
  const canLiveExaminer = isUserAdmin || Boolean(subscription?.canUseLiveExaminer);
  const isPaidUser = isUserAdmin || Boolean(subscription?.isPaid);

  const getUnreadFn = useServerFn(getUnreadMessageCount);
  const unreadMsgQuery = useQuery({
    queryKey: ["student-unread-count"],
    queryFn: () => getUnreadFn(),
    refetchInterval: 3_000,
  });
  const unreadMsgCount = unreadMsgQuery.data?.unreadCount ?? 0;

  const prevAdminCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isUserAdmin) return;
    if (prevAdminCountRef.current === null) {
      if (unreadMsgCount > 0) {
        playMessageNotificationChime();
        toast.info("Unread student messages in queue", {
          description: `You have ${unreadMsgCount} direct message(s) from students.`,
          action: {
            label: "Open Portal",
            onClick: () => navigate({ to: "/admin", search: { tab: "messages" } }),
          },
          duration: 8000,
        });
      }
      prevAdminCountRef.current = unreadMsgCount;
      return;
    }
    if (unreadMsgCount > prevAdminCountRef.current) {
      playMessageNotificationChime();
      toast.info("New message from student", {
        description: "A student sent a message in the direct portal.",
        action: {
          label: "View Chat",
          onClick: () => navigate({ to: "/admin", search: { tab: "messages" } }),
        },
        duration: 8000,
      });
    }
    prevAdminCountRef.current = unreadMsgCount;
  }, [unreadMsgCount, isUserAdmin, navigate]);

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
    const isCollapsed = collapsedGroups.has(group.id);
    const isOpen = !isCollapsed;
    const meta = GROUP_META[group.id];

    return (
      <div key={group.id} className="space-y-0.5">
        {group.label ? (
          sidebarCollapsed && !isMobile ? (
            <div className="my-2 border-t border-sidebar-border/60" />
          ) : (
            <button
              type="button"
              onClick={() => group.collapsible && toggleGroup(group.id)}
              className={cn(
                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold tracking-tight uppercase select-none transition-all duration-200 group cursor-pointer text-left",
                meta?.bg ?? "hover:bg-sidebar-accent/50",
                isOpen ? (meta?.text ?? "text-foreground") : "text-muted-foreground/70 hover:text-foreground",
              )}
              title={isOpen ? "Collapse section" : "Expand section"}
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className={cn(
                    "size-1.5 rounded-full transition-transform duration-200 shrink-0",
                    meta?.dot ?? "bg-primary/70",
                    isOpen && "scale-125",
                  )}
                />
                <span className="truncate">{group.label}</span>
                {group.isExperimental && !isHigherTierUser ? (
                  <Lock className="size-3 text-amber-500 shrink-0" />
                ) : null}
              </span>
              {group.collapsible ? (
                <ChevronDown
                  className={cn(
                    "size-3 text-muted-foreground/50 transition-transform duration-300 ease-out group-hover:text-foreground shrink-0",
                    !isOpen && "-rotate-90 text-muted-foreground/30",
                  )}
                />
              ) : null}
            </button>
          )
        ) : null}

        <div
          className={cn(
            "grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden",
            isOpen || (sidebarCollapsed && !isMobile)
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0 pointer-events-none",
          )}
        >
          <div className="min-h-0 overflow-hidden space-y-0.5">
            <nav className="flex flex-col gap-0.5 pt-0.5 pb-1">
              {group.items.map((item) => {
                const active = isItemActive(item.to);
                const label = item.to === "/classes" ? classroomLabel : item.label;

                const isTeacherUser = role === "teacher" || Boolean(subscription?.isTeacher);
                const isTeacherUnpaid = false;

                const isChainedPaid = item.requiresPaid && !canLiveExaminer;
                const isChainedEssay =
                  item.to === "/grade" &&
                  !isUserAdmin &&
                  Boolean(subscription && !subscription.canGradeEssay);
                const isChainedLiveExaminer =
                  item.to === "/live-examiner" &&
                  !isUserAdmin &&
                  isChainedPaid;
                const isChainedMCQ =
                  item.to === "/mcq-live" &&
                  !isUserAdmin &&
                  // check mcq access
                  Boolean(subscription && !subscription.canUseMCQ);
                const isLockedExperimental = item.requiresHigherTier && !isHigherTierUser;
                const isLocked =
                  isChainedPaid || isChainedEssay || isChainedLiveExaminer || isChainedMCQ || isLockedExperimental;

                if (isLocked) {
                  const lockType: LockedFeatureType =
                    isTeacherUnpaid && (item.to === "/grade" || item.to === "/live-examiner")
                      ? "school_license"
                      : isLockedExperimental
                      ? "experimental"
                      : isChainedLiveExaminer || isChainedPaid
                      ? "live_examiner"
                      : isChainedEssay
                      ? "essay_limit"
                      : isChainedMCQ
                      ? "mcq_limit"
                      : "school_license";
                  const isChained = isChainedPaid || isChainedEssay || isChainedLiveExaminer || isChainedMCQ;

                  return (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => {
                        if (isMobile) setMobileDrawerOpen(false);
                        setLockedModalType(lockType);
                      }}
                      className={cn(
                        "group relative flex w-full items-center rounded-xl py-2 text-xs font-medium text-sidebar-foreground/75 transition-all duration-200 text-left cursor-pointer",
                        sidebarCollapsed && !isMobile ? "justify-center px-2" : "gap-2.5 px-2.5",
                        "hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground hover:translate-x-1",
                      )}
                      title={`${label} (${isTeacherUnpaid ? "School Department License Required" : isChained ? "Chained · Limit Reached" : "Mastery Pass"})`}
                    >
                      <item.icon
                        className={cn(
                          "size-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                          isChained
                            ? "text-amber-500/90"
                            : "text-muted-foreground/70 group-hover:text-amber-500",
                        )}
                      />
                      <span className={cn("truncate", sidebarCollapsed && !isMobile && "sr-only")}>
                        {label}
                      </span>
                      {!sidebarCollapsed || isMobile ? (
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 shadow-2xs group-hover:bg-amber-500/25 transition-colors">
                          <Lock className="size-2.5 animate-pulse" />
                          {isTeacherUnpaid && (item.to === "/grade" || item.to === "/live-examiner")
                            ? "School Pass"
                            : isChained
                            ? "Chained"
                            : "Locked"}
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
                      "group relative flex items-center rounded-xl py-2 text-xs font-medium transition-all duration-200",
                      sidebarCollapsed && !isMobile ? "justify-center px-2" : "gap-2.5 px-2.5",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground hover:translate-x-1",
                    )}
                    title={label}
                  >
                    {active && (!sidebarCollapsed || isMobile) ? (
                      <span className="absolute left-0.5 top-2 bottom-2 w-1 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
                    ) : null}
                    <item.icon
                      className={cn(
                        "size-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                        active ? "text-primary" : "text-muted-foreground/80 group-hover:text-foreground",
                      )}
                    />
                    <span className={cn("truncate", sidebarCollapsed && !isMobile && "sr-only")}>
                      {label}
                    </span>
                    {item.badge && (!sidebarCollapsed || isMobile) ? (
                      <span
                        className={cn(
                          "ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow-2xs transition-colors shrink-0 flex items-center gap-1",
                          item.badge === "Under Building"
                            ? "bg-amber-500/15 border border-amber-500/35 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/25"
                            : item.badge === "Root" || item.badge === "Admin"
                            ? "bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400"
                            : "bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/25",
                        )}
                      >
                        {item.badge === "Under Building" && (
                          <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                        )}
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
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
          <div className="flex flex-col items-center gap-2 mb-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={toggleSidebar}
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="size-3.5" />
            </Button>
            <Link
              to="/settings"
              className="group relative flex items-center justify-center p-0.5 rounded-xl hover:ring-2 hover:ring-primary/40 transition-all"
              title={`${name ?? "Candidate"} — Profile & Settings`}
            >
              <UserAvatar
                avatarUrl={avatarUrl}
                name={name}
                fallbackInitials={candidateInitials}
                showStatusDot={true}
                className="size-8 transition-transform group-hover:scale-105"
              />
            </Link>
          </div>
        ) : null}

        {/* User Status Widget */}
        {!sidebarCollapsed && subscription ? (
          <div className="mb-3 shrink-0">
            {role === "admin" || subscription.isAdmin ? (
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-card to-amber-500/5 p-3 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 size-20 bg-amber-500/15 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <Link
                    to="/settings"
                    className="flex items-center gap-2.5 min-w-0 group/profile flex-1"
                    title="Open Administrator Profile Settings"
                  >
                    <UserAvatar
                      avatarUrl={avatarUrl}
                      name={name}
                      fallbackInitials={candidateInitials}
                      showStatusDot={true}
                      className="size-9 shrink-0 transition-transform group-hover/profile:scale-105"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate text-foreground leading-tight group-hover/profile:text-primary transition-colors">
                        {name ?? "Marginal Admin"}
                      </p>
                      <p className="text-[10.5px] text-amber-600 dark:text-amber-400 font-bold leading-tight flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="size-3 shrink-0" /> Administrator
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge className="bg-amber-500/25 text-amber-600 dark:text-amber-400 border-amber-500/40 text-[9px] font-extrabold uppercase shadow-2xs">
                      Root
                    </Badge>
                    <Link
                      to="/settings"
                      className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                      title="Settings"
                    >
                      <Settings className="size-3" />
                    </Link>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-amber-500/20 text-[10px] text-muted-foreground flex items-center gap-1.5 font-medium relative z-10">
                  <Sparkles className="size-3 text-amber-500 animate-pulse shrink-0" />
                  <span className="text-foreground truncate">Uncapped Godmode · No Limits</span>
                </div>
              </div>
            ) : role === "teacher" || subscription.isTeacher ? (
              <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/15 via-card to-purple-500/5 p-3 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 size-20 bg-purple-500/15 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <Link
                    to="/settings"
                    className="flex items-center gap-2.5 min-w-0 group/profile flex-1"
                    title="Open Educator Profile Settings"
                  >
                    <UserAvatar
                      avatarUrl={avatarUrl}
                      name={name}
                      fallbackInitials={candidateInitials}
                      showStatusDot={true}
                      className="size-9 shrink-0 transition-transform group-hover/profile:scale-105"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate text-foreground leading-tight group-hover/profile:text-primary transition-colors">
                        {name ?? "Educator"}
                      </p>
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold leading-tight flex items-center gap-1 mt-0.5 truncate">
                        <GraduationCap className="size-3 shrink-0" /> {school || "CS Academy"}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge
                      variant="outline"
                      className="bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/35 text-[9.5px] font-bold uppercase shadow-2xs"
                    >
                      Educator
                    </Badge>
                    <Link
                      to="/settings"
                      className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                      title="Settings"
                    >
                      <Settings className="size-3" />
                    </Link>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-purple-500/20 flex items-center justify-between text-[10px] text-muted-foreground relative z-10">
                  <span className="flex items-center gap-1 font-medium truncate">
                    <PenLine className="size-3 text-purple-500 shrink-0" />
                    {subscription.essaysLimit === 9999 ? "Unlimited" : `${subscription.essaysRemaining} essays left`}
                  </span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    {subscription.tierName || "Educator"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/[0.04] p-3 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 size-20 bg-primary/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <Link
                    to="/settings"
                    className="flex items-center gap-2.5 min-w-0 group/profile flex-1"
                    title="Open Student Profile Settings"
                  >
                    <UserAvatar
                      avatarUrl={avatarUrl}
                      name={name}
                      fallbackInitials={candidateInitials}
                      showStatusDot={true}
                      className="size-9 shrink-0 transition-transform group-hover/profile:scale-105"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate text-foreground leading-tight group-hover/profile:text-primary transition-colors">
                        {name ?? "Candidate"}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate font-medium">
                        {school || "Cambridge 9708 Candidate"}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge
                      variant="outline"
                      className="border-primary/30 bg-primary/10 text-primary text-[9.5px] px-2 py-0.5 font-bold shadow-2xs"
                    >
                      {subscription.tierName || "Candidate"}
                    </Badge>
                    <Link
                      to="/settings"
                      className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                      title="Settings"
                    >
                      <Settings className="size-3" />
                    </Link>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground relative z-10">
                  <span className="flex items-center gap-1 font-medium truncate">
                    <PenLine className="size-3 text-primary shrink-0" />
                    {subscription.essaysLimit === 9999 ? "Unlimited Essays" : `${subscription.essaysRemaining} essays left`}
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {subscription.isPaid ? "Active Pass" : "Free Plan"}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Scrollable Navigation Groups */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden space-y-2 pr-0.5">
          {visibleGroups.map((group) => renderNavGroup(group))}
        </div>

        {/* ── User Footer: Cleanly pinned at the bottom, perfectly spaced ── */}
        <div className="shrink-0 pt-2.5 border-t border-sidebar-border/70 mt-auto space-y-1">
          {isUserAdmin ? (
            <Link
              to="/admin"
              search={{ tab: "messages" }}
              className={cn(
                "relative flex items-center rounded-lg py-1.5 text-xs font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full text-left cursor-pointer",
                sidebarCollapsed ? "justify-center px-1" : "gap-2.5 px-2.5",
              )}
              title="Direct In-App User Texting Portal"
            >
              <Send className="size-4 shrink-0 text-primary" />
              <span className={cn("truncate", sidebarCollapsed && "sr-only")}>
                Direct Messages
              </span>
              {unreadMsgCount > 0 && (
                <span className="absolute top-1.5 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
                  {unreadMsgCount}
                </span>
              )}
            </Link>
          ) : (
            <StudentMessagesDialog
              trigger={
                <button
                  type="button"
                  className={cn(
                    "flex items-center rounded-lg py-1.5 text-xs font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full text-left cursor-pointer",
                    sidebarCollapsed ? "justify-center px-1" : "gap-2.5 px-2.5",
                  )}
                  title="Direct messages from Marginal team"
                >
                  <Send className="size-4 shrink-0 text-primary" />
                  <span className={cn("truncate", sidebarCollapsed && "sr-only")}>
                    Direct Messages
                  </span>
                </button>
              }
            />
          )}

          <FeedbackDialog
            trigger={
              <button
                type="button"
                className={cn(
                  "flex items-center rounded-lg py-1.5 text-xs font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full text-left cursor-pointer",
                  sidebarCollapsed ? "justify-center px-1" : "gap-2.5 px-2.5",
                )}
                title="Send direct feedback or message to Marginal team"
              >
                <MessageSquare className="size-4 shrink-0 text-primary" />
                <span className={cn("truncate", sidebarCollapsed && "sr-only")}>
                  Message Us / Feedback
                </span>
              </button>
            }
          />

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
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-2.5 backdrop-blur-sm md:hidden sticky top-0 z-40 w-full max-w-full">
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
                    <div className="mb-3 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-card to-amber-500/5 p-3 shrink-0 shadow-sm relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <Link
                          to="/settings"
                          onClick={() => setMobileDrawerOpen(false)}
                          className="flex items-center gap-2 min-w-0 flex-1"
                        >
                          <UserAvatar
                            avatarUrl={avatarUrl}
                            name={name}
                            fallbackInitials={candidateInitials}
                            showStatusDot={true}
                            className="size-7 shrink-0"
                          />
                          <span className="font-bold text-foreground text-xs truncate">{name ?? "Marginal Admin"}</span>
                        </Link>
                        <Badge className="bg-amber-500/25 text-amber-600 dark:text-amber-400 border-amber-500/40 text-[9px] font-extrabold uppercase shadow-2xs">
                          Root Admin
                        </Badge>
                      </div>
                      <div className="mt-2 pt-2 border-t border-amber-500/20 text-[10px] text-muted-foreground flex items-center gap-1.5 font-medium">
                        <Sparkles className="size-3 text-amber-500 animate-pulse" />
                        <span className="text-foreground">Uncapped Godmode · No Limits</span>
                      </div>
                    </div>
                  ) : role === "teacher" || subscription.isTeacher ? (
                    <div className="mb-3 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/15 via-card to-purple-500/5 p-3 shrink-0 shadow-sm relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <Link
                          to="/settings"
                          onClick={() => setMobileDrawerOpen(false)}
                          className="flex items-center gap-2 min-w-0 flex-1"
                        >
                          <UserAvatar
                            avatarUrl={avatarUrl}
                            name={name}
                            fallbackInitials={candidateInitials}
                            showStatusDot={true}
                            className="size-7 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-foreground block truncate">{name ?? "Educator"}</span>
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium block truncate">{school || "CS Academy"}</span>
                          </div>
                        </Link>
                        <Badge className="bg-purple-500/25 text-purple-600 dark:text-purple-400 border-purple-500/40 text-[9px] font-extrabold uppercase shadow-2xs">
                          Educator
                        </Badge>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-purple-500/20 flex justify-between text-[10.5px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium">
                          <PenLine className="size-3 text-purple-500" /> Essays: {subscription.essaysLimit === 9999 ? "Unlimited" : `${subscription.essaysRemaining}/${subscription.essaysLimit}`}
                        </span>
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          {subscription.tierName || "Educator"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3 rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/[0.04] p-3 shrink-0 shadow-sm">
                      <div className="flex items-center justify-between">
                        <Link
                          to="/settings"
                          onClick={() => setMobileDrawerOpen(false)}
                          className="flex items-center gap-2 min-w-0 flex-1"
                        >
                          <UserAvatar
                            avatarUrl={avatarUrl}
                            name={name}
                            fallbackInitials={candidateInitials}
                            showStatusDot={true}
                            className="size-7 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-foreground block truncate">{name ?? "Candidate"}</span>
                            <span className="text-[10px] text-muted-foreground block truncate">{school || "Cambridge Candidate"}</span>
                          </div>
                        </Link>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] px-1.5 py-0 font-bold",
                            subscription.isPaid
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "border-primary/30 bg-primary/10 text-primary"
                          )}
                        >
                          {subscription.isPaid ? subscription.tierName.split(" ")[0] : "Free Plan"}
                        </Badge>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-border/60 flex justify-between text-[10.5px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium">
                          <PenLine className="size-3 text-primary" /> Essays: {subscription.essaysLimit === 9999 ? "Unlimited" : `${subscription.essaysRemaining}/${subscription.essaysLimit}`}
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {subscription.isPaid ? "Active" : "Free"}
                        </span>
                      </div>
                    </div>
                  )
                ) : null}

                <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1">
                  {visibleGroups.map((group) => renderNavGroup(group, true))}
                </div>

                <div className="mt-auto shrink-0 pt-3 border-t border-border space-y-1">
                  {isUserAdmin ? (
                    <Link
                      to="/admin"
                      search={{ tab: "messages" }}
                      onClick={() => setMobileDrawerOpen(false)}
                      className="relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted w-full text-left cursor-pointer"
                    >
                      <Send className="size-4 text-primary" /> Direct Messages
                      {unreadMsgCount > 0 && (
                        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
                          {unreadMsgCount}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <StudentMessagesDialog
                      trigger={
                        <button
                          type="button"
                          onClick={() => setMobileDrawerOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted w-full text-left cursor-pointer"
                        >
                          <Send className="size-4 text-primary" /> Direct Messages
                        </button>
                      }
                    />
                  )}
                  <FeedbackDialog
                    trigger={
                      <button
                        type="button"
                        onClick={() => setMobileDrawerOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted w-full text-left cursor-pointer"
                      >
                        <MessageSquare className="size-4 text-primary" /> Message Us / Feedback
                      </button>
                    }
                  />
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
            {isUserAdmin ? (
              <Link
                to="/admin"
                search={{ tab: "messages" }}
                className="relative flex items-center justify-center size-8 rounded-full border border-border/80 hover:bg-muted transition-colors"
                title="Direct Messages Portal"
              >
                <Send className="size-3.5 text-primary" />
                {unreadMsgCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
                    {unreadMsgCount}
                  </span>
                )}
              </Link>
            ) : (
              <StudentMessagesDialog />
            )}
            <Link to="/pricing">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-bold",
                  role === "teacher" || subscription?.isTeacher
                    ? "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400"
                    : subscription?.isPaid
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "text-primary border-primary/30",
                )}
              >
                {role === "teacher" || subscription?.isTeacher
                  ? "Educator"
                  : subscription?.isPaid
                  ? subscription.tierName.split(" ")[0]
                  : "Free Tier"}
              </Badge>
            </Link>
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
      </div>

      <LockedFeatureModal
        open={lockedModalType !== null}
        onOpenChange={(open) => {
          if (!open) setLockedModalType(null);
        }}
        type={lockedModalType}
      />

      {!pathname.startsWith("/mcq") && <FloatingFeedbackPill />}
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
    <div className="border-b border-border bg-card/60 px-4 py-3.5 sm:px-6 sm:py-5 md:px-8">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm leading-relaxed">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 pt-0.5 sm:pt-0">{action}</div> : null}
      </div>
    </div>
  );
}
