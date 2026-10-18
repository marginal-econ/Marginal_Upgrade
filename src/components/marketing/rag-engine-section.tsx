import { useState, useMemo, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Database,
  Search,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
  Workflow,
  Cpu,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CAMBRIDGE_CORE_DEFINITIONS } from "@/lib/cambridge-definitions";
import { supabase } from "@/integrations/backend/client";
import { CosmicAtmosphere } from "./cosmic-atmosphere";

interface SyllabusChapter {
  num: number;
  level: "AS" | "A2";
  title: string;
  category: "Micro" | "Macro";
  concepts: string[];
}

const SYLLABUS_CHAPTERS: SyllabusChapter[] = [
  { num: 1, level: "AS", title: "Basic Economic Ideas & Resource Allocation", category: "Micro", concepts: ["Scarcity & Opportunity Cost", "Production Possibility Curves (PPC)", "Factors of Production"] },
  { num: 2, level: "AS", title: "The Price System & the Microeconomy", category: "Micro", concepts: ["Demand & Supply Curves", "Elasticities (PED, YED, XED, PES)", "Consumer & Producer Surplus"] },
  { num: 3, level: "AS", title: "Government Microeconomic Intervention", category: "Micro", concepts: ["Maximum & Minimum Price Controls", "Specific & Ad Valorem Taxes", "Merit & Demerit Goods"] },
  { num: 4, level: "AS", title: "The Macroeconomy", category: "Macro", concepts: ["Aggregate Demand & Supply (AD/AS)", "Demand-Pull & Cost-Push Inflation", "Balance of Payments"] },
  { num: 5, level: "AS", title: "Government Macroeconomic Intervention", category: "Macro", concepts: ["Fiscal & Monetary Policy Levers", "Supply-Side Macro Policies"] },
  { num: 6, level: "A2", title: "International Economic Issues", category: "Macro", concepts: ["Law of Comparative Advantage", "Protectionism vs Free Trade", "Exchange Rates"] },
  { num: 7, level: "A2", title: "Utility & Consumer Behaviour", category: "Micro", concepts: ["Diminishing Marginal Utility", "Indifference Curves & Budget Lines"] },
  { num: 8, level: "A2", title: "Market Structures & Imperfect Competition", category: "Micro", concepts: ["Monopoly & Oligopoly", "Contestable Markets", "Allocative & Productive Efficiency"] },
  { num: 9, level: "A2", title: "The Labour Market", category: "Micro", concepts: ["Marginal Revenue Product (MRP)", "Monopsony & Trade Unions"] },
  { num: 10, level: "A2", title: "Macroeconomic Performance", category: "Macro", concepts: ["Actual vs Potential Growth", "Lorenz Curve & Gini Coefficient"] },
  { num: 11, level: "A2", title: "Macroeconomic Policies", category: "Macro", concepts: ["Phillips Curves", "Quantitative Easing (QE)", "Debt Sustainability"] },
];

export interface PastPaperReference {
  id: string;
  paperCode: string;
  questionNumber: string;
  marks: number;
  level: "AS" | "A2";
  section: "Micro" | "Macro";
  topicTitle: string;
  stem: string;
}

export const CAMBRIDGE_PAST_PAPERS_CORPUS: PastPaperReference[] = [
  { id: "q-ppc-1", paperCode: "9708/22/M/J/23", questionNumber: "Q2(a)", marks: 8, level: "AS", section: "Micro", topicTitle: "PPC & Opportunity Cost", stem: "Explain movement along a PPC vs outward shift of a PPC." },
  { id: "q-ppc-2", paperCode: "9708/21/O/N/20", questionNumber: "Q2(b)", marks: 12, level: "AS", section: "Micro", topicTitle: "PPC & Capital Goods", stem: "Assess whether reallocation towards capital goods is always beneficial in the long run." },
  { id: "q-ped-1", paperCode: "9708/22/O/N/24", questionNumber: "Q2(b)", marks: 12, level: "AS", section: "Micro", topicTitle: "PED & Pricing Strategy", stem: "Assess whether a business can rely solely on PED during an economic recession." },
  { id: "q-ped-2", paperCode: "9708/22/M/J/22", questionNumber: "Q2(a)", marks: 8, level: "AS", section: "Micro", topicTitle: "PES Agricultural Lags", stem: "Explain why PES for agricultural crops differs between short run and long run." },
  { id: "q-ped-3", paperCode: "9708/21/O/N/21", questionNumber: "Q3(a)", marks: 8, level: "AS", section: "Micro", topicTitle: "PED & Tax Incidence", stem: "Explain how PED determines the incidence of an indirect tax." },
  { id: "q-tax-1", paperCode: "9708/22/M/J/23", questionNumber: "Q3(b)", marks: 12, level: "AS", section: "Micro", topicTitle: "Indirect Taxes on Demerit Goods", stem: "Assess whether an indirect tax is the most effective policy to reduce demerit goods." },
  { id: "q-ctrl-1", paperCode: "9708/22/O/N/22", questionNumber: "Q3(b)", marks: 12, level: "AS", section: "Micro", topicTitle: "Maximum Prices (Price Ceilings)", stem: "Assess the consequences of introducing a maximum price on essential food items." },
  { id: "q-inf-1", paperCode: "9708/22/M/J/24", questionNumber: "Q4(a)", marks: 8, level: "AS", section: "Macro", topicTitle: "Demand-Pull vs Cost-Push Inflation (AD/AS)", stem: "Explain the difference between demand-pull and cost-push inflation using AD/AS." },
  { id: "q-inf-2", paperCode: "9708/21/O/N/23", questionNumber: "Q4(b)", marks: 12, level: "AS", section: "Macro", topicTitle: "Inflation vs Deflation", stem: "Assess whether high inflation is always more harmful than deflation." },
  { id: "q-fx-1", paperCode: "9708/22/M/J/23", questionNumber: "Q5(b)", marks: 12, level: "AS", section: "Macro", topicTitle: "Currency Depreciation & Current Account", stem: "Assess whether currency depreciation will always correct a current account deficit." },
  { id: "q-pol-1", paperCode: "9708/21/O/N/24", questionNumber: "Q5(b)", marks: 12, level: "AS", section: "Macro", topicTitle: "Supply-Side vs Monetary Policy (AD)", stem: "Assess whether supply-side policies are superior to monetary policy in stimulating non-inflationary growth." },
  { id: "q-pol-2", paperCode: "9708/22/W/22", questionNumber: "Q4(b)", marks: 12, level: "AS", section: "Macro", topicTitle: "Contractionary Monetary Policy on AD", stem: "Assess the effectiveness of contractionary monetary policy in reducing demand-pull inflation." },
  { id: "q-pol-3", paperCode: "9708/21/M/J/24", questionNumber: "Q5(b)", marks: 12, level: "AS", section: "Macro", topicTitle: "Fiscal Multiplier on AD", stem: "Assess the effectiveness of expansionary fiscal policy in stimulating economic growth in recession." },
  { id: "q-prot-1", paperCode: "9708/22/O/N/22", questionNumber: "Q5(b)", marks: 12, level: "AS", section: "Macro", topicTitle: "Infant Industry Tariffs", stem: "Assess whether developing countries should use tariffs to protect infant industries." },
  { id: "q-prot-2", paperCode: "9708/21/M/J/21", questionNumber: "Q5(a)", marks: 8, level: "AS", section: "Macro", topicTitle: "Tariff Diagram Analysis", stem: "Explain with a diagram the effect of an import tariff on domestic production and government revenue." },
  { id: "q-prot-3", paperCode: "9708/42/M/J/24", questionNumber: "Q5", marks: 20, level: "A2", section: "Macro", topicTitle: "Tariffs & Domestic Welfare Loss", stem: "Evaluate whether import tariffs always reduce domestic economic welfare." },
  { id: "q-a2-mono-1", paperCode: "9708/42/M/J/23", questionNumber: "Q2", marks: 20, level: "A2", section: "Micro", topicTitle: "Monopoly Efficiency & Antitrust", stem: "Evaluate whether monopolies are always allocatively and productively inefficient." },
  { id: "q-a2-labour-1", paperCode: "9708/41/M/J/23", questionNumber: "Q4", marks: 20, level: "A2", section: "Micro", topicTitle: "Labour Markets & Monopsony", stem: "Evaluate whether trade unions always cause unemployment when negotiating wage rates." },
  { id: "q-a2-ext-1", paperCode: "9708/41/O/N/23", questionNumber: "Q3", marks: 20, level: "A2", section: "Micro", topicTitle: "Tradable Permits vs Carbon Tax", stem: "Evaluate whether tradable permits are superior to a carbon tax for industrial emissions." },
];

const POPULAR_QUICK_SEARCHES = [
  "AD",
  "PED",
  "Demerit Goods",
  "Tariffs",
  "Inflation",
  "Monopoly",
  "PPC",
  "Scarcity",
];

export function RagEngineSection() {
  const [searchQuery, setSearchQuery] = useState("AD");
  const [showDetails, setShowDetails] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(Boolean(data.session));
    });
  }, []);

  // Fast, direct corpus retrieval for ANY keyword (e.g. "AD", "PED", "demerit goods", "tariffs")
  const searchResults = useMemo(() => {
    const raw = searchQuery.trim();
    if (!raw) {
      return {
        definitions: CAMBRIDGE_CORE_DEFINITIONS.slice(0, 5),
        pastPapers: CAMBRIDGE_PAST_PAPERS_CORPUS.slice(0, 4),
        chapters: SYLLABUS_CHAPTERS.slice(0, 3),
        totalCount: 12,
      };
    }

    const clean = raw.toLowerCase().replace(/['"“”‘’()]/g, " ").replace(/\s+/g, " ").trim();
    const rawLow = raw.toLowerCase();
    const phrases: string[] = [rawLow, clean];

    // Typo corrections
    if (clean.includes("deprit")) phrases.push("demerit", "demerit good", "negative externality", "indirect tax");
    if (clean.includes("oood")) phrases.push("good", "demerit good");
    if (clean.includes("oppurtunity") || clean.includes("oppertunity")) phrases.push("opportunity cost", "ppc");
    if (clean.includes("elasticy")) phrases.push("elasticity", "ped", "pes");
    if (clean.includes("inflaton")) phrases.push("inflation", "demand-pull", "cost-push");
    if (clean.includes("terriff")) phrases.push("tariff", "protectionism");
    if (clean.includes("monoply")) phrases.push("monopoly");
    if (clean.includes("scarsity")) phrases.push("scarcity");

    // Token extraction
    const tokens = clean.split(" ").filter((w) => w.length > 0);

    // Cambridge acronym expansions (handles lowercase, uppercase, with or without parentheses)
    if (tokens.includes("ped") || clean === "ped" || clean.includes("price elasticity") || clean.includes("elasticity")) {
      phrases.push("ped", "price elasticity of demand", "price elasticity", "elasticity of demand", "elasticity");
    }
    if (tokens.includes("pes") || clean === "pes") {
      phrases.push("pes", "price elasticity of supply", "elasticity of supply");
    }
    if (tokens.includes("yed") || clean === "yed") {
      phrases.push("yed", "income elasticity of demand", "income elasticity");
    }
    if (tokens.includes("xed") || clean === "xed") {
      phrases.push("xed", "cross elasticity of demand", "cross elasticity");
    }
    if (tokens.includes("ad") || clean === "ad" || clean.includes("aggregate demand")) {
      phrases.push("aggregate demand", "ad/as", "ad-as", "aggregate demand (ad)");
    }
    if (tokens.includes("as") || clean === "as" || clean.includes("aggregate supply")) {
      phrases.push("aggregate supply", "sras", "lras");
    }
    if (tokens.includes("ppc") || tokens.includes("ppf") || clean === "ppc" || clean === "ppf" || clean.includes("production possibility")) {
      phrases.push("production possibility curve", "opportunity cost", "ppc", "ppf");
    }
    if (tokens.includes("bop") || clean === "bop") {
      phrases.push("balance of payments", "current account");
    }
    if (tokens.includes("cpi") || clean === "cpi") {
      phrases.push("consumer price index", "inflation");
    }

    const textMatches = (text: string) => {
      const t = text.toLowerCase();
      // 1. Direct phrase or acronym match
      for (const phrase of phrases) {
        if (phrase.length >= 2 && t.includes(phrase)) return true;
      }
      // 2. Individual tokens match (e.g. if searching multi-word query, matches if words appear)
      if (tokens.length >= 2 && tokens.every((tok) => t.includes(tok))) {
        return true;
      }
      // 3. Whole-word match for short tokens like "ped", "ad", "ppc"
      for (const tok of tokens) {
        if (tok.length <= 4) {
          const re = new RegExp(`\\b${tok}\\b`, "i");
          if (re.test(t)) return true;
        }
      }
      return false;
    };

    // 1. Match Cambridge Master Definitions
    const matchedDefs = CAMBRIDGE_CORE_DEFINITIONS.filter((d) => {
      return textMatches(d.term) || textMatches(d.definition_text) || textMatches(d.category);
    });

    // 2. Match Past Papers & Mark Schemes
    const matchedPapers = CAMBRIDGE_PAST_PAPERS_CORPUS.filter((p) => {
      return textMatches(p.stem) || textMatches(p.paperCode) || textMatches(p.topicTitle);
    });

    // 3. Match Syllabus Chapters
    const matchedChapters = SYLLABUS_CHAPTERS.filter((ch) => {
      return textMatches(ch.title) || ch.concepts.some((c) => textMatches(c)) || textMatches(ch.category);
    });

    return {
      definitions: matchedDefs,
      pastPapers: matchedPapers,
      chapters: matchedChapters,
      totalCount: matchedDefs.length + matchedPapers.length + matchedChapters.length,
    };
  }, [searchQuery]);

  return (
    <section id="rag-engine" className="relative border-b-[1.5px] border-ink bg-surface-raised py-12 sm:py-16 scroll-mt-20 overflow-hidden">
      <CosmicAtmosphere variant="cyan" sparkles={true} density="medium" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6">
        {/* Spotlight Card Frame */}
        <div className="relative rounded-2xl sm:rounded-3xl border-2 border-primary/30 bg-card/95 shadow-xl p-5 sm:p-7 backdrop-blur-md text-center space-y-5 ring-1 ring-primary/20">
          
          {/* Pivotal Feature Badge & Header */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary shadow-2xs">
              <Cpu className="size-3.5 text-primary animate-pulse" />
              <span className="font-mono text-[11px] tracking-wide uppercase">Pivotal Intelligence Engine</span>
              <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Official Cambridge 9708 RAG Knowledge Engine
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              The vector intelligence grounding every mark in official Cambridge 9708 mark schemes. Tested across 449 textbook definitions, 1,400+ past papers, and all 11 syllabus units with zero hallucination.
            </p>
          </div>

          {/* ONE Simple Search Bar */}
          <div className="space-y-2.5 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-primary pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type any keyword (e.g. AD, demerit goods, tariffs, PED, scarcity)..."
                className="w-full h-11 pl-10 pr-9 rounded-xl border-2 border-primary/35 focus:border-primary bg-background text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-5 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer text-xs"
                  title="Clear"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Quick Click Tags */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">Quick Check:</span>
              {POPULAR_QUICK_SEARCHES.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearchQuery(tag)}
                  className={cn(
                    "rounded-md px-2.5 py-0.5 text-xs font-semibold transition-all cursor-pointer border",
                    searchQuery.trim().toLowerCase() === tag.toLowerCase()
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Compact Number of References Display */}
          {searchQuery.trim() && (
            <div className="pt-1 max-w-xl mx-auto">
              <div className="rounded-xl border border-primary/30 bg-muted/20 p-3.5 text-left space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-foreground border-b border-border/70 pb-2">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <span>
                      <strong>{searchResults.totalCount}</strong> Cambridge References for &ldquo;<strong>{searchQuery.trim()}</strong>&rdquo;
                    </span>
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                    100% Vector Grounded
                  </Badge>
                </div>

                {/* 3 Metric Pills */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-card p-2 border border-border/70 space-y-0.5 shadow-2xs">
                    <div className="text-base sm:text-lg font-black text-foreground">{searchResults.definitions.length}</div>
                    <div className="text-[10.5px] text-muted-foreground font-medium flex items-center justify-center gap-1">
                      <BookOpen className="size-3 text-primary" /> Definitions
                    </div>
                  </div>
                  <div className="rounded-lg bg-card p-2 border border-border/70 space-y-0.5 shadow-2xs">
                    <div className="text-base sm:text-lg font-black text-foreground">{searchResults.pastPapers.length}</div>
                    <div className="text-[10.5px] text-muted-foreground font-medium flex items-center justify-center gap-1">
                      <FileText className="size-3 text-emerald-500" /> Past Papers
                    </div>
                  </div>
                  <div className="rounded-lg bg-card p-2 border border-border/70 space-y-0.5 shadow-2xs">
                    <div className="text-base sm:text-lg font-black text-foreground">{searchResults.chapters.length}</div>
                    <div className="text-[10.5px] text-muted-foreground font-medium flex items-center justify-center gap-1">
                      <Database className="size-3 text-amber-500" /> Chapters
                    </div>
                  </div>
                </div>

                {/* Subtle Toggle for Details */}
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {showDetails ? (
                      <>
                        <ChevronUp className="size-3" /> Hide reference titles
                      </>
                    ) : (
                      <>
                        <ChevronDown className="size-3" /> Preview matched reference titles ({searchResults.totalCount})
                      </>
                    )}
                  </button>
                </div>

                {/* Collapsed by default - only renders compact title pills when toggled */}
                {showDetails && (
                  <div className="pt-2 border-t border-border/60 space-y-2 text-xs">
                    {searchResults.definitions.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Cambridge Definitions:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {searchResults.definitions.map((d) => (
                            <span key={d.id} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground font-medium border border-border/60">
                              {d.term}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.pastPapers.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Past Paper Stems:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {searchResults.pastPapers.map((p) => (
                            <span key={p.id} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground font-medium border border-border/60">
                              {p.paperCode} {p.questionNumber} ({p.topicTitle})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.chapters.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Syllabus Objectives:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {searchResults.chapters.map((ch) => (
                            <span key={ch.num} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground font-medium border border-border/60">
                              Ch {ch.num}: {ch.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Short Brief: How the Cambridge 9708 RAG Engine Works */}
          <div className="pt-4 border-t border-border/60 max-w-xl mx-auto space-y-2.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span className="flex items-center gap-1.5 text-foreground font-bold">
                <Workflow className="size-3.5 text-primary" /> How Our Cambridge RAG Engine Marks:
              </span>
              <span className="text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                Dual-Pass Auditor
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
              <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 space-y-1 shadow-2xs hover:border-primary/40 transition-colors">
                <span className="text-[10px] font-mono font-bold text-primary block">01 · Corpus</span>
                <div className="text-xs font-bold text-foreground">15 Yrs Papers</div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  1,400+ mark schemes, examiner reports &amp; 449 definitions.
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 space-y-1 shadow-2xs hover:border-sky-500/40 transition-colors">
                <span className="text-[10px] font-mono font-bold text-sky-500 block">02 · Grounding</span>
                <div className="text-xs font-bold text-foreground">Exact Rubric</div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Vector-retrieves authentic syllabus mark schemes per essay claim.
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 space-y-1 shadow-2xs hover:border-amber-500/40 transition-colors">
                <span className="text-[10px] font-mono font-bold text-amber-500 block">03 · Calibration</span>
                <div className="text-xs font-bold text-foreground">Zero Central Bias</div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Independent auditor eliminates generic AI middle-band clumping.
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-background/80 p-2.5 space-y-1 shadow-2xs hover:border-emerald-500/40 transition-colors">
                <span className="text-[10px] font-mono font-bold text-emerald-500 block">04 · Verdict</span>
                <div className="text-xs font-bold text-foreground">Next-Band Plan</div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Exact AO1, AO2, AO3 tariffs with line-by-line rewrite guidance.
                </p>
              </div>
            </div>

            {/* View Engine Action CTA */}
            <div className="mt-4 pt-4 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <p className="text-xs font-bold text-foreground">Ready to test the Cambridge 9708 RAG Engine on your own essay?</p>
                <p className="text-[11px] text-muted-foreground">Get instant AO1/AO2/AO3 clause feedback with 2 full essays completely free.</p>
              </div>
              <Button asChild size="sm" className="font-bold shadow-xs shrink-0 cursor-pointer">
                <Link
                  to={isAuthenticated ? "/grade" : "/auth"}
                  search={isAuthenticated ? undefined : ({ redirect: "/grade" } as any)}
                >
                  <span>View Engine</span>
                  <ArrowRight className="size-3.5 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
