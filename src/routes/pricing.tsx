import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles, Zap } from "lucide-react";

import { PricingSection } from "@/components/marketing/pricing-section";
import { SiteFooter } from "@/components/marketing/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing & Plans — Marginal Economics" },
      {
        name: "description",
        content:
          "Official Cambridge International 9708 Economics pricing for students and schools. 4 B2C student tiers starting from ₹99/mo (billed annually) or ₹149/mo, plus institutional school packages.",
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
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5">
            <img
              src="/marginal-m-icon-clean.png"
              alt="Marginal"
              className="size-8 object-contain transition-transform duration-300 group-hover:-rotate-6"
            />
            <span className="text-base font-bold tracking-tight">Marginal</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="text-xs px-2.5 sm:px-3">
              <Link to="/dashboard">
                <span className="hidden sm:inline">Go to </span>Dashboard <ArrowRight className="ml-1 sm:ml-1.5 size-3.5" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-xs px-2 sm:px-3">
              <Link to="/">
                <ArrowLeft className="mr-1 sm:mr-1.5 size-3.5" /> Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Free Tier Onboarding Banner */}
      <section className="border-b border-border bg-primary/[0.03] py-3.5 sm:py-4 px-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground font-semibold">Get Started Free:</strong> Every student gets{" "}
              <strong className="text-foreground font-semibold">2 Free Graded Essays</strong> and{" "}
              <strong className="text-foreground font-semibold">30 Days of MCQ Past Papers</strong> with zero upfront payment.
            </p>
          </div>

          <Button asChild size="sm" variant="secondary" className="text-xs font-semibold shrink-0 h-auto sm:h-8 py-2 sm:py-0 w-full sm:w-auto">
            <Link to="/dashboard">
              Continue with Free Tier (2 Free Essays) <ArrowRight className="ml-1 size-3" />
            </Link>
          </Button>
        </div>
      </section>

      <main className="py-8">
        <PricingSection />
      </main>

      <SiteFooter />
    </div>
  );
}
