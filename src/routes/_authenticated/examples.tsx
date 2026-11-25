import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Copy,
  Globe2,
  Lightbulb,
  Scale,
  Search,
  Sliders,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ECONOMICS_EXAMPLES,
  EXAMPLE_SECTIONS,
  INTEGRATION_STEPS,
  matchExamplesToQuestion,
  type EconomicsExample,
  type ExampleSection,
} from "@/lib/economics-examples";
import { DIAGRAM_PRESET_META } from "@/lib/diagram-lab/math";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/examples")({
  validateSearch: (search: Record<string, unknown>): { q?: string; id?: string } => ({
    q: typeof search.q === "string" ? search.q : undefined,
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Real-World Examples & Essay Integration Bank — Cambridge 9708" },
      {
        name: "description",
        content:
          "High-value Cambridge 9708 real-world economics examples across micro, macro, and international trade — with AO2 integration chains, A* model sentences, and AO3 evaluation pivots.",
      },
    ],
  }),
  component: ExamplesBankPage,
});

const SAMPLE_PROMPTS = [
  "Evaluate whether indirect taxes are the best way to reduce demerit goods",
  "Assess whether a minimum wage inevitably increases unemployment",
  "Evaluate the impact of tariffs on consumers, producers and the economy",
  "Discuss whether monopolies are always harmful to consumers",
  "Evaluate the effectiveness of monetary policy in controlling inflation",
  "Assess whether currency depreciation always improves the current account",
];

function ExamplesBankPage() {
  const routeSearch = Route.useSearch();
  const [tab, setTab] = useState<"bank" | "guide">("bank");
  const [section, setSection] = useState<ExampleSection | "All">("All");
  const [query, setQuery] = useState(() => routeSearch.q ?? "");
  const [selectedId, setSelectedId] = useState<string>(
    () => routeSearch.id ?? ECONOMICS_EXAMPLES[0]!.id,
  );

  const matches = useMemo(
    () => matchExamplesToQuestion(query, section),
    [query, section],
  );

  const selected: EconomicsExample | null = useMemo(() => {
    const found = matches.find((m) => m.example.id === selectedId);
    return found?.example ?? matches[0]?.example ?? null;
  }, [matches, selectedId]);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard!`);
  };

  return (
    <>
      <PageHeader
        title="Real-World Examples & Essay Integration"
        description={`${ECONOMICS_EXAMPLES.length} examiner-grade Cambridge 9708 case studies with AO2 integration chains, weak vs A* examples, AO3 evaluation pivots, and matching CAD diagrams.`}
        action={
          <Link to="/diagram-lab" search={{}}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Sliders className="size-3.5" /> Diagram CAD Lab
            </Button>
          </Link>
        }
      />

      <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
        {/* Top Mode & Smart Question Matcher */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "bank" | "guide")}>
              <TabsList className="grid grid-cols-2 w-80">
                <TabsTrigger value="bank" className="text-xs gap-1.5">
                  <Globe2 className="size-3.5" /> Examples Bank ({ECONOMICS_EXAMPLES.length})
                </TabsTrigger>
                <TabsTrigger value="guide" className="text-xs gap-1.5">
                  <BookOpen className="size-3.5 text-primary" /> How to Integrate (4-Step)
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
              {(["All", ...EXAMPLE_SECTIONS] as const).map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => {
                    setSection(sec);
                    setTab("bank");
                  }}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors",
                    section === sec && "bg-background text-foreground shadow-2xs font-semibold",
                  )}
                >
                  {sec === "International & Development" ? "Trade & Dev" : sec}
                </button>
              ))}
            </div>
          </div>

          {tab === "bank" && (
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Paste any Cambridge 9708 essay question or topic (e.g. 'Evaluate whether tariffs protect domestic industries')..."
                  className="pl-9 text-xs sm:text-sm h-10"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground mr-1">
                  Try an essay prompt:
                </span>
                {SAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setQuery(prompt);
                      setSection("All");
                    }}
                    className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {prompt.length > 52 ? `${prompt.slice(0, 52)}…` : prompt}
                  </button>
                ))}
                {query.trim() && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="text-[11px] font-semibold text-primary hover:underline ml-1"
                  >
                    Clear search
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: EXAMPLES BANK                                               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {tab === "bank" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT LIST */}
            <aside className="lg:col-span-4 space-y-2 lg:sticky lg:top-16 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto pr-1">
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {query.trim()
                    ? `Best Matches (${matches.length})`
                    : `${section} Examples (${matches.length})`}
                </span>
              </div>
              {matches.length === 0 ? (
                <Card className="p-5 text-center text-xs text-muted-foreground">
                  No examples matched that query. Try broader economics terms like{" "}
                  <span className="font-semibold text-foreground">inflation</span>,{" "}
                  <span className="font-semibold text-foreground">monopoly</span>,{" "}
                  <span className="font-semibold text-foreground">tariff</span>, or{" "}
                  <span className="font-semibold text-foreground">externality</span>.
                </Card>
              ) : (
                matches.map(({ example, score }) => {
                  const isActive = selected?.id === example.id;
                  return (
                    <button
                      key={example.id}
                      type="button"
                      onClick={() => setSelectedId(example.id)}
                      className={cn(
                        "w-full text-left rounded-xl border p-3.5 transition-all space-y-1.5",
                        isActive
                          ? "border-primary bg-primary/[0.05] shadow-xs"
                          : "border-border bg-card hover:bg-accent/50",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {example.region}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {query.trim() && score >= 8 && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] px-1.5 py-0">
                              Top Match
                            </Badge>
                          )}
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {example.level}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-foreground leading-snug">
                        {example.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {example.topic}
                      </p>
                    </button>
                  );
                })
              )}
            </aside>

            {/* RIGHT DETAIL WORKSPACE */}
            <div className="lg:col-span-8 min-w-0">
              {selected ? (
                <article className="space-y-5">
                  {/* Header & Hard Data */}
                  <Card className="border-border shadow-xs">
                    <CardHeader className="space-y-2 pb-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary">{selected.section}</Badge>
                        <Badge variant="outline">{selected.topic}</Badge>
                        <Badge variant="outline">{selected.level}</Badge>
                        <Badge variant="outline" className="font-mono">
                          {selected.yearOrPeriod}
                        </Badge>
                        {selected.markBands.map((band) => (
                          <Badge
                            key={band}
                            className="bg-primary/10 text-primary border-primary/20 text-[10px]"
                          >
                            {band}
                          </Badge>
                        ))}
                      </div>
                      <CardTitle className="text-lg md:text-xl font-bold">
                        {selected.title}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm leading-relaxed">
                        {selected.summary}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="rounded-lg border border-primary/25 bg-primary/[0.04] p-3.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                          Key Empirical Evidence to Cite ({selected.region})
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed">
                          {selected.keyData}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() =>
                            copyText(selected.aStarIntegration, "A* integrated paragraph")
                          }
                          className="text-xs gap-1.5"
                        >
                          <Copy className="size-3.5" /> Copy A* Integrated Paragraph
                        </Button>
                        {selected.cadPreset && (
                          <Link
                            to="/diagram-lab"
                            search={{ preset: selected.cadPreset }}
                          >
                            <Button variant="outline" size="sm" className="text-xs gap-1.5">
                              <Sliders className="size-3.5" />
                              Open Paired Diagram ({DIAGRAM_PRESET_META[selected.cadPreset].shortTitle})
                              <ArrowRight className="size-3" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Essay Questions This Unlocks */}
                  <Card className="border-border shadow-xs">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <BookOpen className="size-4 text-primary" />
                        Cambridge 9708 Essay Questions This Unlocks
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selected.essayQuestions.map((q, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-muted/20 p-2.5 text-xs text-foreground"
                        >
                          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                            Q
                          </span>
                          <span>{q}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Step-by-Step AO2 Integration Chain */}
                  <Card className="border-border shadow-xs">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Sparkles className="size-4 text-primary" />
                        How to Integrate into Your Essay (AO2 Causal Chain)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="space-y-2.5">
                        {selected.integrationChain.map((step, idx) => (
                          <li key={idx} className="flex gap-3 text-xs sm:text-sm">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                              {idx + 1}
                            </span>
                            <span className="text-muted-foreground leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>

                  {/* Weak vs A* Side-by-Side Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-rose-500/30 bg-rose-500/[0.03] shadow-xs">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                          <XCircle className="size-4" /> Weak Name-Drop (Low AO2)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs sm:text-sm italic text-muted-foreground leading-relaxed">
                          &ldquo;{selected.weakMention}&rdquo;
                        </p>
                        <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-2">
                          Why it scores poorly: No economic mechanism, no diagram link, and no
                          quantitative or policy specificity.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-emerald-500/35 bg-emerald-500/[0.04] shadow-xs">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="size-4" /> A* Examiner Integration (Full AO2)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                          &ldquo;{selected.aStarIntegration}&rdquo;
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* AO3 Evaluation Pivot */}
                  <Card className="border-amber-500/30 bg-amber-500/[0.04] shadow-xs">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                        <Scale className="size-4" />
                        AO3 Evaluation Pivot (&ldquo;However, This Depends On...&rdquo;)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                        {selected.ao3Evaluation}
                      </p>
                    </CardContent>
                  </Card>
                </article>
              ) : null}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: 4-STEP INTEGRATION BLUEPRINT                                */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {tab === "guide" && (
          <div className="space-y-5">
            <Card className="border-primary/25 bg-primary/[0.03]">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Lightbulb className="size-5 text-primary" />
                  The Cambridge 9708 4-Step Example Integration Formula
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Cambridge examiners explicitly penalise unattached &ldquo;name-dropping&rdquo; and
                  reward examples woven directly into AO2 causal chains and AO3 evaluative
                  judgements. Follow these 4 steps in every 12-mark and 20-mark essay.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {INTEGRATION_STEPS.map((item) => (
                  <div
                    key={item.step}
                    className="rounded-xl border border-border bg-card p-4 space-y-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {item.step}
                      </span>
                      <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed">{item.rule}</p>
                    <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-2.5 text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-2">
                      <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                      <span>{item.avoid}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  How Many Examples Do You Need per Question?
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-1">
                  <Badge variant="outline">8-Mark Essays (Paper 2)</Badge>
                  <p className="font-semibold text-foreground mt-1">1 Brief Anchored Example</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Prioritise tight AO1 definitions, a clean diagram, and 1 concise real-world
                    market (e.g. OPEC+ oil for inelastic PED) embedded inside your analysis.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-1">
                  <Badge variant="outline">12-Mark Essays (Paper 2)</Badge>
                  <p className="font-semibold text-foreground mt-1">2 Contrasting Examples</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Use 1 case supporting the policy/theory (e.g. UK SDIL sugar tax) and 1 counter-case
                    or limitation for AO3 evaluation (e.g. regressivity / substitution).
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-1">
                  <Badge variant="outline">20-Mark Essays (Paper 4)</Badge>
                  <p className="font-semibold text-foreground mt-1">2–3 Synoptic Cases</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Contrast across economies or time horizons (e.g. Denmark vs South Africa Gini,
                    or 1970s stagflation vs 2023–24 disinflation) to justify a decisive conclusion.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
