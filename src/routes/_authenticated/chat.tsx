import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BookText,
  Check,
  ChevronDown,
  Copy,
  Download,
  Globe2,
  GraduationCap,
  HelpCircle,
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
      { title: "Marginal Tutor — AI Economics Assistant" },
      {
        name: "description",
        content:
          "Specialized AI Economics tutor grounded in verified Cambridge 9708 mark schemes, interactive diagrams, and real-world case studies.",
      },
    ],
  }),
  component: MarginalTutorPage,
});

interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  voiceoverSummary?: string;
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
    label: "Quick",
    shortLabel: "Quick",
    hint: "Fast 45-second intuition, causal steps & real example",
    icon: Zap,
  },
  {
    id: "exam",
    label: "Exam A*",
    shortLabel: "Exam A*",
    hint: "Full Cambridge 9708 AO1 / AO2 / AO3 precision",
    icon: GraduationCap,
  },
  {
    id: "diagram",
    label: "Graphs",
    shortLabel: "Graphs",
    hint: "Interactive diagram + step-by-step curve walkthrough",
    icon: LineChart,
  },
  {
    id: "quiz",
    label: "Quiz Me",
    shortLabel: "Quiz",
    hint: "Brief explanation followed by an active recall check",
    icon: HelpCircle,
  },
];

const STARTER_PROMPTS: Array<{
  title: string;
  tag: string;
  prompt: string;
  mode: EconChatMode;
}> = [
  {
    title: "Marshall-Lerner & the J-Curve",
    tag: "Trade",
    prompt: "Explain the Marshall-Lerner condition and the J-Curve simply with a diagram and real example.",
    mode: "diagram",
  },
  {
    title: "Monopoly & Deadweight Loss",
    tag: "Micro",
    prompt: "Show a monopoly diagram and explain why P > MC creates deadweight welfare loss.",
    mode: "diagram",
  },
  {
    title: "Price Ceilings & Black Markets",
    tag: "Micro",
    prompt: "Explain how a binding maximum price causes a shortage and black market with a diagram.",
    mode: "diagram",
  },
  {
    title: "Stagflation & Central Bank Dilemma",
    tag: "Macro",
    prompt: "Draw a custom AD/AS graph showing stagflation and explain why central banks face a trade-off.",
    mode: "diagram",
  },
  {
    title: "Cigarette Tax Incidence & PED",
    tag: "Elasticity",
    prompt: "Why do consumers pay most of a cigarette tax? Explain clearly with a diagram and real example.",
    mode: "quick",
  },
  {
    title: "Keynesian Multiplier & Crowding Out",
    tag: "Fiscal",
    prompt: "Explain the Keynesian multiplier and crowding out simply, then quiz me with one question.",
    mode: "quiz",
  },
];

const EXPLORE_TOPICS = [
  { label: "Carbon tax & negative externalities", prompt: "Explain how a carbon tax fixes negative production externalities with a diagram." },
  { label: "Tariffs vs import quotas", prompt: "Show a tariff diagram and compare tariffs vs quotas with real-world trade cases." },
  { label: "Short-run vs long-run Phillips curve", prompt: "Explain the short-run vs long-run Phillips curve with a diagram." },
  { label: "Kinked demand curve in oligopoly", prompt: "Explain the kinked demand curve and price rigidity in oligopoly with a diagram." },
  { label: "Income & substitution effects", prompt: "Explain income and substitution effects for normal vs inferior goods simply." },
  { label: "Comparative vs absolute advantage", prompt: "Explain comparative advantage with a crisp numerical example." },
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
    // ignore quota errors
  }
}

/**
 * Normalizes LaTeX expressions & raw underscore economics variables
 * (e.g. $S_1 \to S_2$ -> S₁ → S₂, P_max -> Pmax, Q_s -> Qs, P_black -> Pb).
 */
function prettifyEconNotation(raw: string): string {
  const subMap: Record<string, string> = {
    "0": "₀",
    "1": "₁",
    "2": "₂",
    "3": "₃",
    "4": "₄",
    "5": "₅",
    "6": "₆",
    "7": "₇",
    "8": "₈",
    "9": "₉",
  };

  const cleanMathExpr = (expr: string) =>
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
      .replace(/_\{?([0-9])\}?/g, (_, d) => subMap[d] ?? d)
      .replace(/\\([a-zA-Z]+)/g, "$1")
      .trim();

  return raw
    .replace(/\$\$([^$]+)\$\$/g, (_, m) => cleanMathExpr(m))
    .replace(/\$([^$\n]+)\$/g, (_, m) => cleanMathExpr(m))
    .replace(/\bP_max\b/gi, "Pmax")
    .replace(/\bP_min\b/gi, "Pmin")
    .replace(/\bP_black\b/gi, "Pb")
    .replace(/\bP_world\b/gi, "Pw")
    .replace(/\bP_e\b/g, "Pe")
    .replace(/\bQ_e\b/g, "Qe")
    .replace(/\bQ_s\b/g, "Qs")
    .replace(/\bQ_d\b/g, "Qd")
    .replace(/\bQ_m\b/g, "Qm")
    .replace(/\bY_fe\b/gi, "Yf")
    .replace(/\bY_f\b/g, "Yf")
    .replace(/\b([A-Za-z]+)_([0-9])\b/g, (_, base, d) => `${base}${subMap[d] ?? d}`);
}

/**
 * Bulletproof inline formatter:
 * 1. Protects economics star symbols (A*, P*, Q*, Y*, W*, E*, r*, u*) so they NEVER trigger markdown italic/bold.
 * 2. Renders **bold**, `code`, and *italic* cleanly.
 * 3. Strips any stray unmatched `**` or `*` so raw markdown artifacts NEVER appear on screen.
 */
function renderInlineFormatting(raw: string): React.ReactNode[] {
  const STAR_SENTINEL = "\uE001";
  const normalized = prettifyEconNotation(raw).replace(
    /\b([APQYWERru]|Band\s*A)\*(?![a-zA-Z0-9])/g,
    `$1${STAR_SENTINEL}`,
  );

  const restoreStar = (s: string) =>
    s
      .replace(/\*\*/g, "") // eliminate any stray unmatched **
      .replace(/(^|\s)\*(?=\s|$)/g, "$1") // eliminate stray isolated *
      .replace(new RegExp(STAR_SENTINEL, "g"), "*");

  const parts: React.ReactNode[] = [];
  // Match **bold**, `code`, or proper *italic* (non-space inside)
  const tokenRegex = /\*\*([^*]+?)\*\*|`([^`]+?)`|(?<!\w)\*([^\s*][^*]*?[^\s*]|[^\s*])\*(?!\w)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = tokenRegex.exec(normalized)) !== null) {
    if (match.index > last) {
      parts.push(restoreStar(normalized.slice(last, match.index)));
    }
    if (match[1] !== undefined) {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {restoreStar(match[1])}
        </strong>,
      );
    } else if (match[2] !== undefined) {
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-muted/80 border border-border/60 font-mono text-[12px] text-foreground"
        >
          {restoreStar(match[2])}
        </code>,
      );
    } else if (match[3] !== undefined) {
      parts.push(
        <em key={key++} className="italic text-foreground/95">
          {restoreStar(match[3])}
        </em>,
      );
    }
    last = match.index + match[0].length;
  }

  if (last < normalized.length) {
    parts.push(restoreStar(normalized.slice(last)));
  }
  return parts;
}

function EconMarkdown({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const trimmed = (lines[i] ?? "").trim();
    if (!trimmed) {
      i++;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      blocks.push(<hr key={key++} className="my-4 border-border/50" />);
      i++;
      continue;
    }

    // Markdown Table
    if (trimmed.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:-]+\|/.test(lines[i + 1] ?? "")) {
      const headerCells = trimmed
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim());
      i += 2;
      const bodyRows: string[][] = [];
      while (i < lines.length && (lines[i] ?? "").trim().includes("|")) {
        bodyRows.push(
          (lines[i] ?? "")
            .trim()
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((c) => c.trim()),
        );
        i++;
      }
      blocks.push(
        <div key={key++} className="my-3.5 overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border/70">
                {headerCells.map((hc, ci) => (
                  <th key={ci} className="px-3.5 py-2 text-left font-semibold text-foreground">
                    {renderInlineFormatting(hc)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {bodyRows.map((row, ri) => (
                <tr key={ri} className="hover:bg-muted/20">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3.5 py-2 text-foreground/90">
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
      const text = headingMatch[2]!;
      blocks.push(
        <h3
          key={key++}
          className="text-[15px] font-bold tracking-tight text-foreground mt-4 mb-1.5 first:mt-0"
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
          className="my-3 border-l-2 border-primary/60 pl-3.5 py-1 text-[14px] text-foreground/90 leading-relaxed"
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
        <ul key={key++} className="my-2.5 space-y-1.5 pl-5 list-disc marker:text-primary/60">
          {items.map((it, idx) => (
            <li key={idx} className="text-[14.5px] leading-relaxed text-foreground/90">
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
        <ol key={key++} className="my-2.5 space-y-2 pl-5 list-decimal marker:font-semibold marker:text-primary">
          {items.map((it, idx) => (
            <li key={idx} className="text-[14.5px] leading-relaxed text-foreground/90">
              {renderInlineFormatting(it)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Paragraph
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
      <p key={key++} className="my-2.5 first:mt-0 text-[14.5px] leading-[1.7] text-foreground/90">
        {renderInlineFormatting(paraLines.join(" "))}
      </p>,
    );
  }

  return <div>{blocks}</div>;
}

/**
 * Full-width spacious diagram canvas so axes, labels, and shaded regions
 * breathe cleanly without ever feeling squished or overlapped.
 */
function ChatDiagramCard({
  diagram,
  onModify,
}: {
  diagram: ChatDiagramPayload;
  onModify: (title: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

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
    toast.success("Saved diagram as SVG");
  };

  return (
    <div className="my-4 rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
      {/* Slim Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <LineChart className="size-4 text-primary shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
            {diagram.title}
          </span>
          <Badge
            variant="outline"
            className="text-[10px] font-medium px-1.5 py-0 border-border/80 text-muted-foreground shrink-0"
          >
            {diagram.kind === "custom" ? "Custom Graph" : "9708 Diagram"}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onModify(diagram.title)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Wand2 className="size-3 text-primary" />
            <span>Modify</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Download className="size-3" />
            <span className="hidden sm:inline">SVG</span>
          </button>
          <Link
            to="/diagram-lab"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Sliders className="size-3 text-violet-500" />
            <span className="hidden sm:inline">CAD Lab</span>
          </Link>
        </div>
      </div>

      {/* Spacious Centered Diagram Canvas */}
      <div ref={containerRef} className="px-4 sm:px-6 pt-4 pb-3 flex flex-col items-center bg-card">
        <div className="w-full max-w-[520px]">
          <EconomicsDiagram spec={diagram.spec} title={diagram.title} />
        </div>
        {diagram.caption && (
          <p className="mt-2 text-xs text-center text-muted-foreground max-w-lg leading-relaxed">
            {renderInlineFormatting(diagram.caption)}
          </p>
        )}
      </div>

      {/* Clean Compact 2-Column Step Key Underneath */}
      {diagram.walkthrough.length > 0 && (
        <div className="border-t border-border/60 bg-muted/15 px-4 sm:px-5 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2">
            {diagram.walkthrough.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-foreground/85 leading-relaxed">
                <span className="size-4.5 rounded-full bg-primary/12 text-primary font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{renderInlineFormatting(step)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MarginalTutorPage() {
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
  const [openSourcesMsgId, setOpenSourcesMsgId] = useState<string | null>(null);
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
          title: textToSend.length > 44 ? `${textToSend.slice(0, 44)}…` : textToSend,
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
        const history = priorMessages.slice(-6).map((m) => ({
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
        const errMessage = err?.message || "Could not reach Marginal Tutor right now. Please try again.";
        toast.error(errMessage);
        const failMsg: ChatMessageItem = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `Something went wrong reaching Marginal Tutor: ${errMessage}. Please try again in a moment.`,
          nextTopics: ["Try asking that again", "Explain price elasticity of demand with a diagram"],
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
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
    const spoken = prettifyEconNotation(msg.voiceoverSummary || msg.content)
      .replace(/[*_#>`~|]/g, "")
      .trim();
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
    navigator.clipboard.writeText(prettifyEconNotation(text).replace(/\*\*/g, ""));
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleModifyGraph = (title: string) => {
    setForceGraph(true);
    setInputMessage(`Modify the "${title}" diagram to show `);
    textareaRef.current?.focus();
  };

  const handleTransferToGrader = () => {
    if (!activeDraft) return;
    try {
      sessionStorage.setItem("marginal_prefill_draft", activeDraft.essayDraft);
      sessionStorage.setItem("marginal_prefill_q", activeDraft.question);
    } catch {}
    setDraftModalOpen(false);
    toast.success("Draft loaded into Essay Grader");
    navigate({
      to: "/grade",
      search: { q: activeDraft.question, marks: activeDraft.marks },
    });
  };

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] bg-background overflow-hidden">
      {/* ── MINIMAL LEFT THREAD SIDEBAR ── */}
      <aside
        className={cn(
          "border-r border-border/60 bg-muted/15 flex-col shrink-0 transition-all duration-200 hidden md:flex",
          sidebarOpen ? "w-64" : "w-0 overflow-hidden border-r-0",
        )}
      >
        <div className="p-3">
          <Button
            onClick={handleNewChat}
            variant="outline"
            size="sm"
            className="w-full h-9 rounded-xl justify-start gap-2 text-xs font-semibold bg-background/80 hover:bg-muted border-border/70 cursor-pointer"
          >
            <MessageSquarePlus className="size-3.5 text-primary" />
            <span>New chat</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-4">
          {threads.length > 0 && (
            <div className="space-y-0.5">
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                Recent
              </p>
              {threads.map((t) => {
                const isActive = t.id === activeThreadId;
                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveThreadId(t.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setActiveThreadId(t.id)}
                    className={cn(
                      "group flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors",
                      isActive
                        ? "bg-muted font-semibold text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    )}
                  >
                    <span className="truncate">{t.title}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteThread(t.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-destructive transition-all cursor-pointer shrink-0"
                      aria-label="Delete thread"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-0.5 pt-2 border-t border-border/50">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Explore Topics
            </p>
            {EXPLORE_TOPICS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleSend(item.prompt, "diagram", false)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer truncate"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-3.5 py-2.5 border-t border-border/50 text-[11px] text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
          <span>Cambridge 9708 Verified</span>
        </div>
      </aside>

      {/* ── MAIN EDITORIAL CHATGPT WORKSPACE ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Clean Minimal Header */}
        <header className="shrink-0 h-12 border-b border-border/60 bg-background/95 backdrop-blur-sm px-3 sm:px-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="hidden md:inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
              title="Toggle sidebar"
              aria-label="Toggle sidebar"
            >
              <PanelLeft className="size-4" />
            </button>
            <span className="text-sm font-bold tracking-tight text-foreground">Marginal Tutor</span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-muted-foreground pl-1">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Syllabus Verified
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Compact 4-Mode Segmented Control */}
            <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/60">
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
                      "flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                      active
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("size-3", active ? "text-primary" : "opacity-65")} />
                    <span>{opt.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNewChat}
              className="md:hidden inline-flex size-8 items-center justify-center rounded-lg border border-border/70 text-muted-foreground hover:text-foreground cursor-pointer"
              title="New chat"
              aria-label="New chat"
            >
              <MessageSquarePlus className="size-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Message Stream OR Calm Welcome Canvas */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 ? (
              <div className="pt-8 sm:pt-14 pb-6 space-y-8">
                <div className="text-center space-y-2.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border/70 text-[11px] font-medium text-muted-foreground">
                    <Sparkles className="size-3 text-primary" />
                    <span>Cambridge 9708 Verified · Live Diagrams &amp; Real Examples</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    What economics topic do you want to master?
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
                    Ask anything — get fast explanations, interactive diagrams, real-world cases, and mark-scheme accurate answers.
                  </p>
                </div>

                {/* Clean 2x3 Minimal Starter Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {STARTER_PROMPTS.map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => handleSend(item.prompt, item.mode, false)}
                      className="group text-left p-3.5 rounded-xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/40 transition-all cursor-pointer flex flex-col justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-primary/80">
                          {item.tag}
                        </span>
                        <p className="text-xs sm:text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                          {item.title}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
                        Explore <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8 pb-6">
                {messages.map((msg) =>
                  msg.role === "user" ? (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[82%] sm:max-w-[72%] rounded-2xl rounded-br-sm bg-muted/90 border border-border/60 text-foreground px-4 py-2.5 text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <article key={msg.id} className="space-y-3.5">
                      {/* Minimal Assistant Label */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="size-5 rounded-md bg-primary/12 border border-primary/25 flex items-center justify-center text-primary shrink-0">
                          <Sparkles className="size-3" />
                        </span>
                        <span className="font-semibold text-foreground">Marginal Tutor</span>
                        {msg.kbVerified && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                            <ShieldCheck className="size-3" />
                            Verified
                          </span>
                        )}
                      </div>

                      {/* Key Definition (Slim Left-Border Note) */}
                      {msg.keyDefinition && (
                        <div className="border-l-2 border-sky-500/60 bg-sky-500/[0.04] pl-3.5 pr-3 py-2 rounded-r-lg text-xs leading-relaxed">
                          <span className="font-semibold text-foreground inline-flex items-center gap-1 mr-1">
                            <BookText className="size-3 text-sky-500 inline" />
                            {msg.keyDefinition.term}:
                          </span>
                          <span className="text-foreground/85">
                            {renderInlineFormatting(msg.keyDefinition.definition)}
                          </span>
                        </div>
                      )}

                      {/* Clean Box-Free Editorial Prose */}
                      <EconMarkdown content={msg.content} />

                      {/* Full-Width Spacious Interactive Diagram */}
                      {msg.diagram && (
                        <ChatDiagramCard diagram={msg.diagram} onModify={handleModifyGraph} />
                      )}

                      {/* Real-World Case (Slim Accent Strip) */}
                      {msg.realWorldExample && (
                        <div className="border-l-2 border-emerald-500/60 bg-emerald-500/[0.04] pl-3.5 pr-3 py-2.5 rounded-r-lg space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <Globe2 className="size-3.5 text-emerald-500 shrink-0" />
                            <span className="font-semibold text-foreground">
                              {msg.realWorldExample.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              · {msg.realWorldExample.region}
                            </span>
                          </div>
                          {msg.realWorldExample.stat && (
                            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                              {renderInlineFormatting(msg.realWorldExample.stat)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {renderInlineFormatting(msg.realWorldExample.takeaway)}
                          </p>
                        </div>
                      )}

                      {/* Clean Utility Bar + Collapsible Sources */}
                      <div className="flex items-center flex-wrap gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
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
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
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
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          >
                            <PenLine className="size-3" />
                            <span>Essay draft</span>
                          </button>
                        )}

                        {msg.sources && msg.sources.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setOpenSourcesMsgId((curr) => (curr === msg.id ? null : msg.id))
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer ml-auto"
                          >
                            <BookOpen className="size-3" />
                            <span>Sources ({msg.sources.length})</span>
                            <ChevronDown
                              className={cn(
                                "size-3 transition-transform",
                                openSourcesMsgId === msg.id && "rotate-180",
                              )}
                            />
                          </button>
                        )}
                      </div>

                      {openSourcesMsgId === msg.id && msg.sources && (
                        <div className="rounded-xl border border-border/60 bg-muted/25 p-3 space-y-2">
                          {msg.sources.map((src, idx) => (
                            <div key={idx} className="text-xs">
                              <p className="font-semibold text-foreground">
                                {src.title}{" "}
                                <span className="font-normal text-muted-foreground">· {src.chapter}</span>
                              </p>
                              {src.snippet && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                                  {src.snippet}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Clean Follow-Up Pills */}
                      {msg.nextTopics && msg.nextTopics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {msg.nextTopics.map((topic, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSend(topic)}
                              disabled={isSending}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border/70 bg-background hover:bg-muted/70 hover:border-primary/40 text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer text-left"
                            >
                              <span>{topic}</span>
                              <ArrowUpRight className="size-3 shrink-0 opacity-60" />
                            </button>
                          ))}
                        </div>
                      )}
                    </article>
                  ),
                )}

                {/* Clean Thinking Indicator */}
                {isSending && (
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <div className="flex gap-1">
                      <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                      <span className="size-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:150ms]" />
                      <span className="size-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:300ms]" />
                    </div>
                    <span>Verifying syllabus facts &amp; preparing explanation…</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* ── CLEAN FLOATING COMPOSER ── */}
        <div className="shrink-0 bg-gradient-to-t from-background via-background to-transparent px-4 sm:px-6 pb-4 pt-2">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl border border-border/80 bg-card shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all px-3.5 py-2.5">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputMessage}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask any economics concept, or say 'Draw a graph for...'"
                className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none py-0.5 max-h-36"
              />

              <div className="flex items-center justify-between gap-2 pt-2 mt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setForceGraph((g) => !g)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all cursor-pointer",
                      forceGraph
                        ? "border-primary/45 bg-primary/10 text-primary font-semibold"
                        : "border-border/70 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    )}
                    title="Generate a fresh custom graph with your next answer"
                  >
                    <LineChart className="size-3" />
                    <span>{forceGraph ? "Custom Graph On" : "+ Graph"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleVoiceDictation}
                    className={cn(
                      "inline-flex items-center justify-center size-7 rounded-full border transition-all cursor-pointer",
                      isDictating
                        ? "border-rose-500/45 bg-rose-500/15 text-rose-500 animate-pulse"
                        : "border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    )}
                    title="Voice input"
                    aria-label="Voice input"
                  >
                    {isDictating ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                  </button>
                </div>

                <Button
                  type="button"
                  size="icon"
                  disabled={!inputMessage.trim() || isSending}
                  onClick={() => handleSend()}
                  className="size-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-2xs"
                  aria-label="Send message"
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ESSAY DRAFT MODAL ── */}
      <Dialog open={draftModalOpen} onOpenChange={setDraftModalOpen}>
        <DialogContent className="max-w-2xl max-h-[82vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <PenLine className="size-4 text-primary" />
              Cambridge 9708 Essay Draft ({activeDraft?.marks ?? 12} Marks)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Starter structure generated from your discussion — open in Essay Grader to refine and mark.
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
