/**
 * The two pieces of the landing page a student can actually play with.
 *
 * Both are deliberately real: the marking demo types a genuine Paper 2
 * answer and lights up the assessment objective each clause is earning, and
 * the command-word drill uses the same definitions the examiner prompt uses.
 * A marketing page for a marking tool should let you feel the marking, not
 * just read a description of it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Pause, Play, RotateCcw, X } from "lucide-react";

import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════════════════════════════════
   Live marking demo
   ══════════════════════════════════════════════════════════════════════════ */

type Ao = "AO1" | "AO2" | "AO3";

type Clause = {
  text: string;
  ao: Ao | null;
  note?: string;
};

type Specimen = {
  paper: string;
  question: string;
  total: number;
  clauses: Clause[];
};

const AO_META: Record<Ao, { name: string; dot: string; text: string; ring: string }> = {
  AO1: { name: "Knowledge", dot: "bg-ao1", text: "text-ao1", ring: "ring-ao1/40" },
  AO2: { name: "Analysis", dot: "bg-ao2", text: "text-ao2", ring: "ring-ao2/40" },
  AO3: { name: "Evaluation", dot: "bg-ao3", text: "text-ao3", ring: "ring-ao3/40" },
};

const SPECIMENS: Specimen[] = [
  {
    paper: "Paper 2 · 4(b)",
    question:
      "Assess whether a minimum price is the most effective way to reduce consumption of a demerit good.",
    total: 12,
    clauses: [
      {
        text: "A minimum price is a price floor set above equilibrium, ",
        ao: "AO1",
        note: "Definition, precisely stated. AO1 credited.",
      },
      {
        text: "used where a demerit good is over-consumed because its external costs are ignored by the individual. ",
        ao: "AO1",
        note: "Links the policy to the market failure. Still AO1, but earning it.",
      },
      {
        text: "Raising price from P1 to Pmin contracts demand along the curve to Q2, ",
        ao: "AO2",
        note: "The chain has started — and it's on the diagram.",
      },
      {
        text: "so consumption and therefore external cost fall, moving output toward the social optimum. ",
        ao: "AO2",
        note: "Cause reaches consequence. This is the sentence most answers stop before.",
      },
      {
        text: "However the size of that fall depends on price elasticity of demand: for an addictive good demand is inelastic, so a large price rise buys a small fall in quantity. ",
        ao: "AO3",
        note: "Judgement with a condition attached. AO3 in full.",
      },
      {
        text: "A minimum price is therefore most effective where demand is relatively elastic and enforcement is credible; otherwise taxation with hypothecated revenue does more.",
        ao: "AO3",
        note: "Answers the actual command word: which, and when.",
      },
    ],
  },
  {
    paper: "Paper 4 · 6(a)",
    question:
      "Explain how a rise in the exchange rate affects a country's current account balance.",
    total: 8,
    clauses: [
      {
        text: "An appreciation raises the foreign-currency price of exports and lowers the domestic price of imports. ",
        ao: "AO1",
        note: "The mechanism, stated the right way round.",
      },
      {
        text: "Export volumes therefore contract and import volumes expand, ",
        ao: "AO2",
        note: "First link of the chain.",
      },
      {
        text: "so provided the Marshall–Lerner condition holds, the current account balance worsens. ",
        ao: "AO2",
        note: "Named condition doing real analytical work.",
      },
      {
        text: "In the short run the J-curve means volumes respond slowly and the balance may improve before it deteriorates.",
        ao: "AO3",
        note: "Time period distinguished — the cheapest AO3 mark on the paper.",
      },
    ],
  },
];

const TYPE_SPEED = 17; // ms per character

export function LiveMarkDemo() {
  const [specimenIndex, setSpecimenIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [playing, setPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [started, setStarted] = useState(false);

  const specimen = SPECIMENS[specimenIndex];
  const full = useMemo(() => specimen.clauses.map((c) => c.text).join(""), [specimen]);

  // Only start typing once the demo is actually on screen — otherwise it has
  // already finished by the time anyone scrolls down to it.
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setStarted(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setStarted(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Reduced motion gets the finished, fully-marked state immediately: the
    // information is the point, the typing is the flourish.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(full.length);
      return;
    }
    if (!started || !playing || typed >= full.length) return;
    const timer = window.setTimeout(
      () => setTyped((n) => Math.min(n + 1, full.length)),
      TYPE_SPEED,
    );
    return () => window.clearTimeout(timer);
  }, [started, playing, typed, full.length]);

  const restart = useCallback(() => {
    setTyped(0);
    setPlaying(true);
  }, []);

  const switchSpecimen = useCallback((index: number) => {
    setSpecimenIndex(index);
    setTyped(0);
    setPlaying(true);
  }, []);

  // Walk the clauses once, splitting the current one into typed / untyped.
  let cursor = 0;
  const rendered = specimen.clauses.map((clause, index) => {
    const start = cursor;
    cursor += clause.text.length;
    const visible = Math.max(0, Math.min(clause.text.length, typed - start));
    return { clause, index, visible, complete: typed >= cursor };
  });

  const activeNote = [...rendered].reverse().find((r) => r.visible > 0 && r.clause.note)
    ?.clause.note;

  // Marks accrue as each clause lands, so the number climbs with the writing.
  const earned = rendered.filter((r) => r.complete && r.clause.ao).length;
  const totalClauses = specimen.clauses.filter((c) => c.ao).length;
  const mark = Math.round((earned / totalClauses) * specimen.total);

  const aoTotals = (Object.keys(AO_META) as Ao[]).map((ao) => {
    const all = specimen.clauses.filter((c) => c.ao === ao).length;
    const hit = rendered.filter((r) => r.complete && r.clause.ao === ao).length;
    return { ao, pct: all === 0 ? 0 : Math.round((hit / all) * 100) };
  });

  const done = typed >= full.length;

  return (
    <div ref={containerRef} className="pop overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] border-ink/12 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5" aria-hidden="true">
            <span
              className={cn(
                "absolute inline-flex size-full rounded-full bg-primary opacity-70",
                !done && "animate-ping",
              )}
            />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-bold">{done ? "Marked" : "Marking as you write"}</span>
          <span className="eyebrow ml-1">{specimen.paper}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {SPECIMENS.map((item, index) => (
            <button
              key={item.paper}
              type="button"
              onClick={() => switchSpecimen(index)}
              aria-pressed={index === specimenIndex}
              className={cn(
                "rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-colors",
                index === specimenIndex
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {item.paper.split(" · ")[0]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => (done ? restart() : setPlaying((p) => !p))}
            className="ml-1 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={done ? "Play again" : playing ? "Pause" : "Play"}
          >
            {done ? (
              <RotateCcw className="size-4" />
            ) : playing ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
        {/* The script */}
        <div className="border-b-[1.5px] border-ink/12 p-5 md:p-6 lg:border-r-[1.5px] lg:border-b-0">
          <p className="text-sm leading-relaxed font-semibold text-pretty">{specimen.question}</p>

          <p className="mt-4 min-h-[13rem] font-serif text-[0.98rem] leading-[1.75] text-pretty">
            {rendered.map(({ clause, index, visible, complete }) => (
              <span
                key={index}
                className={cn(
                  "transition-colors duration-500",
                  complete && clause.ao === "AO1" && "bg-ao1/12 decoration-ao1",
                  complete && clause.ao === "AO2" && "bg-ao2/12 decoration-ao2",
                  complete && clause.ao === "AO3" && "bg-ao3/14 decoration-ao3",
                  complete && clause.ao && "rounded underline decoration-2 underline-offset-4",
                )}
              >
                {clause.text.slice(0, visible)}
              </span>
            ))}
            {!done ? <span className="caret" aria-hidden="true" /> : null}
          </p>

          {/* The examiner's margin note for whatever was written last. */}
          <div className="mt-4 min-h-[3.25rem]">
            {activeNote ? (
              <p
                key={activeNote}
                className="pop-in flex gap-2.5 rounded-lg bg-muted/70 p-3 text-xs leading-relaxed text-muted-foreground"
              >
                <span className="mt-0.5 shrink-0 font-mono font-semibold text-primary">
                  examiner
                </span>
                <span>{activeNote}</span>
              </p>
            ) : null}
          </div>
        </div>

        {/* The running mark */}
        <div className="p-5 md:p-6">
          <p className="eyebrow">Running mark</p>
          <p className="mt-1 font-display text-4xl font-bold tabular-nums">
            {mark}
            <span className="text-xl text-muted-foreground">/{specimen.total}</span>
          </p>

          <div className="mt-6 space-y-4">
            {aoTotals.map(({ ao, pct }) => (
              <div key={ao}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className={cn("size-2 rounded-full", AO_META[ao].dot)}
                      aria-hidden="true"
                    />
                    {ao}
                    <span className="text-muted-foreground">{AO_META[ao].name}</span>
                  </span>
                  <span className="font-mono tabular-nums text-muted-foreground">{pct}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-700 ease-out",
                      AO_META[ao].dot,
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            {done
              ? "Every clause is tagged with the objective it earned. The ones with no highlight earned nothing — that's where the rewrite plan starts."
              : "Watch which objective each clause lands in. Most answers are dense in AO1 and thin everywhere the grade is decided."}
          </p>
        </div>
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
