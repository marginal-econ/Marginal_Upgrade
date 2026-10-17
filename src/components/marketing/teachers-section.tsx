import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, CheckCircle2, FileCheck2, GraduationCap, Layers, LineChart, Lock, School, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Reveal } from "./reveal";
import { Button } from "@/components/ui/button";

export function TeachersSection() {
  const capabilities = [
    {
      icon: BookOpen,
      title: "School Mark Scheme & RAG Ingestion",
      lead: "Ground AI evaluation in your school's curriculum",
      desc: "Upload custom internal exam mark schemes, school coursebooks, and syllabus notes. Marginal indexes and vectors your department's resources for clause-level citation.",
      badge: "Knowledge Engine",
    },
    {
      icon: ShieldCheck,
      title: "Anchor Calibration Standards",
      lead: "Lock grading standards to Cambridge examiner levels",
      desc: "Calibrate exemplar student essays against Cambridge 9708 Level 4 and Level 5 grade boundaries to guarantee department-wide marking consistency.",
      badge: "Exam Calibration",
    },
    {
      icon: FileCheck2,
      title: "Desktop Batch Marking Desk & Moderation",
      lead: "Grade 30 candidate mock papers in minutes",
      desc: "Review AI first-pass marks on our desktop marking desk. Inspect AI vs Teacher discrepancies, apply mark adjustments with one click, and attach formal examiner notes.",
      badge: "Marking Desk",
    },
    {
      icon: LineChart,
      title: "Cohort Diagnostic Analytics & Classes",
      lead: "Pinpoint syllabus weaknesses across your entire class",
      desc: "Set mock paper assignments, manage class cohorts, and audit automated AO1, AO2, and AO3 diagnostic heatmaps to target revision before exam series.",
      badge: "Cohort Analytics",
    },
  ];

  return (
    <section id="teachers-section" className="relative border-b-[1.5px] border-ink bg-card/40 py-20 md:py-24 scroll-mt-16">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 mb-3">
              <GraduationCap className="size-4" />
              For Cambridge 9708 Economics Teachers &amp; Departments
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-balance">
              Transform Your Economics Department’s Marking &amp; Assessment
            </h2>
            <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed text-pretty">
              Marginal gives Cambridge Economics teachers the administrative tools to ingest internal mark schemes, calibrate standardized grading anchors, and batch-evaluate mock scripts with examiner precision.
            </p>
          </Reveal>
        </div>

        {/* 4 Capabilities Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6">
          {capabilities.map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal key={c.title} delay={100 + i * 80}>
                <div className="panel border-2 border-border p-6 md:p-8 rounded-2xl bg-card hover:border-purple-500/40 transition-all duration-300 h-full flex flex-col justify-between shadow-sm hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
                        <Icon className="size-5.5" />
                      </span>
                      <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider bg-purple-500/5 px-2.5 py-1 rounded-md border border-purple-500/20">
                        {c.badge}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{c.title}</h3>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-1">{c.lead}</p>
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Teacher Security & Call To Action Banner */}
        <Reveal delay={300}>
          <div className="mt-12 rounded-2xl border-2 border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-card to-purple-500/5 p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-lg">
            <div className="space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                <School className="size-4" />
                Institutional Verification Required
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                Ready to empower your Cambridge economics cohort?
              </h3>
              <p className="text-sm text-muted-foreground max-w-xl">
                Teachers can register freely with their official school email domain. All accounts receive immediate verification review by our academic team to protect examination security.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
              <Link to="/teacher-auth" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 shadow-md">
                  Sign In to Teacher Portal →
                </Button>
              </Link>
              <Link to="/teacher-auth" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-purple-500/40 text-foreground font-semibold px-5">
                  Register as Teacher
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
