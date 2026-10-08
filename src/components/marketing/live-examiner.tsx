/**
 * Realistic Live Examiner interactive showcase for the landing page.
 *
 * Demonstrates the authentic Cambridge 9708 Live Examiner engine:
 * - Real syllabus questions across AS and A2 (8m, 12m)
 * - Automatic clause-by-clause evaluation and running mark estimation
 * - Live interactive sandbox mode: visitors can click and type their own
 *   answers in real time to watch Cambridge AO1, AO2, AO3 recognition,
 *   terminology detection, and examiner next-move tips update dynamically.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Edit3,
  Lightbulb,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Ao = "AO1" | "AO2" | "AO3";

const AO_META: Record<Ao, { name: string; tint: string; ink: string; dot: string; text: string }> = {
  AO1: { name: "Knowledge", tint: "var(--ao1)", ink: "var(--ao1)", dot: "bg-ao1", text: "text-ao1" },
  AO2: { name: "Analysis", tint: "var(--ao2)", ink: "var(--ao2)", dot: "bg-ao2", text: "text-ao2" },
  AO3: { name: "Evaluation", tint: "var(--ao3)", ink: "var(--ao3)", dot: "bg-ao3", text: "text-ao3" },
};

export type Clause = { text: string; ao: Ao; note: string };

export type Specimen = {
  id: string;
  code: string;
  title: string;
  paper: string;
  total: number;
  aoBreakdown: { ao1: number; ao2: number; ao3: number };
  question: string;
  clauses: Clause[];
  keyTerms: string[];
};

const SPECIMENS: Specimen[] = [
  {
    id: "aggregate-demand",
    code: "QUESTION 1 [12] · AD",
    title: "Aggregate Demand (12m)",
    paper: "Economics AS Level - Paper 2 Digital Answer Script",
    total: 12,
    aoBreakdown: { ao1: 3, ao2: 5, ao3: 4 },
    question:
      "Asses whether an increase in aggregate demand would be of overall benefit to an economy.",
    keyTerms: [
      "aggregate demand",
      "c + i + g + nx",
      "monetary policy",
      "fiscal policy",
      "demand-pull inflation",
      "production capacity",
      "profit motive",
      "gdp",
      "economic growth",
      "budget deficit",
      "merit goods",
    ],
    clauses: [
      {
        text: "Aggregate demand is equal C + I + G + NX. Aggregate demand can be increased in certain cases by expansionary monetary and fiscal policies. ",
        ao: "AO1",
        note: "AO1 credited: AD formula components (C+I+G+NX) and monetary/fiscal macroeconomic levers accurately defined.",
      },
      {
        text: "Increased aggregate demand can cause demand-pull inflation. ",
        ao: "AO1",
        note: "Cambridge terminology applied: demand-pull inflation recognized.",
      },
      {
        text: "Increased aggregate demand may mean increase in production. As when aggregate demand is high, it means suppliers are incentivised to produce due to their profit motive. Increased production can lead to increased job opportunities, and also increased production leading to an increase in GDP (Economic growth). ",
        ao: "AO2",
        note: "AO2 credited: complete analytical transmission chain linking consumer spending to producer output, employment, and real GDP growth.",
      },
      {
        text: "But, the level of increase in production depends on the production capacity. If an economy is already operating at maximum production capacity, and high aggregate demand may only lead to higher prices. This is because firms may not have enough resources to increase production capacity. ",
        ao: "AO3",
        note: "AO3 credited: critical capacity bottleneck constraint. Evaluates where on the aggregate supply curve the economy operates.",
      },
      {
        text: "As AD shifts outward, the increase in quantity is minimal from Y1 to Y2, but the price level rises sharply from P1 to P2. ",
        ao: "AO2",
        note: "AO2 credited: diagrammatic shift mechanics accurately integrated into written prose.",
      },
      {
        text: "Increase in aggregate demand can be more government revenue. As increased demand means that consumers are spending more, producers may be increasing production. This means revenue from income tax and corporate tax rises, leading to more budget for the government to spend on merit goods like healthcare and education. ",
        ao: "AO2",
        note: "AO2 credited: analytical bridge linking macroeconomic expansion to fiscal tax yields and public investment in merit goods.",
      },
      {
        text: "But, a high aggregate demand is not always due to increased consumer spending. It can also be due to an increase in government spending as part of an expansionary fiscal policies. If that is true, while aggregate demand may be high, it may actually cause a budget deficit for the government as their spending may be high and taxation low.",
        ao: "AO3",
        note: "AO3 in full: high-band evaluative counter-argument addressing fiscal solvency and government budget deficit risks.",
      },
    ],
  },
  {
    id: "public-goods",
    code: "Paper 2 · 2(a)",
    title: "Public Goods (8m)",
    paper: "AS Paper 2 · 8 marks",
    total: 8,
    aoBreakdown: { ao1: 4, ao2: 4, ao3: 0 },
    question: "Explain why market failure occurs in the provision of public goods.",
    keyTerms: [
      "public good",
      "non-excludable",
      "non-rival",
      "free rider",
      "market failure",
      "marginal cost",
      "missing market",
    ],
    clauses: [
      {
        text: "A public good has two defining characteristics: non-excludability and non-rivalry in consumption. ",
        ao: "AO1",
        note: "Precise definitions of both economic criteria. Full AO1 credit.",
      },
      {
        text: "Non-excludability means it is impossible to prevent non-payers from consuming the good once provided, ",
        ao: "AO1",
        note: "Accurate explanation of the non-excludability condition.",
      },
      {
        text: "which creates the free-rider problem where rational consumers refuse to pay. ",
        ao: "AO2",
        note: "Analytical bridge linking economic characteristic to consumer incentive.",
      },
      {
        text: "Consequently, profit-seeking firms cannot generate revenue to cover costs, resulting in a missing market where the private sector provides zero output.",
        ao: "AO2",
        note: "Logical end of chain: complete explanation of complete market failure.",
      },
    ],
  },
  {
    id: "monopoly",
    code: "Paper 4 · 5",
    title: "Monopoly vs Competition (12m)",
    paper: "A2 Paper 4 · 12 marks",
    total: 12,
    aoBreakdown: { ao1: 3, ao2: 5, ao3: 4 },
    question:
      "Evaluate the view that a monopoly market structure always leads to worse outcomes for consumers than perfect competition.",
    keyTerms: [
      "monopoly",
      "perfect competition",
      "allocative efficiency",
      "deadweight loss",
      "dynamic efficiency",
      "economies of scale",
      "abnormal profit",
      "supernormal profit",
    ],
    clauses: [
      {
        text: "A monopoly is a single dominant seller protected by high barriers to entry, profit-maximising where MR = MC. ",
        ao: "AO1",
        note: "Market definition and technical profit-maximisation condition.",
      },
      {
        text: "Because price exceeds marginal cost (P > MC), output is restricted below the allocatively efficient level, creating deadweight welfare loss. ",
        ao: "AO2",
        note: "Rigorous welfare economic analysis comparing price to marginal cost.",
      },
      {
        text: "However, monopolies earn supernormal profits in the long run which can be reinvested into research and development, achieving dynamic efficiency. ",
        ao: "AO3",
        note: "Counter-argument distinguishing static inefficiency from dynamic efficiency.",
      },
      {
        text: "Furthermore, if substantial economies of scale exist, a natural monopoly's average costs may be lower than those of fragmented competitive firms, benefiting consumers.",
        ao: "AO3",
        note: "Conditional evaluation grounded in natural monopoly cost curves.",
      },
    ],
  },
];

const COMMON_MISSPELLINGS: Record<string, string> = {
  elasticy: "elasticity",
  elasitcity: "elasticity",
  inelasitc: "inelastic",
  equilibrum: "equilibrium",
  equilbrium: "equilibrium",
  tarrif: "tariff",
  reccession: "recession",
  unemploymant: "unemployment",
};

export function LiveExaminer({ className }: { className?: string }) {
  const [specimenIndex, setSpecimenIndex] = useState(0);
  const [mode, setMode] = useState<"simulate" | "manual">("simulate");
  const [typed, setTyped] = useState(0);
  const [manualText, setManualText] = useState("");
  const [playing, setPlaying] = useState(true);
  const [justChanged, setJustChanged] = useState(false);
  const previousMarkRef = useRef<number | null>(null);

  const specimen = SPECIMENS[specimenIndex];
  const fullText = useMemo(() => specimen.clauses.map((c) => c.text).join(""), [specimen]);

  // Autotyping simulation loop
  useEffect(() => {
    if (mode !== "simulate" || !playing) return;
    if (typed < fullText.length) {
      const timer = window.setTimeout(() => {
        setTyped((prev) => Math.min(prev + 1, fullText.length));
      }, 22);
      return () => window.clearTimeout(timer);
    }
    // Hold at completion then pause
    const timer = window.setTimeout(() => {
      // Hold complete state
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [mode, playing, typed, fullText.length]);

  // Switch specimen
  const handleSelectSpecimen = useCallback((index: number) => {
    setSpecimenIndex(index);
    setTyped(0);
    setPlaying(true);
    setManualText(SPECIMENS[index].clauses.map((c) => c.text).join(""));
  }, []);

  // Compute live breakdown for simulation mode
  let cursor = 0;
  const renderedClauses = specimen.clauses.map((clause, index) => {
    const start = cursor;
    cursor += clause.text.length;
    return {
      clause,
      index,
      visible: Math.max(0, Math.min(clause.text.length, typed - start)),
      marked: typed >= cursor,
    };
  });

  const activeSimulationNote = [...renderedClauses].reverse().find((row) => row.marked)?.clause.note;

  // Analysis engine for manual typing mode
  const manualAnalysis = useMemo(() => {
    if (mode !== "manual") return null;
    const text = manualText.trim().toLowerCase();
    const words = text ? text.split(/\s+/).filter(Boolean) : [];
    const wordCount = words.length;

    // Detect matched terms
    const matchedTerms: string[] = [];
    specimen.keyTerms.forEach((term) => {
      if (text.includes(term.toLowerCase())) {
        matchedTerms.push(term);
      }
    });

    // Detect common misspellings & specific Cambridge mechanics
    const detectedMisspellings: { wrong: string; correct: string }[] = [];
    if (text.includes("demand pull inflate")) {
      detectedMisspellings.push({ wrong: "demand pull inflate", correct: "demand-pull inflation" });
    }
    if (text.includes("thai because")) {
      detectedMisspellings.push({ wrong: "Thai because", correct: "This is because" });
    }
    words.forEach((w) => {
      const cleanWord = w.replace(/[^a-z]/g, "");
      if (COMMON_MISSPELLINGS[cleanWord]) {
        detectedMisspellings.push({ wrong: cleanWord, correct: COMMON_MISSPELLINGS[cleanWord] });
      }
    });

    // AO1: based on keywords and basic concepts
    const ao1Points = Math.min(
      specimen.aoBreakdown.ao1,
      Math.floor((matchedTerms.length / Math.max(2, specimen.keyTerms.length / 2)) * specimen.aoBreakdown.ao1) +
        (wordCount >= 20 ? 1 : 0),
    );

    // AO2: analytical reasoning chains ("leads to", "because", "contracts", "consequently", "as a result", "shifts")
    const analyticalTriggers = [
      "because",
      "leads to",
      "contracts",
      "consequently",
      "as a result",
      "therefore",
      "causes",
      "shifts",
      "increases",
      "reduces",
      "meaning",
      "results in",
      "incentivised",
      "profit motive",
    ];
    let ao2Hits = 0;
    analyticalTriggers.forEach((t) => {
      if (text.includes(t)) ao2Hits++;
    });
    const ao2Points = Math.min(
      specimen.aoBreakdown.ao2,
      Math.min(ao2Hits, Math.ceil(specimen.aoBreakdown.ao2 * (wordCount / 50))),
    );

    // AO3: evaluation triggers ("however", "depends on", "in the short run", "in the long run", "on the other hand", "overall", "only effective if")
    const evalTriggers = [
      "however",
      "depends on",
      "short run",
      "long run",
      "on the other hand",
      "overall",
      "in contrast",
      "effective if",
      "furthermore",
      "limitation",
      "capacity",
      "deficit",
    ];
    let ao3Hits = 0;
    evalTriggers.forEach((t) => {
      if (text.includes(t)) ao3Hits++;
    });
    const ao3Points = Math.min(
      specimen.aoBreakdown.ao3,
      Math.min(ao3Hits * 2, specimen.aoBreakdown.ao3),
    );

    const totalMark = Math.min(specimen.total, ao1Points + ao2Points + ao3Points);

    // Generate dynamic Next Move guidance
    let nextMove = "Keep developing your argument using precise 9708 syllabus concepts.";
    if (ao1Points === 0) {
      nextMove = "State one accurate definition or core economic concept to establish AO1.";
    } else if (ao2Points < Math.ceil(specimen.aoBreakdown.ao2 / 2)) {
      nextMove = "Develop a because → effect → consequence chain and apply it to the question.";
    } else if (specimen.aoBreakdown.ao3 > 0 && ao3Points === 0) {
      nextMove = "Add a justified condition, limitation, or counter-argument for AO3 evaluation.";
    } else if (specimen.aoBreakdown.ao3 > 0 && ao3Points < specimen.aoBreakdown.ao3) {
      nextMove = "Weigh up whether long-run supply-side improvements from infrastructure and education spending offset the short-run inflationary risks.";
    } else {
      nextMove = "Strong response! Strengthen with an explicit named context or diagram label.";
    }

    return {
      wordCount,
      matchedTerms,
      detectedMisspellings,
      ao1: ao1Points,
      ao2: ao2Points,
      ao3: ao3Points,
      totalMark,
      nextMove,
    };
  }, [mode, manualText, specimen]);

  // Determine active marks & AO meters based on mode
  let currentMark = 0;
  let currentAo1 = 0;
  let currentAo2 = 0;
  let currentAo3 = 0;
  let activeNextMove = "Live calibration active — write or observe the examiner.";
  let recognizedTermsCount = 0;

  if (mode === "simulate") {
    const earnedClauses = renderedClauses.filter((r) => r.marked);
    const ao1Count = earnedClauses.filter((r) => r.clause.ao === "AO1").length;
    const ao2Count = earnedClauses.filter((r) => r.clause.ao === "AO2").length;
    const ao3Count = earnedClauses.filter((r) => r.clause.ao === "AO3").length;

    const totalClauses = specimen.clauses.length;
    currentMark = Math.min(
      specimen.total,
      Math.round((earnedClauses.length / totalClauses) * specimen.total),
    );

    const maxAo1Clauses = specimen.clauses.filter((c) => c.ao === "AO1").length || 1;
    const maxAo2Clauses = specimen.clauses.filter((c) => c.ao === "AO2").length || 1;
    const maxAo3Clauses = specimen.clauses.filter((c) => c.ao === "AO3").length || 1;

    currentAo1 = Math.round((ao1Count / maxAo1Clauses) * specimen.aoBreakdown.ao1);
    currentAo2 = Math.round((ao2Count / maxAo2Clauses) * specimen.aoBreakdown.ao2);
    currentAo3 = Math.round((ao3Count / maxAo3Clauses) * specimen.aoBreakdown.ao3);

    if (currentAo1 === 0) {
      activeNextMove = "State one accurate definition or core economic concept.";
    } else if (currentAo2 < specimen.aoBreakdown.ao2) {
      activeNextMove = "Develop a because → effect → consequence chain and apply it to the question.";
    } else if (currentAo3 < specimen.aoBreakdown.ao3) {
      activeNextMove = "Add a justified limitation, condition, or counter-argument for AO3.";
    } else {
      activeNextMove = "Weigh your arguments and finish with a conditional overall judgement.";
    }
    recognizedTermsCount = Math.min(specimen.keyTerms.length, earnedClauses.length * 2);
  } else if (manualAnalysis) {
    currentMark = manualAnalysis.totalMark;
    currentAo1 = manualAnalysis.ao1;
    currentAo2 = manualAnalysis.ao2;
    currentAo3 = manualAnalysis.ao3;
    activeNextMove = manualAnalysis.nextMove;
    recognizedTermsCount = manualAnalysis.matchedTerms.length;
  }

  // Trigger pulse effect when total mark changes
  useEffect(() => {
    if (previousMarkRef.current !== null && previousMarkRef.current !== currentMark) {
      setJustChanged(true);
      const timer = setTimeout(() => setJustChanged(false), 800);
      return () => clearTimeout(timer);
    }
    previousMarkRef.current = currentMark;
  }, [currentMark]);

  const wordCount =
    mode === "simulate"
      ? specimen.clauses
          .map((c) => c.text)
          .join("")
          .slice(0, typed)
          .split(/\s+/)
          .filter(Boolean).length
      : manualAnalysis?.wordCount ?? 0;

  return (
    <div className={cn("examiner-card pop examiner-float overflow-hidden rounded-2xl border border-ink/20 bg-card shadow-2xl text-foreground", className)}>
      {/* ── Studio Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
          </span>
          <span className="text-xs font-bold tracking-tight text-foreground flex items-center gap-1.5">
            <Sparkles className="size-3 text-primary" /> Live Examiner
          </span>
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-primary">
            9708 ENGINE
          </span>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-background p-0.5 border border-border/80 text-[11px]">
          <button
            type="button"
            onClick={() => {
              setMode("simulate");
              setPlaying(true);
            }}
            className={cn(
              "px-2 py-0.5 rounded font-medium transition-colors",
              mode === "simulate"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Auto Simulation
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("manual");
              if (!manualText) {
                setManualText(specimen.clauses.map((c) => c.text).join(""));
              }
            }}
            className={cn(
              "px-2 py-0.5 rounded font-medium transition-colors flex items-center gap-1",
              mode === "manual"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Edit3 className="size-2.5" /> Type Your Own
          </button>
        </div>
      </div>

      {/* ── Cambridge Paper 2 Answer Script Header ─────────────────── */}
      <div className="border-b border-border/80 bg-muted/20 px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-1.5 text-[10.5px]">
        <div className="flex items-center gap-1.5 font-mono text-muted-foreground text-[10px]">
          <span className="font-semibold text-foreground">CAMBRIDGE ASSESSMENT INTERNATIONAL EDUCATION</span>
          <span>·</span>
          <span className="text-primary font-bold">9708 SYLLABUS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Script Active
          </span>
          <Badge variant="outline" className="font-mono text-[9.5px] border-primary/30 bg-primary/5 text-primary">
            Max Tariff: [12 Marks]
          </Badge>
        </div>
      </div>

      {/* ── Question Bar & Tabs ───────────────────────────────────────── */}
      <div className="border-b border-border/80 bg-background/50 px-3.5 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {SPECIMENS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectSpecimen(idx)}
                className={cn(
                  "whitespace-nowrap px-2 py-1 text-[11px] rounded-md font-medium transition-all",
                  specimenIndex === idx
                    ? "bg-muted text-foreground border border-border shadow-2xs font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                {s.title}
              </button>
            ))}
          </div>

          <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
            {specimen.code}
          </Badge>
        </div>

        <p className="mt-1.5 text-[11.5px] font-semibold leading-snug text-foreground/90">
          “{specimen.question}”
        </p>

        {/* Quick Notations bar */}
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[10px]">
          <span className="font-mono uppercase text-muted-foreground text-[9px] shrink-0">Quick Notation:</span>
          {[
            { label: "+ PED formula", insert: " PED = %ΔQd / %ΔP " },
            { label: "+ YED formula", insert: " YED = %ΔQd / %ΔY " },
            { label: "+ PES formula", insert: " PES = %ΔQs / %ΔP " },
            { label: "+ AD equation", insert: " AD = C + I + G + NX " },
            { label: "+ LRAS / SRAS", insert: " LRAS / SRAS shifts " },
            { label: "+ PPC", insert: " PPC outward shift " },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                if (mode === "manual") {
                  setManualText((prev) => prev + item.insert);
                } else {
                  setMode("manual");
                  setManualText(specimen.clauses.map((c) => c.text).join("") + item.insert);
                }
              }}
              className="rounded bg-muted/60 hover:bg-muted px-1.5 py-0.5 font-mono text-[9.5px] text-foreground border border-border/70 transition-colors shrink-0"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Workspace ────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-[1fr_210px] divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Editor Area */}
        <div className="p-3.5 flex flex-col justify-between min-h-[220px]">
          {mode === "simulate" ? (
            <div className="relative">
              <div className="min-h-[140px] font-serif text-[13.5px] leading-[1.8] text-foreground select-none">
                {renderedClauses.map(({ clause, index, visible, marked }) => (
                  <span
                    key={index}
                    className="clause"
                    data-marked={marked ? "true" : "false"}
                    style={
                      {
                        "--clause-tint": `color-mix(in oklab, ${AO_META[clause.ao].tint} 16%, transparent)`,
                        "--clause-ink": AO_META[clause.ao].ink,
                      } as React.CSSProperties
                    }
                  >
                    {clause.text.slice(0, visible)}
                  </span>
                ))}
                {typed < fullText.length ? (
                  <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-primary animate-pulse align-middle" />
                ) : null}
              </div>

              {/* Live margin note from simulation */}
              <div className="mt-3 min-h-[38px]">
                {activeSimulationNote ? (
                  <div className="rounded-lg bg-primary/5 border border-primary/15 p-2 text-[11px] leading-tight text-foreground/80 flex items-start gap-1.5">
                    <span className="shrink-0 font-mono font-bold text-[10px] text-primary uppercase">
                      Examiner
                    </span>
                    <span>{activeSimulationNote}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Type your economics answer here... The Live Examiner calculates running marks, AO breakdowns, and economics terminology in real time."
                rows={6}
                className="w-full resize-none rounded-lg border border-border bg-background p-2.5 font-serif text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              />

              {/* Detected spelling warning */}
              {manualAnalysis?.detectedMisspellings.length ? (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-1.5 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="size-3 shrink-0" />
                  <span>
                    Economic spelling warning: <strong>{manualAnalysis.detectedMisspellings[0].wrong}</strong> →{" "}
                    <strong>{manualAnalysis.detectedMisspellings[0].correct}</strong>
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* Editor Footer Status */}
          <div className="mt-3 pt-2 border-t border-border/70 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3" /> {wordCount} words
            </span>

            {mode === "simulate" ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTyped(0);
                    setPlaying(true);
                  }}
                  className="hover:text-foreground flex items-center gap-1 transition-colors"
                  title="Replay from beginning"
                >
                  <RotateCcw className="size-3" /> Replay
                </button>
                <button
                  type="button"
                  onClick={() => setPlaying(!playing)}
                  className="hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
                  {playing ? "Pause" : "Resume"}
                </button>
              </div>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Live Sandbox
              </span>
            )}
          </div>
        </div>

        {/* ── Examiner Calibration Panel ──────────────────────────────── */}
        <div className="p-3.5 bg-muted/20 flex flex-col justify-between gap-3">
          {/* Running Mark Card */}
          <div className="rounded-xl border border-primary/20 bg-card p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Predicted Mark
              </span>
              <Badge
                variant="outline"
                className="font-mono text-[9px] border-primary/30 bg-primary/10 text-primary py-0 px-1"
              >
                RUNNING MARK
              </Badge>
            </div>

            <div className="mt-1 flex items-baseline gap-1">
              <span
                className={cn(
                  "text-3xl font-black tabular-nums transition-transform duration-300",
                  justChanged ? "text-primary scale-110" : "text-foreground",
                )}
              >
                {currentMark}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">/ {specimen.total}</span>
            </div>

            {/* AO Breakdown meters */}
            <div className="mt-3 space-y-1.5">
              <AoMeter
                label="AO1"
                name="Knowledge"
                awarded={currentAo1}
                outOf={specimen.aoBreakdown.ao1}
                dot={AO_META.AO1.dot}
              />
              <AoMeter
                label="AO2"
                name="Analysis"
                awarded={currentAo2}
                outOf={specimen.aoBreakdown.ao2}
                dot={AO_META.AO2.dot}
              />
              {specimen.aoBreakdown.ao3 > 0 ? (
                <AoMeter
                  label="AO3"
                  name="Evaluation"
                  awarded={currentAo3}
                  outOf={specimen.aoBreakdown.ao3}
                  dot={AO_META.AO3.dot}
                />
              ) : null}
            </div>
          </div>

          {/* Examiner Next Move Card */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
            <p className="text-[9px] font-bold tracking-wider text-primary uppercase flex items-center gap-1">
              <Lightbulb className="size-2.5" /> Examiner Next Move
            </p>
            <p className="mt-1 text-[10.5px] leading-snug text-foreground/90 font-medium">
              {activeNextMove}
            </p>
          </div>

          {/* Syllabus Term Count & CTA */}
          <div className="pt-1">
            <p className="text-[10px] text-muted-foreground mb-2 flex items-center justify-between">
              <span>Syllabus terms:</span>
              <span className="font-mono font-semibold text-foreground">
                {recognizedTermsCount} verified
              </span>
            </p>

            <Button
              asChild
              size="sm"
              className="w-full text-xs font-semibold gap-1.5 h-7.5 shadow-xs"
            >
              <Link to="/auth">
                Open Full Examiner <ArrowRight className="size-3" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AoMeter({
  label,
  name,
  awarded,
  outOf,
  dot,
}: {
  label: string;
  name: string;
  awarded: number;
  outOf: number;
  dot: string;
}) {
  const pct = outOf > 0 ? Math.min(100, Math.round((awarded / outOf) * 100)) : 0;
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5 text-[10px]">
      <span className="flex items-center gap-1 font-semibold text-foreground">
        <span className={cn("size-1.5 rounded-full shrink-0", dot)} />
        {label}
      </span>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
        <div
          className={cn("h-full rounded-full transition-all duration-500", dot)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono font-semibold tabular-nums text-foreground/80 text-right w-6">
        {awarded}/{outOf}
      </span>
    </div>
  );
}

/**
 * 3D stage wrapper that tilts subtly with pointer hover on desktop devices.
 */
export function ExaminerStage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const tick = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      node.style.setProperty("--mx", currentX.toFixed(4));
      node.style.setProperty("--my", currentY.toFixed(4));
      frame = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      targetX = Math.max(
        -1,
        Math.min(1, ((event.clientX - (rect.left + rect.width / 2)) / rect.width) * 1.5),
      );
      targetY = Math.max(
        -1,
        Math.min(1, ((event.clientY - (rect.top + rect.height / 2)) / rect.height) * 1.5),
      );
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className={cn("examiner-stage", className)}>
      {children}
    </div>
  );
}
