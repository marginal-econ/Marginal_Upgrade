/**
 * Interactive marketing components:
 * 1. LiveMarkDemo — An authentic, interactive Cambridge 9708 Live Examiner Studio.
 *    Allows visitors to type their own essays or test tiered exemplars (Level 1, 2, 3)
 *    with real-time sentence-by-sentence AO highlights, predicted marks, and examiner advice.
 * 2. CommandWordDrill — 2-minute drill on Cambridge command words and mark weightings.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════════════════════════════════
   Live marking demo & interactive studio
   ══════════════════════════════════════════════════════════════════════════ */

type Ao = "AO1" | "AO2" | "AO3";

type Clause = {
  text: string;
  ao: Ao | null;
  note?: string;
};

type Specimen = {
  id: string;
  paper: string;
  question: string;
  total: number;
  aoBreakdown: { ao1: number; ao2: number; ao3: number };
  keyTerms: string[];
  clauses: Clause[];
  levels: {
    level1: { title: string; mark: number; text: string; tip: string };
    level2: { title: string; mark: number; text: string; tip: string };
    level3: { title: string; mark: number; text: string; tip: string };
  };
};

const AO_META: Record<Ao, { name: string; dot: string; text: string; ring: string }> = {
  AO1: { name: "Knowledge", dot: "bg-ao1", text: "text-ao1", ring: "ring-ao1/40" },
  AO2: { name: "Analysis", dot: "bg-ao2", text: "text-ao2", ring: "ring-ao2/40" },
  AO3: { name: "Evaluation", dot: "bg-ao3", text: "text-ao3", ring: "ring-ao3/40" },
};

const COMMON_MISSPELLINGS: Record<string, string> = {
  elasticy: "elasticity",
  elasitcity: "elasticity",
  inelasitc: "inelastic",
  equilibrum: "equilibrium",
  equilbrium: "equilibrium",
  tarrif: "tariff",
  subsidys: "subsidies",
  reccession: "recession",
  unemploymant: "unemployment",
};

const SPECIMENS: Specimen[] = [
  {
    id: "aggregate-demand",
    paper: "Economics AS Level - Paper 2 · 12 marks",
    question:
      "Asses whether an increase in aggregate demand would be of overall benefit to an economy.",
    total: 12,
    aoBreakdown: { ao1: 3, ao2: 5, ao3: 4 },
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
    levels: {
      level1: {
        title: "Level 1: Basic Definition (4/12)",
        mark: 4,
        text: "Aggregate demand is equal C + I + G + NX. Aggregate demand is the total demand for all goods and services in an economy. Increased aggregate demand can be caused by expansionary monetary and fiscal policies.",
        tip: "Definition only. Without developing analytical chains linking AD to output, employment, and prices, marks are capped in Level 1.",
      },
      level2: {
        title: "Level 2: Candidate Live Script (8/12)",
        mark: 8,
        text: "Aggregate demand is equal C + I + G + NX. Aggregate demand can be increased in certain cases by expansionary monetary and fiscal policies. Increased aggregate demand can cause demand-pull inflation.\n\nIncreased aggregate demand may mean increase in production. As when aggregate demand is high, it means suppliers are incentivised to produce due to their profit motive. Increased production can lead to increased job opportunities, and also increased production leading to an increase in GDP (Economic growth).\n\nBut, the level of increase in production depends on the production capacity. If an economy is already operating at maximum production capacity, and high aggregate demand may only lead to higher prices. This is because firms may not have enough resources to increase production capacity. This can be shown from the diagram below.\n\nAs AD shifts outward, the increase in quantity is minimal from Y1 to Y2, but the price level rises sharply from P1 to P2.\n\nIncrease in aggregate demand can be more government revenue. As increased demand means that consumers are spending more, producers may be increasing production. This means revenue from income tax and corporate tax rises, leading to more budget for the government to spend on merit goods like healthcare and education.\n\nBut, a high aggregate demand is not always due to increased consumer spending. It can also be due to an increase in government spending as part of an expansionary fiscal policies. If that is true, while aggregate demand may be high, it may actually cause a budget deficit for the government as their spending may be high and taxation low.",
        tip: "Real student draft: Strong AO1 definitions and solid AO2 transmission chains to GDP and tax revenue. Good evaluation of capacity limits and fiscal deficits (8/12).",
      },
      level3: {
        title: "Level 3: Full Marks Exemplar (12/12)",
        mark: 12,
        text: "Aggregate demand is equal to C + I + G + (X - M). An outward shift in AD via expansionary fiscal or monetary policy incentivises firms to raise output due to the profit motive, increasing derived labour demand and accelerating real GDP growth. Furthermore, higher corporate profits and incomes yield buoyant tax revenue for public expenditure on merit goods. However, the net economic benefit depends strictly on current spare capacity. If the economy operates on the vertical, classical segment of the LRAS curve, higher AD produces demand-pull inflation without real output gains. Additionally, debt-financed government spending risks structural budget deficits and current account deterioration. Therefore, an AD increase is only of overall benefit when an economy has an initial negative output gap and supply-side capacity expands concurrently.",
        tip: "Outstanding response: precise Keynesian/Classical synthesis, unbroken transmission mechanisms, and conditional evaluation answering 'overall benefit'.",
      },
    },
  },
  {
    id: "public-goods",
    paper: "AS Paper 2 · 8 marks",
    question: "Explain why market failure occurs in the provision of public goods.",
    total: 8,
    aoBreakdown: { ao1: 4, ao2: 4, ao3: 0 },
    keyTerms: [
      "public good",
      "non-excludable",
      "non-rival",
      "free rider",
      "marginal cost",
      "missing market",
      "market failure",
    ],
    clauses: [
      {
        text: "A public good has two defining characteristics: non-excludability and non-rivalry in consumption. ",
        ao: "AO1",
        note: "Precise technical definition of both criteria.",
      },
      {
        text: "Non-excludability means it is impossible to prevent non-payers from consuming the good once provided, ",
        ao: "AO1",
        note: "Accurate explanation of the non-excludability condition.",
      },
      {
        text: "which creates the free-rider problem where rational consumers have no incentive to pay. ",
        ao: "AO2",
        note: "Analytical bridge linking economic characteristic to consumer incentive.",
      },
      {
        text: "Consequently, profit-seeking firms cannot generate revenue to cover marginal costs, resulting in a missing market where zero output is supplied.",
        ao: "AO2",
        note: "Logical conclusion of complete market failure.",
      },
    ],
    levels: {
      level1: {
        title: "Level 1: Basic Concepts (3/8)",
        mark: 3,
        text: "A public good is a good like street lighting or defence. It is non-excludable and non-rival in consumption.",
        tip: "Good recall of concepts, but needs explanation of why the private sector cannot supply them.",
      },
      level2: {
        title: "Level 2: Good Analysis (6/8)",
        mark: 6,
        text: "A public good has two defining characteristics: non-excludability and non-rivalry in consumption. Non-excludability means it is impossible to prevent non-payers from consuming the good once provided, which creates the free-rider problem where rational consumers refuse to pay.",
        tip: "Clear explanation of free riders. Complete the final link to missing markets to achieve full marks.",
      },
      level3: {
        title: "Level 3: Full Marks (8/8)",
        mark: 8,
        text: "A public good has two defining characteristics: non-excludability and non-rivalry in consumption. Non-excludability means it is impossible to prevent non-payers from consuming the good once provided, which creates the free-rider problem where rational consumers have no incentive to pay. Consequently, profit-seeking firms cannot generate revenue to cover marginal costs, resulting in a missing market where zero output is supplied.",
        tip: "Complete analytical chain from technical properties to consumer incentives to private firm failure.",
      },
    },
  },
  {
    id: "monopoly",
    paper: "A2 Paper 4 · 12 marks",
    question:
      "Evaluate the view that a monopoly market structure always leads to worse outcomes for consumers than perfect competition.",
    total: 12,
    aoBreakdown: { ao1: 3, ao2: 5, ao3: 4 },
    keyTerms: [
      "monopoly",
      "perfect competition",
      "allocative efficiency",
      "deadweight loss",
      "dynamic efficiency",
      "economies of scale",
      "abnormal profit",
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
    levels: {
      level1: {
        title: "Level 1: Basic Definition (4/12)",
        mark: 4,
        text: "A monopoly is a single seller in a market with high barriers to entry. It makes supernormal profit where MR = MC.",
        tip: "States technical definition. Must explain allocative inefficiency to access higher marks.",
      },
      level2: {
        title: "Level 2: Welfare Analysis (8/12)",
        mark: 8,
        text: "A monopoly is a dominant firm with high barriers to entry that maximises profit where MR = MC. Because price exceeds marginal cost (P > MC), output is restricted below the allocatively efficient output, generating deadweight welfare loss and higher prices for consumers.",
        tip: "Solid analytical comparison. To earn AO3 marks, evaluate dynamic efficiency and economies of scale.",
      },
      level3: {
        title: "Level 3: Full Evaluation (12/12)",
        mark: 12,
        text: "A monopoly is a dominant supplier protected by high barriers to entry that maximises profit where MR = MC. Because price exceeds marginal cost, output is restricted below the allocatively efficient level, creating deadweight welfare loss. However, monopolies earn abnormal profits in the long run which can be reinvested into R&D, achieving dynamic efficiency. Furthermore, where substantial economies of scale exist in natural monopolies, average costs and prices may be lower than in fragmented competitive markets.",
        tip: "Exceptional A2 analysis and balanced evaluation directly assessing 'always leads to worse outcomes'.",
      },
    },
  },
];

const TYPE_SPEED = 18; // ms per character in autotype mode

export function LiveMarkDemo() {
  const [specimenIndex, setSpecimenIndex] = useState(0);
  const [mode, setMode] = useState<"interactive" | "autotype">("interactive");
  const [typed, setTyped] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [customText, setCustomText] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<"level1" | "level2" | "level3" | "custom">("level2");
  const [justChanged, setJustChanged] = useState(false);
  const previousMarkRef = useRef<number | null>(null);

  const specimen = SPECIMENS[specimenIndex];
  const fullSpecimenText = useMemo(() => specimen.clauses.map((c) => c.text).join(""), [specimen]);

  // Initial text setup
  useEffect(() => {
    setCustomText(specimen.levels.level2.text);
    setSelectedLevel("level2");
    setTyped(specimen.levels.level2.text.length);
  }, [specimenIndex]);

  // Autotyping engine
  useEffect(() => {
    if (mode !== "autotype" || !playing) return;
    if (typed < fullSpecimenText.length) {
      const timer = window.setTimeout(() => setTyped((n) => Math.min(n + 1, fullSpecimenText.length)), TYPE_SPEED);
      return () => window.clearTimeout(timer);
    }
  }, [mode, playing, typed, fullSpecimenText.length]);

  // Handle switching preset levels
  const handleLoadLevel = (lvl: "level1" | "level2" | "level3") => {
    setSelectedLevel(lvl);
    setMode("interactive");
    setPlaying(false);
    setCustomText(specimen.levels[lvl].text);
  };

  const handleClear = () => {
    setSelectedLevel("custom");
    setMode("interactive");
    setPlaying(false);
    setCustomText("");
  };

  // Real-time Text Analysis Engine
  const liveAnalysis = useMemo(() => {
    const text = customText.trim().toLowerCase();
    const words = text ? text.split(/\s+/).filter(Boolean) : [];
    const wordCount = words.length;

    // Detect matched economic terms
    const matchedTerms: string[] = [];
    specimen.keyTerms.forEach((term) => {
      if (text.includes(term.toLowerCase())) {
        matchedTerms.push(term);
      }
    });

    // Detect common misspellings & specific Cambridge mechanics
    const misspellings: { wrong: string; correct: string }[] = [];
    if (text.includes("demand pull inflate")) {
      misspellings.push({ wrong: "demand pull inflate", correct: "demand-pull inflation" });
    }
    if (text.includes("thai because")) {
      misspellings.push({ wrong: "Thai because", correct: "This is because" });
    }
    words.forEach((w) => {
      const clean = w.replace(/[^a-z]/g, "");
      if (COMMON_MISSPELLINGS[clean]) {
        misspellings.push({ wrong: clean, correct: COMMON_MISSPELLINGS[clean] });
      }
    });

    // AO1 Calculation (Definitions & Technical Terms)
    const ao1Max = specimen.aoBreakdown.ao1;
    const termRatio = matchedTerms.length / Math.max(2, specimen.keyTerms.length / 2);
    let ao1Awarded = 0;
    if (termRatio > 0.6 || wordCount >= 35) {
      ao1Awarded = ao1Max;
    } else if (termRatio > 0.2 || wordCount >= 15) {
      ao1Awarded = Math.max(1, Math.round(ao1Max * 0.6));
    } else if (wordCount > 5) {
      ao1Awarded = 1;
    }

    // AO2 Calculation (Analysis Chains: cause -> effect)
    const ao2Max = specimen.aoBreakdown.ao2;
    const analyticalConnectors = [
      "because",
      "leads to",
      "contracts",
      "causes",
      "as a result",
      "consequently",
      "therefore",
      "meaning",
      "shifts",
      "results in",
      "reduces",
      "increases",
      "exceeds",
      "incentivised",
      "profit motive",
    ];
    let ao2Hits = 0;
    analyticalConnectors.forEach((c) => {
      if (text.includes(c)) ao2Hits++;
    });

    let ao2Awarded = 0;
    if (ao2Hits >= 3 && wordCount >= 40) {
      ao2Awarded = ao2Max;
    } else if (ao2Hits >= 2 && wordCount >= 25) {
      ao2Awarded = Math.max(1, ao2Max - 1);
    } else if (ao2Hits >= 1 && wordCount >= 15) {
      ao2Awarded = Math.max(1, Math.floor(ao2Max / 2));
    }

    // AO3 Calculation (Evaluation & Conditional Judgement)
    const ao3Max = specimen.aoBreakdown.ao3;
    const evalConnectors = [
      "however",
      "depends on",
      "in the short run",
      "in the long run",
      "on the other hand",
      "overall",
      "only effective if",
      "furthermore",
      "in contrast",
      "limitation",
      "condition",
      "capacity",
      "deficit",
    ];
    let ao3Hits = 0;
    evalConnectors.forEach((c) => {
      if (text.includes(c)) ao3Hits++;
    });

    let ao3Awarded = 0;
    if (ao3Max > 0) {
      if (ao3Hits >= 2 && wordCount >= 50) {
        ao3Awarded = ao3Max;
      } else if (ao3Hits >= 1 && wordCount >= 30) {
        ao3Awarded = Math.max(1, Math.floor(ao3Max / 2));
      }
    }

    const totalMark = Math.min(specimen.total, ao1Awarded + ao2Awarded + ao3Awarded);

    // Dynamic Next Move Guidance
    let nextMove = "Begin writing your answer using syllabus terminology.";
    if (wordCount === 0) {
      nextMove = "State one precise definition or core economic concept to earn your opening AO1 marks.";
    } else if (ao1Awarded < ao1Max) {
      nextMove = "Introduce more specific Cambridge 9708 terms (e.g. " + specimen.keyTerms.slice(0, 3).join(", ") + ").";
    } else if (ao2Awarded < Math.ceil(ao2Max / 2)) {
      nextMove = "Develop a because → effect → consequence chain to show how the economic mechanism works.";
    } else if (ao3Max > 0 && ao3Awarded === 0) {
      nextMove = "Add an evaluative counter-argument or condition (e.g. capacity limits, time period, or fiscal deficits).";
    } else if (ao3Max > 0 && ao3Awarded < ao3Max) {
      nextMove = "Weigh up whether long-run supply-side improvements from infrastructure and education spending offset the short-run inflationary risks.";
    } else {
      nextMove = "Full Cambridge criteria satisfied! Response demonstrates high-band knowledge, analysis, and evaluation.";
    }

    return {
      wordCount,
      matchedTerms,
      misspellings,
      ao1: ao1Awarded,
      ao2: ao2Awarded,
      ao3: ao3Awarded,
      totalMark,
      nextMove,
    };
  }, [customText, specimen]);

  // Flash mark when updated
  useEffect(() => {
    if (previousMarkRef.current !== null && previousMarkRef.current !== liveAnalysis.totalMark) {
      setJustChanged(true);
      const timer = setTimeout(() => setJustChanged(false), 800);
      return () => clearTimeout(timer);
    }
    previousMarkRef.current = liveAnalysis.totalMark;
  }, [liveAnalysis.totalMark]);

  return (
    <div className="pop overflow-hidden rounded-2xl border-2 border-primary/30 bg-card shadow-2xl">
      {/* ── Studio Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-3" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-emerald-600 dark:bg-emerald-400" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary" /> Live Examiner Studio
              </span>
              <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/30">
                CAMBRIDGE 9708
              </Badge>
            </div>
          </div>
        </div>

        {/* Question Selector Tabs */}
        <div className="flex items-center gap-1.5 rounded-lg bg-background/80 p-1 border border-border">
          {SPECIMENS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSpecimenIndex(index);
                setMode("interactive");
              }}
              className={cn(
                "rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-all",
                index === specimenIndex
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.paper.split(" · ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Level Presets & Toolbar ───────────────────────────────────── */}
      <div className="border-b border-border bg-background px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Exemplar Presets:
          </span>
          <button
            type="button"
            onClick={() => handleLoadLevel("level1")}
            className={cn(
              "px-2.5 py-1 rounded-md font-medium transition-colors border",
              selectedLevel === "level1"
                ? "bg-muted text-foreground border-primary/40 font-semibold"
                : "text-muted-foreground border-border hover:bg-muted/50",
            )}
          >
            Level 1 (Pass · {specimen.levels.level1.mark}m)
          </button>
          <button
            type="button"
            onClick={() => handleLoadLevel("level2")}
            className={cn(
              "px-2.5 py-1 rounded-md font-medium transition-colors border",
              selectedLevel === "level2"
                ? "bg-primary/10 text-primary border-primary font-bold shadow-xs"
                : "text-muted-foreground border-border hover:bg-muted/50",
            )}
          >
            Level 2 (Candidate Script · {specimen.levels.level2.mark}m)
          </button>
          <button
            type="button"
            onClick={() => handleLoadLevel("level3")}
            className={cn(
              "px-2.5 py-1 rounded-md font-medium transition-colors border",
              selectedLevel === "level3"
                ? "bg-primary/10 text-primary border-primary font-bold shadow-xs"
                : "text-muted-foreground border-border hover:bg-muted/50",
            )}
          >
            Level 3 (Exemplar · {specimen.levels.level3.mark}m)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="size-3.5" /> Clear Editor
          </button>
        </div>
      </div>

      {/* ── Main Studio Grid ──────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-[1.3fr_0.7fr] divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* Left Column: Interactive Essay Writing Workspace */}
        <div className="p-5 md:p-6 flex flex-col justify-between min-h-[380px] bg-background">
          <div className="space-y-4">
            {/* Cambridge Script Header */}
            <div className="rounded-xl border border-primary/20 bg-muted/30 p-3.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10.5px]">
                <div className="flex items-center gap-1.5 font-mono text-muted-foreground text-[10px]">
                  <span className="font-semibold text-foreground">CAMBRIDGE ASSESSMENT INTERNATIONAL EDUCATION</span>
                  <span>·</span>
                  <span className="text-primary font-bold">9708 SYLLABUS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="size-1.5 rounded-full bg-emerald-500" /> Script Active
                  </span>
                  <Badge variant="outline" className="font-mono text-[9.5px] border-primary/30 bg-primary/10 text-primary">
                    Max Tariff: [{specimen.total} Marks]
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span>{specimen.paper}</span>
                <span className="font-mono text-[10px] text-muted-foreground">QUESTION 1 [{specimen.total}] · CONTINUOUS PROSE</span>
              </div>
              <p className="text-[13px] font-semibold text-foreground leading-snug pt-0.5 border-t border-border/60">
                “{specimen.question}”
              </p>
            </div>

            {/* Quick Notations bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[10px]">
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
                    setCustomText((prev) => prev + item.insert);
                    setSelectedLevel("custom");
                  }}
                  className="rounded bg-muted/60 hover:bg-muted px-1.5 py-0.5 font-mono text-[9.5px] text-foreground border border-border/70 transition-colors shrink-0"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Editable Interactive Textarea */}
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Edit3 className="size-3.5 text-primary" /> Essay Workspace (Candidate Answer Script)
                </span>
                <span className="text-[11px]">
                  {liveAnalysis.wordCount} words · ~{Math.max(1, Math.ceil(liveAnalysis.wordCount / 20))} min read
                </span>
              </div>
              <textarea
                value={customText}
                onChange={(e) => {
                  setCustomText(e.target.value);
                  setSelectedLevel("custom");
                }}
                rows={8}
                placeholder="Type or paste your economics answer here... The Live Examiner calculates running marks, AO breakdowns, and economics terminology in real time."
                className="w-full resize-none rounded-xl border border-border bg-card p-4 font-serif text-[14.5px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 shadow-inner"
              />
            </div>

            {/* Economic Spelling Alerts */}
            {liveAnalysis.misspellings.length > 0 ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  Economics spelling correction: <strong>"{liveAnalysis.misspellings[0].wrong}"</strong> →{" "}
                  <strong>"{liveAnalysis.misspellings[0].correct}"</strong> (AO1 accuracy).
                </span>
              </div>
            ) : null}

            {/* Verified Terminology Chips */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Verified Cambridge Terms Identified ({liveAnalysis.matchedTerms.length}):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {liveAnalysis.matchedTerms.length > 0 ? (
                  liveAnalysis.matchedTerms.map((term) => (
                    <span
                      key={term}
                      className="rounded-md bg-ao1/15 px-2 py-0.5 text-xs font-medium text-foreground border border-ao1/30 flex items-center gap-1"
                    >
                      <Check className="size-3 text-ao1" /> {term}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    Type relevant economic concepts to verify them against the Cambridge 9708 glossary.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="size-3.5" /> Instant Cambridge Calibrated Sandbox
            </span>
            <span>Write in real-time or pick a preset above</span>
          </div>
        </div>

        {/* Right Column: Live Examiner Calibration Engine */}
        <div className="p-5 md:p-6 bg-muted/20 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            {/* Running Mark Box */}
            <div className="rounded-xl border border-primary/25 bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Predicted Cambridge Mark
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] border-primary/30 bg-primary/10 text-primary py-0.5"
                >
                  RUNNING MARK
                </Badge>
              </div>

              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "text-4xl font-black tabular-nums transition-transform duration-300",
                    justChanged ? "text-primary scale-110" : "text-foreground",
                  )}
                >
                  {liveAnalysis.totalMark}
                </span>
                <span className="text-base font-semibold text-muted-foreground">
                  / {specimen.total} marks
                </span>
              </div>

              {/* AO Meters */}
              <div className="mt-4 space-y-2.5">
                <StudioMeter
                  label="AO1"
                  name="Knowledge & Concepts"
                  awarded={liveAnalysis.ao1}
                  outOf={specimen.aoBreakdown.ao1}
                  dot={AO_META.AO1.dot}
                />
                <StudioMeter
                  label="AO2"
                  name="Analysis & Application"
                  awarded={liveAnalysis.ao2}
                  outOf={specimen.aoBreakdown.ao2}
                  dot={AO_META.AO2.dot}
                />
                {specimen.aoBreakdown.ao3 > 0 ? (
                  <StudioMeter
                    label="AO3"
                    name="Evaluation & Judgement"
                    awarded={liveAnalysis.ao3}
                    outOf={specimen.aoBreakdown.ao3}
                    dot={AO_META.AO3.dot}
                  />
                ) : null}
              </div>
            </div>

            {/* Examiner Next Move Guidance */}
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5">
              <p className="text-[10px] font-bold tracking-wider text-primary uppercase flex items-center gap-1.5">
                <Lightbulb className="size-3.5" /> Examiner Next Move
              </p>
              <p className="mt-1.5 text-xs font-semibold leading-relaxed text-foreground">
                {liveAnalysis.nextMove}
              </p>
            </div>

            {/* Preset Explanatory Note */}
            {selectedLevel !== "custom" ? (
              <div className="rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">
                  {specimen.levels[selectedLevel].title}:
                </p>
                <p>{specimen.levels[selectedLevel].tip}</p>
              </div>
            ) : null}
          </div>

          {/* Action Link to Full App */}
          <div className="pt-2">
            <Button asChild className="w-full font-bold shadow-md gap-2" size="lg">
              <Link to="/auth">
                <span>Start Full Live Examiner Session</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Full access includes OCR handwriting upload and diagram detection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudioMeter({
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
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          <span className={cn("size-2 rounded-full shrink-0", dot)} />
          {label}
          <span className="text-muted-foreground font-normal text-[11px]">{name}</span>
        </span>
        <span className="font-mono font-bold tabular-nums text-foreground">
          {awarded}/{outOf}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", dot)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Command-word drill
   ══════════════════════════════════════════════════════════════════════════ */

type Drill = {
  word: string;
  marks: string;
  options: string[];
  answer: number;
  because: string;
};

const DRILLS: Drill[] = [
  {
    word: "Assess",
    marks: "8–12 marks",
    options: [
      "List the advantages, then the disadvantages",
      "Weigh the arguments and reach a supported judgement",
      "Define the term and draw the diagram",
    ],
    answer: 1,
    because:
      "Assess is an AO3 command. A balanced list scores nothing extra without a judgement that says which side dominates, and why.",
  },
  {
    word: "Explain",
    marks: "4–8 marks",
    options: [
      "Give a chain of reasoning from cause to effect",
      "State the definition accurately",
      "Compare two policies",
    ],
    answer: 0,
    because:
      "Explain is AO2. The marks are in the links — 'so', 'therefore', 'which means' — not in the opening definition.",
  },
  {
    word: "Consider whether",
    marks: "8–12 marks",
    options: [
      "Describe both cases neutrally",
      "Say yes or no in the first line and stop",
      "Argue both ways, then decide under what conditions",
    ],
    answer: 2,
    because:
      "The marks sit in the conditions: it depends on elasticity, time period, or the size of the multiplier. 'It depends' is only worth something once you say on what.",
  },
  {
    word: "Analyse",
    marks: "6–8 marks",
    options: [
      "Break the mechanism down and follow it through",
      "Judge which effect matters most",
      "Recall the relevant theory",
    ],
    answer: 0,
    because:
      "Analyse is AO2 without the AO3. You are asked for the mechanism, not the verdict — spending half the answer evaluating costs you the analysis marks.",
  },
];

export function CommandWordDrill() {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const drill = DRILLS[index];

  const choose = (option: number) => {
    if (picked !== null) return;
    setPicked(option);
    if (option === drill.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (index + 1 >= DRILLS.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  };

  const restart = () => {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <div className="pop pop-in p-6 text-center md:p-8">
        <p className="eyebrow eyebrow-accent">Drill complete</p>
        <p className="mt-3 font-display text-5xl font-bold tabular-nums">
          {score}
          <span className="text-2xl text-muted-foreground">/{DRILLS.length}</span>
        </p>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-pretty text-muted-foreground">
          {score === DRILLS.length
            ? "That's the whole trick: the command word tells you which objective the marks are in before you write a word."
            : "Command words are the cheapest marks on the paper — they tell you which objective is being tested before you start writing."}
        </p>
        <button
          type="button"
          onClick={restart}
          className="pop-sm pop-press mt-6 inline-flex items-center gap-2 bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <RotateCcw className="size-4" />
          Go again
        </button>
      </div>
    );
  }

  return (
    <div className="pop p-6 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow eyebrow-accent">Command word drill</p>
        <div
          className="flex items-center gap-1.5"
          aria-label={`Question ${index + 1} of ${DRILLS.length}`}
        >
          {DRILLS.map((item, i) => (
            <span
              key={item.word}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index
                  ? "w-6 bg-primary"
                  : i < index
                    ? "w-1.5 bg-primary/40"
                    : "w-1.5 bg-muted",
              )}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-baseline gap-3">
        <h3 className="font-display text-3xl font-bold md:text-4xl">“{drill.word}”</h3>
        <span className="font-mono text-xs text-muted-foreground">{drill.marks}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        What is the examiner actually asking for?
      </p>

      <div className="mt-6 space-y-2.5">
        {drill.options.map((option, i) => {
          const isAnswer = i === drill.answer;
          const isPicked = picked === i;
          const revealed = picked !== null;
          return (
            <button
              key={option}
              type="button"
              onClick={() => choose(i)}
              disabled={revealed}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border-[1.5px] p-3.5 text-left text-sm transition-all duration-200",
                !revealed &&
                  "border-border hover:-translate-y-0.5 hover:border-primary/50 hover:bg-muted/60",
                revealed && isAnswer && "border-ao2 bg-ao2/12",
                revealed && isPicked && !isAnswer && "border-destructive bg-destructive/10",
                revealed && !isAnswer && !isPicked && "border-border opacity-55",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
                  revealed && isAnswer && "border-ao2 bg-ao2 text-background",
                  revealed &&
                    isPicked &&
                    !isAnswer &&
                    "border-destructive bg-destructive text-background",
                  (!revealed || (!isAnswer && !isPicked)) && "border-input",
                )}
                aria-hidden="true"
              >
                {revealed && isAnswer ? <Check className="size-3.5" strokeWidth={3} /> : null}
                {revealed && isPicked && !isAnswer ? (
                  <X className="size-3.5" strokeWidth={3} />
                ) : null}
              </span>
              <span className="leading-relaxed">{option}</span>
            </button>
          );
        })}
      </div>

      {picked !== null ? (
        <div className="pop-in mt-5 rounded-lg bg-muted/70 p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{drill.because}</p>
          <button
            type="button"
            onClick={next}
            className="pop-sm pop-press mt-4 inline-flex items-center gap-2 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {index + 1 >= DRILLS.length ? "See score" : "Next command word"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
