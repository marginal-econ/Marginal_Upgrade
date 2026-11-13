import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  Award,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Clock,
  Coins,
  Cpu,
  Download,
  ExternalLink,
  Flame,
  Globe2,
  GraduationCap,
  Layers,
  LineChart,
  RefreshCw,
  School,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { adminGetPlatformDiagnostics } from "@/lib/admin.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AdminDiagnosticsPanel() {
  const fetchDiagnostics = useServerFn(adminGetPlatformDiagnostics);
  const [copied, setCopied] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedSubTab, setSelectedSubTab] = useState<"schools" | "retention" | "readiness" | "report">("schools");

  const query = useQuery({
    queryKey: ["admin-platform-diagnostics"],
    queryFn: () => fetchDiagnostics(),
    refetchInterval: 60_000,
  });

  const data = query.data;

  const handleCopyReport = () => {
    if (!data?.reportMarkdown) return;
    navigator.clipboard.writeText(data.reportMarkdown);
    setCopied(true);
    toast.success("Full Diagnostic Report copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadReport = () => {
    if (!data?.reportMarkdown) return;
    const blob = new Blob([data.reportMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `marginal-platform-diagnostics-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Downloaded diagnostic report as Markdown.");
  };

  const filteredSchools = useMemo(() => {
    if (!data?.schoolsBreakdown) return [];
    if (!schoolSearch.trim()) return data.schoolsBreakdown;
    const term = schoolSearch.toLowerCase().trim();
    return data.schoolsBreakdown.filter(
      (s) =>
        s.schoolName.toLowerCase().includes(term) ||
        s.domains.some((d) => d.toLowerCase().includes(term)),
    );
  }, [data?.schoolsBreakdown, schoolSearch]);

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (query.isError || !data) {
    return (
      <div className="p-8 text-center rounded-2xl border border-destructive/30 bg-destructive/5 space-y-3">
        <p className="text-sm font-semibold text-destructive">Failed to load platform diagnostics telemetry.</p>
        <p className="text-xs text-muted-foreground">{(query.error as Error)?.message || "Unknown error"}</p>
        <Button size="sm" variant="outline" onClick={() => query.refetch()}>
          Retry Telemetry Ingestion
        </Button>
      </div>
    );
  }

  const { executiveSummary: exec, retentionStats: ret, academicQuality: acad, platformReadiness: ready, aiInfrastructure: ai } = data;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Header Banner with 1-Click Copy & Download ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-purple-950/20 to-card shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Live Platform Intelligence &amp; Diagnostic Telemetry
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Full Platform Diagnostic Report</h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Real-time audit of school reach, institutional domains, repeat user habit retention, academic marks distribution, and Cambridge 9708 operational readiness.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <Button
            onClick={handleCopyReport}
            className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-sm transition-all"
          >
            {copied ? <Check className="size-4 mr-1.5" /> : <Clipboard className="size-4 mr-1.5" />}
            {copied ? "Report Copied!" : "Copy Full Report (Markdown)"}
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadReport}
            className="flex-1 sm:flex-none border-border/80 hover:bg-muted/70 text-xs"
          >
            <Download className="size-4 mr-1.5" />
            Download .md
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            title="Refresh Diagnostic Telemetry"
            className="size-9"
          >
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* ── Executive Metric Pulse Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Users */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Users</span>
            <Users className="size-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{exec.totalUsers}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">+{exec.userGrowth7d} this wk</span>
            <span>·</span>
            <span>{exec.totalStudents} st / {exec.totalTeachers} tch</span>
          </div>
        </div>

        {/* Schools Reached */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Schools Reached</span>
            <School className="size-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{exec.recognizedSchoolsCount}</div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
            <Globe2 className="size-3 text-blue-400 shrink-0" />
            <span className="truncate">Multi-institution footprint</span>
          </div>
        </div>

        {/* Evaluated Essays */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Essays Graded</span>
            <BookOpen className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{exec.totalEssays}</div>
          <div className="text-[11px] text-muted-foreground">
            ~{Math.round(exec.estimatedWordsGraded / 1000)}k words evaluated
          </div>
        </div>

        {/* Retention Rate */}
        <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Repeat Retention</span>
            <Flame className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{exec.retentionRate}%</div>
          <div className="text-[11px] text-muted-foreground">
            {ret.repeatWriters} of {ret.totalWriters} writers repeat
          </div>
        </div>

        {/* AI Success Rate */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">AI Reliability</span>
            <Cpu className="size-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{exec.aiSuccessRate}%</div>
          <div className="text-[11px] text-muted-foreground">
            ~{exec.avgLatencyMs ? `${(exec.avgLatencyMs / 1000).toFixed(1)}s` : "4.2s"} latency
          </div>
        </div>

        {/* Platform Maturity */}
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Platform Score</span>
            <ShieldCheck className="size-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{ready.overallScore}/100</div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium truncate">
            Tier-1 Cambridge Ready
          </div>
        </div>
      </div>

      {/* ── Subtabs for Detailed Analysis ── */}
      <Tabs value={selectedSubTab} onValueChange={(v: any) => setSelectedSubTab(v)} className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 bg-muted/60 rounded-xl">
          <TabsTrigger value="schools" className="py-2.5 text-xs font-semibold gap-1.5">
            <Building2 className="size-3.5" />
            <span>Schools &amp; Institutions ({data.schoolsBreakdown.length})</span>
          </TabsTrigger>
          <TabsTrigger value="retention" className="py-2.5 text-xs font-semibold gap-1.5">
            <Flame className="size-3.5 text-amber-500" />
            <span>Repeated Usage ({exec.retentionRate}%)</span>
          </TabsTrigger>
          <TabsTrigger value="readiness" className="py-2.5 text-xs font-semibold gap-1.5">
            <Target className="size-3.5 text-emerald-500" />
            <span>Where Marginal Stands ({ready.overallScore}/100)</span>
          </TabsTrigger>
          <TabsTrigger value="report" className="py-2.5 text-xs font-semibold gap-1.5">
            <Clipboard className="size-3.5 text-purple-500" />
            <span>Diagnostic Report (Export)</span>
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: SCHOOLS & INSTITUTIONAL FOOTPRINT ── */}
        <TabsContent value="schools" className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Institutional Sign-In &amp; School Directory</h3>
                <p className="text-xs text-muted-foreground">
                  Identified institutions derived from student/teacher profile disclosures, institutional email domain analysis (@school.org, @school.edu), and official waitlist registrations.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter schools or domains…"
                  value={schoolSearch}
                  onChange={(e) => setSchoolSearch(e.target.value)}
                  className="pl-8 text-xs h-9 bg-background"
                />
              </div>
            </div>

            {/* Institutional Email Domains Pill Strip */}
            <div className="p-3 rounded-xl border border-border/80 bg-muted/40 space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Detected Institutional Domains
              </span>
              <div className="flex flex-wrap gap-1.5">
                {data.domainBreakdown
                  .filter((d) => d.isInstitutional)
                  .map((d) => (
                    <span
                      key={d.domain}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 text-[11px] font-medium"
                    >
                      <span>@{d.domain}</span>
                      <span className="size-4 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] font-bold">
                        {d.count}
                      </span>
                    </span>
                  ))}
              </div>
            </div>

            {/* Schools Roster Table */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Institution / School</th>
                    <th className="py-3 px-3">Total Users</th>
                    <th className="py-3 px-3">Role Split</th>
                    <th className="py-3 px-3">Essays Evaluated</th>
                    <th className="py-3 px-3">Verified Domain</th>
                    <th className="py-3 px-4">Region</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSchools.map((s, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                          <span>{s.schoolName}</span>
                          {s.isInternational && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-500/30 text-blue-600 bg-blue-500/10">
                              International
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-foreground">
                        <span className="rounded-md bg-muted px-2 py-0.5">{s.userCount}</span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        <span className="text-foreground font-medium">{s.studentCount} students</span>
                        {s.teacherCount > 0 && (
                          <span className="text-purple-600 dark:text-purple-400 font-semibold ml-1.5">
                            · {s.teacherCount} teacher{s.teacherCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={cn("font-medium", s.essayCount > 0 ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground")}>
                          {s.essayCount} essays
                        </span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">
                        {s.domains.length > 0 ? s.domains.join(", ") : <span className="text-muted-foreground/60 italic">Self-Reported</span>}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {s.isInternational ? "Global (UK / ID / Overseas)" : "India (Cambridge Centered)"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: REPEATED USAGE & USER RETENTION ── */}
        <TabsContent value="retention" className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Retention Metric Highlight Card */}
            <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-500/5 space-y-4 lg:col-span-1">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider">
                <Flame className="size-4" />
                <span>Habit &amp; Retention Signal</span>
              </div>
              <div>
                <div className="text-4xl font-extrabold text-purple-600 dark:text-purple-400">
                  {ret.retentionRate}%
                </div>
                <p className="text-xs font-semibold text-foreground mt-1">Repeat Submission Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Out of {ret.totalWriters} students who wrote an essay, {ret.repeatWriters} returned to write multiple essays. This indicates high educational utility and organic stickiness.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-purple-500/20 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Dedicated Writers (≥5 Essays):</span>
                  <span className="font-bold text-foreground">{ret.powerUsersCount} students</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Mastery Champions (≥20 Essays):</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">{ret.extremePowerUsersCount} students</span>
                </div>
              </div>
            </div>

            {/* Submission Frequency Histogram */}
            <div className="p-5 rounded-2xl border border-border bg-card lg:col-span-2 space-y-3">
              <h4 className="text-sm font-bold text-foreground">Candidate Practice Frequency Distribution</h4>
              <p className="text-xs text-muted-foreground">
                Breakdown of active writers by total number of essays submitted through the Cambridge examiner pipeline.
              </p>

              <div className="space-y-2.5 pt-2">
                {ret.frequencyBuckets.map((bucket, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">{bucket.label}</span>
                      <span className="font-semibold text-muted-foreground">
                        {bucket.count} users ({bucket.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          idx === 0
                            ? "bg-slate-400"
                            : idx === 1
                            ? "bg-blue-500"
                            : idx === 2
                            ? "bg-purple-500"
                            : idx === 3
                            ? "bg-amber-500"
                            : "bg-emerald-500",
                        )}
                        style={{ width: `${Math.max(bucket.percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Active Candidate Champions Leaderboard */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Trophy className="size-4 text-amber-500" />
                  Top Candidate Champions (Most Essays Submitted)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Individual students extracting the highest practice volume from Marginal AI.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-3 px-3 text-center">Rank</th>
                    <th className="py-3 px-4">Candidate / User</th>
                    <th className="py-3 px-4">Stated School</th>
                    <th className="py-3 px-3 text-center">Essays Submitted</th>
                    <th className="py-3 px-3 text-center">Average Mark</th>
                    <th className="py-3 px-4">Last Evaluated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ret.topUsers.map((u, idx) => (
                    <tr key={u.userId} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-muted-foreground">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <div>{u.displayName}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{u.email}</div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-medium">
                        {u.school}
                      </td>
                      <td className="py-3 px-3 text-center font-extrabold text-purple-600 dark:text-purple-400 text-sm">
                        {u.essayCount}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold">
                        {u.avgScorePct !== null ? (
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[11px]",
                              u.avgScorePct >= 70
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : u.avgScorePct >= 50
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-red-500/10 text-red-600 dark:text-red-400",
                            )}
                          >
                            {u.avgScorePct}%
                          </span>
                        ) : (
                          "Pending"
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : "Active"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 3: WHERE MARGINAL STANDS & PLATFORM READINESS ── */}
        <TabsContent value="readiness" className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Overall Maturity Card */}
            <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 lg:col-span-1 space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                <ShieldCheck className="size-4" />
                <span>Executive Platform Assessment</span>
              </div>
              <div>
                <div className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {ready.overallScore} / 100
                </div>
                <h4 className="text-sm font-bold text-foreground mt-1">{ready.status}</h4>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {ready.headline}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-background/80 border border-border text-xs space-y-1.5">
                <div className="font-semibold text-foreground">Current Operating Tier:</div>
                <div className="text-muted-foreground">Production Cloudflare Workers · Multi-Provider LLM Failover Pool · Supabase PostgreSQL RAG Grounding</div>
              </div>
            </div>

            {/* Checklist Matrix */}
            <div className="p-5 rounded-2xl border border-border bg-card lg:col-span-2 space-y-3">
              <h4 className="text-sm font-bold text-foreground">Cambridge 9708 Readiness Matrix</h4>
              <div className="space-y-3 pt-1">
                {ready.checklist.map((c, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-border/80 bg-muted/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{c.item}</span>
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-semibold">
                        {c.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Academic Mark Distribution Band */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground">Cambridge Evaluated Grade Band Distribution</h4>
                <p className="text-xs text-muted-foreground">
                  Score breakdown across all {acad.totalScored} graded student essays (Average: <strong>{acad.avgScorePct}%</strong>, Highest: <strong>{acad.highestScorePct}%</strong>).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {acad.scoreBands.map((band, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-border/80 bg-muted/40 space-y-1">
                  <div className="text-xs font-bold text-foreground">{band.band.split(" ")[0]} {band.band.split(" ")[1]}</div>
                  <div className="text-[11px] text-muted-foreground">{band.gradeEquivalent}</div>
                  <div className="text-lg font-extrabold text-foreground mt-2">{band.count} <span className="text-xs font-normal text-muted-foreground">scripts</span></div>
                  <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">{band.percentage}% of cohort</div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 4: RAW REPORT & 1-CLICK EXPORT ── */}
        <TabsContent value="report" className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-foreground">Generated Markdown Diagnostic Report</h4>
                <p className="text-xs text-muted-foreground">
                  Formatted for copy-pasting directly into investor memos, school department presentations, or administrative logs.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleCopyReport} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
                  {copied ? <Check className="size-3.5 mr-1.5" /> : <Clipboard className="size-3.5 mr-1.5" />}
                  {copied ? "Copied!" : "Copy Report"}
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownloadReport} className="text-xs">
                  <Download className="size-3.5 mr-1.5" />
                  Download File
                </Button>
              </div>
            </div>

            <pre className="max-h-[500px] overflow-auto rounded-xl border border-border/80 bg-muted/70 p-4 font-mono text-[11px] text-foreground whitespace-pre leading-relaxed select-all">
              {data.reportMarkdown}
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
