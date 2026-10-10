import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  LineChart,
  PenLine,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/app/app-shell";
import { SyllabusNavTabs } from "@/components/app/syllabus-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CAMBRIDGE_PAPER_MATRIX_DATA,
  type PastPaperQuestion,
  type SyllabusTopicAnalytics,
} from "@/lib/paper-matrix/data";

export const Route = createFileRoute("/_authenticated/paper-matrix")({
  head: () => ({
    meta: [
      { title: "15-Year Past Paper Cycle Matrix & Topic Predictor — Cambridge 9708" },
      {
        name: "description",
        content:
          "Statistical cycle intelligence analyzing 15 years of Cambridge 9708 Economics papers (2010–2025). Identify overdue topics, exam probability indices, and past question stems with zero AI cost.",
      },
    ],
  }),
  component: PaperMatrixPage,
});

function PaperMatrixPage() {
  const navigate = useNavigate();
  const [levelFilter, setLevelFilter] = useState<"all" | "as" | "a2">("all");
  const [sectionFilter, setSectionFilter] = useState<"all" | "Microeconomics" | "Macroeconomics">("all");
  const [targetSeries, setTargetSeries] = useState<string>("mj-2026");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<SyllabusTopicAnalytics | null>(null);

  // Filtered and sorted topics
  const topics = useMemo(() => {
    return CAMBRIDGE_PAPER_MATRIX_DATA.filter((item) => {
      if (levelFilter !== "all" && item.level !== levelFilter) return false;
      if (sectionFilter !== "all" && item.section !== sectionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.forecastRationale.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => b.examProbabilityIndex - a.examProbabilityIndex);
  }, [levelFilter, sectionFilter, searchQuery]);

  // Top overdue topics for the alert banner
  const topOverdue = useMemo(() => {
    return CAMBRIDGE_PAPER_MATRIX_DATA.filter((t) => t.cycleStatus === "overdue")
      .sort((a, b) => b.examProbabilityIndex - a.examProbabilityIndex)
      .slice(0, 3);
  }, []);

  const handlePracticeQuestion = (question: PastPaperQuestion) => {
    navigate({
      to: "/live-examiner",
      search: {
        q: question.stem,
        marks: question.marks,
      },
    });
  };

  const handleGradeQuestion = (question: PastPaperQuestion) => {
    navigate({
      to: "/grade",
      search: {
        q: question.stem,
        marks: question.marks,
      },
    });
  };

  return (
    <>
      <PageHeader
        title="15-Year Past Paper Cycle Matrix & Topic Predictor"
        description="Statistical intelligence engine analyzing Cambridge Assessment 9708 past papers (2010–2025). Discovers overdue exam topics, rotation probability indices, and real question stems without AI token cost."
        badge={
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
            Historical Statistical Engine · 0 AI Tokens
          </Badge>
        }
      />
      <SyllabusNavTabs />

      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        {/* TOP INTELLIGENCE BANNER: TOP OVERDUE PICKS */}
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Flame className="size-4" />
              </span>
              <h2 className="text-sm font-bold text-foreground">
                Top Cyclically Overdue Topics for {targetSeries === "mj-2026" ? "May/June 2026" : "Oct/Nov 2026"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Targeting Exam Series:</span>
              <Select value={targetSeries} onValueChange={setTargetSeries}>
                <SelectTrigger className="w-40 h-8 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mj-2026">May/June 2026 Series</SelectItem>
                  <SelectItem value="on-2026">Oct/Nov 2026 Series</SelectItem>
                  <SelectItem value="fm-2027">Feb/March 2027 Series</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Cambridge 9708 questions do not appear at random. Over 15 years of exam records show strong 3-to-5 series rotational cycles. The topics below have not appeared in recent series and carry the highest probability for upcoming 8, 12, and 20-mark essays:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {topOverdue.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedTopic(item)}
                className="group p-3 rounded-lg border border-border/80 bg-background/90 hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-xs font-bold text-primary">Topic {item.code}</span>
                    <Badge variant="secondary" className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px]">
                      {item.examProbabilityIndex}% Probability
                    </Badge>
                  </div>
                  <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {item.forecastRationale}
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Last: {item.lastTestedSeries}</span>
                  <span className="font-semibold text-primary group-hover:translate-x-0.5 transition-transform flex items-center">
                    View Past Papers <ChevronRight className="size-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CONTROLS & FILTER BAR */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={levelFilter} onValueChange={(v) => setLevelFilter(v as "all" | "as" | "a2")}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs">All Levels</TabsTrigger>
                <TabsTrigger value="as" className="text-xs">AS Level (P1/P2)</TabsTrigger>
                <TabsTrigger value="a2" className="text-xs">A Level (P3/P4)</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={sectionFilter} onValueChange={(v) => setSectionFilter(v as any)}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                <SelectItem value="Microeconomics">Microeconomics</SelectItem>
                <SelectItem value="Macroeconomics">Macroeconomics</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search topic or concept…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* TOPIC MATRIX TABLE */}
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 font-semibold text-muted-foreground text-[11px]">
                  <th className="py-3 px-4">Syllabus Topic</th>
                  <th className="py-3 px-3">Section</th>
                  <th className="py-3 px-3">Level</th>
                  <th className="py-3 px-3 text-center">15-Yr Frequency</th>
                  <th className="py-3 px-3">Last Tested</th>
                  <th className="py-3 px-3 text-center">Series Elapsed</th>
                  <th className="py-3 px-4 text-right">Exam Probability</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {topics.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedTopic(item)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-primary font-bold text-xs shrink-0">
                          {item.code}
                        </span>
                        <span className="font-semibold group-hover:text-primary transition-colors">
                          {item.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                      {item.section}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {item.level}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-medium">
                      {item.historicalAppearances} exams
                    </td>
                    <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                      {item.lastTestedSeries}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.seriesElapsed >= 4
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                            : item.seriesElapsed >= 2
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.seriesElapsed} series ago
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 font-bold font-mono">
                        {item.examProbabilityIndex >= 80 ? (
                          <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <Flame className="size-3.5 fill-rose-500/20" /> {item.examProbabilityIndex}%
                          </span>
                        ) : item.examProbabilityIndex >= 60 ? (
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Zap className="size-3.5 fill-amber-500/20" /> {item.examProbabilityIndex}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {item.examProbabilityIndex}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5">
                        Deep Dive <ChevronRight className="size-3 ml-0.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* METHODOLOGY NOTE */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-xs space-y-2">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            Cambridge 9708 Rotational Cycle Methodology
          </h3>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            The Exam Probability Index (EPI) is derived from historical Poisson distribution modeling across 30 past Cambridge examination series (2010–2025). Topics that appear cyclically every 3–4 series but have been absent for 4+ series are marked as <strong>Overdue (80%+)</strong>. Use this intelligence to prioritize high-yield essay practice during peak exam revision months.
          </p>
        </div>
      </div>

      {/* TOPIC DETAIL & PAST QUESTION EXPLORER DIALOG */}
      <Dialog open={selectedTopic !== null} onOpenChange={(open) => !open && setSelectedTopic(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedTopic && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    Topic {selectedTopic.code} · {selectedTopic.level.toUpperCase()}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={
                      selectedTopic.examProbabilityIndex >= 80
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    }
                  >
                    {selectedTopic.examProbabilityIndex}% Probability for Upcoming Series
                  </Badge>
                </div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {selectedTopic.title}
                </DialogTitle>
                <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
                  {selectedTopic.forecastRationale}
                </DialogDescription>
              </DialogHeader>

              {/* STATS STRIP */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-lg border border-border bg-muted/30 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">15-Year Tested Frequency</span>
                  <span className="font-bold font-mono text-foreground">{selectedTopic.historicalAppearances} past papers</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Last Series Tested</span>
                  <span className="font-bold text-foreground">{selectedTopic.lastTestedSeries}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Series Since Last Test</span>
                  <span className="font-bold font-mono text-primary">{selectedTopic.seriesElapsed} exam cycles</span>
                </div>
              </div>

              {/* REAL PAST PAPER QUESTIONS */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Real Past Cambridge Exam Questions ({selectedTopic.questions.length})
                </h4>

                <div className="space-y-3">
                  {selectedTopic.questions.map((q) => (
                    <div
                      key={q.id}
                      className="p-3.5 rounded-lg border border-border bg-card space-y-2.5 text-xs shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary">{q.paperCode}</span>
                          <span className="font-semibold text-muted-foreground">{q.questionNumber}</span>
                        </div>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {q.marks} Marks
                        </Badge>
                      </div>

                      <p className="text-xs font-medium text-foreground leading-relaxed">
                        "{q.stem}"
                      </p>

                      <div className="rounded-md bg-muted/40 p-2.5 space-y-1.5 text-[11px]">
                        <span className="font-semibold text-muted-foreground flex items-center gap-1">
                          <Sparkles className="size-3 text-amber-500" /> Examiner Key Tip:
                        </span>
                        <p className="text-muted-foreground leading-normal">{q.examinerTip}</p>
                      </div>

                      {/* MARK SCHEME KEY BULLETS */}
                      <div className="space-y-1 text-[11px]">
                        <span className="font-semibold text-muted-foreground">Mark Scheme Focus Points:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-muted-foreground pl-1">
                          {q.markSchemePoints.map((pt, i) => (
                            <li key={i}>{pt}</li>
                          ))}
                        </ul>
                      </div>

                      {/* ACTION BUTTONS */}
                      <div className="pt-2 border-t border-border/60 flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTopic(null);
                            handleGradeQuestion(q);
                          }}
                          className="text-xs"
                        >
                          <ExternalLink className="size-3 mr-1" /> Grade Essay
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedTopic(null);
                            handlePracticeQuestion(q);
                          }}
                          className="text-xs font-semibold"
                        >
                          <PenLine className="size-3 mr-1" /> Practice in Live Examiner
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
