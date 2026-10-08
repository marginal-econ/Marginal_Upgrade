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
  LineChart,
  Wand2,
  ShieldCheck,
  ShieldPlus,
  ListOrdered,
  BookMarked,
  Sparkles,
  UploadCloud,
  PanelLeftClose,
  PanelLeftOpen,
  UsersRound,
  BookText,
  Trophy,
  CircleHelp,
  ChevronDown,
  ChevronRight,
  Menu,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { usePresenceHeartbeat } from "@/hooks/use-presence";
import { supabase } from "@/integrations/backend/client";
import { cn } from "@/lib/utils";

export type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  staffOnly?: boolean;
  adminOnly?: boolean;
};

export type NavGroup = {
  id: string;
  label?: string;
  collapsible?: boolean;
  items: NavItem[];
};

const SIDEBAR_COLLAPSED_STORAGE_KEY = "marginal.sidebarCollapsed";
const COLLAPSED_GROUPS_STORAGE_KEY = "marginal.collapsedNavGroups";

/**
 * Clean, structured navigation groups:
 * 1. Overview: Dashboard, Review Panel, Classes
 * 2. Examiner & Essays: Flagship Live Examiner, Marking, Essay Gen, Response Structure
 * 3. Practice & Papers: Real past-paper MCQ, Question Bank, Skills Coach
 * 4. Syllabus Resources: Definitions, Diagrams, Command Words, Showcase (Collapsible)
 * 5. Staff & Administration: Knowledge Base, Calibration, Content, Admin Console (Collapsible)
 */
const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/review", label: "Review & Analytics", icon: ClipboardCheck },
      { to: "/classes", label: "Classes", icon: UsersRound },
    ],
  },
  {
    id: "writing",
    label: "Examiner & Essays",
    items: [
      { to: "/live-examiner", label: "Live Examiner", icon: Sparkles, badge: "Live" },
      { to: "/grade", label: "Essay Marking", icon: PenLine },
      { to: "/essay-generator", label: "Essay Generator", icon: Wand2 },
      { to: "/response-structure", label: "Response Structure", icon: ListOrdered },
    ],
  },
  {
    id: "practice",
    label: "Past Papers & Practice",
    items: [
      { to: "/mcq-live", label: "MCQ Past Papers", icon: ListChecks },
      { to: "/question-bank", label: "Essay Question Bank", icon: BookMarked },
      { to: "/practice", label: "AO Skills Coach", icon: Dumbbell },
    ],
  },
  {
    id: "resources",
    label: "Syllabus Resources",
    collapsible: true,
    items: [
      { to: "/definitions", label: "Definitions Hub", icon: BookText },
      { to: "/diagrams", label: "Diagram Library", icon: LineChart },
      { to: "/command-words", label: "Command Words", icon: CircleHelp },
      { to: "/showcase", label: "Exemplars Showcase", icon: Trophy },
    ],
  },
  {
    id: "staff",
    label: "Staff & Administration",
    collapsible: true,
    items: [
      { to: "/admin", label: "Admin Console", icon: ShieldCheck, staffOnly: true, adminOnly: true },
      { to: "/knowledge", label: "Knowledge Base", icon: BookOpen, staffOnly: true },
      { to: "/calibration", label: "Calibration Anchors", icon: Target, staffOnly: true },
      { to: "/content-admin", label: "Content Admin", icon: ShieldPlus, staffOnly: true, adminOnly: true },
      { to: "/mcq-papers-admin", label: "MCQ Paper Library", icon: UploadCloud, staffOnly: true, adminOnly: true },
    ],
  },
];

function filterGroupForRole(
  group: NavGroup,
  role: "student" | "teacher" | "admin",
): NavGroup | null {
  const visibleItems = group.items.filter(
    (item) =>
      (!item.staffOnly || role === "teacher" || role === "admin") &&
      (!item.adminOnly || role === "admin"),
  );
  if (visibleItems.length === 0) return null;
  return { ...group, items: visibleItems };
}

export function AppShell({
  children,
  role,
  name,
  userId,
}: {
  children: ReactNode;
  role: "student" | "teacher" | "admin";
  name: string | null;
  userId: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  usePresenceHeartbeat(pathname, userId);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

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
    return NAV_GROUPS.map((g) => filterGroupForRole(g, role)).filter(
      (g): g is NavGroup => g !== null,
    );
  }, [role]);

  const classroomLabel = role === "student" ? "Join class" : "Classes";

  const renderNavGroup = (group: NavGroup, isMobile = false) => {
    const isGroupCollapsed = group.collapsible && collapsedGroups.has(group.id);
    // Always expand group if current page is within this group
    const hasActiveItem = group.items.some((item) => pathname.startsWith(item.to));
    const forceOpen = hasActiveItem || !isGroupCollapsed;

    return (
      <div key={group.id} className="space-y-0.5">
        {group.label ? (
          sidebarCollapsed && !isMobile ? (
            <div className="my-2 border-t border-sidebar-border/60" />
          ) : (
            <div className="flex items-center justify-between px-2.5 pt-3.5 pb-1 text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase select-none">
              <span>{group.label}</span>
              {group.collapsible ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="rounded p-0.5 text-muted-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                  title={forceOpen ? "Collapse section" : "Expand section"}
                >
                  {forceOpen ? (
                    <ChevronDown className="size-3" />
                  ) : (
                    <ChevronRight className="size-3" />
                  )}
                </button>
              ) : null}
            </div>
          )
        ) : null}

        {(forceOpen || (sidebarCollapsed && !isMobile)) && (
          <nav className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname.startsWith(item.to);
              const label = item.to === "/classes" ? classroomLabel : item.label;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => isMobile && setMobileDrawerOpen(false)}
                  className={cn(
                    "group relative flex items-center rounded-lg py-1.5 text-xs font-medium text-sidebar-foreground/75 transition-all duration-150",
                    sidebarCollapsed && !isMobile ? "justify-center px-2" : "gap-2.5 px-2.5",
                    "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
                    active && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-xs",
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

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-4 transition-[width,padding] duration-300 ease-out md:flex",
          sidebarCollapsed ? "w-[4.5rem] px-2" : "w-64 px-3",
        )}
      >
        {/* Brand Header */}
        <div
          className={cn(
            "mb-3 flex items-center pb-2 border-b border-sidebar-border/50",
            sidebarCollapsed ? "justify-center" : "gap-2 px-1.5",
          )}
        >
          <Link
            to="/dashboard"
            className="flex min-w-0 items-center gap-2 group"
            title="Marginal dashboard"
          >
            <img
              src="/marginal-m-icon-clean.png"
              alt=""
              aria-hidden="true"
              className="size-8 shrink-0 object-contain transition-transform group-hover:scale-105"
            />
            <span
              className={cn("text-sm leading-tight font-bold tracking-tight", sidebarCollapsed && "hidden")}
            >
              Marginal
              <span className="block text-[10px] font-normal text-muted-foreground">
                Economics 9708
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
            className="mb-2 size-8 self-center text-muted-foreground hover:text-foreground"
            onClick={toggleSidebar}
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="size-3.5" />
          </Button>
        ) : null}

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2 pr-0.5">
          {visibleGroups.map((group) => renderNavGroup(group))}
        </div>

        {/* User Footer */}
        <div className="mt-3 border-t border-sidebar-border/70 pt-2.5">
          <Link
            to="/settings"
            className={cn(
              "block rounded-lg py-1.5 transition-colors hover:bg-sidebar-accent",
              sidebarCollapsed ? "px-1 text-center" : "px-2",
              pathname.startsWith("/settings") && "bg-sidebar-accent",
            )}
            title="Account settings"
          >
            <p className={cn("text-xs font-semibold truncate", sidebarCollapsed && "sr-only")}>
              {name ?? "Your account"}
            </p>
            <p
              className={cn(
                "text-[11px] text-muted-foreground capitalize truncate",
                sidebarCollapsed && "sr-only",
              )}
            >
              {role} · Settings
            </p>
            {sidebarCollapsed ? (
              <span className="text-xs font-bold text-muted-foreground">{role.slice(0, 1).toUpperCase()}</span>
            ) : null}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className={cn("mt-0.5 h-8 w-full text-xs text-muted-foreground hover:text-foreground", sidebarCollapsed ? "justify-center p-0" : "justify-start px-2")}
            onClick={signOut}
            title="Sign out"
          >
            <LogOut className="size-3.5" />
            <span className={cn("ml-2", sidebarCollapsed && "sr-only")}>Sign out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content & Mobile Header */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-2.5 backdrop-blur-sm md:hidden">
          <div className="flex items-center gap-2.5">
            <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <Menu className="size-4" />
                  <span className="sr-only">Open navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4">
                <SheetHeader className="mb-4 text-left">
                  <SheetTitle className="flex items-center gap-2">
                    <img
                      src="/marginal-m-icon-clean.png"
                      alt=""
                      aria-hidden="true"
                      className="size-7 object-contain"
                    />
                    <span>Marginal 9708</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="overflow-y-auto space-y-3 max-h-[calc(100vh-140px)]">
                  {visibleGroups.map((group) => renderNavGroup(group, true))}
                </div>
                <div className="mt-4 border-t border-border pt-3">
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={signOut}>
                    <LogOut className="mr-2 size-3.5" /> Sign out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/dashboard" className="flex items-center gap-2">
              <img
                src="/marginal-m-icon-clean.png"
                alt=""
                className="size-6 object-contain"
              />
              <span className="text-sm font-bold tracking-tight">Marginal</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Link to="/live-examiner" className="flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 font-semibold text-primary">
              <Sparkles className="size-3" /> Live Examiner
            </Link>
            <Button variant="ghost" size="icon" className="size-8" onClick={signOut} title="Sign out">
              <LogOut className="size-3.5" />
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
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
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-5 md:px-8">
      <div>
        <h1 className="text-lg font-semibold md:text-xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
