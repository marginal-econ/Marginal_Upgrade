import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { CAMBRIDGE_CORE_DEFINITIONS } from "./cambridge-definitions";
import { DIAGRAM_BY_ID, DIAGRAMS } from "./diagrams/catalog";
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
        content: z.string().max(3000),
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

// Fast, high-accuracy primary model routed silently on the server (never exposed to users)
const PRIMARY_FAST_MODEL = "nvidia/nemotron-3.5-lightning:free";

const SUBSCRIPT_DIGITS: Record<string, string> = {
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

/**
 * Turns verbose AI graph annotations like "P_black (Black Market Price)" or
 * "Q* (Equilibrium)" into crisp, non-overlapping Cambridge exam symbols
 * ("Pb", "Q*", "Pmax", "Qs", "DWL"). Never truncates mid-word.
 */
export function cleanDiagramSymbol(
  raw: unknown,
  kind: "tick" | "marker" | "curve" | "shade" | "axis" | "arrow",
): string {
  if (typeof raw !== "string") return "";
  let s = raw
    .replace(/\([^)]*\)/g, "") // strip parenthetical commentary like "(Equilibrium)" or "(Supplied)"
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[*`~]/g, (m) => (m === "*" ? "*" : "")) // keep P*, Q*, A* and _ for subscript conversion below
    .replace(/\s+/g, " ")
    .trim();

  if (!s) return "";

  // Convert common underscore notations into clean Cambridge symbols
  s = s
    .replace(/\bP_?max\b/gi, "Pmax")
    .replace(/\bP_?min\b/gi, "Pmin")
    .replace(/\bP_?black\b/gi, "Pb")
    .replace(/\bP_?world\b/gi, "Pw")
    .replace(/\bP_?e\b/g, "Pe")
    .replace(/\bQ_?e\b/g, "Qe")
    .replace(/\bQ_?s\b/g, "Qs")
    .replace(/\bQ_?d\b/g, "Qd")
    .replace(/\bQ_?m\b/g, "Qm")
    .replace(/\bQ_?opt\b/gi, "Q*")
    .replace(/\bY_?fe\b/gi, "Yf")
    .replace(/\bY_?f\b/g, "Yf")
    .replace(/\b([A-Za-z]+)_([0-9])\b/g, (_, base, d) => `${base}${SUBSCRIPT_DIGITS[d] ?? d}`)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (kind === "axis") {
    return s.length <= 22 ? s : s.split(/\s+/).slice(0, 3).join(" ").slice(0, 22);
  }

  if (kind === "tick" || kind === "marker") {
    // Ticks & markers MUST be ultra-short symbols (e.g. P₁, Pmax, Q*, E₁, A, B)
    const firstToken = s.split(/\s*[:—–-]\s*/)[0]?.trim() || s;
    const words = firstToken.split(/\s+/);
    const compact = words[0]!.length <= 7 ? words[0]! : firstToken.slice(0, 7);
    return compact;
  }

  if (kind === "curve") {
    // Curve labels like D, S₁, S+tax, MPB=MSB, SRAS₁, LRAS
    const compact = s.split(/\s*[:—–]\s*/)[0]?.trim() || s;
    if (compact.length <= 9) return compact;
    const words = compact.split(/\s+/);
    return words[0]!.slice(0, 9);
  }

  if (kind === "shade" || kind === "arrow") {
    // Keep area/arrow labels crisp (<= 11 chars) using standard economic abbreviations
    const lower = s.toLowerCase();
    if (lower.includes("deadweight") || lower.includes("welfare loss")) return "DWL";
    if (lower.includes("consumer surplus")) return "CS";
    if (lower.includes("producer surplus")) return "PS";
    if (lower.includes("tax rev")) return "Tax rev";
    if (lower.includes("tariff rev")) return "Tariff rev";
    if (lower.includes("excess demand") || lower.includes("shortage")) return "Shortage";
    if (lower.includes("excess supply") || lower.includes("surplus")) return "Surplus";
    if (lower.includes("black market")) return "Black mkt";
    if (lower.includes("abnormal profit") || lower.includes("supernormal")) return "Profit";
    if (lower.includes("subsidy")) return "Subsidy";
    if (s.length <= 11) return s;
    const words = s.split(/\s+/);
    let acc = words[0]!;
    for (let i = 1; i < words.length; i++) {
      if ((acc + " " + words[i]).length <= 11) acc += " " + words[i];
      else break;
    }
    return acc.length <= 11 ? acc : acc.slice(0, 11);
  }

  return s.slice(0, 16);
}

function clampCoord(n: unknown, min = 6, max = 94): number | null {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return null;
  return Math.round(Math.max(min, Math.min(max, num)) * 10) / 10;
}

function parsePt(raw: unknown, min = 6, max = 94): Pt | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const x = clampCoord(raw[0], min, max);
  const y = clampCoord(raw[1], min, max);
  if (x === null || y === null) return null;
  return [x, y];
}

type Box = { x1: number; y1: number; x2: number; y2: number };

function boxesOverlap(a: Box, b: Box, pad = 1.6): boolean {
  return !(
    a.x2 + pad < b.x1 ||
    a.x1 - pad > b.x2 ||
    a.y2 + pad < b.y1 ||
    a.y1 - pad > b.y2
  );
}

function labelBoxAt(x: number, y: number, label: string, anchor: "start" | "middle" | "end" = "start"): Box {
  const w = Math.max(5, label.length * 1.9 + 2);
  const h = 5.5;
  if (anchor === "middle") {
    return { x1: x - w / 2, y1: y - h / 2, x2: x + w / 2, y2: y + h / 2 };
  }
  if (anchor === "end") {
    return { x1: x - w, y1: y - h / 2, x2: x, y2: y + h / 2 };
  }
  return { x1: x, y1: y - h / 2, x2: x + w, y2: y + h / 2 };
}

function polygonCentroid(points: Pt[]): Pt {
  const sum = points.reduce<[number, number]>((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}

/**
 * Validates, shortens labels to authentic Cambridge exam symbols, and runs
 * 2D bounding-box collision avoidance so AI-generated graphs NEVER overlap
 * or clip off-canvas inside <EconomicsDiagram />.
 */
export function sanitizeCustomDiagramSpec(raw: unknown): DiagramSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const xLabel = cleanDiagramSymbol(obj.xLabel, "axis") || "Quantity";
  const yLabel = cleanDiagramSymbol(obj.yLabel, "axis") || "Price ($)";

  const placedBoxes: Box[] = [];
  const collides = (box: Box) => placedBoxes.some((b) => boxesOverlap(b, box));

  // 1. Curves (max 6) with clean non-overlapping end labels
  const rawCurves = Array.isArray(obj.curves) ? obj.curves : [];
  const curves: Curve[] = [];
  for (const c of rawCurves.slice(0, 6)) {
    if (!c || typeof c !== "object") continue;
    const co = c as Record<string, unknown>;
    const ptsRaw = Array.isArray(co.points) ? co.points : [];
    const points = ptsRaw.map((p) => parsePt(p, 8, 90)).filter((p): p is Pt => p !== null);
    if (points.length < 2) continue;

    const toneRaw = typeof co.tone === "string" ? (co.tone as CurveTone) : "demand";
    const tone: CurveTone = VALID_CURVE_TONES.has(toneRaw) ? toneRaw : "neutral";
    const label = cleanDiagramSymbol(co.label, "curve");
    const end = points[points.length - 1]!;
    let labelAt: Pt = parsePt(co.labelAt, 8, 90) ?? [Math.min(89, end[0] + 2.5), end[1]];

    if (label) {
      const candidates: Pt[] = [
        labelAt,
        [Math.min(89, end[0] + 2.5), Math.min(92, end[1] + 5)],
        [Math.min(89, end[0] + 2.5), Math.max(8, end[1] - 5)],
        [Math.max(10, points[0]![0] - 2), Math.min(92, points[0]![1] + 5)],
      ];
      let chosen = candidates[0]!;
      for (const cand of candidates) {
        const box = labelBoxAt(cand[0], cand[1], label, cand[0] >= 84 ? "end" : "start");
        if (!collides(box)) {
          chosen = cand;
          placedBoxes.push(box);
          break;
        }
      }
      labelAt = chosen;
    }

    curves.push({
      points,
      label: label || undefined,
      tone,
      dashed: Boolean(co.dashed),
      arrow: Boolean(co.arrow),
      ...(label ? { labelAt } : {}),
    });
  }

  if (curves.length === 0) return null;

  // 2. Markers (max 4, spaced >= 8 units apart, smart zero-overlap labelOffset)
  const markers: Marker[] = [];
  if (Array.isArray(obj.markers)) {
    for (const m of obj.markers.slice(0, 6)) {
      if (markers.length >= 4) break;
      if (!m || typeof m !== "object") continue;
      const mo = m as Record<string, unknown>;
      const at = parsePt(mo.at, 10, 88);
      if (!at) continue;
      if (markers.some((prev) => Math.hypot(prev.at[0] - at[0], prev.at[1] - at[1]) < 8)) {
        continue;
      }

      const guidesRaw = typeof mo.guides === "string" ? mo.guides : "both";
      const guides: Marker["guides"] =
        guidesRaw === "x" || guidesRaw === "y" || guidesRaw === "both" || guidesRaw === "none"
          ? guidesRaw
          : "both";

      let label = cleanDiagramSymbol(mo.label, "marker");
      let labelOffset: Pt = [2.5, 4];

      if (label) {
        const offsets: Pt[] = [
          [2.5, 4],
          [2.5, -6],
          [-8, 4],
          [-8, -6],
          [4, 0],
          [-10, 0],
        ];
        let placed = false;
        for (const off of offsets) {
          const lx = at[0] + off[0];
          const ly = at[1] + off[1];
          if (lx < 6 || lx > 88 || ly < 8 || ly > 93) continue;
          const box = labelBoxAt(lx, ly, label, "start");
          if (!collides(box)) {
            labelOffset = off;
            placedBoxes.push(box);
            placed = true;
            break;
          }
        }
        if (!placed) {
          // Drop overlapping text label while keeping the dot & guides crisp
          label = "";
        }
      }

      markers.push({
        at,
        ...(label ? { label, labelOffset } : {}),
        guides,
      });
    }
  }

  // 3. Shades (max 2, smart centroid nudge — drops text pill if area too cramped so ZERO overlap)
  const shades: Shade[] = [];
  if (Array.isArray(obj.shades)) {
    for (const s of obj.shades.slice(0, 2)) {
      if (!s || typeof s !== "object") continue;
      const so = s as Record<string, unknown>;
      const ptsRaw = Array.isArray(so.points) ? so.points : [];
      const points = ptsRaw.map((p) => parsePt(p, 8, 90)).filter((p): p is Pt => p !== null);
      if (points.length < 3) continue;
      const toneRaw = typeof so.tone === "string" ? so.tone : "primary";
      const tone = VALID_SHADE_TONES.has(toneRaw as any)
        ? (toneRaw as "primary" | "warn" | "muted" | "danger")
        : "primary";

      let label = cleanDiagramSymbol(so.label, "shade");
      const basePos = parsePt(so.labelAt, 14, 86) ?? polygonCentroid(points);
      let labelAt: Pt | undefined = basePos;

      if (label) {
        const nudges: Pt[] = [
          [0, 0],
          [0, 7],
          [0, -7],
          [-8, 0],
          [8, 0],
          [-7, 7],
          [7, -7],
        ];
        let placed = false;
        for (const [dx, dy] of nudges) {
          const cx = Math.max(14, Math.min(84, basePos[0] + dx));
          const cy = Math.max(12, Math.min(88, basePos[1] + dy));
          const box = labelBoxAt(cx, cy, label, "middle");
          if (!collides(box)) {
            labelAt = [cx, cy];
            placedBoxes.push(box);
            placed = true;
            break;
          }
        }
        if (!placed) {
          // Keep the shaded polygon cleanly without colliding capsule text
          label = "";
          labelAt = undefined;
        }
      }

      shades.push({
        points,
        ...(label ? { label, labelAt } : {}),
        tone,
      });
    }
  }

  // 4. Arrows (max 2, omit arrow label if overlapping)
  const arrows: Arrow[] = [];
  if (Array.isArray(obj.arrows)) {
    for (const a of obj.arrows.slice(0, 2)) {
      if (!a || typeof a !== "object") continue;
      const ao = a as Record<string, unknown>;
      const from = parsePt(ao.from, 8, 90);
      const to = parsePt(ao.to, 8, 90);
      if (!from || !to) continue;
      let label = cleanDiagramSymbol(ao.label, "arrow");
      if (label) {
        const mx = (from[0] + to[0]) / 2;
        const my = (from[1] + to[1]) / 2 + 4;
        const box = labelBoxAt(mx, my, label, "middle");
        if (collides(box)) {
          label = "";
        } else {
          placedBoxes.push(box);
        }
      }
      arrows.push({ from, to, ...(label ? { label } : {}) });
    }
  }

  // 5. Axis Ticks (max 4 each, short symbols, spaced >= 11 units apart, xTicks <= 76 so never hits xLabel!)
  const parseSpacedTicks = (rawTicks: unknown, isX: boolean) => {
    if (!Array.isArray(rawTicks)) return undefined;
    const rawList: Array<{ at: number; label: string }> = [];
    for (const t of rawTicks.slice(0, 6)) {
      if (!t || typeof t !== "object") continue;
      const to = t as Record<string, unknown>;
      const at = clampCoord(to.at, 8, isX ? 76 : 90);
      const label = cleanDiagramSymbol(to.label, "tick");
      if (at !== null && label) rawList.push({ at, label });
    }
    rawList.sort((a, b) => a.at - b.at);
    const spaced: Array<{ at: number; label: string }> = [];
    const minGap = isX ? 11 : 10;
    for (const item of rawList) {
      if (spaced.length >= 4) break;
      if (spaced.every((prev) => Math.abs(prev.at - item.at) >= minGap)) {
        spaced.push(item);
      }
    }
    return spaced.length > 0 ? spaced : undefined;
  };

  // Notes are omitted from AI-generated graphs to prevent clutter/overlaps (explanations go in walkthrough)
  const notes: Note[] = [];

  return {
    xLabel,
    yLabel,
    curves,
    ...(markers.length > 0 ? { markers } : {}),
    ...(shades.length > 0 ? { shades } : {}),
    ...(arrows.length > 0 ? { arrows } : {}),
    ...(notes.length > 0 ? { notes } : {}),
    ...(parseSpacedTicks(obj.xTicks, true) ? { xTicks: parseSpacedTicks(obj.xTicks, true) } : {}),
    ...(parseSpacedTicks(obj.yTicks, false) ? { yTicks: parseSpacedTicks(obj.yTicks, false) } : {}),
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
  return CAMBRIDGE_CORE_DEFINITIONS.map((def) => {
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
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.def);
}

function matchExamples(query: string, limit = 2): EconomicsExample[] {
  const lower = query.toLowerCase();
  const tokens = tokenizeQuery(query);
  return ECONOMICS_EXAMPLES.map((ex) => {
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
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.ex);
}

function matchTopCatalogDiagrams(query: string, limit = 6) {
  const lower = query.toLowerCase();
  const tokens = tokenizeQuery(query);
  return DIAGRAMS.map((d) => {
    const hay = `${d.id} ${d.title} ${d.topic} ${d.represents}`.toLowerCase();
    let score = 0;
    if (lower.includes(d.title.toLowerCase())) score += 60;
    if (lower.includes(d.id.replace(/-/g, " "))) score += 50;
    for (const t of tokens) {
      if (d.title.toLowerCase().includes(t)) score += 18;
      if (d.id.toLowerCase().includes(t)) score += 14;
      if (d.topic.toLowerCase().includes(t)) score += 10;
      if (hay.includes(t)) score += 4;
    }
    return { d, score };
  })
    .filter((x) => x.score >= 12)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function stripThinkingAndParseKit(rawText: string): {
  markdown: string;
  kit: Record<string, any> | null;
} {
  let cleaned = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .trim();

  let kit: Record<string, any> | null = null;
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
      try {
        kit = JSON.parse(jsonStr.replace(/,\s*([}\]])/g, "$1"));
        cleaned = (cleaned.slice(0, lastMatch.index) + cleaned.slice(lastMatch.index + lastMatch[0].length)).trim();
      } catch {
        if (lastMatch[0].toLowerCase().startsWith("```econ-kit")) {
          cleaned = (cleaned.slice(0, lastMatch.index) + cleaned.slice(lastMatch.index + lastMatch[0].length)).trim();
        }
      }
    }
  }

  return { markdown: cleaned, kit };
}

/**
 * Marginal AI Economics Tutor Backend.
 * - Ultra-fast low-latency routing with automatic multi-key & provider failover.
 * - Strictly grounded in Cambridge 9708 Knowledge Base (2.2s non-blocking race),
 *   Core Definitions, Real-World Examples Bank, and Calibrated Diagram Library.
 * - Zero-overlap custom SVG diagram generator + calibrated catalog diagrams.
 * - Never exposes external vendor/model branding to end users.
 */
export const sendGroundedChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ChatInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<GroundedChatReply> => {
    const started = Date.now();
    const { supabase, userId } = context;

    const query = data.message.trim();
    const lowerQuery = query.toLowerCase();
    const wantsNewCustomGraph =
      data.forceGraph ||
      /\b(modify|custom|new graph|generate a.*graph|draw a.*for|sketch a.*for|show.*shift)\b/i.test(query);
    const wantsAnyGraph =
      wantsNewCustomGraph ||
      data.mode === "diagram" ||
      /\b(draw|plot|sketch|graph|diagram|curve|shift|visuali[sz]e|illustrate|chart)\b/i.test(query);

    // 1. FAST PARALLEL GROUNDING (KB search bounded to 2.2s so chat stays snappy!)
    const kbPromise = (async () => {
      try {
        const { retrieve, extractRelevantSnippetWindow } = await import("./retrieval.server");
        const hits = await retrieve(supabase, {
          query,
          matchCount: 4,
          minSimilarity: 0.46,
          enableHybridRrf: true,
        });
        return hits.map((h) => ({
          ...h,
          window: extractRelevantSnippetWindow(h.snippet, 650, query),
        }));
      } catch {
        return [];
      }
    })();

    const timeoutPromise = new Promise<never[]>((resolve) => setTimeout(() => resolve([]), 2200));

    const [kbSources, matchedDefs, matchedExamples, topDiagrams] = await Promise.all([
      Promise.race([kbPromise, timeoutPromise]),
      Promise.resolve(matchDefinitions(query, 2)),
      Promise.resolve(matchExamples(query, 2)),
      Promise.resolve(matchTopCatalogDiagrams(query, 6)),
    ]);

    const kbBlock =
      kbSources.length > 0
        ? kbSources
            .map((s, i) => `[KB-${i + 1}] (${s.docType} · ${s.documentTitle})\n${s.window}`)
            .join("\n\n")
        : "Ground strictly in official Cambridge International AS & A Level Economics (9708) syllabus standards.";

    const defsBlock =
      matchedDefs.length > 0
        ? matchedDefs.map((d) => `• ${d.term}: "${d.definition_text}"`).join("\n")
        : "None pre-matched.";

    const examplesBlock =
      matchedExamples.length > 0
        ? matchedExamples
            .map((ex) => `• ${ex.title} (${ex.region}, ${ex.yearOrPeriod}) — ${ex.keyData}. ${ex.summary}`)
            .join("\n")
        : "Use an accurate, concrete real-world economic example with a real figure.";

    const catalogSnippet =
      topDiagrams.length > 0
        ? topDiagrams.map((x) => `${x.d.id} — ${x.d.title}: ${x.d.represents}`).join("\n")
        : "No direct catalog match — generate a clean custom diagram if visual.";

    const modeInstructions: Record<EconChatMode, string> = {
      quick:
        "MODE: QUICK INTUITION — Be concise, punchy, and crystal clear (150–240 words). Open with a 1-sentence intuition/analogy, give 3–4 crisp numbered causal steps using → arrows, and a 1-line exam tip.",
      exam:
        "MODE: CAMBRIDGE 9708 A* — Give a structured, high-mark 9708 explanation: Definition (AO1), step-by-step causal mechanism (AO2), and sharp 'However, this depends on...' evaluation (AO3). Concise and dense with exam marks.",
      diagram:
        "MODE: GRAPH STUDIO — Anchor the explanation around the visual model. Explain axes, equilibrium, shift, and welfare/surplus area clearly and briefly.",
      quiz:
        "MODE: ACTIVE RECALL — Teach the core idea in 3 crisp bullets, then end with ONE short multiple-choice or 2-mark challenge question (do NOT reveal the answer yet — invite the student to reply!).",
    };

    const systemPrompt = `You are Marginal Tutor, a specialized AI Economics tutor built for Cambridge International AS & A Level Economics (9708).
NEVER mention any external AI company, vendor, or model name. Always refer to yourself simply as Marginal Tutor if asked.

${modeInstructions[data.mode]}

VERIFIED CAMBRIDGE 9708 KNOWLEDGE BASE (trust this first):
${kbBlock}

VERIFIED DEFINITIONS:
${defsBlock}

REAL-WORLD EXAMPLES:
${examplesBlock}

MATCHING CALIBRATED CATALOG DIAGRAMS (zero-overlap textbook quality):
${catalogSnippet}

STRICT FORMATTING RULES:
1. Write clean, readable Markdown with ### headings, numbered steps, and clean Unicode subscripts (P₁, P₂, Q₁, Q₂, S₁ → S₂, Pmax, Pmin, Qs, Qd). NEVER write raw underscores like P_max or Q_s, and NEVER wrap single symbols in asterisks!
2. At the very end of your reply, append ONE fenced \`\`\`econ-kit JSON block:
\`\`\`econ-kit
{
  "diagramMode": "catalog" | "custom" | "none",
  "catalogDiagramId": "<exact id from MATCHING CALIBRATED CATALOG DIAGRAMS or null>",
  "customDiagram": {
    "title": "<short graph title>",
    "caption": "<1 short sentence takeaway>",
    "spec": {
      "xLabel": "Quantity",
      "yLabel": "Price ($)",
      "curves": [
        { "points": [[12, 84], [84, 16]], "label": "D", "tone": "demand" },
        { "points": [[14, 16], [84, 84]], "label": "S₁", "tone": "supply" },
        { "points": [[14, 34], [66, 86]], "label": "S₂", "tone": "warn", "dashed": true }
      ],
      "markers": [
        { "at": [49, 49], "label": "E₁", "guides": "both" },
        { "at": [40, 58], "label": "E₂", "guides": "both" }
      ],
      "shades": [
        { "points": [[40, 58], [49, 49], [40, 40]], "label": "DWL", "tone": "danger" }
      ],
      "arrows": [
        { "from": [64, 64], "to": [54, 74] }
      ],
      "xTicks": [{ "at": 40, "label": "Q₂" }, { "at": 49, "label": "Q₁" }],
      "yTicks": [{ "at": 49, "label": "P₁" }, { "at": 58, "label": "P₂" }]
    },
    "walkthrough": [
      "Initial equilibrium sits at E₁ (P₁, Q₁).",
      "Supply shifts left from S₁ to S₂, raising price to P₂.",
      "Output falls to Q₂, creating the shaded DWL triangle."
    ]
  },
  "keyDefinition": { "term": "<term>", "definition": "<concise official definition>" },
  "realWorldExample": { "title": "<case>", "region": "<country & year>", "stat": "<1 concrete stat>", "takeaway": "<1 sentence link to theory>" },
  "nextTopics": ["<follow-up 1>", "<follow-up 2>", "<follow-up 3>"],
  "voiceover": "<2 short spoken sentences, plain text only>"
}
\`\`\`

STRICT GRAPH RULES (CRITICAL — ZERO OVERLAP):
- ${wantsNewCustomGraph ? 'Generate a fresh, clean "custom" diagram tailored to the student\'s exact scenario.' : 'If one of the MATCHING CALIBRATED CATALOG DIAGRAMS fits closely, set "diagramMode": "catalog" and use its exact "catalogDiagramId" (and omit customDiagram to keep responses super fast!). Only use "custom" when no catalog diagram fits or a custom variation is needed.'}
- For custom diagrams: EVERY curve, marker, and tick label MUST be a short 1–5 char symbol ONLY (e.g. D, S₁, S₂, E₁, E₂, P₁, P₂, Pmax, Q₁, Q₂, Qs, Qd, DWL, CS, PS). NEVER put parenthetical text or phrases inside graph labels! Put all explanations in "walkthrough" (max 4 short steps).
- Space xTicks and yTicks at least 12 units apart (xTicks <= 74 so they stay clear of the X-axis title). Allowed curve tones: demand, supply, cost, revenue, neutral, accent, warn. Allowed shade tones: primary, warn, muted, danger.`;

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...data.history.slice(-6).map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: query },
    ];

    const maxTokens = data.mode === "exam" ? 2400 : 1850;

    // 2. FAST AI EXECUTION (primary fast model + instant failover to active fast provider chain)
    const { chat } = await import("./ai.server");
    const { normaliseConfig } = await import("./ai/active.server");

    let fastProviderConfig = null as ReturnType<typeof normaliseConfig> | null;
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
        fastProviderConfig = {
          ...normaliseConfig(orRows[0]!),
          model: PRIMARY_FAST_MODEL,
        };
      }
    } catch {
      // Fall through to site-wide active provider chain
    }

    let aiResult: Awaited<ReturnType<typeof chat>>;
    if (fastProviderConfig) {
      try {
        aiResult = await chat({
          model: PRIMARY_FAST_MODEL,
          overrideProvider: fastProviderConfig,
          messages: chatMessages,
          maxCompletionTokens: maxTokens,
          temperature: 0.25,
          reasoningEffort: "none",
          userId,
          feature: "econ_gpt_chat",
        });
      } catch {
        aiResult = await chat({
          model: "qwen/qwen3.8-27b",
          messages: chatMessages,
          maxCompletionTokens: maxTokens,
          temperature: 0.25,
          userId,
          feature: "econ_gpt_chat_fallback",
        });
      }
    } else {
      aiResult = await chat({
        model: "qwen/qwen3.8-27b",
        messages: chatMessages,
        maxCompletionTokens: maxTokens,
        temperature: 0.25,
        userId,
        feature: "econ_gpt_chat_fallback",
      });
    }

    const { markdown, kit } = stripThinkingAndParseKit(aiResult.text || "");
    const cleanReply = markdown || aiResult.text.trim();

    // 3. RESOLVE ZERO-OVERLAP DIAGRAM (prefer calibrated catalog for standard models, sanitized custom for bespoke graphs)
    let diagram: ChatDiagramPayload | null = null;
    if (kit) {
      const dMode = String(kit.diagramMode || "").toLowerCase();

      if (dMode === "catalog" && kit.catalogDiagramId) {
        const entry = DIAGRAM_BY_ID[String(kit.catalogDiagramId)];
        if (entry) {
          diagram = {
            kind: "catalog",
            catalogId: entry.id,
            title: entry.title,
            caption: entry.represents,
            spec: entry.spec,
            walkthrough: entry.howToRead.slice(0, 4),
          };
        }
      }

      if (!diagram && kit.customDiagram?.spec) {
        const spec = sanitizeCustomDiagramSpec(kit.customDiagram.spec);
        if (spec) {
          diagram = {
            kind: "custom",
            title: String(kit.customDiagram.title || "Economics Diagram").slice(0, 72),
            caption: String(kit.customDiagram.caption || "Cambridge 9708 economic model.").slice(0, 180),
            spec,
            walkthrough: Array.isArray(kit.customDiagram.walkthrough)
              ? kit.customDiagram.walkthrough.map((s: unknown) => String(s)).filter(Boolean).slice(0, 4)
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
            walkthrough: entry.howToRead.slice(0, 4),
          };
        }
      }
    }

    // Fallback to top calibrated catalog match if student requested a visual and none was emitted
    if (!diagram && wantsAnyGraph && topDiagrams[0]) {
      const entry = topDiagrams[0].d;
      diagram = {
        kind: "catalog",
        catalogId: entry.id,
        title: entry.title,
        caption: entry.represents,
        spec: entry.spec,
        walkthrough: entry.howToRead.slice(0, 4),
      };
    }

    // 4. VERIFIED SOURCES
    const sources: GroundedChatReply["sources"] = [];
    for (const s of kbSources.slice(0, 3)) {
      const typeMap: Record<string, GroundedChatReply["sources"][number]["type"]> = {
        mark_scheme: "mark_scheme",
        examiner_report: "examiner_report",
        coursebook: "coursebook",
        syllabus: "syllabus",
      };
      sources.push({
        title: s.documentTitle,
        chapter: s.heading || s.docType.replace("_", " "),
        snippet: s.window.slice(0, 200),
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
        chapter: "Official Syllabus",
        type: "syllabus",
      });
    }

    // 5. STRUCTURED EXTRAS
    const keyDefinition =
      kit?.keyDefinition?.term && kit?.keyDefinition?.definition
        ? {
            term: String(kit.keyDefinition.term).slice(0, 80),
            definition: String(kit.keyDefinition.definition).slice(0, 280),
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
            title: String(kit.realWorldExample.title).slice(0, 90),
            region: String(kit.realWorldExample.region || "Global").slice(0, 50),
            stat: String(kit.realWorldExample.stat || "").slice(0, 140),
            takeaway: String(kit.realWorldExample.takeaway).slice(0, 220),
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
            `Draw a new custom graph showing a shift for ${matchedDefs[0]?.term || "this topic"}`,
            "How do I evaluate this for A* marks in a 20-mark essay?",
            "Quiz me on this concept with a quick check question",
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
            .slice(0, 240);

    return {
      reply: cleanReply,
      voiceoverSummary,
      isEssayDraftRequest,
      modelLabel: "Marginal AI",
      latencyMs: aiResult.latencyMs || Date.now() - started,
      kbVerified: kbSources.length > 0 || matchedDefs.length > 0,
      sources,
      diagram,
      keyDefinition,
      realWorldExample,
      nextTopics,
      diagramGuidance: diagram?.caption,
      autoDraftPrompt: buildAutoDraftPrompt(query, cleanReply, sources),
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
