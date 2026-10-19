import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";

import { PricingSection } from "@/components/marketing/pricing-section";
import { AiComparisonSection } from "@/components/marketing/ai-comparison-section";
import { SiteFooter } from "@/components/marketing/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/backend/client";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing & Plans — Marginal Economics" },
      {
        name: "description",
        content:
          "Official Cambridge International 9708 Economics pricing for students and schools. 4 B2C student tiers starting from ₹99/mo, plus institutional school packages.",
      },
      {
        property: "og:title",
        content: "Marginal Economics — Pricing Plans for Students & Schools",
      },
    ],
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
                alt="Marginal"
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
            <a href="/#rag-engine" className="hover:text-foreground transition-colors">
              Syllabus &amp; RAG
            </a>
            <Link
              to="/teacher-auth"
              className="flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:text-purple-500 transition-colors"
            >
              <GraduationCap className="size-3.5" />
              Teacher Portal
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
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

      <main className="py-8 space-y-12">
        <PricingSection />
        <AiComparisonSection />
      </main>

      <SiteFooter />
    </div>
  );
}
