import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  ChevronsUpDown,
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PenLine,
  Search,
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
import * as React from "react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LockedFeatureModal, type LockedFeatureType } from "@/components/app/locked-feature-modal";
import { FeedbackDialog, FloatingFeedbackPill } from "@/components/feedback/feedback-dialog";
import {
  StudentMessagesDialog,
  playMessageNotificationChime,
} from "@/components/app/student-messages-dialog";
import { UserAvatar } from "@/components/app/user-avatar";
import { getUnreadMessageCount } from "@/lib/messages.functions";
import { usePresenceHeartbeat } from "@/hooks/use-presence";
import { supabase } from "@/integrations/backend/client";
import type { UserSubscriptionDetails } from "@/lib/usage-limits";
import { cn } from "@/lib/utils";
import { TopTutorialButton } from "@/components/tutorials/feature-tutorial-dialog";
import { matchTutorialByPath } from "@/lib/tutorials-data";
import { useFeatureTutorial } from "@/components/tutorials/tutorial-context";

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
    id: "core",
    label: "Core Practice",
    collapsible: true,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/grade", label: "Grade Essays", icon: PenLine },
      {
        to: "/live-examiner",
        label: "Live Examiner",
        icon: Sparkles,
        badge: "Live",
      },
      { to: "/mcq-live", label: "MCQ Past Papers", icon: ListChecks },
      {
        to: "/data-response",
        label: "Data Response",
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    id: "syllabus",
    label: "Syllabus Hub",
    collapsible: true,
    items: [
      { to: "/definitions", label: "Definitions Hub", icon: BookText },
      { to: "/diagrams", label: "Diagram Library", icon: LineChart },
      { to: "/question-bank", label: "Question Bank", icon: BookMarked },
      { to: "/paper-matrix", label: "Paper Predictor", icon: Flame },
      {
        to: "/response-structure",
        label: "Essay Structure Guide",
        icon: GraduationCap,
      },
      { to: "/essay-generator", label: "Sample Essay Generator", icon: Wand2 },
      { to: "/command-words", label: "Command Words", icon: Target },
      { to: "/showcase", label: "Exemplars Showcase", icon: Trophy },
    ],
  },
  {
    id: "classroom",
    label: "Classroom & Progress",
    collapsible: true,
    items: [
      { to: "/classes", label: "Classes", icon: UsersRound },
      { to: "/review", label: "Diagnostics & Review", icon: ClipboardCheck },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    adminOnly: true,
    collapsible: true,
    items: [
      { to: "/admin", label: "Admin Console", icon: ShieldCheck, badge: "Root" },
    ],
  },
];

const TEACHER_NAV_GROUPS: NavGroup[] = [
  {
    id: "core",
    label: "Core Practice",
    collapsible: true,
    items: [
      { to: "/dashboard", label: "Educator Dashboard", icon: LayoutDashboard },
      { to: "/grade", label: "Grade Essays", icon: PenLine },
      {
        to: "/live-examiner",
        label: "Live Examiner",
        icon: Sparkles,
        badge: "Live",
      },
      { to: "/mcq-live", label: "MCQ Past Papers", icon: ListChecks },
      {
        to: "/data-response",
        label: "Data Response",
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    id: "classroom",
    label: "Classroom & Progress",
    collapsible: true,
    items: [
      { to: "/classes", label: "My Classrooms", icon: UsersRound },
      { to: "/review", label: "Diagnostics & Review", icon: ClipboardCheck },
    ],
  },
  {
    id: "syllabus",
    label: "Syllabus & Knowledge",
    collapsible: true,
    items: [
      { to: "/definitions", label: "Definitions Hub", icon: BookText },
      { to: "/diagrams", label: "Diagram Library", icon: LineChart },
      { to: "/question-bank", label: "Question Bank", icon: BookMarked },
      { to: "/paper-matrix", label: "Paper Predictor", icon: Flame },
      {
        to: "/response-structure",
        label: "Essay Structure Guide",
        icon: GraduationCap,
      },
      { to: "/essay-generator", label: "Sample Essay Generator", icon: Wand2 },
      { to: "/knowledge", label: "Knowledge Base", icon: BookOpen },
      { to: "/showcase", label: "Exemplars Showcase", icon: Trophy },
      { to: "/command-words", label: "Command Words", icon: Target },
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

const GROUP_META: Record<string, { dot: string; text: string; bg: string }> = {
  core: {
    dot: "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]",
    text: "text-indigo-600 dark:text-indigo-400",
    bg: "hover:bg-indigo-500/10",
  },
  syllabus: {
    dot: "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]",
    text: "text-sky-600 dark:text-sky-400",
    bg: "hover:bg-sky-500/10",
  },
  classroom: {
    dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "hover:bg-emerald-500/10",
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
  const { openTutorial } = useFeatureTutorial();
  const currentTutorial = useMemo(() => matchTutorialByPath(pathname), [pathname]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [lockedModalType, setLockedModalType] = useState<LockedFeatureType>(null);

  // Global Ctrl+K / Cmd+K listener for quick navigation
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

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
  const isHigherTierUser =
    isUserAdmin || subscription?.tier === "mastery" || subscription?.tier === "elite";
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
    if (
      (to === "/admin" || to === "/knowledge") &&
      ["/calibration", "/content-admin", "/mcq-papers-admin"].some((p) => pathname.startsWith(p))
    ) {
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
                isOpen
                  ? (meta?.text ?? "text-foreground")
                  : "text-muted-foreground/70 hover:text-foreground",
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
                        active
                          ? "text-primary"
                          : "text-muted-foreground/80 group-hover:text-foreground",
                      )}
                    />
                    <span className={cn("truncate", sidebarCollapsed && !isMobile && "sr-only")}>
                      {label}
                    </span>
                    {item.badge && (!sidebarCollapsed || isMobile) ? (
                      <span
                        className={cn(
                          "ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow-2xs transition-colors shrink-0 flex items-center gap-1",
                          item.badge === "Live" || item.badge === "Beta"
                            ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            : item.badge === "Root" || item.badge === "Admin"
                              ? "bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400"
                              : "bg-muted border border-border/80 text-muted-foreground",
                        )}
                      >
                        {item.badge === "Live" && (
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
      {/* ── Desktop Sidebar: Fixed, locked to viewport, perfectly pinned ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 h-screen h-[100dvh] max-h-[100dvh] shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-3 transition-[width,padding] duration-300 ease-out hidden lg:flex z-30 select-none",
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
              className={cn(
                "text-sm leading-tight font-bold tracking-tight text-foreground",
                sidebarCollapsed && "hidden",
              )}
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
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={() => setCommandOpen(true)}
              title="Quick Jump (Ctrl+K)"
              aria-label="Quick Jump"
            >
              <Search className="size-3.5" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="mb-2.5 flex w-full items-center justify-between rounded-xl border border-sidebar-border/80 bg-sidebar-accent/30 px-2.5 py-1.5 text-xs text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground cursor-pointer group shadow-2xs shrink-0"
            title="Quick Search or Jump (Ctrl+K)"
          >
            <span className="flex items-center gap-2 min-w-0">
              <Search className="size-3.5 shrink-0 text-muted-foreground/70 group-hover:text-primary transition-colors" />
              <span className="truncate text-[11.5px]">Search or jump...</span>
            </span>
            <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border border-border/70 bg-background/80 px-1 font-mono text-[9px] font-medium text-muted-foreground">
              <span className="text-[10px]">⌘</span>K
            </kbd>
          </button>
        )}

        {/* Scrollable Navigation Groups */}
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto space-y-2",
            sidebarCollapsed ? "no-scrollbar px-0" : "custom-scrollbar pr-1",
          )}
        >
          {visibleGroups.map((group) => renderNavGroup(group))}
        </div>

        {/* ── User Footer: Sleek, compact bottom bar with Direct Messages & Account Menu ── */}
        <div className="shrink-0 pt-2 border-t border-sidebar-border/70 mt-auto space-y-1">
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
              <span className={cn("truncate", sidebarCollapsed && "sr-only")}>Direct Messages</span>
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

          {/* Unified Profile & Settings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center rounded-xl p-1.5 text-xs transition-colors hover:bg-sidebar-accent w-full text-left cursor-pointer outline-none group border border-transparent hover:border-sidebar-border/60",
                  sidebarCollapsed ? "justify-center" : "gap-2 justify-between",
                )}
                title={`${name ?? "Candidate"} — Profile & Menu`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <UserAvatar
                    avatarUrl={avatarUrl}
                    name={name}
                    fallbackInitials={candidateInitials}
                    showStatusDot={true}
                    className="size-7 shrink-0 transition-transform group-hover:scale-105"
                  />
                  {!sidebarCollapsed && (
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-xs font-semibold truncate text-foreground leading-tight">
                        {name ?? "Candidate"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate leading-tight capitalize">
                        {role === "admin" || subscription?.isAdmin
                          ? "Root Admin"
                          : role === "teacher" || subscription?.isTeacher
                            ? "Educator"
                            : school || "Candidate"}
                      </p>
                    </div>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={sidebarCollapsed ? "right" : "top"}
              align={sidebarCollapsed ? "end" : "start"}
              className="w-56 p-1.5 shadow-xl border-border/80"
            >
              <DropdownMenuLabel className="p-2 font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-bold leading-none text-foreground truncate">{name ?? "Candidate"}</p>
                  <p className="text-[10px] leading-none text-muted-foreground truncate">
                    {role === "admin" || subscription?.isAdmin
                      ? "Administrator Access"
                      : role === "teacher" || subscription?.isTeacher
                        ? (school ?? "Educator")
                        : "Cambridge 9708 Candidate"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2 cursor-pointer text-xs">
                  <Settings className="size-3.5 text-muted-foreground" />
                  <span>Profile & Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openTutorial()}
                className="flex items-center gap-2 cursor-pointer text-xs"
              >
                <GraduationCap className="size-3.5 text-purple-500" />
                <span>Feature Tutorials</span>
              </DropdownMenuItem>
              <FeedbackDialog
                trigger={
                  <div className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full">
                    <MessageSquare className="size-3.5 text-primary" />
                    <span>Send Feedback / Message</span>
                  </div>
                }
              />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="flex items-center gap-2 cursor-pointer text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="size-3.5" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ── Main Content & Mobile Header ── */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-x-hidden transition-[padding] duration-300 ease-out",
          sidebarCollapsed ? "lg:pl-[4.5rem]" : "lg:pl-64",
        )}
      >
        <header className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-2.5 backdrop-blur-sm lg:hidden sticky top-0 z-40 w-full max-w-full">
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

                {/* Mobile Quick Jump */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    setCommandOpen(true);
                  }}
                  className="mb-2.5 flex w-full items-center justify-between rounded-xl border border-border/80 bg-muted/40 px-3 py-2 text-xs text-muted-foreground cursor-pointer shrink-0"
                >
                  <span className="flex items-center gap-2">
                    <Search className="size-3.5 text-primary" />
                    <span>Search or jump...</span>
                  </span>
                  <kbd className="text-[9px] font-mono px-1 rounded bg-background border border-border">⌘K</kbd>
                </button>

                <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                  {visibleGroups.map((group) => renderNavGroup(group, true))}
                </div>

                <div className="mt-auto shrink-0 pt-3 border-t border-border space-y-1">
                  {isUserAdmin ? (
                    <Link
                      to="/admin"
                      search={{ tab: "messages" }}
                      onClick={() => setMobileDrawerOpen(false)}
                      className="relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted w-full text-left cursor-pointer"
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
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted w-full text-left cursor-pointer"
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
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted w-full text-left cursor-pointer"
                      >
                        <MessageSquare className="size-4 text-primary" /> Message Us / Feedback
                      </button>
                    }
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      openTutorial();
                    }}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted w-full text-left cursor-pointer"
                  >
                    <GraduationCap className="size-4 text-purple-500" /> Feature Tutorials
                  </button>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <Link
                      to="/settings"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex items-center gap-2 min-w-0 flex-1 py-1"
                    >
                      <UserAvatar
                        avatarUrl={avatarUrl}
                        name={name}
                        fallbackInitials={candidateInitials}
                        showStatusDot={true}
                        className="size-7 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-foreground block truncate">
                          {name ?? "Candidate"}
                        </span>
                        <span className="text-[10px] text-muted-foreground block truncate capitalize">
                          {role === "admin" || subscription?.isAdmin
                            ? "Root Admin"
                            : role === "teacher" || subscription?.isTeacher
                              ? "Educator"
                              : school || "Candidate"}
                        </span>
                      </div>
                    </Link>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        to="/settings"
                        onClick={() => setMobileDrawerOpen(false)}
                        className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Settings"
                      >
                        <Settings className="size-3.5" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={signOut}
                        title="Sign out"
                      >
                        <LogOut className="size-3.5" />
                      </Button>
                    </div>
                  </div>
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
            <TopTutorialButton size="sm" />
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
          </div>
        </header>

        {/* ── Desktop Top Header Bar: Clean, sleek utility bar pinned on top ── */}
        <header className="hidden lg:flex items-center justify-between border-b border-border/70 bg-card/70 px-6 py-2.5 backdrop-blur-md sticky top-0 z-30 w-full shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {currentTutorial ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <currentTutorial.icon className="size-4" />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-foreground truncate">
                    {currentTutorial.title}
                  </span>
                  {currentTutorial.paperTag && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-muted-foreground border-border/80 py-0 hidden lg:inline-flex"
                    >
                      {currentTutorial.paperTag}
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-xs font-semibold text-muted-foreground">
                Cambridge International Economics 9708
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <TopTutorialButton />

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

      {/* Global Quick Command & Jump Palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search pages, tools, syllabus, admin..." />
        <CommandList className="custom-scrollbar max-h-80">
          <CommandEmpty>No matching destination found.</CommandEmpty>

          <CommandGroup heading="Core Practice">
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                navigate({ to: "/dashboard" });
              }}
              className="cursor-pointer"
            >
              <LayoutDashboard className="mr-2 size-4 text-indigo-500" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                navigate({ to: "/grade" });
              }}
              className="cursor-pointer"
            >
              <PenLine className="mr-2 size-4 text-indigo-500" />
              <span>Grade Essays (AI Evaluator)</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                navigate({ to: "/live-examiner" });
              }}
              className="cursor-pointer"
            >
              <Sparkles className="mr-2 size-4 text-emerald-500" />
              <span>Live Examiner</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                navigate({ to: "/mcq-live" });
              }}
              className="cursor-pointer"
            >
              <ListChecks className="mr-2 size-4 text-indigo-500" />
              <span>MCQ Past Papers</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                navigate({ to: "/data-response" });
              }}
              className="cursor-pointer"
            >
              <FileSpreadsheet className="mr-2 size-4 text-indigo-500" />
              <span>Data Response</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Syllabus & Knowledge">
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                navigate({ to: "/definitions" });
              }}
              className="cursor-pointer"
            >
              <BookText className="mr-2 size-4 text-sky-500" />
              <span>Definitions Hub</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                navigate({ to: "/diagrams" });
              }}
              className="cursor-pointer"
            >
              <LineChart className="mr-2 size-4 text-sky-500" />
              <span>Diagram Library</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                navigate({ to: "/question-bank" });
              }}
              className="cursor-pointer"
            >
              <BookMarked className="mr-2 size-4 text-sky-500" />
              <span>Question Bank</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                navigate({ to: "/paper-matrix" });
              }}
              className="cursor-pointer"
            >
              <Flame className="mr-2 size-4 text-sky-500" />
              <span>Paper Predictor</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                navigate({ to: "/response-structure" });
              }}
              className="cursor-pointer"
            >
              <GraduationCap className="mr-2 size-4 text-sky-500" />
              <span>Essay Structure Guide</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                navigate({ to: "/essay-generator" });
              }}
              className="cursor-pointer"
            >
              <Wand2 className="mr-2 size-4 text-sky-500" />
              <span>Sample Essay Generator</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                navigate({ to: "/command-words" });
              }}
              className="cursor-pointer"
            >
              <Target className="mr-2 size-4 text-sky-500" />
              <span>Command Words</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                navigate({ to: "/showcase" });
              }}
              className="cursor-pointer"
            >
              <Trophy className="mr-2 size-4 text-sky-500" />
              <span>Exemplars Showcase</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Classroom & Progress">
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                navigate({ to: "/classes" });
              }}
              className="cursor-pointer"
            >
              <UsersRound className="mr-2 size-4 text-emerald-500" />
              <span>{role === "student" ? "Classroom" : "Classes"}</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                navigate({ to: "/review" });
              }}
              className="cursor-pointer"
            >
              <ClipboardCheck className="mr-2 size-4 text-emerald-500" />
              <span>Diagnostics & Review</span>
            </CommandItem>
          </CommandGroup>

          {isUserAdmin && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Administration">
                <CommandItem
                  onSelect={() => {
                    setCommandOpen(false);
                    navigate({ to: "/admin" });
                  }}
                  className="cursor-pointer"
                >
                  <ShieldCheck className="mr-2 size-4 text-purple-500" />
                  <span>Admin Console</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setCommandOpen(false);
                    navigate({ to: "/admin", search: { tab: "messages" } });
                  }}
                  className="cursor-pointer"
                >
                  <Send className="mr-2 size-4 text-purple-500" />
                  <span>Direct Messages Portal</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setCommandOpen(false);
                    navigate({ to: "/admin", search: { tab: "overview" } });
                  }}
                  className="cursor-pointer"
                >
                  <Zap className="mr-2 size-4 text-purple-500" />
                  <span>User Activeness & Economics</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setCommandOpen(false);
                    navigate({ to: "/admin", search: { tab: "users" } });
                  }}
                  className="cursor-pointer"
                >
                  <UsersRound className="mr-2 size-4 text-purple-500" />
                  <span>User Management & Access</span>
                </CommandItem>
              </CommandGroup>
            </>
          )}

          <CommandSeparator />

          <CommandGroup heading="Account">
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                navigate({ to: "/settings" });
              }}
              className="cursor-pointer"
            >
              <Settings className="mr-2 size-4 text-muted-foreground" />
              <span>Profile & Settings</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCommandOpen(false);
                openTutorial();
              }}
              className="cursor-pointer"
            >
              <GraduationCap className="mr-2 size-4 text-purple-500" />
              <span>Feature Tutorials</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
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
            <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 pt-0.5 sm:pt-0">{action}</div> : null}
      </div>
    </div>
  );
}
