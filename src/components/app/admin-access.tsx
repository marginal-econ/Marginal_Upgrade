import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Gauge, Loader2, Mail, PauseCircle, Save, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  adminGetEmailBrandSettings,
  adminGetSettings,
  adminSetEmailBrandSettings,
  adminSetSettings,
  adminUserActivity,
  type AiGatewayMode,
  type UserActivityRow,
} from "@/lib/admin.functions";
import { describePath } from "@/lib/presence";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Small shared helpers                                                */
/* ------------------------------------------------------------------ */

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
}

export function displayName(row: Pick<UserActivityRow, "fullName" | "email">): string {
  return row.fullName?.trim() || row.email || "Unnamed account";
}

/** Case-insensitive "every word must appear somewhere" match. */
export function matchesSearch(haystack: (string | null | undefined)[], query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = haystack.filter(Boolean).join(" ").toLowerCase();
  return words.every((word) => text.includes(word));
}

export function useUserActivity() {
  const fetchActivity = useServerFn(adminUserActivity);
  return useQuery({
    queryKey: ["admin-user-activity"],
    queryFn: () => fetchActivity(),
    // Keeps "online now" honest while the tab is open.
    refetchInterval: 30_000,
  });
}

export function SearchBox({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label={placeholder}
      />
    </div>
  );
}

function OnlineDot({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        online
          ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]"
          : "bg-muted-foreground/30",
      )}
      title={online ? "Online now" : "Offline"}
      aria-label={online ? "Online now" : "Offline"}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Overview: who is online, who uses the most, searchable per-user data */
/* ------------------------------------------------------------------ */

type SortKey = "total" | "essays" | "live" | "mcq" | "ai" | "recent" | "joined";

const SORT_LABELS: Record<SortKey, string> = {
  total: "Most active overall",
  essays: "Most essays graded",
  live: "Most Live Examiner sessions",
  mcq: "Most MCQ attempts",
  ai: "Most AI calls",
  recent: "Most recently active",
  joined: "Newest accounts",
};

function totalActivity(row: UserActivityRow): number {
  return row.essaysGraded + row.liveExaminerSessions + row.mcqAttempts;
}

function sortValue(row: UserActivityRow, key: SortKey): number {
  switch (key) {
    case "total":
      return totalActivity(row);
    case "essays":
      return row.essaysGraded;
    case "live":
      return row.liveExaminerSessions;
    case "mcq":
      return row.mcqAttempts;
    case "ai":
      return row.aiCalls;
    case "recent":
      return row.lastActivity ? new Date(row.lastActivity).getTime() : 0;
    case "joined":
      return new Date(row.joinedAt).getTime();
  }
}

export function ActivityOverview({ search }: { search: string }) {
  const activity = useUserActivity();
  const fetchSettings = useServerFn(adminGetSettings);
  const settings = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => fetchSettings(),
    refetchInterval: 30_000,
  });
  const [sortKey, setSortKey] = useState<SortKey>("total");

  const rows = useMemo(() => activity.data ?? [], [activity.data]);
  const online = useMemo(() => rows.filter((row) => row.isOnline), [rows]);
  const topUsers = useMemo(
    () =>
      [...rows]
        .filter((row) => totalActivity(row) > 0)
        .sort((a, b) => totalActivity(b) - totalActivity(a))
        .slice(0, 5),
    [rows],
  );
  const maxTotal = topUsers[0] ? totalActivity(topUsers[0]) : 0;

  const filtered = useMemo(() => {
    return rows
      .filter((row) =>
        matchesSearch(
          [
            row.fullName,
            row.email,
            row.school,
            row.role,
            row.isOnline ? "online" : "offline",
            row.isOnline ? describePath(row.currentPath) : null,
          ],
          search,
        ),
      )
      .sort((a, b) => sortValue(b, sortKey) - sortValue(a, sortKey));
  }, [rows, search, sortKey]);

  if (activity.isLoading) return <Skeleton className="h-64 w-full" />;
  if (activity.error) {
    return (
      <p className="text-sm text-destructive">
        Couldn't load user activity: {(activity.error as Error).message}. Make sure migration
        20260919090000 has been run on your database.
      </p>
    );
  }

  const gradedToday = rows.reduce((sum, row) => sum + row.essaysToday, 0);
  const s = settings.data;
  const tiles = [
    { label: "Online now", value: online.length, tone: online.length > 0 },
    { label: "Seats used", value: s ? `${s.currentUsers} / ${s.maxUsers}` : "—" },
    { label: "On waitlist", value: s ? s.waitlistCount : "—" },
    { label: "Essays graded today", value: gradedToday },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="panel rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{tile.label}</p>
            <p className="mt-1 flex items-center gap-2 text-xl font-semibold">
              {tile.tone ? <OnlineDot online /> : null}
              {tile.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="panel rounded-xl border border-border">
          <p className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
            <OnlineDot online={online.length > 0} /> Online right now
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              updates every 30 s
            </span>
          </p>
          <div className="divide-y divide-border">
            {online.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">
                Nobody is on the platform at the moment.
              </p>
            ) : (
              online.map((row) => (
                <div key={row.userId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <OnlineDot online />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{displayName(row)}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                  </div>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {describePath(row.currentPath)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel rounded-xl border border-border">
          <p className="border-b border-border px-4 py-3 text-sm font-semibold">
            Who uses it the most
          </p>
          <div className="divide-y divide-border">
            {topUsers.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              topUsers.map((row, index) => (
                <div key={row.userId} className="px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-xs text-muted-foreground">{index + 1}</span>
                    <span className="truncate font-medium">{displayName(row)}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {row.essaysGraded} essays · {row.liveExaminerSessions} live ·{" "}
                      {row.mcqAttempts} MCQ
                    </span>
                  </div>
                  <div className="mt-1.5 ml-6 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${maxTotal ? (totalActivity(row) / maxTotal) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="panel rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">
            All users{" "}
            <span className="font-normal text-muted-foreground">
              ({filtered.length}
              {filtered.length !== rows.length ? ` of ${rows.length}` : ""})
            </span>
          </p>
          <div className="ml-auto w-full sm:w-64">
            <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {SORT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[760px] divide-y divide-border">
            <div className="grid grid-cols-[minmax(0,2.2fr)_repeat(5,minmax(0,0.8fr))_minmax(0,1fr)] gap-3 px-4 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              <span>User</span>
              <span className="text-right">Essays</span>
              <span className="text-right">Today</span>
              <span className="text-right">Live Ex.</span>
              <span className="text-right">MCQ</span>
              <span className="text-right">AI calls</span>
              <span className="text-right">Last active</span>
            </div>
            {filtered.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">
                {search ? "No users match that search." : "No accounts yet."}
              </p>
            ) : null}
            {filtered.map((row) => (
              <div
                key={row.userId}
                className="grid grid-cols-[minmax(0,2.2fr)_repeat(5,minmax(0,0.8fr))_minmax(0,1fr)] items-center gap-3 px-4 py-2.5 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <OnlineDot online={row.isOnline} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate font-medium">
                      {displayName(row)}
                      {row.role !== "student" ? (
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                          {row.role}
                        </Badge>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.email}
                      {row.isOnline ? ` · ${describePath(row.currentPath)}` : ""}
                    </p>
                  </div>
                </div>
                <span className="text-right tabular-nums">{row.essaysGraded}</span>
                <span className="text-right tabular-nums">{row.essaysToday}</span>
                <span className="text-right tabular-nums">{row.liveExaminerSessions}</span>
                <span className="text-right tabular-nums">{row.mcqAttempts}</span>
                <span className="text-right tabular-nums">{row.aiCalls}</span>
                <span className="text-right text-xs text-muted-foreground">
                  {row.isOnline ? "online" : timeAgo(row.lastActivity)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Access: seat cap, essays/day, AI usage controls, waitlist           */
/* ------------------------------------------------------------------ */

const AI_MODE_LABELS: Record<AiGatewayMode, string> = {
  max: "Max quality",
  balanced: "Balanced",
  economy: "Max savings",
};

const AI_MODE_DESCRIPTIONS: Record<AiGatewayMode, string> = {
  max: "No change — every feature uses its normal model and full reply length.",
  balanced: "Same models, shorter replies. A moderate credit saving with little quality loss.",
  economy:
    "Every AI call (including essay grading) is switched to the fast/cheap model and capped hard. Real quality trade-off — use this to stretch credits in an emergency, not as the everyday setting.",
};

function VerificationEmailPanel() {
  const queryClient = useQueryClient();
  const fetchEmailSettings = useServerFn(adminGetEmailBrandSettings);
  const saveEmailSettings = useServerFn(adminSetEmailBrandSettings);
  const emailSettings = useQuery({
    queryKey: ["admin-email-brand-settings"],
    queryFn: () => fetchEmailSettings(),
  });
  const [form, setForm] = useState({
    senderName: "Marginal",
    subject: "Your Marginal verification code",
    eyebrow: "Email verification",
    heading: "Confirm your place on the waitlist",
    intro: "Use the six-digit code below to verify your email and join the Marginal waitlist.",
    footer: "Marginal · Built for AS and A Level Economics (9708)",
  });

  useEffect(() => {
    if (emailSettings.data) setForm(emailSettings.data);
  }, [emailSettings.data]);

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const dirty =
    !!emailSettings.data &&
    Object.keys(form).some(
      (key) => form[key as keyof typeof form] !== emailSettings.data?.[key as keyof typeof form],
    );
  const valid =
    form.senderName.trim().length > 0 &&
    form.subject.trim().length > 0 &&
    form.eyebrow.trim().length > 0 &&
    form.heading.trim().length > 0 &&
    form.intro.trim().length > 0 &&
    form.footer.trim().length > 0;
  const save = useMutation({
    mutationFn: () => saveEmailSettings({ data: form }),
    onSuccess: async (result) => {
      queryClient.setQueryData(["admin-email-brand-settings"], result);
      toast.success("Verification email design saved.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (emailSettings.isLoading) return <Skeleton className="h-80 w-full" />;
  if (emailSettings.error) {
    return (
      <p className="text-sm text-destructive">
        Couldn&apos;t load verification email settings: {(emailSettings.error as Error).message}
      </p>
    );
  }

  return (
    <div className="panel rounded-xl border border-border p-5">
      <div className="mb-5">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Mail className="size-4 text-primary" /> Waitlist verification email
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Edit the official email copy and preview it here. The secure six-digit code and expiry
          cannot be changed.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="email-sender-name">Sender name</Label>
            <Input
              id="email-sender-name"
              value={form.senderName}
              maxLength={60}
              onChange={(event) => update("senderName", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-subject">Subject line</Label>
            <Input
              id="email-subject"
              value={form.subject}
              maxLength={120}
              onChange={(event) => update("subject", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-eyebrow">Header label</Label>
            <Input
              id="email-eyebrow"
              value={form.eyebrow}
              maxLength={60}
              onChange={(event) => update("eyebrow", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-heading">Main heading</Label>
            <Input
              id="email-heading"
              value={form.heading}
              maxLength={120}
              onChange={(event) => update("heading", event.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="email-intro">Message</Label>
            <Textarea
              id="email-intro"
              value={form.intro}
              maxLength={500}
              rows={3}
              onChange={(event) => update("intro", event.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="email-footer">Footer</Label>
            <Input
              id="email-footer"
              value={form.footer}
              maxLength={180}
              onChange={(event) => update("footer", event.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button disabled={!dirty || !valid || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save email design
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Preview
          </p>
          <div className="overflow-hidden rounded-2xl border-2 border-[#21172d] bg-white text-[#21172d] shadow-[6px_6px_0_#21172d]">
            <div className="h-2 bg-[#7c4edb]" />
            <div className="flex items-center gap-2 border-b border-[#e6dfef] px-5 py-4">
              <span className="flex size-9 items-center justify-center rounded-xl border-2 border-[#21172d] bg-[#7c4edb] text-lg font-bold text-white">
                m
              </span>
              <div>
                <p className="font-bold">Marginal</p>
                <p className="text-[10px] text-[#726b7c]">AS &amp; A Level Economics 9708</p>
              </div>
            </div>
            <div className="px-5 py-6">
              <p className="text-[10px] font-bold tracking-widest text-[#7c4edb] uppercase">
                {form.eyebrow}
              </p>
              <p className="mt-2 text-xl font-bold leading-tight">{form.heading}</p>
              <p className="mt-3 text-xs leading-relaxed text-[#625d6c]">{form.intro}</p>
              <div className="mt-5 flex gap-1.5">
                {["4", "8", "2", "9", "1", "6"].map((digit, index) => (
                  <span
                    key={index}
                    className="flex h-11 flex-1 items-center justify-center rounded-lg border-2 border-[#21172d] bg-[#f8f5ff] font-mono text-lg font-bold"
                  >
                    {digit}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-[#625d6c]">
                <strong>Expires in 10 minutes.</strong> Never share this code.
              </p>
            </div>
            <div className="bg-[#21172d] px-5 py-3 text-[10px] text-[#d9cee8]">
              If you did not request this code, safely ignore this email.
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] text-muted-foreground">{form.footer}</p>
        </div>
      </div>
    </div>
  );
}

export function AccessPanel() {
  const queryClient = useQueryClient();
  const fetchSettings = useServerFn(adminGetSettings);
  const saveSettings = useServerFn(adminSetSettings);

  const settings = useQuery({ queryKey: ["admin-settings"], queryFn: () => fetchSettings() });

  const [maxUsers, setMaxUsers] = useState("");
  const [essayLimit, setEssayLimit] = useState("");

  useEffect(() => {
    if (settings.data) {
      setMaxUsers(String(settings.data.maxUsers));
      setEssayLimit(String(settings.data.essayDailyLimit));
    }
  }, [settings.data]);

  const parsedMax = Number(maxUsers);
  const parsedEssay = Number(essayLimit);
  const validMax = Number.isInteger(parsedMax) && parsedMax >= 1 && parsedMax <= 1000;
  const validEssay = Number.isInteger(parsedEssay) && parsedEssay >= 1 && parsedEssay <= 200;
  const dirty =
    !!settings.data &&
    (parsedMax !== settings.data.maxUsers || parsedEssay !== settings.data.essayDailyLimit);

  const saveMutation = useMutation({
    mutationFn: () => saveSettings({ data: { maxUsers: parsedMax, essayDailyLimit: parsedEssay } }),
    onSuccess: async () => {
      toast.success("Saved. The new limits apply immediately.");
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin-settings"] })]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // --- AI usage controls: deliberately its own mutation, separate from the
  // capacity form's "Save changes" button above — a pause switch that
  // needs a form save first isn't a real emergency control. Both the
  // toggle and the mode selector apply the instant they're changed. -------
  const aiMutation = useMutation({
    mutationFn: (vars: { aiEnabled?: boolean; aiMode?: AiGatewayMode }) =>
      saveSettings({ data: vars }),
    onSuccess: (result, vars) => {
      queryClient.setQueryData(["admin-settings"], result);
      if (vars.aiEnabled !== undefined) {
        toast.success(
          result.aiEnabled
            ? "AI is live again for everyone."
            : "AI paused site-wide — every AI feature will fail fast until you turn this back on.",
        );
      } else {
        toast.success(`AI mode set to ${AI_MODE_LABELS[result.aiMode]}.`);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const s = settings.data;
  const freeSeats = s ? Math.max(s.maxUsers - s.currentUsers, 0) : 0;
  const overCap = s ? s.currentUsers > s.maxUsers : false;

  if (settings.isLoading) return <Skeleton className="h-64 w-full" />;
  if (settings.error) {
    return (
      <p className="text-sm text-destructive">
        Couldn't load access settings: {(settings.error as Error).message}. Make sure migration
        20260919090000 has been run on your database.
      </p>
    );
  }

  const ai = settings.data;

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "panel space-y-4 rounded-xl border p-5",
          ai && !ai.aiEnabled ? "border-destructive/40 bg-destructive/5" : "border-border",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Gauge className="size-4" /> AI usage
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Applies instantly, everywhere — essay marking, Live Examiner, MCQ tagging, diagrams.
              The admin account is not exempt from the pause switch.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Label htmlFor="ai-enabled" className="text-xs text-muted-foreground">
              {ai?.aiEnabled ? "AI is on" : "AI is paused"}
            </Label>
            <Switch
              id="ai-enabled"
              checked={ai?.aiEnabled ?? true}
              disabled={!ai || aiMutation.isPending}
              onCheckedChange={(checked) => aiMutation.mutate({ aiEnabled: checked })}
            />
          </div>
        </div>

        {ai && !ai.aiEnabled ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <PauseCircle className="mt-0.5 size-3.5 shrink-0" />
            AI is paused for everyone right now. Every essay grade, Live Examiner check and other AI
            feature will show an error until you turn this back on.
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="ai-mode" className="text-xs">
            Credit-saving mode
          </Label>
          <Select
            value={ai?.aiMode ?? "max"}
            disabled={!ai || aiMutation.isPending}
            onValueChange={(value) => aiMutation.mutate({ aiMode: value as AiGatewayMode })}
          >
            <SelectTrigger id="ai-mode" className="sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(AI_MODE_LABELS) as AiGatewayMode[]).map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {AI_MODE_LABELS[mode]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            {ai?.aiMode === "economy" ? (
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
            ) : null}
            {AI_MODE_DESCRIPTIONS[ai?.aiMode ?? "max"]}
          </p>
        </div>
      </div>

      <div className="panel space-y-5 rounded-xl border border-border p-5">
        <div>
          <p className="text-sm font-semibold">Capacity &amp; daily limits</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Changes take effect immediately for everyone. The admin account is never limited.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="max-users">Maximum active users</Label>
            <Input
              id="max-users"
              type="number"
              inputMode="numeric"
              min={1}
              max={1000}
              value={maxUsers}
              onChange={(event) => setMaxUsers(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Includes every existing account (admin included). Once full, new sign-ups join the
              waitlist. Currently{" "}
              <span className="font-medium text-foreground">
                {s?.currentUsers} / {s?.maxUsers}
              </span>{" "}
              seats used
              {overCap
                ? " — over the new cap; nobody is removed, but no new accounts can join until some are deleted."
                : `, ${freeSeats} free.`}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="essay-limit">Essays graded per person, per day</Label>
            <Input
              id="essay-limit"
              type="number"
              inputMode="numeric"
              min={1}
              max={200}
              value={essayLimit}
              onChange={(event) => setEssayLimit(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Counts every essay marked from Essay marking, an essay rewrite, or "Grade now" in Live
              Examiner. Resets at midnight IST. Live Examiner itself is fixed at one session (one
              question) per person per day.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!dirty || !validMax || !validEssay || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save changes
          </Button>
          {!validMax || !validEssay ? (
            <p className="text-xs text-destructive">
              Users: 1–1000 · Essays per day: 1–200 (whole numbers).
            </p>
          ) : null}
        </div>
      </div>

      <VerificationEmailPanel />
    </div>
  );
}
