import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BookText,
  Bot,
  Check,
  Compass,
  Copy,
  Download,
  Globe2,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  LineChart,
  MessageSquarePlus,
  Mic,
  MicOff,
  PanelLeft,
  PenLine,
  Send,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  Wand2,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { EconomicsDiagram } from "@/components/diagrams/economics-diagram";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  sendGroundedChatMessage,
  type ChatDiagramPayload,
  type EconChatMode,
  type GroundedChatReply,
} from "@/lib/chat.functions";
import { cn } from "@/lib/utils";

const searchSchema = z
  .object({
    q: z.string().optional().catch(undefined),
    mode: z.enum(["quick", "exam", "diagram", "quiz"]).optional().catch(undefined),
  })
  .passthrough()
  .catch({});

export const Route = createFileRoute("/_authenticated/chat")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Marginal EconGPT — Specialized AI Economics Tutor" },
      {
        name: "description",
        content:
          "Specialized ChatGPT for Economics powered by NVIDIA AI and grounded in verified Cambridge 9708 mark schemes, live custom-generated diagrams, and real-world case studies.",
      },
    ],
  }),
  component: MarginalEconGptPage,
});

interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  voiceoverSummary?: string;
  modelLabel?: string;
  latencyMs?: number;
  kbVerified?: boolean;
  sources?: GroundedChatReply["sources"];
  diagram?: ChatDiagramPayload | null;
  keyDefinition?: GroundedChatReply["keyDefinition"];
  realWorldExample?: GroundedChatReply["realWorldExample"];
  nextTopics?: string[];
  autoDraftPrompt?: GroundedChatReply["autoDraftPrompt"];
  mode?: EconChatMode;
  timestamp: string;
}

interface ChatThread {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessageItem[];
}

const THREADS_STORAGE_KEY = "marginal.econgpt.threads.v1";

const MODE_OPTIONS: Array<{
  id: EconChatMode;
  label: string;
  shortLabel: string;
  hint: string;
  icon: typeof Sparkles;
}> = [
  {
    id: "quick",
    label: "Quick Intuition",
    shortLabel: "Quick",
    hint: "Fast 45-second mental model, analogy & real example",
    icon: Zap,
  },
  {
    id: "exam",
    label: "Exam A* (9708)",
    shortLabel: "Exam A*",
    hint: "Full Cambridge AO1/AO2/AO3 mark-scheme precision",
    icon: GraduationCap,
  },
  {
    id: "diagram",
    label: "Graph Studio",
    shortLabel: "Graphs",
    hint: "Generates custom interactive diagrams + curve walkthrough",
    icon: LineChart,
  },
  {
    id: "quiz",
    label: "Quiz Me",
    shortLabel: "Quiz",
    hint: "Explains briefly then tests you with active recall",
    icon: HelpCircle,
  },
];

const STARTER_CARDS = [
  {
    title: "Marshall-Lerner & J-Curve",
    category: "International Trade",
    prompt: "Explain the Marshall-Lerner condition and J-Curve simply with a diagram and real example.",
    mode: "diagram" as EconChatMode,
    accent: "text-sky-500 bg-sky-500/10 border-sky-500/25",
  },
  {
    title: "Monopoly & Deadweight Loss",
    category: "Market Structures",
    prompt: "Draw a monopoly diagram showing why P > MC causes allocative inefficiency and deadweight loss.",
    mode: "diagram" as EconChatMode,
    accent: "text-purple-500 bg-purple-500/10 border-purple-500/25",
  },
  {
    title: "Stagflation Policy Dilemma",
    category: "Macroeconomics",
    prompt: "Generate a new AD/AS graph showing stagflation and explain why central banks struggle to fix it.",
    mode: "diagram" as EconChatMode,
    accent: "text-amber-500 bg-amber-500/10 border-amber-500/25",
  },
  {
    title: "Elasticity & Cigarette Tax Incidence",
    category: "Microeconomics",
    prompt: "Why do consumers pay most of a cigarette tax? Explain quickly with a graph and real-world case.",
    mode: "quick" as EconChatMode,
    accent: "text-emerald-500 bg-emerald-500/10 border-emerald-500/25",
  },
  {
    title: "Carbon Tax & Negative Externalities",
    category: "Market Failure",
    prompt: "Show how a Pigouvian carbon tax fixes a negative production externality with a diagram and real example.",
    mode: "diagram" as EconChatMode,
    accent: "text-indigo-500 bg-indigo-500/10 border-indigo-500/25",
  },
  {
    title: "Keynesian Multiplier & Crowding Out",
    category: "Fiscal Policy",
    prompt: "Explain the Keynesian multiplier and crowding out like I am learning it for the first time, then quiz me.",
    mode: "quiz" as EconChatMode,
    accent: "text-rose-500 bg-rose-500/10 border-rose-500/25",
  },
];

const SIDEBAR_EXPLORE_TOPICS = [
  { label: "Price Ceilings & Black Markets", prompt: "Explain binding maximum prices and black markets with a diagram and real example." },
  { label: "Tariffs vs Import Quotas", prompt: "Generate a tariff diagram and compare tariffs vs quotas with real-world trade examples." },
  { label: "Phillips Curve (SR vs LR)", prompt: "Explain the short-run vs long-run Phillips curve with a diagram." },
  { label: "Kinked Demand Oligopoly", prompt: "Explain the kinked demand curve in oligopoly and why prices stay rigid, with a diagram." },
  { label: "Indifference Curves & Income Effect", prompt: "Explain income and substitution effects for normal vs inferior goods simply with a graph." },
  { label: "Comparative Advantage", prompt: "Explain comparative advantage vs absolute advantage with a quick numerical example." },
];

function loadSavedThreads(): ChatThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(THREADS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

function saveThreads(threads: ChatThread[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(threads.slice(0, 20)));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Formats inline LaTeX-style economics notation into crisp typographic Unicode
 * (e.g., $S_1 \to S_2$ -> S₁ → S₂, $\Delta P$ -> ΔP, $|PED| < 1$ -> |PED| < 1).
 */
function prettifyEconMath(raw: string): string {
  const subMap: Record<string, string> = {
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
    "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
    e: "ₑ", m: "ₘ", s: "ₛ", p: "ₚ", w: "w",
  };
  const replaceMath = (expr: string) =>
    expr
      .replace(/\\text\{([^}]+)\}/g, "$1")
      .replace(/\\mathrm\{([^}]+)\}/g, "$1")
      .replace(/\\to|\\rightarrow/g, "→")
      .replace(/\\leftarrow/g, "←")
      .replace(/\\uparrow/g, "↑")
      .replace(/\\downarrow/g, "↓")
      .replace(/\\Delta/g, "Δ")
      .replace(/\\times/g, "×")
      .replace(/\\div/g, "÷")
      .replace(/\\infty/g, "∞")
      .replace(/\\geq|\\ge/g, "≥")
      .replace(/\\leq|\\le/g, "≤")
      .replace(/\\neq/g, "≠")
      .replace(/\\approx/g, "≈")
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)")
      .replace(/_\{?([0-9emps])\}?/g, (_, ch) => subMap[ch] ?? ch)
      .replace(/\\([a-zA-Z]+)/g, "$1")
      .trim();

  return raw
    .replace(/\$\$([^$]+)\$\$/g, (_, m) => replaceMath(m))
    .replace(/\$([^$\n]+)\$/g, (_, m) => replaceMath(m));
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  const pretty = prettifyEconMath(text);
  const parts: React.ReactNode[] = [];
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = tokenRegex.exec(pretty)) !== null) {
    if (match.index > last) {
      parts.push(pretty.slice(last, match.index));
    }
    const tok = match[0];
    if (tok.startsWith("**") && tok.endsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else if (tok.startsWith("`") && tok.endsWith("`")) {
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-muted/80 border border-border/60 font-mono text-[12px] text-foreground"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("*") && tok.endsWith("*")) {
      parts.push(
        <em key={key++} className="italic text-foreground/90">
          {tok.slice(1, -1)}
        </em>,
      );
    }
    last = match.index + tok.length;
  }

  if (last < pretty.length) {
    parts.push(pretty.slice(last));
  }
  return parts;
}

function EconMarkdown({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      blocks.push(<hr key={key++} className="my-3 border-border/60" />);
      i++;
      continue;
    }

    // Markdown table
    if (trimmed.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:-]+\|/.test(lines[i + 1] ?? "")) {
      const headerCells = trimmed
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim());
      i += 2;
      const bodyRows: string[][] = [];
      while (i < lines.length && (lines[i] ?? "").trim().includes("|")) {
        const rowCells = (lines[i] ?? "")
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim());
        bodyRows.push(rowCells);
        i++;
      }
      blocks.push(
        <div key={key++} className="my-3 overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border/70">
                {headerCells.map((hc, ci) => (
                  <th key={ci} className="px-3 py-2 text-left font-bold text-foreground">
                    {renderInlineFormatting(hc)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {bodyRows.map((row, ri) => (
                <tr key={ri} className="hover:bg-muted/25">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-foreground/90">
                      {renderInlineFormatting(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1]!.length;
      const text = headingMatch[2]!;
      blocks.push(
        <h3
          key={key++}
          className={cn(
            "font-bold tracking-tight text-foreground mt-4 mb-1.5 first:mt-0",
            level <= 2 ? "text-[15px]" : "text-sm",
          )}
        >
          {renderInlineFormatting(text)}
        </h3>,
      );
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i] ?? "").trim().startsWith(">")) {
        quoteLines.push((lines[i] ?? "").trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-2.5 border-l-2 border-primary/60 bg-primary/[0.04] pl-3.5 pr-3 py-2 rounded-r-lg text-[13.5px] text-foreground/90"
        >
          {renderInlineFormatting(quoteLines.join(" "))}
        </blockquote>,
      );
      continue;
    }

    // Unordered list
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test((lines[i] ?? "").trim())) {
        items.push((lines[i] ?? "").trim().replace(/^[-*•]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-2 space-y-1.5 pl-4 list-disc marker:text-primary/70">
          {items.map((it, idx) => (
            <li key={idx} className="text-[13.5px] leading-relaxed text-foreground/90">
              {renderInlineFormatting(it)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test((lines[i] ?? "").trim())) {
        items.push((lines[i] ?? "").trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="my-2 space-y-1.5 pl-4 list-decimal marker:font-semibold marker:text-primary">
          {items.map((it, idx) => (
            <li key={idx} className="text-[13.5px] leading-relaxed text-foreground/90">
              {renderInlineFormatting(it)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Standard paragraph
    const paraLines: string[] = [trimmed];
    i++;
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() &&
      !/^(#{1,4}\s+|[-*•]\s+|\d+\.\s+|>|---+$)/.test((lines[i] ?? "").trim())
    ) {
      paraLines.push((lines[i] ?? "").trim());
      i++;
    }
    blocks.push(
      <p key={key++} className="my-2 first:mt-0 text-[13.5px] leading-relaxed text-foreground/90">
        {renderInlineFormatting(paraLines.join(" "))}
      </p>,
    );
  }

  return <div className="space-y-1">{blocks}</div>;
}

function ChatDiagramCard({
  diagram,
  onModify,
}: {
  diagram: ChatDiagramPayload;
  onModify: (title: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showSteps, setShowSteps] = useState(true);

  const handleDownloadSvg = () => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${diagram.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Diagram downloaded as SVG!");
  };

  return (
    <div className="mt-3.5 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/[0.05] via-card to-card overflow-hidden shadow-xs">
      {/* Diagram Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-border/60 bg-muted/25">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-6 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500 shrink-0">
            <LineChart className="size-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-foreground truncate">{diagram.title}</p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[9.5px] font-mono font-bold px-1.5 py-0 shrink-0",
              diagram.kind === "custom"
                ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-indigo-500/35 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
            )}
          >
            {diagram.kind === "custom" ? "AI-Generated Graph" : "9708 Calibrated"}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onModify(diagram.title)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border/70 bg-background/80 hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Ask EconGPT to modify or draw a shift on this graph"
          >
            <Wand2 className="size-3 text-primary" />
            <span>Modify</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border/70 bg-background/80 hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Download diagram SVG for revision notes"
          >
            <Download className="size-3" />
            <span className="hidden sm:inline">SVG</span>
          </button>
          <Link
            to="/diagram-lab"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border/70 bg-background/80 hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            title="Open interactive Diagram CAD Lab"
          >
            <Sliders className="size-3 text-violet-500" />
            <span className="hidden sm:inline">CAD Lab</span>
          </Link>
        </div>
      </div>

      {/* Rendered SVG Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
        <div
          ref={containerRef}
          className={cn(
            "p-3 sm:p-4 bg-card flex flex-col items-center justify-center",
            diagram.walkthrough.length > 0 ? "md:col-span-7 md:border-r border-border/60" : "md:col-span-12",
          )}
        >
          <div className="w-full max-w-[440px]">
            <EconomicsDiagram spec={diagram.spec} title={diagram.title} />
          </div>
          {diagram.caption && (
            <p className="mt-2 text-[11.5px] text-center text-muted-foreground max-w-md leading-snug">
              {diagram.caption}
            </p>
          )}
        </div>

        {/* Step-by-Step Curve Walkthrough */}
        {diagram.walkthrough.length > 0 && (
          <div className="md:col-span-5 p-3.5 bg-muted/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                  How to Read This Graph
                </span>
                <button
                  type="button"
                  onClick={() => setShowSteps((s) => !s)}
                  className="text-[10.5px] text-primary hover:underline cursor-pointer md:hidden"
                >
                  {showSteps ? "Hide" : "Show"}
                </button>
              </div>
              {showSteps && (
                <ol className="space-y-2">
                  {diagram.walkthrough.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 leading-relaxed">
                      <span className="size-4.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{renderInlineFormatting(step)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MarginalEconGptPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const sendFn = useServerFn(sendGroundedChatMessage);

  const [threads, setThreads] = useState<ChatThread[]>(() => loadSavedThreads());
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [mode, setMode] = useState<EconChatMode>(search.mode ?? "quick");
  const [forceGraph, setForceGraph] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState(search.q ?? "");
  const [isSending, setIsSending] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [expandedSourceMsgId, setExpandedSourceMsgId] = useState<string | null>(null);
  const [isDictating, setIsDictating] = useState(false);

  const [activeDraft, setActiveDraft] = useState<GroundedChatReply["autoDraftPrompt"] | null>(null);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dictationRecRef = useRef<any>(null);
  const initialQueryRanRef = useRef(false);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) ?? null,
    [threads, activeThreadId],
  );
  const messages = activeThread?.messages ?? [];

  useEffect(() => {
    saveThreads(threads);
  }, [threads]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isSending]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (dictationRecRef.current) {
        try {
          dictationRecRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const handleNewChat = () => {
    setActiveThreadId(null);
    setInputMessage("");
    setForceGraph(false);
    textareaRef.current?.focus();
  };

  const handleDeleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (activeThreadId === id) {
      setActiveThreadId(null);
    }
  };

  const handleSend = useCallback(
    async (overrideText?: string, overrideMode?: EconChatMode, overrideGraph?: boolean) => {
      if (isDictating && dictationRecRef.current) {
        try {
          dictationRecRef.current.stop();
        } catch {}
        setIsDictating(false);
      }

      const textToSend = (overrideText ?? inputMessage).trim();
      if (!textToSend || isSending) return;

      const effectiveMode = overrideMode ?? mode;
      const effectiveGraph = overrideGraph ?? forceGraph;

      const userMsg: ChatMessageItem = {
        id: `u-${Date.now()}`,
        role: "user",
        content: textToSend,
        mode: effectiveMode,
        timestamp: new Date().toISOString(),
      };

      let targetThreadId = activeThreadId;
      const priorMessages = activeThread?.messages ?? [];

      if (!targetThreadId) {
        targetThreadId = `thread-${Date.now()}`;
        const newThread: ChatThread = {
          id: targetThreadId,
          title: textToSend.length > 46 ? `${textToSend.slice(0, 46)}…` : textToSend,
          updatedAt: new Date().toISOString(),
          messages: [userMsg],
        };
        setThreads((prev) => [newThread, ...prev]);
        setActiveThreadId(targetThreadId);
      } else {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === targetThreadId
              ? { ...t, updatedAt: new Date().toISOString(), messages: [...t.messages, userMsg] }
              : t,
          ),
        );
      }

      setInputMessage("");
      setForceGraph(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      setIsSending(true);

      try {
        const history = priorMessages.slice(-8).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await sendFn({
          data: {
            message: textToSend,
            mode: effectiveMode,
            forceGraph: effectiveGraph,
            history,
          },
        });

        const assistantMsg: ChatMessageItem = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: res.reply,
          voiceoverSummary: res.voiceoverSummary,
          modelLabel: res.modelLabel,
          latencyMs: res.latencyMs,
          kbVerified: res.kbVerified,
          sources: res.sources,
          diagram: res.diagram,
          keyDefinition: res.keyDefinition,
          realWorldExample: res.realWorldExample,
          nextTopics: res.nextTopics,
          autoDraftPrompt: res.autoDraftPrompt,
          mode: effectiveMode,
          timestamp: new Date().toISOString(),
        };

        setThreads((prev) =>
          prev.map((t) =>
            t.id === targetThreadId
              ? { ...t, updatedAt: new Date().toISOString(), messages: [...t.messages, assistantMsg] }
              : t,
          ),
        );

        if (res.isEssayDraftRequest && res.autoDraftPrompt) {
          setActiveDraft(res.autoDraftPrompt);
          setDraftModalOpen(true);
        }
      } catch (err: any) {
        const errMessage = err?.message || "Could not reach Marginal EconGPT right now. Please try again.";
        toast.error(errMessage);
        const failMsg: ChatMessageItem = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `I ran into a temporary issue reaching the AI engine: **${errMessage}**. Please try sending your question again.`,
          nextTopics: ["Try asking that again", "Draw a Supply & Demand shift diagram"],
          timestamp: new Date().toISOString(),
        };
        setThreads((prev) =>
          prev.map((t) =>
            t.id === targetThreadId ? { ...t, messages: [...t.messages, failMsg] } : t,
          ),
        );
      } finally {
        setIsSending(false);
      }
    },
    [activeThread, activeThreadId, forceGraph, inputMessage, isDictating, isSending, mode, sendFn],
  );

  // Auto-run URL ?q= prefill once on mount
  useEffect(() => {
    if (search.q && !initialQueryRanRef.current) {
      initialQueryRanRef.current = true;
      handleSend(search.q, search.mode ?? "quick");
    }
  }, [search.q, search.mode, handleSend]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoiceDictation = () => {
    if (typeof window === "undefined") return;
    if (isDictating) {
      try {
        dictationRecRef.current?.stop();
      } catch {}
      setIsDictating(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.error("Voice dictation requires Chrome, Edge, or Safari.");
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = "en-US";
      rec.interimResults = true;
      rec.continuous = true;
      rec.onstart = () => setIsDictating(true);
      rec.onresult = (event: any) => {
        let txt = "";
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i]?.[0]) txt += event.results[i][0].transcript + " ";
        }
        setInputMessage(txt.trim());
      };
      rec.onerror = () => setIsDictating(false);
      rec.onend = () => setIsDictating(false);
      dictationRecRef.current = rec;
      rec.start();
    } catch {
      setIsDictating(false);
    }
  };

  const handleToggleSpeak = (msg: ChatMessageItem) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Text-to-speech is not supported in this browser.");
      return;
    }
    if (speakingMsgId === msg.id) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const spoken = (msg.voiceoverSummary || msg.content).replace(/[*_#>`~|]/g, "").trim();
    if (!spoken) return;
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.rate = 1.02;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    setSpeakingMsgId(msg.id);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (text: string, id: string) => {
    if (typeof navigator === "undefined") return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied explanation!");
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleModifyGraph = (title: string) => {
    setForceGraph(true);
    setInputMessage(`Modify the "${title}" graph to show `);
    textareaRef.current?.focus();
  };

  const handleTransferToGrader = () => {
    if (!activeDraft) return;
    try {
      sessionStorage.setItem("marginal_prefill_draft", activeDraft.essayDraft);
      sessionStorage.setItem("marginal_prefill_q", activeDraft.question);
    } catch {}
    setDraftModalOpen(false);
    toast.success("Draft loaded into Essay Grader!");
    navigate({
      to: "/grade",
      search: { q: activeDraft.question, marks: activeDraft.marks },
    });
  };

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] bg-background overflow-hidden">
      {/* ── LEFT SIDEBAR: Conversation History & Topic Explorer ── */}
      <aside
        className={cn(
          "border-r border-border/70 bg-card/60 backdrop-blur-sm flex-col shrink-0 transition-all duration-200 hidden md:flex",
          sidebarOpen ? "w-64 lg:w-72" : "w-0 overflow-hidden border-r-0",
        )}
      >
        <div className="p-3 border-b border-border/60 flex items-center gap-2">
          <Button
            onClick={handleNewChat}
            size="sm"
            className="flex-1 h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1.5 shadow-xs cursor-pointer"
          >
            <MessageSquarePlus className="size-3.5" />
            <span>New Economics Topic</span>
          </Button>
        </div>

        {/* Saved Threads */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
          <div className="space-y-1">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Recent Topics
            </p>
            {threads.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground/80">
                Your topic threads will appear here so you can revisit graphs &amp; notes anytime.
              </p>
            ) : (
              threads.map((t) => {
                const isActive = t.id === activeThreadId;
                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveThreadId(t.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setActiveThreadId(t.id)}
                    className={cn(
                      "group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold border border-primary/25"
                        : "text-foreground/85 hover:bg-muted/70 border border-transparent",
                    )}
                  >
                    <span className="truncate">{t.title}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteThread(t.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/15 hover:text-destructive transition-all cursor-pointer shrink-0"
                      aria-label="Delete thread"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Syllabus Explorer */}
          <div className="space-y-1 pt-2 border-t border-border/60">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Compass className="size-3 text-primary" />
              Explore Hard Topics
            </p>
            {SIDEBAR_EXPLORE_TOPICS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleSend(item.prompt, "diagram", true)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer truncate"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Grounding Badge */}
        <div className="p-3 border-t border-border/60 bg-muted/20">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
            <span>Grounded in Cambridge 9708 Mark Schemes &amp; Definitions</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN CHATGPT CANVAS ── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Studio Bar */}
        <header className="shrink-0 h-13 border-b border-border/70 bg-background/90 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between gap-2 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="hidden md:inline-flex size-8 items-center justify-center rounded-lg border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
              title="Toggle sidebar"
              aria-label="Toggle sidebar"
            >
              <PanelLeft className="size-4" />
            </button>

            <div className="size-7 rounded-xl bg-gradient-to-br from-emerald-500 via-primary to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Bot className="size-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold tracking-tight text-foreground truncate">
                  Marginal EconGPT
                </h1>
                <Badge
                  variant="outline"
                  className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold border-emerald-500/35 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0"
                >
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  NVIDIA AI · KB Verified
                </Badge>
              </div>
            </div>
          </div>

          {/* 4-Mode Selector + New Chat */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-xl bg-muted/60 p-0.5 border border-border/70">
              {MODE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = mode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMode(opt.id)}
                    title={opt.hint}
                    className={cn(
                      "flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer",
                      active
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("size-3", active ? "text-primary" : "opacity-70")} />
                    <span className="hidden lg:inline">{opt.label}</span>
                    <span className="lg:hidden">{opt.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNewChat}
              className="md:hidden h-8 px-2.5 rounded-lg text-xs"
              title="New topic"
            >
              <MessageSquarePlus className="size-3.5" />
            </Button>
          </div>
        </header>

        {/* Scrollable Message Stream OR Welcome Hero */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 sm:py-7">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 ? (
              /* ── ZERO-FRICTION WELCOME HERO ── */
              <div className="py-4 sm:py-8 space-y-7">
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                    <Sparkles className="size-3.5" />
                    <span>Powered by NVIDIA Nemotron · Grounded in Cambridge 9708 Knowledge Base</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    Master any hard economics concept{" "}
                    <span className="bg-gradient-to-r from-primary via-indigo-500 to-emerald-500 bg-clip-text text-transparent">
                      in seconds.
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                    Your specialized ChatGPT for Economics — ask anything to get crystal-clear explanations,
                    brand-new custom graphs, real-world examples, and Cambridge mark-scheme verified facts.
                  </p>
                </div>

                {/* 6 Curated Hard-Topic Launch Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {STARTER_CARDS.map((card) => (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => handleSend(card.prompt, card.mode, card.mode === "diagram")}
                      className="group text-left p-4 rounded-2xl border border-border/80 bg-card/85 hover:bg-card hover:border-primary/45 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-2.5"
                    >
                      <div className="space-y-1.5">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] font-semibold px-2 py-0", card.accent)}
                        >
                          {card.category}
                        </Badge>
                        <p className="text-xs sm:text-[13px] font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                          {card.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {card.prompt}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-primary/80 group-hover:text-primary pt-1">
                        <span>Learn &amp; visualize</span>
                        <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ── ACTIVE CONVERSATION THREAD ── */
              <div className="space-y-7 pb-6">
                {messages.map((msg) =>
                  msg.role === "user" ? (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2.5 text-sm shadow-xs leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <article key={msg.id} className="space-y-3">
                      {/* Assistant Identity + Verification Header */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-lg bg-gradient-to-br from-emerald-500 via-primary to-indigo-600 flex items-center justify-center text-white shrink-0">
                            <Bot className="size-3.5" />
                          </div>
                          <span className="text-xs font-bold text-foreground">Marginal EconGPT</span>
                          {msg.modelLabel && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono px-1.5 py-0 border-border/80 bg-muted/40 text-muted-foreground"
                            >
                              {msg.modelLabel}
                            </Badge>
                          )}
                          {msg.kbVerified && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold px-1.5 py-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1"
                            >
                              <ShieldCheck className="size-2.5" />
                              KB Verified
                            </Badge>
                          )}
                        </div>
                        {msg.latencyMs && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {(msg.latencyMs / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>

                      <div className="pl-0 sm:pl-8 space-y-3">
                        {/* Key Cambridge Definition Callout */}
                        {msg.keyDefinition && (
                          <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.06] px-3.5 py-2.5 flex items-start gap-2.5">
                            <BookText className="size-4 text-sky-500 shrink-0 mt-0.5" />
                            <div className="text-xs leading-relaxed">
                              <span className="font-bold text-foreground">{msg.keyDefinition.term}: </span>
                              <span className="text-foreground/90">{msg.keyDefinition.definition}</span>
                            </div>
                          </div>
                        )}

                        {/* Main Formatted Explanation */}
                        <div className="rounded-2xl border border-border/70 bg-card/85 px-4 sm:px-5 py-4 shadow-2xs">
                          <EconMarkdown content={msg.content} />
                        </div>

                        {/* Live Interactive Diagram / AI-Generated Custom Graph */}
                        {msg.diagram && (
                          <ChatDiagramCard diagram={msg.diagram} onModify={handleModifyGraph} />
                        )}

                        {/* Real-World Example Spotlight */}
                        {msg.realWorldExample && (
                          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.07] via-card to-card px-4 py-3 space-y-1">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                <Globe2 className="size-3.5 text-emerald-500 shrink-0" />
                                <span>Real-World Case: {msg.realWorldExample.title}</span>
                              </div>
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0"
                              >
                                {msg.realWorldExample.region}
                              </Badge>
                            </div>
                            {msg.realWorldExample.stat && (
                              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                {msg.realWorldExample.stat}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {msg.realWorldExample.takeaway}
                            </p>
                          </div>
                        )}

                        {/* Verified Knowledge Base Sources */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className="text-[10.5px] font-semibold text-muted-foreground inline-flex items-center gap-1 mr-0.5">
                                <BookOpen className="size-3 text-primary" />
                                Grounded in:
                              </span>
                              {msg.sources.map((src, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() =>
                                    setExpandedSourceMsgId((curr) =>
                                      curr === `${msg.id}-${idx}` ? null : `${msg.id}-${idx}`,
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border/70 bg-muted/40 hover:bg-muted text-[10.5px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                >
                                  <span className="font-medium truncate max-w-[180px]">{src.title}</span>
                                  {src.similarity ? (
                                    <span className="font-mono text-[9.5px] text-emerald-600 dark:text-emerald-400">
                                      {src.similarity}%
                                    </span>
                                  ) : null}
                                </button>
                              ))}
                            </div>
                            {msg.sources.map((src, idx) =>
                              expandedSourceMsgId === `${msg.id}-${idx}` && src.snippet ? (
                                <div
                                  key={`snip-${idx}`}
                                  className="rounded-xl border border-border/70 bg-muted/30 p-3 text-[11.5px] text-muted-foreground leading-relaxed"
                                >
                                  <p className="font-semibold text-foreground mb-1">
                                    {src.title} · {src.chapter}
                                  </p>
                                  <p className="italic">"{src.snippet}…"</p>
                                </div>
                              ) : null,
                            )}
                          </div>
                        )}

                        {/* Utility Actions Row */}
                        <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                          >
                            {copiedId === msg.id ? (
                              <Check className="size-3 text-emerald-500" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                            <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleSpeak(msg)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                          >
                            {speakingMsgId === msg.id ? (
                              <VolumeX className="size-3 text-primary" />
                            ) : (
                              <Volume2 className="size-3" />
                            )}
                            <span>{speakingMsgId === msg.id ? "Stop" : "Listen"}</span>
                          </button>

                          {msg.autoDraftPrompt && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDraft(msg.autoDraftPrompt ?? null);
                                setDraftModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            >
                              <PenLine className="size-3" />
                              <span>Turn into 12m Essay</span>
                            </button>
                          )}
                        </div>

                        {/* Curiosity-Driven Follow-Up Topic Chips */}
                        {msg.nextTopics && msg.nextTopics.length > 0 && (
                          <div className="pt-1.5 space-y-1.5">
                            <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <Lightbulb className="size-3 text-amber-500" />
                              Keep Learning Next
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.nextTopics.map((topic, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleSend(topic)}
                                  disabled={isSending}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-primary/5 hover:border-primary/40 text-xs font-medium text-foreground/90 hover:text-primary transition-all cursor-pointer text-left"
                                >
                                  <span>{topic}</span>
                                  <ArrowUpRight className="size-3 shrink-0 opacity-60" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  ),
                )}

                {/* Thinking Indicator */}
                {isSending && (
                  <div className="flex items-start gap-3 pl-0 sm:pl-8">
                    <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] px-4 py-3 flex items-center gap-3">
                      <div className="flex gap-1">
                        <span className="size-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                        <span className="size-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:150ms]" />
                        <span className="size-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:300ms]" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        NVIDIA AI is checking the Cambridge 9708 Knowledge Base &amp; crafting your visual explanation…
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* ── ELEVATED CHATGPT COMPOSER ── */}
        <div className="shrink-0 border-t border-border/70 bg-background/95 backdrop-blur-md px-4 sm:px-6 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl border border-border/80 bg-card shadow-md focus-within:border-primary/55 focus-within:ring-4 focus-within:ring-primary/10 transition-all px-3 py-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputMessage}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask any economics question, paste a confusing concept, or say 'Draw a graph for...'"
                className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/75 focus:outline-none px-1.5 py-1 max-h-40"
              />

              <div className="flex items-center justify-between gap-2 pt-1.5 mt-1 border-t border-border/50">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setForceGraph((g) => !g)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer",
                      forceGraph
                        ? "border-emerald-500/45 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "border-border/70 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                    title="Force EconGPT to generate a custom interactive economics graph for your next message"
                  >
                    <LineChart className="size-3.5" />
                    <span>{forceGraph ? "Custom Graph ON" : "+ Generate Graph"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleVoiceDictation}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer",
                      isDictating
                        ? "border-rose-500/45 bg-rose-500/15 text-rose-600 dark:text-rose-400 animate-pulse"
                        : "border-border/70 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                    title="Dictate your question with voice"
                  >
                    {isDictating ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                    <span className="hidden sm:inline">{isDictating ? "Listening…" : "Voice"}</span>
                  </button>
                </div>

                <Button
                  type="button"
                  size="sm"
                  disabled={!inputMessage.trim() || isSending}
                  onClick={() => handleSend()}
                  className="h-8 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Send</span>
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
            <p className="mt-1.5 text-[10.5px] text-center text-muted-foreground">
              Marginal EconGPT grounds every answer in official Cambridge 9708 Mark Schemes, Definitions &amp; Examples Bank.
            </p>
          </div>
        </div>
      </div>

      {/* ── AUTO-DRAFT ESSAY TRANSFER MODAL ── */}
      <Dialog open={draftModalOpen} onOpenChange={setDraftModalOpen}>
        <DialogContent className="max-w-2xl max-h-[82vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <PenLine className="size-4 text-primary" />
              Cambridge 9708 Essay Draft ({activeDraft?.marks ?? 12} Marks)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review this starter structure generated from your EconGPT discussion, then open it in Essay Grader to refine and mark.
            </DialogDescription>
          </DialogHeader>
          {activeDraft && (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                  Question Prompt
                </p>
                <p className="text-xs sm:text-sm font-semibold text-foreground mt-0.5">
                  {activeDraft.question}
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-card p-4">
                <EconMarkdown content={activeDraft.essayDraft} />
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (!activeDraft) return;
                navigator.clipboard.writeText(activeDraft.essayDraft);
                setCopiedDraft(true);
                setTimeout(() => setCopiedDraft(false), 1800);
              }}
            >
              {copiedDraft ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
              {copiedDraft ? "Copied" : "Copy Draft"}
            </Button>
            <Button type="button" size="sm" onClick={handleTransferToGrader}>
              Open in Essay Grader
              <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
