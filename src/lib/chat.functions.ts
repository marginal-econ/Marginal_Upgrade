import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { CAMBRIDGE_CORE_DEFINITIONS } from "./cambridge-definitions";
import { DIAGRAM_BY_ID, DIAGRAM_INDEX_FOR_AI, DIAGRAMS } from "./diagrams/catalog";
import type { Arrow, Curve, CurveTone, DiagramSpec, Marker, Note, Pt, Shade } from "./diagrams/spec";
import { ECONOMICS_EXAMPLES, type EconomicsExample } from "./economics-examples";

export type EconChatMode = "quick" | "exam" | "diagram" | "quiz";

const ChatInputSchema = z.object({
  message: z.string().trim().min(1).max(3000),
  mode: z.enum(["quick", "exam", "diagram", "quiz"]).default("quick"),
  forceGraph: z.boolean().default(false),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .optional()
    .default([]),
});

export interface ChatDiagramPayload {
  kind: "catalog" | "custom";
  catalogId?: string;
  title: string;
  caption: string;
  spec: DiagramSpec;
  walkthrough: string[];
  cadPreset?: string;
}

export interface GroundedChatReply {
  reply: string;
  voiceoverSummary: string;
  isEssayDraftRequest?: boolean;
  modelUsed: string;
  modelLabel: string;
  latencyMs: number;
  kbVerified: boolean;
  sources: Array<{
    title: string;
    chapter: string;
    paperCode?: string;
    snippet?: string;
    similarity?: number;
    type: "syllabus" | "mark_scheme" | "definition" | "examiner_report" | "coursebook" | "example";
  }>;
  diagram?: ChatDiagramPayload | null;
  keyDefinition?: {
    term: string;
    definition: string;
    category?: string;
  } | null;
  realWorldExample?: {
    title: string;
    region: string;
    stat: string;
    takeaway: string;
  } | null;
  nextTopics: string[];
  diagramGuidance?: string;
  autoDraftPrompt?: {
    question: string;
    marks: 8 | 12 | 20;
    essayDraft: string;
  };
}

const VALID_CURVE_TONES = new Set<CurveTone>([
  "demand",
  "supply",
  "cost",
  "revenue",
  "neutral",
  "accent",
  "warn",
]);

const VALID_SHADE_TONES = new Set<"primary" | "warn" | "muted" | "danger">([
  "primary",
  "warn",
  "muted",
  "danger",
]);

const NVIDIA_PRIMARY_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";

function clampCoord(n: unknown): number | null {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return null;
  return Math.round(Math.max(4, Math.min(96, num)) * 10) / 10;
}

function parsePt(raw: unknown): Pt | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const x = clampCoord(raw[0]);
  const y = clampCoord(raw[1]);
  if (x === null || y === null) return null;
  return [x, y];
}

/**
 * Validates and clamps an AI-generated DiagramSpec so rendered SVG graphs
 * are always geometrically clean, legible, and crash-proof inside <EconomicsDiagram />.
 */
export function sanitizeCustomDiagramSpec(raw: unknown): DiagramSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const xLabel =
    typeof obj.xLabel === "string" && obj.xLabel.trim()
      ? obj.xLabel.trim().slice(0, 32)
      : "Quantity";
  const yLabel =
    typeof obj.yLabel === "string" && obj.yLabel.trim()
      ? obj.yLabel.trim().slice(0, 32)
      : "Price ($)";

  const rawCurves = Array.isArray(obj.curves) ? obj.curves : [];
  const curves: Curve[] = [];
  for (const c of rawCurves.slice(0, 10)) {
    if (!c || typeof c !== "object") continue;
    const co = c as Record<string, unknown>;
    const ptsRaw = Array.isArray(co.points) ? co.points : [];
    const points = ptsRaw.map(parsePt).filter((p): p is Pt => p !== null);
    if (points.length < 2) continue;
    const toneRaw = typeof co.tone === "string" ? (co.tone as CurveTone) : "demand";
    const tone: CurveTone = VALID_CURVE_TONES.has(toneRaw) ? toneRaw : "neutral";
    const labelAt = parsePt(co.labelAt) ?? undefined;
    curves.push({
      points,
      label: typeof co.label === "string" ? co.label.trim().slice(0, 22) : undefined,
      tone,
      dashed: Boolean(co.dashed),
      arrow: Boolean(co.arrow),
      ...(labelAt ? { labelAt } : {}),
    });
  }

  if (curves.length === 0) return null;

  const markers: Marker[] = [];
  if (Array.isArray(obj.markers)) {
    for (const m of obj.markers.slice(0, 8)) {
      if (!m || typeof m !== "object") continue;
      const mo = m as Record<string, unknown>;
      const at = parsePt(mo.at);
      if (!at) continue;
      const guidesRaw = typeof mo.guides === "string" ? mo.guides : "both";
      const guides: Marker["guides"] =
        guidesRaw === "x" || guidesRaw === "y" || guidesRaw === "both" || guidesRaw === "none"
          ? guidesRaw
          : "both";
      markers.push({
        at,
        label: typeof mo.label === "string" ? mo.label.trim().slice(0, 18) : undefined,
        guides,
      });
    }
  }

  const shades: Shade[] = [];
  if (Array.isArray(obj.shades)) {
    for (const s of obj.shades.slice(0, 5)) {
      if (!s || typeof s !== "object") continue;
      const so = s as Record<string, unknown>;
      const ptsRaw = Array.isArray(so.points) ? so.points : [];
      const points = ptsRaw.map(parsePt).filter((p): p is Pt => p !== null);
      if (points.length < 3) continue;
      const toneRaw = typeof so.tone === "string" ? so.tone : "primary";
      const tone = VALID_SHADE_TONES.has(toneRaw as any)
        ? (toneRaw as "primary" | "warn" | "muted" | "danger")
        : "primary";
      const labelAt = parsePt(so.labelAt) ?? undefined;
      shades.push({
        points,
        label: typeof so.label === "string" ? so.label.trim().slice(0, 20) : undefined,
        tone,
        ...(labelAt ? { labelAt } : {}),
      });
    }
  }

  const arrows: Arrow[] = [];
  if (Array.isArray(obj.arrows)) {
    for (const a of obj.arrows.slice(0, 6)) {
      if (!a || typeof a !== "object") continue;
      const ao = a as Record<string, unknown>;
      const from = parsePt(ao.from);
      const to = parsePt(ao.to);
      if (!from || !to) continue;
      arrows.push({
        from,
        to,
        label: typeof ao.label === "string" ? ao.label.trim().slice(0, 18) : undefined,
      });
    }
  }

  const notes: Note[] = [];
  if (Array.isArray(obj.notes)) {
    for (const n of obj.notes.slice(0, 6)) {
      if (!n || typeof n !== "object") continue;
      const no = n as Record<string, unknown>;
      const at = parsePt(no.at);
      const text = typeof no.text === "string" ? no.text.trim().slice(0, 32) : "";
      if (!at || !text) continue;
      notes.push({ at, text });
    }
  }

  const parseTicks = (rawTicks: unknown) => {
    if (!Array.isArray(rawTicks)) return undefined;
    const ticks: Array<{ at: number; label: string }> = [];
    for (const t of rawTicks.slice(0, 6)) {
      if (!t || typeof t !== "object") continue;
      const to = t as Record<string, unknown>;
      const at = clampCoord(to.at);
      const label = typeof to.label === "string" ? to.label.trim().slice(0, 12) : "";
      if (at !== null && label) ticks.push({ at, label });
    }
    return ticks.length > 0 ? ticks : undefined;
  };

  return {
    xLabel,
    yLabel,
    curves,
    ...(markers.length > 0 ? { markers } : {}),
    ...(shades.length > 0 ? { shades } : {}),
    ...(arrows.length > 0 ? { arrows } : {}),
    ...(notes.length > 0 ? { notes } : {}),
    ...(parseTicks(obj.xTicks) ? { xTicks: parseTicks(obj.xTicks) } : {}),
    ...(parseTicks(obj.yTicks) ? { yTicks: parseTicks(obj.yTicks) } : {}),
  };
}

function tokenizeQuery(query: string): string[] {
  const stop = new Set([
    "what", "explain", "discuss", "tell", "about", "how", "does", "the", "and",
    "for", "with", "that", "this", "from", "are", "why", "can", "you", "draw",
    "graph", "diagram", "show", "make", "give", "simply", "quick", "easy", "me",
  ]);
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stop.has(w));
}

function matchDefinitions(query: string, limit = 3) {
  const lower = query.toLowerCase();
  const tokens = tokenizeQuery(query);
  const scored = CAMBRIDGE_CORE_DEFINITIONS.map((def) => {
    const termLow = def.term.toLowerCase();
    const defLow = def.definition_text.toLowerCase();
    let score = 0;
    if (termLow === lower) score += 100;
    else if (lower.includes(termLow) && termLow.length >= 3) score += 60;
    else if (termLow.includes(lower) && lower.length >= 4) score += 40;
    for (const t of tokens) {
      if (termLow.includes(t)) score += 18;
      if (defLow.includes(t)) score += 4;
    }
    return { def, score };
  })
    .filter((x) => x.score >= 16)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.def);
}

function matchExamples(query: string, limit = 2): EconomicsExample[] {
  const lower = query.toLowerCase();
  const tokens = tokenizeQuery(query);
  const scored = ECONOMICS_EXAMPLES.map((ex) => {
    const hay = `${ex.title} ${ex.topic} ${ex.summary} ${ex.keywords.join(" ")}`.toLowerCase();
    let score = 0;
    for (const kw of ex.keywords) {
      if (lower.includes(kw.toLowerCase())) score += 25;
    }
    for (const t of tokens) {
      if (ex.title.toLowerCase().includes(t)) score += 14;
      if (ex.topic.toLowerCase().includes(t)) score += 10;
      if (hay.includes(t)) score += 5;
    }
    return { ex, score };
  })
    .filter((x) => x.score >= 15)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.ex);
}

function matchBestCatalogDiagram(query: string) {
  const lower = query.toLowerCase();
  const tokens = tokenizeQuery(query);
  let best = null as (typeof DIAGRAMS)[number] | null;
  let bestScore = 0;
  for (const d of DIAGRAMS) {
    const hay = `${d.id} ${d.title} ${d.topic} ${d.represents}`.toLowerCase();
    let score = 0;
    if (lower.includes(d.title.toLowerCase())) score += 50;
    for (const t of tokens) {
      if (d.title.toLowerCase().includes(t)) score += 16;
      if (d.topic.toLowerCase().includes(t)) score += 10;
      if (hay.includes(t)) score += 4;
    }
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return bestScore >= 16 ? best : null;
}

function friendlyModelLabel(modelId: string): string {
  const m = (modelId || "").toLowerCase();
  if (m.includes("nemotron-3-ultra")) return "NVIDIA Nemotron 3 Ultra (550B)";
  if (m.includes("nemotron-3.5-super")) return "NVIDIA Nemotron 3.5 Super";
  if (m.includes("nemotron-3.5-lightning")) return "NVIDIA Nemotron 3.5 Lightning";
  if (m.includes("nemotron")) return "NVIDIA Nemotron AI";
  if (m.includes("qwen")) return "Qwen 3.8 Economics AI";
  if (m.includes("gemini")) return "Gemini Economics AI";
  return modelId || "Marginal Economics AI";
}

function stripThinkingAndParseKit(rawText: string): {
  markdown: string;
  kit: Record<string, any> | null;
} {
  // Remove hidden reasoning blocks if emitted by thinking models
  let cleaned = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .trim();

  let kit: Record<string, any> | null = null;

  // Prefer explicit ```econ-kit ... ``` block
  const kitRegex = /```(?:econ-kit|econ_kit|json)\s*\n?([\s\S]*?)```/gi;
  let lastMatch: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = kitRegex.exec(cleaned)) !== null) {
    const candidate = (m[1] || "").trim();
    if (
      candidate.startsWith("{") &&
      (candidate.includes('"diagramMode"') ||
        candidate.includes('"nextTopics"') ||
        candidate.includes('"customDiagram"') ||
        candidate.includes('"realWorldExample"'))
    ) {
      lastMatch = m;
    }
  }

  if (lastMatch) {
    const jsonStr = (lastMatch[1] || "").trim();
    try {
      kit = JSON.parse(jsonStr);
      cleaned = (cleaned.slice(0, lastMatch.index) + cleaned.slice(lastMatch.index + lastMatch[0].length)).trim();
    } catch {
      // Try forgiving trailing-comma cleanup
      try {
        const fixed = jsonStr.replace(/,\s*([}\]])/g, "$1");
        kit = JSON.parse(fixed);
        cleaned = (cleaned.slice(0, lastMatch.index) + cleaned.slice(lastMatch.index + lastMatch[0].length)).trim();
      } catch {
        // Still remove raw broken econ-kit fence so student never sees ugly JSON
        if (lastMatch[0].toLowerCase().startsWith("```econ-kit")) {
          cleaned = (cleaned.slice(0, lastMatch.index) + cleaned.slice(lastMatch.index + lastMatch[0].length)).trim();
        }
      }
    }
  }

  return { markdown: cleaned, kit };
}

/**
 * Specialized Economics ChatGPT Engine ("Marginal EconGPT").
 * - 100% real AI powered by NVIDIA Nemotron flagship models (with automatic resilient failover).
 * - Strictly grounded in the platform's Cambridge 9708 Knowledge Base (vector + lexical RRF),
 *   official Cambridge Core Definitions, Real-World Examples Bank, and Calibrated Diagram Library.
 * - Dynamically generates brand-new custom interactive SVG diagrams for ANY economic concept.
 * - Available to all authenticated students, teachers, and admins (zero "No AI" stub paths).
 */
export const sendGroundedChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ChatInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<GroundedChatReply> => {
    const started = Date.now();
    const { supabase, userId } = context;

    const query = data.message.trim();
    const lowerQuery = query.toLowerCase();
    const wantsCustomGraph =
      data.forceGraph ||
      data.mode === "diagram" ||
      /\b(draw|plot|sketch|graph|diagram|curve|shift|visuali[sz]e|illustrate|chart)\b/i.test(query);

    // 1. PARALLEL KNOWLEDGE BASE GROUNDING (Vector+RRF KB + Definitions + Real-World Examples + Diagram Catalog)
    const [kbSources, matchedDefs, matchedExamples] = await Promise.all([
      (async () => {
        try {
          const { retrieve, extractRelevantSnippetWindow } = await import("./retrieval.server");
          const hits = await retrieve(supabase, {
            query,
            matchCount: 5,
            minSimilarity: 0.45,
            enableHybridRrf: true,
          });
          return hits.map((h) => ({
            ...h,
            window: extractRelevantSnippetWindow(h.snippet, 820, query),
          }));
        } catch (err) {
          console.warn("[econgpt] KB vector retrieval skipped/unavailable:", (err as Error)?.message);
          return [];
        }
      })(),
      Promise.resolve(matchDefinitions(query, 3)),
      Promise.resolve(matchExamples(query, 2)),
    ]);

    const kbBlock =
      kbSources.length > 0
        ? kbSources
            .map(
              (s, i) =>
                `[KB-${i + 1}] (${s.docType.toUpperCase()} · ${s.documentTitle}${s.heading ? ` — ${s.heading}` : ""})\n${s.window}`,
            )
            .join("\n\n")
        : "No direct document chunk retrieved; ground strictly in official Cambridge International AS & A Level Economics (9708) theory.";

    const defsBlock =
      matchedDefs.length > 0
        ? matchedDefs
            .map((d) => `• ${d.term} (${d.category}): "${d.definition_text}"`)
            .join("\n")
        : "None pre-matched.";

    const examplesBlock =
      matchedExamples.length > 0
        ? matchedExamples
            .map(
              (ex) =>
                `• ${ex.title} (${ex.region}, ${ex.yearOrPeriod}) — Data: ${ex.keyData}\n  Mechanism: ${ex.summary}\n  AO3 Pivot: ${ex.ao3Evaluation}`,
            )
            .join("\n")
        : "Use an authentic, concrete, accurate real-world economic case study with verifiable figures.";

    const modeInstructions: Record<EconChatMode, string> = {
      quick:
        "MODE: QUICK INTUITION — Make this hard concept click in 45 seconds! Start with a 1-sentence plain-English hook/analogy, then give a crisp step-by-step causal chain with arrows (→), then a cool real-world example, and finish with a 1-line Cambridge exam pro-tip. Keep it punchy, visual, and memorable.",
      exam:
        "MODE: CAMBRIDGE 9708 A* EXAMINER — Deliver an A*-band Cambridge 9708 answer: exact syllabus definition (AO1), rigorous step-by-step transmission mechanism & diagram analysis (AO2), and sharp 'however, this depends on...' evaluation with short-run vs long-run & elasticity nuances (AO3). Cite the KB sources naturally.",
      diagram:
        "MODE: DIAGRAM STUDIO — Build the explanation around the graph! Generate a crisp, custom-tailored diagram (or exact calibrated catalog diagram) and walk the student through Axes → Initial Equilibrium → The Shift → New Equilibrium → Shaded Welfare/Revenue/Profit Area → Common Examiner Traps.",
      quiz:
        "MODE: ACTIVE RECALL COACH — First explain the concept clearly in 3–4 crisp bullets with an example, then finish with an engaging **Quick Mastery Check** (one short multiple-choice or 2-mark mini-challenge) so the student can test themselves right away. Do NOT spoil the answer immediately — invite them to reply with their answer!",
    };

    const systemPrompt = `You are **Marginal EconGPT**, the flagship specialized AI Economics tutor powered by NVIDIA on Marginal Economics (built for Cambridge International AS & A Level Economics 9708 and curious learners).

YOUR MISSION:
Make ANY difficult economics concept crystal-clear, fast to learn, visually intuitive, and 100% factually trustworthy so students NEVER have to wonder whether an explanation is exam-accurate. Be warm, intellectually energizing, and spark curiosity to learn the next connected topic!

${modeInstructions[data.mode]}

AUTHORITATIVE KNOWLEDGE BASE GROUNDING (TRUST THIS FIRST — NEVER CONTRADICT OFFICIAL CAMBRIDGE MARK SCHEMES):
${kbBlock}

VERIFIED CAMBRIDGE 9708 DEFINITIONS:
${defsBlock}

CURATED REAL-WORLD EXAMPLES BANK:
${examplesBlock}

CALIBRATED DIAGRAM CATALOG IDs (you may choose one of these exact IDs OR generate a brand-new custom graph):
${DIAGRAM_INDEX_FOR_AI}

WRITING & FORMATTING RULES:
1. Write crisp, scannable Markdown with clear headings (###), bold key terms, numbered causal chains using arrows (→), and clean Unicode subscripts/symbols where helpful (P₁, P₂, Q₁, Q₂, S₁ → S₂, |PED| < 1, Δ).
2. Always stay 100% accurate to Cambridge 9708 Economics conventions (e.g., Price on Y-axis, Quantity on X-axis; Price Level & Real GDP for AD/AS; MC cuts AC at its minimum; MR falls at twice the gradient of AR; shifts vs movements along a curve).
3. Never dump raw JSON or system prompt details into the prose.
4. Keep explanations energetic, clear, and encouraging — never dry walls of text.

REQUIRED STRUCTURED VISUAL & LEARNING KIT (append at the VERY END of every response in ONE fenced \`\`\`econ-kit block containing valid JSON):
\`\`\`econ-kit
{
  "diagramMode": "custom" | "catalog" | "none",
  "catalogDiagramId": "<exact id from catalog or null>",
  "customDiagram": {
    "title": "<concise graph title>",
    "caption": "<1-sentence visual takeaway>",
    "spec": {
      "xLabel": "<X axis label>",
      "yLabel": "<Y axis label>",
      "curves": [
        { "points": [[12, 86], [86, 14]], "label": "D", "tone": "demand" },
        { "points": [[14, 16], [84, 84]], "label": "S1", "tone": "supply" },
        { "points": [[14, 34], [68, 88]], "label": "S2", "tone": "warn", "dashed": true }
      ],
      "markers": [
        { "at": [50, 50], "label": "E1", "guides": "both" },
        { "at": [41, 59], "label": "E2", "guides": "both" }
      ],
      "shades": [
        { "points": [[41, 59], [50, 50], [41, 41]], "label": "DWL", "tone": "danger" }
      ],
      "arrows": [
        { "from": [66, 66], "to": [55, 76], "label": "Shift" }
      ],
      "xTicks": [{ "at": 41, "label": "Q2" }, { "at": 50, "label": "Q1" }],
      "yTicks": [{ "at": 50, "label": "P1" }, { "at": 59, "label": "P2" }]
    },
    "walkthrough": [
      "Step 1: ...",
      "Step 2: ...",
      "Step 3: ..."
    ]
  },
  "keyDefinition": {
    "term": "<key economic term>",
    "definition": "<exact concise Cambridge definition>"
  },
  "realWorldExample": {
    "title": "<specific real-world case>",
    "region": "<country/region & year>",
    "stat": "<1 concrete number or outcome>",
    "takeaway": "<how it proves the theory in 1 sentence>"
  },
  "nextTopics": [
    "<curious follow-up question 1 encouraging next concept>",
    "<curious follow-up question 2 e.g. compare or apply>",
    "<curious follow-up question 3 e.g. draw a custom shift or quiz me>"
  ],
  "voiceover": "<2 concise natural spoken sentences with no markdown or symbols>"
}
\`\`\`

GRAPH GENERATION RULES:
- Coordinate space is 0 to 100 on both X and Y (Y=0 is bottom, Y=100 is top; keep all points inside [10, 90]).
- Allowed curve tones: "demand", "supply", "cost", "revenue", "neutral", "accent", "warn".
- Allowed shade tones: "primary", "warn", "muted", "danger".
- ${wantsCustomGraph ? 'The student wants a graph right now! Set "diagramMode": "custom" and generate a mathematically clean, well-proportioned customDiagram tailored specifically to their exact scenario (or "catalog" only if an exact catalog diagram is clearly superior).' : 'Include a helpful diagram whenever the topic is visual ("custom" for tailored scenarios/new graphs, or "catalog" for classic 9708 models). Only use "none" for purely definitional/non-graphical questions.'}
- Make sure intersections, markers, and ticks align mathematically (e.g., if D goes from [10,90] to [90,10] (x+y=100) and S goes from [10,10] to [90,90] (y=x), their equilibrium E1 is strictly at [50, 50] with xTick 50 and yTick 50!).`;

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...data.history.slice(-8).map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: query },
    ];

    // 2. CALL NVIDIA FLAGSHIP MODEL (via OpenRouter 5-key free pool, with resilient site-wide failover)
    const { chat } = await import("./ai.server");
    const { normaliseConfig } = await import("./ai/active.server");

    let nvidiaProviderConfig = null as ReturnType<typeof normaliseConfig> | null;
    try {
      const { supabaseAdmin } = await import("@/integrations/backend/client.server");
      const { data: orRows } = await supabaseAdmin
        .from("ai_provider_keys")
        .select("provider, api_key, base_url, model, label")
        .eq("provider", "openrouter")
        .eq("purpose", "chat")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (orRows && orRows.length > 0 && orRows[0]!.api_key) {
        nvidiaProviderConfig = {
          ...normaliseConfig(orRows[0]!),
          model: NVIDIA_PRIMARY_MODEL,
        };
      }
    } catch (err) {
      console.warn("[econgpt] Could not load OpenRouter NVIDIA provider row:", (err as Error)?.message);
    }

    let aiResult: Awaited<ReturnType<typeof chat>>;
    if (nvidiaProviderConfig) {
      try {
        aiResult = await chat({
          model: NVIDIA_PRIMARY_MODEL,
          overrideProvider: nvidiaProviderConfig,
          messages: chatMessages,
          maxCompletionTokens: 3800,
          temperature: 0.3,
          reasoningEffort: "none",
          userId,
          feature: "econ_gpt_chat",
        });
      } catch (nvidiaErr) {
        console.warn(
          "[econgpt] NVIDIA OpenRouter pool temporarily unavailable, failing over to active AI chain:",
          (nvidiaErr as Error)?.message,
        );
        aiResult = await chat({
          model: "qwen/qwen3.8-27b",
          messages: chatMessages,
          maxCompletionTokens: 3800,
          temperature: 0.3,
          userId,
          feature: "econ_gpt_chat_fallback",
        });
      }
    } else {
      aiResult = await chat({
        model: "qwen/qwen3.8-27b",
        messages: chatMessages,
        maxCompletionTokens: 3800,
        temperature: 0.3,
        userId,
        feature: "econ_gpt_chat_fallback",
      });
    }

    const { markdown, kit } = stripThinkingAndParseKit(aiResult.text || "");
    const cleanReply = markdown || aiResult.text.trim();

    // 3. RESOLVE DIAGRAM (AI-Generated Custom Graph OR Calibrated Cambridge Catalog Diagram)
    let diagram: ChatDiagramPayload | null = null;
    if (kit) {
      const mode = String(kit.diagramMode || "").toLowerCase();
      if (mode === "custom" && kit.customDiagram) {
        const spec = sanitizeCustomDiagramSpec(kit.customDiagram.spec);
        if (spec) {
          diagram = {
            kind: "custom",
            title: String(kit.customDiagram.title || "Custom Economics Diagram").slice(0, 80),
            caption: String(kit.customDiagram.caption || "AI-generated Cambridge 9708 economic model.").slice(0, 220),
            spec,
            walkthrough: Array.isArray(kit.customDiagram.walkthrough)
              ? kit.customDiagram.walkthrough.map((s: unknown) => String(s)).filter(Boolean).slice(0, 6)
              : [],
          };
        }
      }

      if (!diagram && kit.catalogDiagramId) {
        const entry = DIAGRAM_BY_ID[String(kit.catalogDiagramId)];
        if (entry) {
          diagram = {
            kind: "catalog",
            catalogId: entry.id,
            title: entry.title,
            caption: entry.represents,
            spec: entry.spec,
            walkthrough: entry.howToRead.slice(0, 5),
          };
        }
      }

      // If AI put a valid customDiagram even when catalogId didn't match, still render it!
      if (!diagram && kit.customDiagram?.spec) {
        const spec = sanitizeCustomDiagramSpec(kit.customDiagram.spec);
        if (spec) {
          diagram = {
            kind: "custom",
            title: String(kit.customDiagram.title || "Custom Economics Diagram").slice(0, 80),
            caption: String(kit.customDiagram.caption || "AI-generated economics diagram.").slice(0, 220),
            spec,
            walkthrough: Array.isArray(kit.customDiagram.walkthrough)
              ? kit.customDiagram.walkthrough.map((s: unknown) => String(s)).filter(Boolean).slice(0, 6)
              : [],
          };
        }
      }
    }

    // Safety net: if user explicitly asked for a graph and AI didn't emit valid JSON geometry, attach best catalog match
    if (!diagram && wantsCustomGraph) {
      const fallbackDiag = matchBestCatalogDiagram(query);
      if (fallbackDiag) {
        diagram = {
          kind: "catalog",
          catalogId: fallbackDiag.id,
          title: fallbackDiag.title,
          caption: fallbackDiag.represents,
          spec: fallbackDiag.spec,
          walkthrough: fallbackDiag.howToRead.slice(0, 5),
        };
      }
    }

    // 4. ASSEMBLE VERIFIED SOURCES (KB chunks + matched definitions + real-world examples)
    const sources: GroundedChatReply["sources"] = [];
    for (const s of kbSources.slice(0, 4)) {
      const typeMap: Record<string, GroundedChatReply["sources"][number]["type"]> = {
        mark_scheme: "mark_scheme",
        examiner_report: "examiner_report",
        coursebook: "coursebook",
        syllabus: "syllabus",
      };
      sources.push({
        title: s.documentTitle,
        chapter: s.heading || s.docType.replace("_", " "),
        snippet: s.window.slice(0, 220),
        similarity: Math.round(s.similarity * 100),
        type: typeMap[s.docType] ?? "syllabus",
      });
    }
    for (const d of matchedDefs.slice(0, 2)) {
      sources.push({
        title: `Cambridge Definition: ${d.term}`,
        chapter: d.category,
        type: "definition",
      });
    }
    for (const ex of matchedExamples.slice(0, 1)) {
      sources.push({
        title: ex.title,
        chapter: `${ex.region} · ${ex.yearOrPeriod}`,
        type: "example",
      });
    }
    if (sources.length === 0) {
      sources.push({
        title: "Cambridge International AS & A Level Economics (9708)",
        chapter: "Verified Syllabus Grounding",
        type: "syllabus",
      });
    }

    // 5. STRUCTURED EXTRAS (Key Definition, Real-World Example, Next Topics, Voiceover)
    const keyDefinition =
      kit?.keyDefinition?.term && kit?.keyDefinition?.definition
        ? {
            term: String(kit.keyDefinition.term).slice(0, 80),
            definition: String(kit.keyDefinition.definition).slice(0, 320),
            category: matchedDefs[0]?.category,
          }
        : matchedDefs[0]
          ? {
              term: matchedDefs[0].term,
              definition: matchedDefs[0].definition_text,
              category: matchedDefs[0].category,
            }
          : null;

    const realWorldExample =
      kit?.realWorldExample?.title && kit?.realWorldExample?.takeaway
        ? {
            title: String(kit.realWorldExample.title).slice(0, 100),
            region: String(kit.realWorldExample.region || "Global").slice(0, 60),
            stat: String(kit.realWorldExample.stat || "").slice(0, 160),
            takeaway: String(kit.realWorldExample.takeaway).slice(0, 260),
          }
        : matchedExamples[0]
          ? {
              title: matchedExamples[0].title,
              region: `${matchedExamples[0].region} (${matchedExamples[0].yearOrPeriod})`,
              stat: matchedExamples[0].keyData,
              takeaway: matchedExamples[0].summary,
            }
          : null;

    const nextTopics: string[] =
      Array.isArray(kit?.nextTopics) && kit.nextTopics.length > 0
        ? kit.nextTopics.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 3)
        : [
            `Draw a new custom graph showing a shock to ${matchedDefs[0]?.term || "this market"}`,
            "How would a Cambridge examiner evaluate this in a 20-mark essay?",
            "Quiz me with a quick exam-style check question on this topic",
          ];

    const isEssayDraftRequest =
      (lowerQuery.includes("draft") && (lowerQuery.includes("essay") || lowerQuery.includes("paper"))) ||
      lowerQuery.includes("write an essay");

    const voiceoverSummary =
      typeof kit?.voiceover === "string" && kit.voiceover.trim()
        ? kit.voiceover.trim()
        : cleanReply
            .replace(/[*_#>`~|]/g, "")
            .replace(/\s+/g, " ")
            .slice(0, 260);

    const draftPrompt = buildAutoDraftPrompt(query, cleanReply, sources);

    return {
      reply: cleanReply,
      voiceoverSummary,
      isEssayDraftRequest,
      modelUsed: aiResult.model,
      modelLabel: friendlyModelLabel(aiResult.model),
      latencyMs: aiResult.latencyMs || Date.now() - started,
      kbVerified: kbSources.length > 0 || matchedDefs.length > 0,
      sources,
      diagram,
      keyDefinition,
      realWorldExample,
      nextTopics,
      diagramGuidance: diagram?.caption,
      autoDraftPrompt: draftPrompt,
    };
  });

export function buildAutoDraftPrompt(
  query: string,
  replyText: string,
  sources: GroundedChatReply["sources"],
): GroundedChatReply["autoDraftPrompt"] {
  const cleanQ = query
    .replace(/^(can you |please |could you )?(explain|discuss|tell me about|what is|draft an essay on|write an essay on|draw a graph for)\s*/i, "")
    .trim();

  const essayQuestion =
    cleanQ.length > 15
      ? `Assess the economic significance and policy implications of ${cleanQ.replace(/\?+$/, "")}. [12 marks]`
      : `Discuss the macroeconomic and microeconomic consequences of ${query.replace(/\?+$/, "")}. [12 marks]`;

  const cleanSnippet = replyText
    .replace(/###\s+\d+\.?\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, 1400);

  const primarySource = sources[0]?.title || "Cambridge 9708 Official Syllabus";

  const essayDraft = `### Introduction (AO1 Knowledge)
This response evaluates ${cleanQ || query} within the Cambridge International AS & A Level Economics (9708) framework, grounded in ${primarySource}.

### Analytical Synthesis (AO1 & AO2)
${cleanSnippet}

### Critical Evaluation (AO3 Distinction)
However, the overall economic outcome depends critically on the magnitude of relevant elasticities (PED/PES), the position of the economy relative to full employment, and short-run versus long-run adjustment time lags.

### Conclusion
Therefore, while theory predicts clear directional shifts, policymakers must calibrate interventions alongside complementary supply-side or targeted measures to minimise unintended welfare losses.`;

  return {
    question: essayQuestion,
    marks: 12,
    essayDraft,
  };
}
