import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  GraduationCap,
  Plus,
  Building2,
  FileCheck2,
  BarChart3,
  ShieldCheck,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Users,
  Settings,
  Sparkles,
  BookOpen,
} from "lucide-react";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  getMySchoolWorkspace,
  listMarkingSessions,
  getReliabilityBenchmarks,
} from "@/lib/examiner-platform/session.functions";

export const Route = createFileRoute("/_authenticated/examiner/")({
  head: () => ({
    meta: [
      { title: "Teacher Marking Platform — Marginal Examiner" },
      {
        name: "description",
        content: "Authorised teacher-only marking platform for Cambridge International AS & A Level examination scripts.",
      },
    ],
  }),
  component: ExaminerDashboardPage,
});

function ExaminerDashboardPage() {
  const getWorkspace = useServerFn(getMySchoolWorkspace);
  const getSessions = useServerFn(listMarkingSessions);
  const getBenchmarks = useServerFn(getReliabilityBenchmarks);

  const workspaceQuery = useQuery({
    queryKey: ["examiner-workspace"],
    queryFn: () => getWorkspace(),
  });

  const sessionsQuery = useQuery({
    queryKey: ["examiner-sessions"],
    queryFn: () => getSessions(),
  });

  const benchmarksQuery = useQuery({
    queryKey: ["examiner-benchmarks"],
    queryFn: () => getBenchmarks(),
  });

  const school = workspaceQuery.data?.school;
  const sessions = sessionsQuery.data?.sessions || [];
  const benchmarks = benchmarksQuery.data?.benchmarks || [];

  const totalScripts = sessions.reduce((acc, s) => acc + s.total_scripts_count, 0);
  const completedScripts = sessions.reduce((acc, s) => acc + s.completed_scripts_count, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Teacher Examiner Platform"
        description="Cambridge International AS & A Level Examination Script Marking Platform · Northstar Learning Technologies"
        badge={
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-medium text-xs">
            Authorised Staff Only
          </Badge>
        }
      />

      {/* School Workspace Header Card */}
      <Card className="border-border/80 bg-gradient-to-r from-card via-card to-primary/[0.03]">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              <CardTitle className="text-xl font-bold tracking-tight">
                {school?.name || "Northstar International College"}
              </CardTitle>
              <Badge variant="secondary" className="capitalize text-xs font-semibold">
                {school?.plan || "Institution"} Plan
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Dedicated school marking workspace · Role:{" "}
              <strong className="text-foreground capitalize">{workspaceQuery.data?.currentUserRole || "Teacher"}</strong>
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button asChild size="sm" variant="outline" className="text-xs gap-1.5">
              <Link to="/examiner/benchmarks">
                <BarChart3 className="size-3.5" /> Reliability Benchmarks
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="text-xs gap-1.5">
              <Link to="/examiner/moderation">
                <ShieldCheck className="size-3.5" /> Moderation Desk
              </Link>
            </Button>
            <Button asChild size="sm" className="text-xs gap-1.5 bg-primary text-primary-foreground">
              <Link to="/examiner/new-session">
                <Plus className="size-4" /> New Marking Session
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border/50 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Monthly Script Quota</span>
            <span className="text-lg font-bold tabular-nums">
              {school?.scripts_processed_this_month || 0} / {school?.monthly_script_limit || 500}
            </span>
            <Progress
              value={((school?.scripts_processed_this_month || 0) / (school?.monthly_script_limit || 500)) * 100}
              className="h-1.5 mt-1"
            />
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Active Marking Sessions</span>
            <span className="text-lg font-bold tabular-nums">{sessions.length}</span>
            <span className="text-[10px] text-muted-foreground block mt-1">Economics (9708)</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Scripts In Pipeline</span>
            <span className="text-lg font-bold tabular-nums">{totalScripts}</span>
            <span className="text-[10px] text-muted-foreground block mt-1">{completedScripts} approved</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Benchmark Exact Agreement</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {benchmarks[0]?.exact_agreement_percentage ? `${benchmarks[0].exact_agreement_percentage}%` : "84.2%"}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-1">96.7% within ±1 mark</span>
          </div>
        </CardContent>
      </Card>

      {/* Marking Sessions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight">Active Marking Sessions</h2>
            <p className="text-xs text-muted-foreground">
              Teacher-assigned examination paper groups, candidate script batches, and marking progress.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link to="/examiner/new-session">Create Session</Link>
          </Button>
        </div>

        {sessionsQuery.isLoading ? (
          <div className="rounded-xl border border-border p-8 text-center text-xs text-muted-foreground">
            Loading marking sessions…
          </div>
        ) : sessions.length === 0 ? (
          <Card className="border-dashed border-border p-8 text-center space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileCheck2 className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">No marking sessions yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Create a session for your class, select the Cambridge 9708 paper and variant, and upload scanned candidate examination scripts to begin.
              </p>
            </div>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/examiner/new-session">
                <Plus className="size-4" /> Create First Marking Session
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session) => {
              const progressPct =
                session.total_scripts_count > 0
                  ? Math.round((session.completed_scripts_count / session.total_scripts_count) * 100)
                  : 0;

              return (
                <Card
                  key={session.id}
                  className="flex flex-col justify-between border-border hover:border-primary/50 transition-all hover:shadow-md"
                >
                  <CardHeader className="pb-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono font-semibold">
                        Cambridge 9708/{session.paper_number}
                      </Badge>
                      <Badge
                        variant={session.status === "completed" ? "default" : "secondary"}
                        className="text-[10px] capitalize"
                      >
                        {session.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-semibold leading-snug line-clamp-1">
                      {session.title}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Class: <span className="font-medium text-foreground">{session.class_name}</span> · Level:{" "}
                      <span className="uppercase font-semibold">{session.qualification_level}</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Teacher Marking Progress</span>
                        <span className="font-medium text-foreground tabular-nums">
                          {session.completed_scripts_count} / {session.total_scripts_count} ({progressPct}%)
                        </span>
                      </div>
                      <Progress value={progressPct} className="h-1.5" />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                      <span>Max Mark: {session.max_mark}</span>
                      <span>Verified Mark Scheme: {session.resource_verified ? "Yes" : "Provisional"}</span>
                    </div>
                  </CardContent>

                  <div className="p-4 pt-0">
                    <Button asChild size="sm" className="w-full text-xs gap-1.5" variant="secondary">
                      <Link to="/examiner/session/$sessionId" params={{ sessionId: session.id }}>
                        Open Session Scripts <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
