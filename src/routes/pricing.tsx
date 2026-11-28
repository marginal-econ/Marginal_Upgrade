import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { AiComparisonSection } from "@/components/marketing/ai-comparison-section";
import { SiteFooter } from "@/components/marketing/footer";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/backend/client";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "100% Free Access — Marginal AI Economics" },
      {
        name: "description",
        content:
          "Marginal AI is 100% Free for all Cambridge International 9708 Economics students and educators. Unlimited AI essay evaluations, Cambridge mark scheme audits, and past-paper MCQ drills.",
      },
      { name: "robots", content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" },
      { property: "og:site_name", content: "Marginal AI" },
      {
        property: "og:title",
        content: "100% Free Access — Marginal AI Economics for Cambridge 9708",
      },
      {
        property: "og:description",
        content:
          "Marginal AI is 100% Free for Cambridge International 9708 Economics students and educators.",
      },
      { property: "og:url", content: "https://marginal-econ.com/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://marginal-econ.com/pricing" }],
  }),
  component: PricingPage,
});

function PricingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(Boolean(data.session));
    });
  }, []);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* ── Modern Production Navigation Header ── */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 md:px-8">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="group flex items-center gap-2.5">
              <img
                src="/marginal-m-icon-clean.png"
                alt="Marginal AI Cambridge Economics 9708 Prep Pricing"
                className="size-8 object-contain transition-transform duration-300 group-hover:-rotate-6"
              />
              <span className="text-base font-bold tracking-tight text-foreground">Marginal</span>
            </Link>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex border-border/80 text-[10.5px] font-semibold text-muted-foreground bg-muted/40"
            >
              Cambridge 9708 Economics
            </Badge>
          </div>

          {/* Center Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <a href="/#tools" className="hover:text-foreground transition-colors">
              Features
            </a>
            <Link
              to="/teacher-auth"
              search={{ tab: "signin" }}
              className="flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:text-purple-500 transition-colors"
            >
              <GraduationCap className="size-3.5" />
              Teacher Portal
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle className="size-8" />
            {isAuthenticated ? (
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-8 px-3.5 shadow-xs">
                <Link to="/dashboard">
                  Go to Dashboard <ArrowRight className="ml-1.5 size-3.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="text-xs h-8 px-3 font-semibold text-muted-foreground hover:text-foreground">
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-8 px-3.5 shadow-xs">
                  <Link to="/auth">
                    Get Started Free <ArrowRight className="ml-1.5 size-3.5" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="py-12 space-y-16">
        {/* ── Hero Free Community Section ── */}
        <section className="mx-auto max-w-5xl px-4 text-center space-y-6">
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3.5 py-1 text-xs font-semibold">
            <Sparkles className="size-3.5 mr-1.5" /> 100% Free Community Edition
          </Badge>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Complete Cambridge 9708 Access. <br className="hidden sm:inline" />
            <span className="text-primary">Zero Paywalls. 100% Free.</span>
          </h1>

          <p className="mx-auto max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            We believe every Cambridge Economics student and educator should have unrestricted access to gold-standard marking, syllabus grounding, and past exam analytics. All core features are open immediately upon sign up.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 font-semibold shadow-md">
              <Link to={isAuthenticated ? "/grade" : "/auth"}>
                {isAuthenticated ? "Open Essay Grader" : "Sign Up Free & Start Marking"} <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-6 font-semibold">
              <Link to={isAuthenticated ? "/mcq-live" : "/auth"}>
                Practice MCQ Papers
              </Link>
            </Button>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" /> Unlimited essay evaluations
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" /> Immediate instant access
            </span>
          </div>
        </section>

        {/* ── Feature Cards ── */}
        <section className="mx-auto max-w-6xl px-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-6 space-y-3">
              <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                <Sparkles className="size-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">Cambridge Essay Grader</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Full AO1 Knowledge, AO2 Analysis, and AO3 Evaluation scoring strictly grounded in official Cambridge mark schemes and examiner reports.
              </p>
              <Badge variant="secondary" className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Unlimited Free
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-6 space-y-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <BookOpen className="size-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">Past Paper MCQ Library</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Complete past paper catalog from 2017 to latest series with crisp PDF canvas, interactive answer panels, and micro vs macro performance analytics.
              </p>
              <Badge variant="secondary" className="text-[11px] font-semibold text-primary">
                Full Library Free
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-6 space-y-3">
              <div className="size-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                <Users className="size-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">Classroom &amp; Cohorts</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Teachers can create classes, assign real past-paper essay questions, review automated AI grading, and export full gradebooks.
              </p>
              <Badge variant="secondary" className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                Free for Teachers &amp; Schools
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-6 space-y-3">
              <div className="size-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">Syllabus Grounding &amp; RAG</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ingested official Cambridge 9708 definitions, command words, topic breakdowns, and model exemplars for rigorous revision.
              </p>
              <Badge variant="secondary" className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                100% Free
              </Badge>
            </CardContent>
          </Card>
        </section>

        <AiComparisonSection />
      </main>

      <SiteFooter />
    </div>
  );
}
