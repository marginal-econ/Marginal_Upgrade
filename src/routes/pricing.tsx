import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { PricingSection } from "@/components/marketing/pricing-section";
import { SiteFooter } from "@/components/marketing/footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing & Plans — Marginal Economics" },
      {
        name: "description",
        content:
          "Official Cambridge International 9708 Economics pricing for students and schools. 4 B2C student tiers starting from ₹150/mo, plus institutional school packages.",
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

          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link to="/">
              <ArrowLeft className="mr-1.5 size-3.5" /> Back to Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="py-8">
        <PricingSection />
      </main>

      <SiteFooter />
    </div>
  );
}
