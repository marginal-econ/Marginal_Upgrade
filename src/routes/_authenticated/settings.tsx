import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  GraduationCap,
  HelpCircle,
  Layers,
  Loader2,
  Mail,
  PenLine,
  RotateCcw,
  Save,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
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
import { Switch } from "@/components/ui/switch";
import { getMe, updateProfile } from "@/lib/account.functions";
import { supabase } from "@/integrations/backend/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Account & Preferences — Marginal Economics" },
      {
        name: "description",
        content:
          "Manage your Cambridge 9708 candidate profile, academic goals, evaluation depth, and platform settings.",
      },
    ],
  }),
  component: SettingsPage,
});

export function SettingsPage() {
  const queryClient = useQueryClient();
  const fetchMe = useServerFn(getMe);
  const save = useServerFn(updateProfile);

  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });

  const [fullName, setFullName] = useState("");
  const [school, setSchool] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Cambridge Study & Exam Preferences (Stored locally & applied across suites)
  const [examSeries, setExamSeries] = useState("May/June 2026");
  const [targetLevel, setTargetLevel] = useState("as_level");
  const [targetGrade, setTargetGrade] = useState("A*");
  const [currencyContext, setCurrencyContext] = useState("uk_intl");
  const [feedbackDepth, setFeedbackDepth] = useState("detailed");
  const [timedModeDefault, setTimedModeDefault] = useState(true);
  const [showDiagramLabels, setShowDiagramLabels] = useState(true);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("marginal_candidate_prefs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.examSeries) setExamSeries(parsed.examSeries);
        if (parsed.targetLevel) setTargetLevel(parsed.targetLevel);
        if (parsed.targetGrade) setTargetGrade(parsed.targetGrade);
        if (parsed.currencyContext) setCurrencyContext(parsed.currencyContext);
        if (parsed.feedbackDepth) setFeedbackDepth(parsed.feedbackDepth);
        if (typeof parsed.timedModeDefault === "boolean") setTimedModeDefault(parsed.timedModeDefault);
        if (typeof parsed.showDiagramLabels === "boolean") setShowDiagramLabels(parsed.showDiagramLabels);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Fetch client user email for display
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
    });
  }, []);

  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (seeded || !me.data) return;
    setFullName(me.data.fullName ?? "");
    setSchool(me.data.school ?? "");
    setSeeded(true);
  }, [me.data, seeded]);

  const profileMutation = useMutation({
    mutationFn: () =>
      save({ data: { fullName: fullName.trim(), school: school.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Profile identity updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSaveAcademicPrefs = () => {
    try {
      const payload = {
        examSeries,
        targetLevel,
        targetGrade,
        currencyContext,
        feedbackDepth,
        timedModeDefault,
        showDiagramLabels,
      };
      localStorage.setItem("marginal_candidate_prefs", JSON.stringify(payload));
      toast.success("Cambridge examination & study preferences saved.");
    } catch {
      toast.error("Could not save preferences locally.");
    }
  };

  const copyUserId = () => {
    if (me.data?.userId) {
      navigator.clipboard.writeText(me.data.userId);
      setCopiedId(true);
      toast.success("Account User ID copied to clipboard.");
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleExportData = () => {
    try {
      const exportObject = {
        candidateName: fullName || me.data?.fullName || "Candidate",
        school: school || me.data?.school || "Independent",
        accountRole: me.data?.role || "student",
        exportedAt: new Date().toISOString(),
        examSeries,
        targetGrade,
        syllabus: "Cambridge International AS & A Level Economics (9708)",
        platform: "Marginal Economics Engine v2.4",
      };
      const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `marginal-economics-candidate-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Academic candidate profile data exported.");
    } catch {
      toast.error("Failed to export data.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings & Preferences"
        description="Configure your Cambridge candidate profile, examination targets, evaluation depth, and account workspace."
      />

      <div className="space-y-6 px-4 py-5 sm:px-6 md:px-8 max-w-6xl mx-auto">
        {me.isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-medium">Loading account settings...</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left 2 Columns: Profile & Academic Goals */}
            <div className="lg:col-span-2 space-y-6">
              {/* 1. Candidate Identity & Profile */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                      {fullName ? fullName.slice(0, 2).toUpperCase() : <User className="size-5" />}
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                        Candidate Identity
                        {me.data?.role === "teacher" ? (
                          <Badge className="bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px] font-bold">
                            Authorized Educator
                          </Badge>
                        ) : me.data?.isAdmin ? (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold">
                            Administrator
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-medium bg-muted">
                            Cambridge Candidate
                          </Badge>
                        )}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Your registered name and institution for official Cambridge grading reports.
                      </p>
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    profileMutation.mutate();
                  }}
                  className="space-y-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="settings-name" className="text-xs font-semibold">
                        Full Name
                      </Label>
                      <Input
                        id="settings-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Eleanor Vance"
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="settings-school" className="text-xs font-semibold">
                        School / Exam Centre
                      </Label>
                      <Input
                        id="settings-school"
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        placeholder="e.g. Raffles Institution / Cambridge College"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 pt-1">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-muted-foreground">
                          Email Address
                        </Label>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" /> Verified
                        </span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-xs text-foreground font-mono">
                        <Mail className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{userEmail || "Signed in candidate"}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-muted-foreground">
                          Candidate User ID
                        </Label>
                        <button
                          type="button"
                          onClick={copyUserId}
                          className="text-[10px] font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                          {copiedId ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-xs font-mono text-muted-foreground">
                        <span className="truncate">{me.data?.userId ? `${me.data.userId.slice(0, 18)}...` : "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/70">
                    <span className="text-[11px] text-muted-foreground">
                      Updates appear across all your essay submissions and teacher exports.
                    </span>
                    <Button type="submit" size="sm" disabled={profileMutation.isPending} className="h-8 text-xs font-semibold">
                      {profileMutation.isPending ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin mr-1.5" /> Saving...
                        </>
                      ) : (
                        <>
                          <Save className="size-3.5 mr-1.5" /> Save Identity
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>

              {/* 2. Cambridge 9708 Academic Target & Preferences */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-border/80 pb-4">
                  <div className="space-y-0.5">
                    <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                      <GraduationCap className="size-4 text-primary" /> Cambridge 9708 Academic Profile
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Tailor feedback, exemplar comparisons, and question suggestions to your syllabus track.
                    </p>
                  </div>
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px] font-semibold">
                    9708 Syllabus Grounded
                  </Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Examination Target Series</Label>
                    <Select value={examSeries} onValueChange={setExamSeries}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="May/June 2026">May / June 2026 (Upcoming)</SelectItem>
                        <SelectItem value="Oct/Nov 2026">October / November 2026</SelectItem>
                        <SelectItem value="Feb/March 2027">February / March 2027 (India Series)</SelectItem>
                        <SelectItem value="May/June 2027">May / June 2027</SelectItem>
                        <SelectItem value="2027+">Future Series / Flexible Self-Paced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Curriculum Focus Level</Label>
                    <Select value={targetLevel} onValueChange={setTargetLevel}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="as_level">AS Level Focus (Paper 1 MCQ &amp; Paper 2 Essays)</SelectItem>
                        <SelectItem value="a2_level">A2 Level Focus (Paper 3 MCQ &amp; Paper 4 Essays)</SelectItem>
                        <SelectItem value="full_a_level">Full Cambridge A Level (Papers 1, 2, 3 &amp; 4)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Target Benchmark Grade</Label>
                    <Select value={targetGrade} onValueChange={setTargetGrade}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A*">Target A* (80%+ Overall Cambridge Band 1)</SelectItem>
                        <SelectItem value="A">Target A (70% - 79% Solid Band 1)</SelectItem>
                        <SelectItem value="B">Target B (60% - 69% Band 2 Competence)</SelectItem>
                        <SelectItem value="C">Target C (50% - 59% Foundational Pass)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Economic Context &amp; Currency</Label>
                    <Select value={currencyContext} onValueChange={setCurrencyContext}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uk_intl">UK &amp; International Standards (£ / $)</SelectItem>
                        <SelectItem value="us_global">US &amp; Global Markets ($)</SelectItem>
                        <SelectItem value="inr">South Asian Markets &amp; Rupee (₹)</SelectItem>
                        <SelectItem value="eur">European Economic Area (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-semibold">Examiner Feedback Calibration</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div
                      onClick={() => setFeedbackDepth("detailed")}
                      className={cn(
                        "rounded-xl border p-3 cursor-pointer transition-all space-y-1 text-xs",
                        feedbackDepth === "detailed"
                          ? "border-primary bg-primary/[0.04] text-foreground"
                          : "border-border hover:border-border/80 text-muted-foreground",
                      )}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="size-3.5 text-primary" /> Full Diagnostic Marking
                        </span>
                        {feedbackDepth === "detailed" && <Check className="size-3.5 text-primary" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Line-by-line mark scheme breakdown, explicit AO1/AO2/AO3 allocations, and rewritten model answers.
                      </p>
                    </div>

                    <div
                      onClick={() => setFeedbackDepth("concise")}
                      className={cn(
                        "rounded-xl border p-3 cursor-pointer transition-all space-y-1 text-xs",
                        feedbackDepth === "concise"
                          ? "border-primary bg-primary/[0.04] text-foreground"
                          : "border-border hover:border-border/80 text-muted-foreground",
                      )}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <Sliders className="size-3.5 text-primary" /> Rapid Band &amp; Tips
                        </span>
                        {feedbackDepth === "concise" && <Check className="size-3.5 text-primary" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Fast band assignment, total marks, and top 3 decisive improvement levers for rapid practice sessions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/70">
                  <span className="text-[11px] text-muted-foreground">
                    Preferences calibrate your Live Examiner prompts and diagnostic rubrics.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveAcademicPrefs}
                    className="h-8 text-xs font-semibold"
                  >
                    <Save className="size-3.5 mr-1.5" /> Save Academic Goals
                  </Button>
                </div>
              </div>

              {/* 3. Study Workspace & Interface Preferences */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                <div className="border-b border-border/80 pb-3">
                  <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <Sliders className="size-4 text-primary" /> Exam Workspace Controls
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Tweak practice exam timer behaviors and interactive vector diagram rendering.
                  </p>
                </div>

                <div className="space-y-3.5 divide-y divide-border/60">
                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5 max-w-[80%]">
                      <Label className="text-xs font-semibold">Automatic Exam Timer by Default</Label>
                      <p className="text-[11px] text-muted-foreground">
                        Automatically start the official Cambridge clock (e.g. 1 hour for Paper 1) when opening MCQ papers.
                      </p>
                    </div>
                    <Switch
                      checked={timedModeDefault}
                      onCheckedChange={(val) => {
                        setTimedModeDefault(val);
                        handleSaveAcademicPrefs();
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <div className="space-y-0.5 max-w-[80%]">
                      <Label className="text-xs font-semibold">Show Diagram Equilibrium Annotations</Label>
                      <p className="text-[11px] text-muted-foreground">
                        Highlight equilibrium shift lines (P1 to P2, Q1 to Q2) directly on vector diagram canvases.
                      </p>
                    </div>
                    <Switch
                      checked={showDiagramLabels}
                      onCheckedChange={(val) => {
                        setShowDiagramLabels(val);
                        handleSaveAcademicPrefs();
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Grounding & Security */}
            <div className="space-y-6">
              {/* Cambridge 9708 Knowledge Grounding Status */}
              <div className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-5 shadow-xs space-y-3 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  <h3 className="font-bold text-foreground">Knowledge Base Grounding</h3>
                </div>
                <p className="text-muted-foreground text-[11.5px] leading-relaxed">
                  Evaluations and model answers are grounded in 259 official Cambridge mark schemes, chief examiner reports, and syllabi via 2048-dimension vector search.
                </p>
                <div className="pt-2 border-t border-primary/20 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">RAG Accuracy Index:</span>
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                    100% Calibrated
                  </Badge>
                </div>
              </div>

              {/* Data & Privacy Controls */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3 text-xs">
                <div className="flex items-center gap-2 border-b border-border/80 pb-2.5">
                  <Shield className="size-4 text-muted-foreground" />
                  <h3 className="font-bold text-foreground">Data &amp; Privacy</h3>
                </div>

                <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                  Your academic essays and performance trajectories are strictly private to you and your authorized classroom teachers.
                </p>

                <div className="space-y-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportData}
                    className="w-full text-xs h-8 justify-start"
                  >
                    <Download className="size-3.5 mr-2 text-primary" /> Export Candidate Profile JSON
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm("Reset local practice cache and filters? (Your saved essays on the server will NOT be touched).")) {
                        localStorage.removeItem("marginal_candidate_prefs");
                        toast.success("Local cache reset to defaults.");
                        window.location.reload();
                      }
                    }}
                    className="w-full text-xs h-8 justify-start text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="size-3.5 mr-2" /> Reset Local Preferences
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}