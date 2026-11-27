import type { Grading } from "@/lib/examiner/types";
import { stripScoreFractionsFromText } from "@/lib/examiner/types";
import { stripStars } from "@/lib/utils";

export interface Pass4Comment {
  id: string;
  category: "diagram" | "analysis" | "evaluation" | "knowledge";
  title: string;
  badge: string;
  color: "emerald" | "amber" | "rose" | "sky" | "indigo";
  paragraphIndex: number;
  paragraphLabel?: string;
  highlightText: string;
  critique: string;
  suggestion: string;
}

/**
 * Diagnostic guidance tailored specifically to Cambridge 9708 syllabus diagrams.
 * Prevents generic supply/demand "price and quantity coordinates" from being applied to macro models or time-path models like the J-Curve.
 */
function getDiagramSyllabusGuidance(
  title: string,
  isFullMarks: boolean,
  hasExplanation: boolean,
): { critique: string; suggestion: string } {
  const lowerTitle = title.toLowerCase();

  // 0. Quotas, Tariffs & Trade Protectionism
  if (/quota|tariff|protectionism|trade\s*barrier/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) accurately models trade protection, domestic output extension ($Q_1 \\to Q_2$), and import contraction.`,
        suggestion: `Full marks secured. For academic distinction: compare who captures the surplus rectangle (government tax revenue under a tariff vs quota rents to licence holders/foreign exporters under a quota) and retaliatory welfare effects.`,
      };
    }
    return {
      critique: hasExplanation
        ? `Diagram (${title}) is positioned in trade analysis. Ensure the price rise from world price $P_w$ to the protected price, the reduction in imports, and the deadweight loss areas (production inefficiency and consumption loss) are explicitly integrated with the coordinates.`
        : `Diagram (${title}) is placed here, but accompanying analysis lacks explicit reference to world price ($P_w$), protected price, and the deadweight welfare loss triangles.`,
      suggestion: `Trace the transmission mechanism: state how the restriction forces domestic price above $P_w$, domestic output extends to $Q_2$, consumption contracts to $Q_3$, leaving quota rents or tariff revenue alongside production and consumption deadweight welfare losses.`,
    };
  }

  // 1. The J-Curve Effect / Marshall-Lerner
  if (/j[\s-_]*curve/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) is accurately positioned in analytical flow, illustrating the time-path trajectory of the current account balance ($X - M$) following currency depreciation.`,
        suggestion: `Full marks secured. For academic distinction: consider acknowledging how non-tariff contracts, exchange rate pass-through elasticity, or domestic spare capacity influence the length of the short-run contractual lag before Marshall-Lerner holds.`,
      };
    }
    return {
      critique: hasExplanation
        ? `Diagram (${title}) is positioned in analytical flow. Ensure the time path (short-run deficit worsening where PEDx + PEDm < 1 due to contractual lags vs long-run surplus recovery where PEDx + PEDm > 1) is explicitly integrated with the current account balance on the vertical axis.`
        : `Diagram (${title}) is placed here, but subsequent analysis lacks explicit reference to the time-path mechanism: why trade balance (X - M) initially worsens before volume adjustments turn it into a surplus under the Marshall-Lerner condition.`,
      suggestion: `Explicitly reference the axes: plot Current Account Balance on the vertical y-axis against Time on the horizontal x-axis, and state the Marshall-Lerner condition (PEDx + PEDm > 1) to explain the recovery leg.`,
    };
  }

  // 2. Macroeconomic AD/AS, LRAS, SRAS, Keynesian AS, Monetary Policy, Supply-Side
  if (
    /ad[\s/-]*as|aggregate\s+demand|aggregate\s+supply|\blras\b|\bsras\b|keynesian|monetarist|classical\s+lras|capacity\s+ceiling|output\s+gap|deflationary\s+gap|inflationary\s+gap|national\s+income|demand-pull|cost-push/i.test(
      lowerTitle,
    )
  ) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) is accurately integrated into macroeconomic flow, illustrating shifts in aggregate demand/supply and capacity constraints.`,
        suggestion: `Full marks secured. For academic distinction: distinguish between short-run Keynesian spare capacity versus long-run classical vertical LRAS constraints.`,
      };
    }
    return {
      critique: hasExplanation
        ? `Diagram (${title}) is positioned in analytical flow. Ensure shifts in AD/AS are traced directly to changes in the general price level ($PL_1 \\to PL_2$) and real output ($Y_1 \\to Y_2$), explicitly identifying any resulting output gap or capacity constraint.`
        : `Diagram (${title}) is placed here, but subsequent analysis lacks explicit reference to general price level ($PL_1 \\to PL_2$) and real output ($Y_1 \\to Y_2$) coordinates.`,
      suggestion: `Integrate general price level coordinates ($PL_1 \\to PL_2$) and real GDP coordinates ($Y_1 \\to Y_2$) directly into your written analysis to demonstrate transmission to macroeconomic stability, noting spare capacity or full employment bottlenecks.`,
    };
  }

  // 3. Phillips Curve (Short-Run & Long-Run)
  if (/phillips/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) accurately illustrates the inflation-unemployment trade-off and expectations adjustments.`,
        suggestion: `Full marks secured. For academic distinction: discuss how anchored inflation expectations prevent permanent trade-offs along the SRPC.`,
      };
    }
    return {
      critique: `Diagram (${title}) is positioned here. Ensure movement along SRPC and shifts in LRPC at the Natural Rate of Unemployment (NRU) are connected directly to inflation and unemployment data.`,
      suggestion: `Explicitly reference inflation (%) on the y-axis and unemployment (%) on the x-axis, explaining how expectations shift the SRPC vertically.`,
    };
  }

  // 4. Foreign Exchange Market (Floating Exchange Rate / Currency Market / Depreciation / Appreciation)
  if (/exchange\s*rate|forex|currency|depreciation|appreciation|devaluation|revaluation/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) accurately models foreign exchange market equilibrium and currency flows.`,
        suggestion: `Full marks secured. For academic distinction: contrast floating market adjustments with central bank foreign exchange reserve interventions.`,
      };
    }
    return {
      critique: `Diagram (${title}) illustrates foreign exchange market equilibrium. Ensure the exchange rate price coordinates (e.g. ER1 to ER2 on the vertical axis) and shifts in currency demand or supply (e.g. D1 to D2 on the horizontal axis) are explicitly connected to balance of payments or trade flows.`,
      suggestion: `Label the forex axes accurately (Exchange Rate / Price of domestic currency on vertical axis, Quantity of currency on horizontal axis) and link the shift in currency demand/supply to trade deficit transmission.`,
    };
  }

  // 5. Monopoly, Oligopoly, Collusion, Game Theory & Market Structures
  if (/monopoly|oligopoly|kinked|cartel|pay[\s-_]*off|game\s+theory|monopolistic/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) accurately illustrates market structure equilibrium where profit maximisation occurs at $MC = MR$.`,
        suggestion: `Full marks secured. For academic distinction: consider contrasting short-run supernormal profit with long-run contestability or dynamic efficiency R&D reinvestment.`,
      };
    }
    return {
      critique: hasExplanation
        ? `Diagram (${title}) is positioned in analytical flow. Ensure the profit-maximising output coordinate ($MC = MR$) and corresponding price coordinate on the AR curve are explicitly integrated with supernormal profit areas or deadweight welfare loss.`
        : `Diagram (${title}) is placed here, but subsequent analysis lacks explicit reference to profit-maximising coordinates ($MC = MR$) and the price markup on the AR curve.`,
      suggestion: `Explicitly trace the coordinates: identify quantity where $MC = MR$, price on the average revenue (AR) curve, and the supernormal profit rectangle ($[P - AC] \\times Q$).`,
    };
  }

  // 6. Lorenz Curve & Gini Coefficient
  if (/lorenz|gini/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) accurately illustrates income inequality distribution against the line of perfect equality.`,
        suggestion: `Full marks secured. For academic distinction: evaluate the difference between pre-tax Gini coefficients and post-tax/transfer Gini coefficients.`,
      };
    }
    return {
      critique: `Ensure the Lorenz curve's deviation from the 45-degree line of perfect equality is tied directly to the Gini coefficient calculation.`,
      suggestion: `Plot Cumulative % of Population on the x-axis against Cumulative % of Income on the y-axis, explaining how fiscal policy alters the area between the curve and the 45° line.`,
    };
  }

  // 7. Production Possibility Frontier (PPF / PPC)
  if (/ppf|ppc|production\s*possibility/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) accurately demonstrates opportunity cost and productive capacity.`,
        suggestion: `Full marks secured. For academic distinction: evaluate how investment in capital goods shifts the PPF outward faster in future periods.`,
      };
    }
    return {
      critique: `Ensure trade-offs between capital goods and consumer goods illustrate opportunity cost and economic growth via outward PPF shifts.`,
      suggestion: `Explicitly reference the two output bundles on the axes and explain how shifting production involves increasing opportunity cost.`,
    };
  }

  // 8. General Microeconomic Supply & Demand / Tax / Subsidy / Externality
  if (isFullMarks) {
    return {
      critique: `Diagram (${title}) is accurately integrated with market equilibrium coordinates.`,
      suggestion: `Full marks secured. For academic distinction: consider evaluating price elasticity bounds or incidence distribution between consumers and producers.`,
    };
  }
  return {
    critique: hasExplanation
      ? `Diagram (${title}) is positioned in analytical flow. Ensure equilibrium shifts (price and quantity coordinates: P1 to P2, Q1 to Q2) are explicitly integrated into subsequent analysis.`
      : `Diagram (${title}) is placed here, but accompanying analysis lacks explicit discussion of the diagram's curves, shifts, and market equilibrium changes.`,
    suggestion: `Explicitly connect the curves shown on the diagram to the market transmission mechanism in the accompanying text to secure full Level 3 AO2 marks.`,
  };
}

export interface ParagraphBlock {
  index: number;
  text: string;
  isDiagram: boolean;
  textParagraphNumber: number | null;
  label: string;
  diagramTitle?: string;
}

/**
 * Robust detection of standalone inline diagram blocks (e.g. [DIAGRAM: ...], (Diagram: ...)).
 * A text block is ONLY a diagram block if it is primarily a diagram tag, not a normal
 * paragraph that happens to reference a diagram in passing.
 */
export function isDiagramBlock(
  text: string,
  diagramMatches: { matchText: string }[] = [],
): boolean {
  const t = text.trim();
  if (t.length === 0) return false;

  // Standalone square bracket diagram tag: e.g. [DIAGRAM: Maximum Price], [FIGURE 1: LRAS]
  if (/^\[\s*(?:DIAGRAM|FIGURE|FIG|GRAPH)\s*:[^\]]+\]$/i.test(t)) return true;
  // Standalone parenthesis diagram tag: e.g. (Diagram: Maximum Price), (Figure: J-Curve)
  if (/^\(\s*(?:Diagram|Figure|Fig|Graph)\s*:[^)]+\)$/i.test(t)) return true;
  // Standalone curly-brace diagram tag: e.g. {Diagram: Depreciation}
  if (/^\{\s*(?:Diagram|Figure|Fig|Graph)\s*:[^}]+\}$/i.test(t)) return true;
  // Short standalone bracket with explicit diagram words: e.g. (Maximum Price Diagram)
  if (/^\([^)]{3,80}\)$/.test(t) && /\b(?:diagram|curve|equilibrium|shortage|surplus|ppc|ppf)\b/i.test(t)) return true;

  // Exact match against detected diagram tags
  if (
    diagramMatches.some((m) => {
      const mt = m.matchText.trim();
      return (
        t === mt ||
        t.toLowerCase() === mt.toLowerCase() ||
        t === mt.replace(/^[(\[]|[)\]]$/g, "").trim()
      );
    })
  ) {
    return true;
  }

  // If the text has multiple sentences or is long (>120 chars), it is a text paragraph, NOT a diagram block
  if (t.length > 120 || /[.!?]\s+[A-Z]/.test(t)) {
    return false;
  }

  return false;
}

/**
 * Normalizes accidental mid-sentence hard line-wraps (e.g. from PDF or OCR pastes)
 * inside a single paragraph while preserving intentional line breaks (after colons,
 * before bullet/list items, or before short formula lines).
 */
function normalizeInternalLineBreaks(chunk: string): string {
  const lines = chunk
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length <= 1) return lines[0] || "";

  let result = lines[0];
  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const curr = lines[i];
    const isListOrBullet = /^(?:[-•*–—]\s+|\d+[.)]\s+|(?:First|Second|Third|Fourth|Finally)[,:]\s+)/i.test(curr);
    const isFormulaLine = curr.length <= 45 && /[=<>+\-×÷→]/.test(curr) && !/[.!?]$/.test(curr);
    const prevEndsWithColon = /:\s*$/.test(prev);
    const looksLikeHardWrap =
      !/[.!?:;)\]}]$/.test(prev) && /^[a-z0-9(]/.test(curr) && !isListOrBullet && !isFormulaLine;

    if (looksLikeHardWrap) {
      result += ` ${curr}`;
    } else if (prevEndsWithColon || isListOrBullet || isFormulaLine) {
      result += `\n${curr}`;
    } else {
      result += ` ${curr}`;
    }
  }
  return result;
}

/**
 * Splits a single-newline essay (no blank lines between prose paragraphs) into coherent
 * paragraphs while rejoining mid-sentence hard wraps and keeping colon-introduced
 * formulas/lists attached to their parent paragraph.
 */
function splitSingleNewlineChunk(chunk: string): string[] {
  const lines = chunk
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length <= 1) return lines;

  const paragraphs: string[] = [];
  let current = lines[0];

  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const curr = lines[i];
    const prevEndsSentence = /[.!?]["'”’)\]]*$/.test(prev);
    const prevEndsColon = /:\s*$/.test(prev);
    const currIsBullet = /^(?:[-•*–—]\s+|\d+[.)]\s+)/.test(curr);
    const currIsFormula = curr.length <= 45 && /[=<>+\-×÷→]/.test(curr) && !/[.!?]$/.test(curr);
    const currStartsLower = /^[a-z]/.test(curr);

    if (prevEndsColon || currIsBullet || currIsFormula) {
      current += `\n${curr}`;
    } else if (!prevEndsSentence || currStartsLower) {
      current += ` ${curr}`;
    } else {
      paragraphs.push(current.trim());
      current = curr;
    }
  }

  if (current.trim()) {
    paragraphs.push(current.trim());
  }

  return paragraphs;
}

/**
 * Splits essay text into discrete paragraph blocks with unified indexing and syllabus labels.
 * Handles both double-newline (\n\n) and single-newline paragraph breaks cleanly,
 * rejoins accidental PDF/OCR mid-sentence hard wraps, and ensures standalone diagram lines
 * are isolated into discrete blocks without corrupting surrounding text paragraph counts.
 */
export function parseParagraphBlocks(
  essayText: string,
  diagramMatches: { matchText: string; title: string }[] = [],
): ParagraphBlock[] {
  if (!essayText.trim()) return [];

  const normalized = essayText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  // Detect whether the author's original prose used blank lines (\n\n) between paragraphs
  // (ignoring blank lines that we are about to inject around standalone diagram tags).
  const standaloneDiagramLineRegex =
    /(^|\n)\s*(\[(?:DIAGRAM|FIGURE|FIG|GRAPH)\s*:[^\]]+\]|\((?:Diagram|Figure|Fig|Graph)\s*:[^)]+\)|\{(?:Diagram|Figure|Fig|Graph)\s*:[^}]+\})\s*(?=$|\n)/gi;

  const proseWithoutDiagrams = normalized.replace(standaloneDiagramLineRegex, "").trim();
  const hasExplicitBlankLineParagraphs = /\n\s*\n+/.test(proseWithoutDiagrams);

  // Ensure diagram tags on their own line are isolated by double-newlines
  const diagramDelimited = normalized.replace(standaloneDiagramLineRegex, "\n\n$2\n\n");

  const initialChunks = diagramDelimited
    .split(/\n\s*\n+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);

  const rawChunks: string[] = [];
  for (const chunk of initialChunks) {
    if (isDiagramBlock(chunk, diagramMatches)) {
      rawChunks.push(chunk);
    } else if (!hasExplicitBlankLineParagraphs && chunk.includes("\n")) {
      rawChunks.push(...splitSingleNewlineChunk(chunk));
    } else if (chunk.includes("\n")) {
      rawChunks.push(normalizeInternalLineBreaks(chunk));
    } else {
      rawChunks.push(chunk);
    }
  }

  let textCounter = 0;
  return rawChunks.map((text, index) => {
    const isDiag = isDiagramBlock(text, diagramMatches);
    if (!isDiag) {
      textCounter++;
      return {
        index,
        text,
        isDiagram: false,
        textParagraphNumber: textCounter,
        label: `¶ Paragraph ${textCounter}`,
      };
    } else {
      const matchingDiag = diagramMatches.find(
        (m) =>
          text.includes(m.matchText) ||
          m.matchText.includes(text) ||
          text.toLowerCase().includes(m.title.toLowerCase()),
      );
      return {
        index,
        text,
        isDiagram: true,
        textParagraphNumber: null,
        label: textCounter > 0 ? `Diagram (after ¶${textCounter})` : "Diagram (at start)",
        diagramTitle: matchingDiag?.title,
      };
    }
  });
}

/**
 * Common English and general evaluation stopwords that should not count
 * toward specific economic topic keyword matching.
 */
const STOP_WORDS = new Set([
  "the", "and", "for", "that", "this", "with", "from", "have", "been",
  "would", "could", "should", "also", "some", "more", "most", "than",
  "their", "they", "then", "them", "into", "over", "such", "only", "very",
  "much", "each", "which", "what", "when", "where", "candidate", "lacks",
  "lacking", "weakness", "requires", "needed", "needs", "need", "mark", "marks",
  "level", "credit", "comment", "response", "answer", "essay", "point",
  "points", "discussion", "explanation", "explain", "analyse", "analyze",
  "analysis", "evaluate", "evaluation", "knowledge", "well", "good", "poor",
  "does", "not", "show", "shows", "about", "there", "these", "those",
  "give", "gives", "given", "using", "uses", "used", "make", "makes",
  "made", "state", "states", "stated", "detail", "details", "briefly",
  "clear", "clearly", "further", "order", "push", "toward", "full",
  "link", "between", "under", "explained", "driven", "reduced", "remain",
  "remains", "remaining", "however", "therefore", "because", "may", "can",
]);

/**
 * Lightweight morphological stemmer for economics vocabulary so variants like
 * "subsidy"/"subsidies", "elastic"/"elasticity", "produce"/"producers" match reliably.
 */
function stemEconWord(word: string): string {
  let w = word.toLowerCase();
  if (w.length <= 2) return w;
  if (w.endsWith("ies") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (w.endsWith("icity") && w.length > 6) return w.slice(0, -5);
  if (w.endsWith("ity") && w.length > 5) return w.slice(0, -3);
  if (w.endsWith("tion") && w.length > 6) return w.slice(0, -4);
  if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
  if (w.endsWith("ers") && w.length > 5) return w.slice(0, -3);
  if (w.endsWith("er") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("es") && w.length > 4 && !w.endsWith("ss")) return w.slice(0, -2);
  if (w.endsWith("s") && w.length > 3 && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) {
    return w.slice(0, -1);
  }
  return w;
}

/**
 * Cambridge 9708 Economics Concept Synonyms & Acronym Bridges.
 * Ensures diagnostic language like "supply elasticity" matches "PES" in the essay,
 * "AI-driven" matches "AI and robotics", "deadweight loss" matches "DWL", etc.
 */
const ECON_SYNONYM_GROUPS: Array<{ trigger: RegExp; expansions: string[] }> = [
  {
    trigger: /\b(?:supply\s+elasticity|elasticity\s+of\s+supply|pes)\b/i,
    expansions: ["pes", "elastic", "elasticity", "supply"],
  },
  {
    trigger: /\b(?:demand\s+elasticity|elasticity\s+of\s+demand|ped)\b/i,
    expansions: ["ped", "elastic", "inelastic", "elasticity", "demand"],
  },
  {
    trigger: /\b(?:income\s+elasticity|yed)\b/i,
    expansions: ["yed", "income", "elasticity"],
  },
  {
    trigger: /\b(?:cross\s+elasticity|xed)\b/i,
    expansions: ["xed", "cross", "substitute", "complement"],
  },
  {
    trigger: /\b(?:ai|artificial\s+intelligence|robotics|automation)\b/i,
    expansions: ["ai", "robotics", "automation", "capital", "technology"],
  },
  {
    trigger: /\b(?:msb|marginal\s+social\s+benefit)\b/i,
    expansions: ["msb", "social", "benefit", "externality"],
  },
  {
    trigger: /\b(?:mpb|marginal\s+private\s+benefit)\b/i,
    expansions: ["mpb", "private", "benefit"],
  },
  {
    trigger: /\b(?:msc|marginal\s+social\s+cost)\b/i,
    expansions: ["msc", "social", "cost"],
  },
  {
    trigger: /\b(?:mpc|marginal\s+private\s+cost)\b/i,
    expansions: ["mpc", "private", "cost"],
  },
  {
    trigger: /\b(?:deadweight|welfare\s+loss|dwl)\b/i,
    expansions: ["dwl", "deadweight", "welfare", "loss"],
  },
  {
    trigger: /\b(?:aggregate\s+demand|\bad\b)\b/i,
    expansions: ["ad", "aggregate", "demand"],
  },
  {
    trigger: /\b(?:aggregate\s+supply|\bas\b|\blras\b|\bsras\b)\b/i,
    expansions: ["as", "sras", "lras", "aggregate", "supply"],
  },
  {
    trigger: /\b(?:economies\s+of\s+scale|eos)\b/i,
    expansions: ["economies", "scale", "eos", "average"],
  },
  {
    trigger: /\b(?:marshall[\s-]*lerner)\b/i,
    expansions: ["marshall", "lerner", "depreciation", "pedx", "pedm"],
  },
  {
    trigger: /\b(?:opportunity\s+cost|budget\s+deficit|fiscal)\b/i,
    expansions: ["opportunity", "deficit", "budget", "spending", "expensive"],
  },
];

/**
 * Extracts exact verbatim quotes inside diagnostic text (e.g. "..." or '...').
 */
function extractQuotedSpans(text: string): string[] {
  const quotes: string[] = [];
  const regex = /[“"']([^“"']{8,140})[”"']/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const q = m[1].trim();
    if (q.length >= 8) quotes.push(q);
  }
  return quotes;
}

/**
 * Tokenizes a block of text cleanly (preserving short economics acronyms like AI, AD, AS, MC, MR, AC, AR, PED, PES).
 */
function tokenizeEconomicsText(text: string): string[] {
  // Replace punctuation AND hyphens with spaces so "AI-driven" yields ["ai", "driven"]
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  return clean
    .split(/\s+/)
    .filter((w) => (w.length >= 3 || /^(?:ai|ad|as|mc|mr|ac|ar|lr|sr)$/i.test(w)) && !STOP_WORDS.has(w))
    .map(stemEconWord);
}

/**
 * Extracts high-information economic keywords, stemmed tokens, synonyms, quotes, and bigrams.
 */
function extractDiagnosticKeywords(text: string): {
  words: string[];
  phrases: string[];
  quotes: string[];
} {
  const rawTokens = tokenizeEconomicsText(text);
  const wordSet = new Set<string>(rawTokens);

  for (const group of ECON_SYNONYM_GROUPS) {
    if (group.trigger.test(text)) {
      for (const exp of group.expansions) {
        wordSet.add(stemEconWord(exp));
      }
    }
  }

  // Extract key 2-word collocations on hyphen-split text
  const cleanTokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const phrases: string[] = [];
  for (let i = 0; i < cleanTokens.length - 1; i++) {
    const w1 = cleanTokens[i];
    const w2 = cleanTokens[i + 1];
    if (
      (w1.length >= 3 || /^(?:ai|ad|as)$/i.test(w1)) &&
      (w2.length >= 3 || /^(?:ai|ad|as)$/i.test(w2)) &&
      !STOP_WORDS.has(w1) &&
      !STOP_WORDS.has(w2)
    ) {
      phrases.push(`${w1} ${w2}`);
    }
  }

  return {
    words: Array.from(wordSet),
    phrases: Array.from(new Set(phrases)),
    quotes: extractQuotedSpans(text),
  };
}

/**
 * Computes document-frequency weights across all text paragraphs so ubiquitous terms
 * (e.g. "subsidy" appearing in 6 paragraphs) don't drown out rare, discriminating terms
 * (e.g. "ai", "robotics", "pes", "teachers", "bureaucracy").
 */
function computeIdfWeights(textBlocks: ParagraphBlock[]): Map<string, number> {
  const docFreq = new Map<string, number>();
  const n = Math.max(1, textBlocks.length);

  for (const block of textBlocks) {
    const uniqueStems = new Set(tokenizeEconomicsText(block.text));
    for (const s of uniqueStems) {
      docFreq.set(s, (docFreq.get(s) ?? 0) + 1);
    }
  }

  const weights = new Map<string, number>();
  for (const [term, df] of docFreq.entries()) {
    // Smooth IDF: rare (1/9) => ~2.3, common (6/9) => ~0.65
    weights.set(term, Math.log((n + 1) / (df + 0.5)) + 0.4);
  }
  return weights;
}

/**
 * Checks for explicit examiner paragraph references (e.g. "in paragraph 3", "the second paragraph", "conclusion").
 */
function findExplicitParagraphIndex(
  diagnosticText: string,
  textBlocks: ParagraphBlock[],
): ParagraphBlock | null {
  if (textBlocks.length === 0) return null;
  const lower = diagnosticText.toLowerCase();

  // Explicit number: paragraph 1, paragraph 2, paragraph 3, etc.
  const numMatch = lower.match(/\b(?:paragraph|para|¶)\s*([1-9]\d?)\b/i);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    const target = textBlocks.find((b) => b.textParagraphNumber === num);
    if (target) return target;
  }

  // Ordinal word references
  if (/\b(?:the\s+)?(?:first|1st|opening|introductory)\s+paragraph\b/i.test(lower)) {
    return textBlocks[0];
  }
  if (/\b(?:the\s+)?(?:second|2nd)\s+paragraph\b/i.test(lower)) {
    return textBlocks[1] || textBlocks[0];
  }
  if (/\b(?:the\s+)?(?:third|3rd)\s+paragraph\b/i.test(lower)) {
    return textBlocks[2] || textBlocks[textBlocks.length - 1];
  }
  if (/\b(?:the\s+)?(?:fourth|4th)\s+paragraph\b/i.test(lower)) {
    return textBlocks[3] || textBlocks[textBlocks.length - 1];
  }
  if (/\b(?:the\s+)?(?:fifth|5th)\s+paragraph\b/i.test(lower)) {
    return textBlocks[4] || textBlocks[textBlocks.length - 1];
  }
  if (/\b(?:concluding\s+paragraph|final\s+paragraph|last\s+paragraph|in\s+conclusion)\b/i.test(lower)) {
    return textBlocks[textBlocks.length - 1];
  }

  return null;
}

/**
 * Robustly matches an examiner diagnostic / weakness comment to the most accurate
 * paragraph block in the candidate manuscript, calibrated against Cambridge syllabus categories.
 */
function findBestMatchingParagraphBlock(
  diagnosticText: string,
  category: "diagram" | "analysis" | "evaluation" | "knowledge",
  allBlocks: ParagraphBlock[],
  usedBlockIndices: Set<number>,
): ParagraphBlock {
  const textBlocks = allBlocks.filter((b) => !b.isDiagram);
  if (textBlocks.length === 0) {
    return allBlocks[0] || {
      index: 0,
      text: "",
      isDiagram: false,
      textParagraphNumber: 1,
      label: "¶ Paragraph 1",
    };
  }

  // 1. Direct explicit reference check
  const explicit = findExplicitParagraphIndex(diagnosticText, textBlocks);
  if (explicit) return explicit;

  // 2. Extract keywords, stems, synonyms, quotes, and IDF weights across essay paragraphs
  const { words, phrases, quotes } = extractDiagnosticKeywords(diagnosticText);
  const idfWeights = computeIdfWeights(textBlocks);

  // 3. Score each candidate text paragraph
  let bestBlock = textBlocks[0];
  let highestScore = -Infinity;

  textBlocks.forEach((block, idx) => {
    let score = 0;
    const lowerPara = block.text.toLowerCase();
    const normPara = lowerPara.replace(/\s+/g, " ");
    const paraStemSet = new Set(tokenizeEconomicsText(block.text));

    // Exact verbatim quote match inside this paragraph: overwhelming anchor (+45)
    for (const q of quotes) {
      const normQ = q.toLowerCase().replace(/\s+/g, " ").trim();
      if (normQ.length >= 8 && normPara.includes(normQ)) {
        score += 45;
      }
    }

    // Phrase matches with word-boundary safety: +12 points each
    for (const phrase of phrases) {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`, "i").test(lowerPara)) {
        score += 12;
      }
    }

    // IDF-weighted stemmed token matches: rare discriminating concepts ("ai", "pes", "robotics")
    // dominate common boilerplate words ("subsidies", "government", "market")
    for (const stem of words) {
      if (paraStemSet.has(stem)) {
        const idf = idfWeights.get(stem) ?? 1.2;
        score += idf * 5.0;
      }
    }

    // Category-specific calibration (gentle tie-breakers so topical IDF always wins)
    if (category === "evaluation") {
      const hasEvalMarker =
        /\b(?:however|on the other hand|in contrast|nevertheless|alternatively|depends?\s+(?:on|upon)|short[\s-]run|long[\s-]run|in conclusion|overall|weighing|on balance|to what extent)\b/i.test(
          lowerPara,
        );
      if (hasEvalMarker) score += 6;
      if (idx >= Math.floor(textBlocks.length / 2)) score += 3;
      if (/^(?:however|on the other hand|in conclusion|overall)/i.test(block.text.trim())) score += 5;
    } else if (category === "analysis") {
      const hasCausalMarker =
        /\b(?:leads?\s+to|causes?|consequently|therefore|as a result|shifts?|creates?|results?\s+in|transmission|contracts?|extends?|multiplier)\b/i.test(
          lowerPara,
        );
      if (hasCausalMarker) score += 2.5;
      if (idx >= 1 && idx < textBlocks.length - 1) score += 2;
      if (idx === 0) score -= 4;
    } else if (category === "knowledge") {
      if (idx === 0 && score === 0) score += 6;
    } else if (category === "diagram") {
      if (
        /\b(?:equilibrium|supply|demand|curve|shift|shortage|surplus|price|quantity|deadweight|cost|revenue|output|gdp)\b/i.test(
          lowerPara,
        )
      ) {
        score += 8;
      }
      if (idx >= 1) score += 4;
    }

    // Collision avoidance: encourage spreading cards across paragraphs without overriding strong topic matches
    if (usedBlockIndices.has(block.index)) {
      score -= 6;
    }

    if (score > highestScore) {
      highestScore = score;
      bestBlock = block;
    }
  });

  return bestBlock;
}

/**
 * Extracts the single most relevant sentence inside the targeted paragraph
 * to quote on the Pass 4 card and highlight in the manuscript.
 */
function extractBestHighlightSentence(
  paraText: string,
  diagnosticText: string,
  category: "diagram" | "analysis" | "evaluation" | "knowledge",
): string {
  if (!paraText.trim()) return "";

  // Split into sentences using punctuation delimiters without lookbehinds (compatible with Safari/WebKit)
  const rawSentences = paraText
    .replace(/([.!?])\s+/g, "$1\0")
    .split("\0")
    .map((s) => s.trim())
    .filter((s) => s.length >= 6);

  if (rawSentences.length <= 1) {
    return (rawSentences[0] || paraText).trim();
  }

  const { words, phrases, quotes } = extractDiagnosticKeywords(diagnosticText);
  let bestSentence = rawSentences[0];
  let highestScore = -Infinity;

  rawSentences.forEach((sentence) => {
    let score = 0;
    const lower = sentence.toLowerCase();
    const normSent = lower.replace(/\s+/g, " ");
    const sentStems = new Set(tokenizeEconomicsText(sentence));

    // Verbatim quote inside this sentence
    for (const q of quotes) {
      const normQ = q.toLowerCase().replace(/\s+/g, " ").trim();
      if (normQ.length >= 8 && normSent.includes(normQ)) score += 40;
    }

    // Phrase matches
    for (const phrase of phrases) {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`, "i").test(lower)) score += 10;
    }

    // Stemmed + synonym token matches
    for (const stem of words) {
      if (sentStems.has(stem)) score += 4;
    }

    // Category clues (light tie-breakers)
    if (category === "evaluation") {
      if (/^(?:however|on the other hand|in conclusion|overall|nevertheless|in contrast)/i.test(sentence)) {
        score += 5;
      }
      if (/\b(?:depends?\s+(?:on|upon)|short[\s-]run|long[\s-]run|weigh|trade-off)\b/i.test(lower)) {
        score += 4;
      }
    } else if (category === "analysis") {
      if (/\b(?:leads?\s+to|causes?|consequently|therefore|as a result|shifts?|transmission|pes|elastic)\b/i.test(lower)) {
        score += 3;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestSentence = sentence;
    }
  });

  return bestSentence.trim();
}

/**
 * Robust in-situ highlight locator that guarantees finding the exact or best
 * matching sentence/phrase in the manuscript paragraph, even with whitespace,
 * quotation, ellipsis, or punctuation variations.
 */
export function findHighlightSpanInText(
  paragraphText: string,
  targetQuery?: string | null,
): { before: string; match: string; after: string } {
  const rawPara = paragraphText || "";
  const cleanTarget = (targetQuery || "").trim();
  if (!rawPara || !cleanTarget) {
    return { before: "", match: rawPara, after: "" };
  }

  // 1. Exact substring match
  const exactIdx = rawPara.indexOf(cleanTarget);
  if (exactIdx !== -1) {
    return {
      before: rawPara.slice(0, exactIdx),
      match: rawPara.slice(exactIdx, exactIdx + cleanTarget.length),
      after: rawPara.slice(exactIdx + cleanTarget.length),
    };
  }

  // 2. Strip surrounding quotes, ellipses (… or ...), and trailing punctuation
  const stripped = cleanTarget
    .replace(/^[“"'\s]+|[”"'\s]+$/g, "")
    .replace(/(?:\.{2,}|…)$/, "")
    .trim();

  if (stripped.length >= 6) {
    const strippedIdx = rawPara.indexOf(stripped);
    if (strippedIdx !== -1) {
      return {
        before: rawPara.slice(0, strippedIdx),
        match: rawPara.slice(strippedIdx, strippedIdx + stripped.length),
        after: rawPara.slice(strippedIdx + stripped.length),
      };
    }
  }

  // 3. Case-insensitive match
  const lowerPara = rawPara.toLowerCase();
  const lowerTarget = (stripped || cleanTarget).toLowerCase();
  const lowerIdx = lowerPara.indexOf(lowerTarget);
  if (lowerIdx !== -1) {
    const matchLen = (stripped || cleanTarget).length;
    return {
      before: rawPara.slice(0, lowerIdx),
      match: rawPara.slice(lowerIdx, lowerIdx + matchLen),
      after: rawPara.slice(lowerIdx + matchLen),
    };
  }

  // 4. Word sequence regex match (handles variable whitespace and newlines)
  const words = (stripped || cleanTarget)
    .split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter(Boolean);

  if (words.length >= 3) {
    const prefixWords = words.slice(0, Math.min(words.length, 8));
    const regex = new RegExp(prefixWords.join("\\s+"), "i");
    const m = regex.exec(rawPara);
    if (m && m.index !== undefined) {
      const start = m.index;
      const rest = rawPara.slice(start);
      const punctMatch = rest.match(/[.!?](?:\s+|$)/);
      const sentenceEnd = punctMatch && punctMatch.index !== undefined ? punctMatch.index + 1 : rest.length;
      const end =
        sentenceEnd !== -1 && sentenceEnd >= m[0].length
          ? start + sentenceEnd
          : start + m[0].length;
      return {
        before: rawPara.slice(0, start),
        match: rawPara.slice(start, end),
        after: rawPara.slice(end),
      };
    }
  }

  // 5. Best sentence overlap: split paragraph into sentences and find highest token overlap (no lookbehinds)
  const sentences = rawPara
    .replace(/([.!?])\s+/g, "$1\0")
    .split("\0")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length > 0) {
    const queryTokens = new Set(
      cleanTarget
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 3),
    );

    let bestSentence = sentences[0];
    let maxOverlap = -1;

    for (const sent of sentences) {
      const sentTokens = sent
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 3);
      let overlap = 0;
      for (const t of sentTokens) {
        if (queryTokens.has(t)) overlap++;
      }
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestSentence = sent;
      }
    }

    const sentIdx = rawPara.indexOf(bestSentence);
    if (sentIdx !== -1) {
      return {
        before: rawPara.slice(0, sentIdx),
        match: rawPara.slice(sentIdx, sentIdx + bestSentence.length),
        after: rawPara.slice(sentIdx + bestSentence.length),
      };
    }
  }

  // 6. Sentence fallback: match the first sentence
  const firstSentence = sentences[0] || rawPara;
  const fallbackIdx = rawPara.indexOf(firstSentence);
  if (fallbackIdx !== -1) {
    return {
      before: rawPara.slice(0, fallbackIdx),
      match: rawPara.slice(fallbackIdx, fallbackIdx + firstSentence.length),
      after: rawPara.slice(fallbackIdx + firstSentence.length),
    };
  }

  return {
    before: "",
    match: rawPara,
    after: "",
  };
}

export interface HighlightSegment {
  text: string;
  comment: Pass4Comment | null;
  isActive: boolean;
}

/**
 * Builds non-overlapping, lossless inline highlight segments for a paragraph that may
 * have one or multiple Pass 4 comments. Concatenating every segment's `text` is
 * guaranteed to equal `paragraphText` verbatim. When two comments target overlapping
 * ranges, the currently active comment takes precedence.
 */
export function buildParagraphHighlightSegments(
  paragraphText: string,
  comments: Pass4Comment[],
  activeCommentId: string | null,
): HighlightSegment[] {
  if (!paragraphText) return [];
  if (comments.length === 0) {
    return [{ text: paragraphText, comment: null, isActive: false }];
  }

  type Range = { start: number; end: number; comment: Pass4Comment; isActive: boolean };
  const rawRanges: Range[] = [];

  for (const comment of comments) {
    const span = findHighlightSpanInText(paragraphText, comment.highlightText);
    if (!span.match) continue;
    const start = span.before.length;
    const end = start + span.match.length;
    if (end > start) {
      rawRanges.push({
        start,
        end,
        comment,
        isActive: comment.id === activeCommentId,
      });
    }
  }

  if (rawRanges.length === 0) {
    return [{ text: paragraphText, comment: null, isActive: false }];
  }

  // Prioritize active comment first, then earlier start, then shorter specific span
  const prioritized = [...rawRanges].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    if (a.start !== b.start) return a.start - b.start;
    return a.end - a.start - (b.end - b.start);
  });

  const accepted: Range[] = [];
  for (const candidate of prioritized) {
    const overlaps = accepted.some(
      (existing) => candidate.start < existing.end && candidate.end > existing.start,
    );
    if (!overlaps) {
      accepted.push(candidate);
    }
  }

  accepted.sort((a, b) => a.start - b.start);

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const range of accepted) {
    if (range.start > cursor) {
      segments.push({
        text: paragraphText.slice(cursor, range.start),
        comment: null,
        isActive: false,
      });
    }
    segments.push({
      text: paragraphText.slice(range.start, range.end),
      comment: range.comment,
      isActive: range.isActive,
    });
    cursor = range.end;
  }

  if (cursor < paragraphText.length) {
    segments.push({
      text: paragraphText.slice(cursor),
      comment: null,
      isActive: false,
    });
  }

  return segments;
}

/**
 * Evaluates whether an embedded diagram has been thoroughly integrated and explained
 * in the surrounding paragraphs (preceding paragraph, succeeding paragraph, or essay body).
 */
export function isDiagramThoroughlyExplained(
  diagramTitle: string,
  targetIndex: number,
  blocks: ParagraphBlock[],
  essayText: string,
): boolean {
  const lowerTitle = diagramTitle.toLowerCase();

  // Surrounding text: the paragraph immediately before and the paragraph immediately after the diagram
  const prevBlock = targetIndex > 0 ? blocks[targetIndex - 1] : null;
  const nextBlock = targetIndex + 1 < blocks.length ? blocks[targetIndex + 1] : null;

  const immediateContext = [
    prevBlock && !prevBlock.isDiagram ? prevBlock.text : "",
    nextBlock && !nextBlock.isDiagram ? nextBlock.text : "",
  ]
    .join(" ")
    .toLowerCase();

  // 1. Foreign exchange / currency / depreciation / appreciation
  if (/exchange\s*rate|forex|currency|depreciation|appreciation|devaluation|revaluation/i.test(lowerTitle)) {
    const hasCurrencyTerm =
      /depreciat|appreciat|exchange\s*rate|foreign\s*currency|domestic\s*currency|inflow|outflow|currency\s*value|current\s*account|trade\s*balance|exports?|imports?|devalu/i.test(
        immediateContext,
      );
    const hasMechanismTerm =
      /demand|supply|greater\s+than|less\s+than|increase|decrease|shift|fall|rise|higher|lower|deficit|surplus|equilibrium|flow/i.test(
        immediateContext,
      );
    return Boolean(hasCurrencyTerm && hasMechanismTerm);
  }

  // 2. J-Curve effect
  if (/j[\s-_]*curve/i.test(lowerTitle)) {
    return Boolean(
      /marshall[\s-_]*lerner|contractual\s+lag|pedx|pedm|elasticity\s+of\s+demand\s+for\s+exports/i.test(
        immediateContext,
      ),
    );
  }

  // 3. Macroeconomic AD/AS, LRAS, SRAS, Keynesian
  if (
    /ad[\s/-]*as|aggregate\s+demand|aggregate\s+supply|\blras\b|\bsras\b|keynesian|monetarist|capacity|output\s+gap|deflationary|inflationary/i.test(
      lowerTitle,
    )
  ) {
    const hasMacroTerm =
      /price\s+level|real\s+gdp|national\s+output|aggregate\s+demand|aggregate\s+supply|spare\s+capacity|full\s+employment|bottleneck|inflation/i.test(
        immediateContext,
      );
    const hasShiftTerm = /shift|increase|decrease|rise|fall|equilibrium|gap/i.test(immediateContext);
    return Boolean(hasMacroTerm && hasShiftTerm);
  }

  // 4. Phillips curve
  if (/phillips/i.test(lowerTitle)) {
    return Boolean(
      /inflation.*unemployment|unemployment.*inflation|trade[\s-_]*off|srpc|lrpc|nru/i.test(immediateContext),
    );
  }

  // 5. Monopoly / Oligopoly / Market structures
  if (/monopoly|oligopoly|kinked|cartel|pay[\s-_]*off|game\s+theory|monopolistic/i.test(lowerTitle)) {
    return Boolean(
      /mc\s*=\s*mr|marginal\s+cost|marginal\s+revenue|supernormal\s+profit|deadweight|abnormal\s+profit|price\s+maker|ar\s+curve/i.test(
        immediateContext,
      ),
    );
  }

  // 6. PPF / PPC
  if (/ppf|ppc|production\s*possibility/i.test(lowerTitle)) {
    return Boolean(
      /opportunity\s+cost|capital\s+goods|consumer\s+goods|trade[\s-_]*off|productive\s+capacity|outward\s+shift/i.test(
        immediateContext,
      ),
    );
  }

  // 7. General market models (Supply & Demand, Price Controls, Taxes, Subsidies, Externalities)
  const hasGenericMechanics =
    /shift|equilibrium|shortage|surplus|price|quantity|tax|subsidy|externality|ceiling|floor|demand|supply|cost|revenue|welfare/i.test(
      immediateContext,
    );
  const hasDirectionalCausal =
    /increase|decrease|contract|extend|fall|rise|higher|lower|lead\s+to|causes?|results?\s+in/i.test(
      immediateContext,
    );

  return hasGenericMechanics && hasDirectionalCausal;
}

/**
 * Matches a Pass 4 card's critique & targeted paragraph against unused entries in
 * `grading.actionable_feedback` using IDF-weighted stem/synonym overlap.
 * Prevents falling back to generic boilerplate whenever the real actionable bullet
 * uses different phrasing (e.g., "PES" instead of "chain" or "mechanism").
 */
function pickActionableSuggestion(params: {
  critique: string;
  category: "diagram" | "analysis" | "evaluation" | "knowledge";
  actionableFeedback: string[];
  usedActionableIndices: Set<number>;
  targetBlockText: string;
  idfWeights: Map<string, number>;
}): string | null {
  const { critique, category, actionableFeedback, usedActionableIndices, targetBlockText, idfWeights } = params;
  if (!actionableFeedback || actionableFeedback.length === 0) return null;

  const critiqueTokens = new Set(extractDiagnosticKeywords(critique).words);
  const paraTokens = new Set(tokenizeEconomicsText(targetBlockText));

  const categoryRegex: Record<typeof category, RegExp> = {
    diagram: /\b(diagram|figure|curve|axis|axes|shift|label|coordinate|j[\s-_]*curve)\b/i,
    analysis: /\b(explain|trace|link|step|cost|price|supply|demand|pes|ped|shift|chain|mechanism|transmission|subsid|tax|revenue|output|profit|ms[bc]|mp[bc])\b/i,
    evaluation: /\b(evaluat|weigh|rank|prioriti[sz]e|compar|judgement|judgment|conclusion|criterion|criteria|depend|trade[\s-]*off|short[\s-]*run|long[\s-]*run|elastic)\b/i,
    knowledge: /\b(defin|term|terminology|concept|formula|distinguish|distinction|accurate|precision)\b/i,
  };

  let bestIdx = -1;
  let bestScore = 0;

  actionableFeedback.forEach((item, idx) => {
    if (usedActionableIndices.has(idx) || !item || !item.trim()) return;
    let score = 0;
    const itemTokens = new Set(extractDiagnosticKeywords(item).words);

    for (const t of itemTokens) {
      const w = idfWeights.get(t) ?? 1.2;
      if (critiqueTokens.has(t)) score += w * 4.5;
      if (paraTokens.has(t)) score += w * 2.5;
    }

    if (categoryRegex[category].test(item)) {
      score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });

  if (bestIdx >= 0 && bestScore >= 4.0) {
    usedActionableIndices.add(bestIdx);
    return actionableFeedback[bestIdx];
  }
  return null;
}

/**
 * Builds a concise, paragraph-grounded rewrite suggestion when `actionable_feedback`
 * had no unused match, referencing the exact concepts detected in the critique/paragraph
 * rather than emitting generic textbook boilerplate.
 */
function buildContextualSuggestionFallback(
  critique: string,
  targetBlockText: string,
  category: "analysis" | "evaluation" | "knowledge",
): string {
  const { words } = extractDiagnosticKeywords(critique);
  const paraStems = new Set(tokenizeEconomicsText(targetBlockText));
  const sharedConcepts = words
    .filter((w) => paraStems.has(w) && w.length >= 2)
    .slice(0, 3);
  const topicLabel = sharedConcepts.length > 0 ? sharedConcepts.join(" / ") : "this point";

  if (category === "analysis") {
    return sharedConcepts.length > 0
      ? `Spell out each intermediate step connecting ${topicLabel} here: explain the cost or incentive adjustment, how market price and quantity respond, and the resulting impact on market welfare.`
      : "Trace the intermediate price, cost, or incentive adjustment explicitly in this paragraph before stating the final market outcome.";
  }
  if (category === "evaluation") {
    return sharedConcepts.length > 0
      ? `Weigh ${topicLabel} explicitly against an evaluative criterion (time horizon, elasticity magnitude, or opportunity cost) and state which force dominates in your final judgement.`
      : "Rank which argument matters most here using an explicit criterion (short vs long run, elasticity size, or fiscal trade-off) and reach a decisive verdict.";
  }
  return sharedConcepts.length > 0
    ? `Sharpen the formal Cambridge 9708 definition and theoretical boundary for ${topicLabel} directly in this paragraph.`
    : "State the exact textbook Cambridge 9708 definition and theoretical distinction cleanly before applying it.";
}

/**
 * Pass 4: In-situ diagnostic alignment pass that compares the dual-examiner
 * candidate report against the candidate script, decoding diagram integration
 * and mapping specific weaknesses directly to paragraphs/sentences.
 */
export function generatePass4Comments(
  essayText: string,
  question: string,
  grading: Grading,
  diagramMatches: { title: string; matchText: string }[] = [],
): Pass4Comment[] {
  if (!essayText.trim() || !grading) return [];

  const comments: Pass4Comment[] = [];
  const blocks = parseParagraphBlocks(essayText, diagramMatches);
  if (blocks.length === 0) return [];

  const textBlocks = blocks.filter((b) => !b.isDiagram);
  const idfWeights = computeIdfWeights(textBlocks);
  const actionableFeedback = Array.isArray(grading.actionable_feedback)
    ? grading.actionable_feedback
    : [];

  // Track weakness texts & actionable items already mapped to prevent duplicate diagnostics
  const usedWeaknessTexts = new Set<string>();
  const usedActionableIndices = new Set<number>();
  // Track block indices already targeted by a comment to disperse annotations
  const usedBlockIndices = new Set<number>();

  // Full marks check (12/12, 20/20, 8/8)
  const isFullMarks = (grading.total_mark ?? 0) >= (grading.max_mark ?? 12);

  // Helper to sanitize suggestion tone when full marks are achieved
  const formatSuggestion = (rawSuggestion: string, fallback: string) => {
    if (!isFullMarks) return rawSuggestion || fallback;
    let s = rawSuggestion || fallback;
    s = s.replace(/to push toward full marks[.,]?\s*/gi, "");
    s = s.replace(/to secure full level \d+ (?:ao\d+ )?marks[.,]?\s*/gi, "");
    s = s.replace(/to gain level \d+ (?:ao\d+ )?credit[.,]?\s*/gi, "");
    s = s.replace(/to push into the top band[.,]?\s*/gi, "");
    if (!/full marks secured|exemplar/i.test(s)) {
      s = `Full marks secured. For academic distinction: ${s.charAt(0).toLowerCase() + s.slice(1)}`;
    }
    return s;
  };

  // 1. Pass 4: Decode Diagram Placement & Integration
  if (diagramMatches.length > 0) {
    diagramMatches.forEach((m, idx) => {
      let targetBlock = blocks.find(
        (b) =>
          b.isDiagram &&
          (b.text.includes(m.matchText) ||
            m.matchText.includes(b.text) ||
            b.text.toLowerCase().includes(m.title.toLowerCase())),
      );
      if (!targetBlock) {
        targetBlock = blocks.find((b) => b.text.includes(m.matchText));
      }
      if (!targetBlock) {
        targetBlock = blocks.find((b) => b.isDiagram) || blocks[Math.min(1, blocks.length - 1)];
      }

      const targetIndex = targetBlock ? targetBlock.index : 0;
      const targetLabel = targetBlock ? targetBlock.label : "Diagram";
      const hasDetailedExplanation = isDiagramThoroughlyExplained(
        m.title,
        targetIndex,
        blocks,
        essayText,
      );

      const missingDiagramNotes = grading.missing_elements?.diagrams || [];
      const hasExaminerDiagramDefect =
        missingDiagramNotes.length > 0 ||
        Boolean(
          grading.weaknesses?.some((w) =>
            /\b(?:diagram|figure|curve|axes|axis|unlabelled|unintegrated)\b/i.test(w),
          ),
        );

      if (hasDetailedExplanation && !hasExaminerDiagramDefect) {
        return;
      }

      usedBlockIndices.add(targetIndex);

      const guidance = getDiagramSyllabusGuidance(m.title, isFullMarks, Boolean(hasDetailedExplanation));

      const critique =
        missingDiagramNotes[0] && !isFullMarks
          ? missingDiagramNotes[0]
          : guidance.critique;

      const matchedActionable = pickActionableSuggestion({
        critique: `${critique} ${m.title} diagram`,
        category: "diagram",
        actionableFeedback,
        usedActionableIndices,
        targetBlockText: m.title,
        idfWeights,
      });
      const rawSuggestion = matchedActionable || guidance.suggestion;

      comments.push({
        id: `pass4-diagram-${idx}`,
        category: "diagram",
        title: isFullMarks ? `Diagram Integration: ${m.title}` : `Diagram Decoding: ${m.title}`,
        badge: isFullMarks ? "Diagram Mastery" : "Diagram Integration",
        color: "emerald",
        paragraphIndex: targetIndex,
        paragraphLabel: targetLabel,
        highlightText: m.matchText,
        critique: stripScoreFractionsFromText(stripStars(critique)),
        suggestion: stripScoreFractionsFromText(stripStars(formatSuggestion(rawSuggestion, guidance.suggestion))),
      });
    });
  } else {
    const targetBlock = findBestMatchingParagraphBlock(
      "diagram curves shifts market equilibrium transmission mechanism",
      "diagram",
      blocks,
      usedBlockIndices,
    );

    const targetIndex = targetBlock ? targetBlock.index : 0;
    const targetLabel = targetBlock ? targetBlock.label : "¶ Paragraph 1";
    usedBlockIndices.add(targetIndex);
    const firstSentence = extractBestHighlightSentence(
      targetBlock?.text || "",
      "diagram equilibrium curves shift",
      "diagram",
    );

    comments.push({
      id: "pass4-diagram-missing",
      category: "diagram",
      title: isFullMarks ? "Diagram Integration: Extension Model" : "Diagram Decoding: Visual Model Omission",
      badge: isFullMarks ? "Diagram Extension" : "Diagram Gap",
      color: isFullMarks ? "emerald" : "amber",
      paragraphIndex: targetIndex,
      paragraphLabel: targetLabel,
      highlightText: firstSentence,
      critique: isFullMarks
        ? "No diagram was included in the script. While full marks were achieved through exhaustive textual reasoning, anchoring the response to an economics diagram represents examiner best practice."
        : "No economics diagram was detected in the candidate script. Cambridge 9708 examiners reward diagrammatic analysis under AO2 for market mechanisms.",
      suggestion: isFullMarks
        ? "Full marks secured. For academic distinction: position an economics diagram directly after this paragraph to visually anchor the transmission mechanism."
        : "Position an economics diagram directly after this paragraph to visually illustrate shifts in market equilibrium and gain Level 3 AO2 credit.",
    });
  }

  // 2. Pass 4: Map Deterministic Neuro-Symbolic Economic Law Violations (if any)
  const neuroViolations = grading.neuro_symbolic?.violations ?? [];
  for (let vIdx = 0; vIdx < Math.min(2, neuroViolations.length); vIdx++) {
    const v = neuroViolations[vIdx];
    const queryWithQuote = `"${v.quote}" ${v.explanation}`;
    const targetBlock = findBestMatchingParagraphBlock(
      queryWithQuote,
      "analysis",
      blocks,
      usedBlockIndices,
    );
    usedBlockIndices.add(targetBlock.index);
    const highlightSentence = extractBestHighlightSentence(targetBlock.text, queryWithQuote, "analysis");
    const matchedActionable = pickActionableSuggestion({
      critique: v.explanation,
      category: "analysis",
      actionableFeedback,
      usedActionableIndices,
      targetBlockText: targetBlock.text,
      idfWeights,
    });

    comments.push({
      id: vIdx === 0 ? "pass4-causal-violation" : `pass4-causal-violation-${vIdx}`,
      category: "analysis",
      title: "AO2 Economic Mechanism: Directional Error",
      badge: v.severity === "fatal" ? "Fatal Mechanism Error" : "Conceptual Slip",
      color: "rose",
      paragraphIndex: targetBlock.index,
      paragraphLabel: targetBlock.label,
      highlightText: highlightSentence,
      critique: stripScoreFractionsFromText(stripStars(v.explanation)),
      suggestion: stripScoreFractionsFromText(
        stripStars(formatSuggestion(matchedActionable || v.law, v.law)),
      ),
    });
  }

  // 3. Pass 4: Map AO2 Causal Analysis Weaknesses (up to 2 distinct issues)
  const analysisCandidates: string[] = [];
  for (const w of grading.weaknesses ?? []) {
    if (
      !usedWeaknessTexts.has(w) &&
      /\b(analysis|causal|mechanism|mechanisms|chain|transmission|link|links|multiplier|under-explained|underdeveloped|shift|elasticity|pes|ped)\b/i.test(
        w,
      ) &&
      !/\b(?:diagram|figure|curve|axes|axis|unlabelled|unintegrated)\b/i.test(w)
    ) {
      analysisCandidates.push(w);
    }
  }
  for (const w of grading.missing_elements?.analysis ?? []) {
    if (!usedWeaknessTexts.has(w)) {
      analysisCandidates.push(w);
    }
  }

  const maxAnalysisCards = Math.max(0, 2 - neuroViolations.length);
  for (let aIdx = 0; aIdx < Math.min(maxAnalysisCards, analysisCandidates.length); aIdx++) {
    const analysisWeakness = analysisCandidates[aIdx];
    usedWeaknessTexts.add(analysisWeakness);

    const bestBlock = findBestMatchingParagraphBlock(
      analysisWeakness,
      "analysis",
      blocks,
      usedBlockIndices,
    );

    const targetIndex = bestBlock.index;
    const targetLabel = bestBlock.label;
    usedBlockIndices.add(targetIndex);
    const highlightSentence = extractBestHighlightSentence(bestBlock.text, analysisWeakness, "analysis");

    const contextualFallback = buildContextualSuggestionFallback(
      analysisWeakness,
      bestBlock.text,
      "analysis",
    );
    const matchedActionable = pickActionableSuggestion({
      critique: analysisWeakness,
      category: "analysis",
      actionableFeedback,
      usedActionableIndices,
      targetBlockText: bestBlock.text,
      idfWeights,
    });
    const rawSuggestion = matchedActionable || contextualFallback;

    comments.push({
      id: aIdx === 0 ? "pass4-analysis-gap" : `pass4-analysis-gap-${aIdx}`,
      category: "analysis",
      title: isFullMarks ? "AO2 Synoptic Analysis: Extension & Edge Cases" : "AO2 Causal Analysis: Mechanism Transmission",
      badge: isFullMarks ? "Extension Tip" : "Analysis Gap",
      color: isFullMarks ? "sky" : "amber",
      paragraphIndex: targetIndex,
      paragraphLabel: targetLabel,
      highlightText: highlightSentence,
      critique: stripScoreFractionsFromText(stripStars(analysisWeakness)),
      suggestion: stripScoreFractionsFromText(stripStars(formatSuggestion(rawSuggestion, contextualFallback))),
    });
  }

  // 4. Pass 4: Map AO3 Critical Evaluation Weaknesses (up to 2 distinct issues)
  const evalCandidates: string[] = [];
  for (const w of grading.weaknesses ?? []) {
    if (
      !usedWeaknessTexts.has(w) &&
      /\b(evaluat|evaluation|conclusion|judgement|judgment|balance|depend|depends|criterion|criteria|short run|long run|rank|prioriti[sz]|trade[\s-]*off)\b/i.test(
        w,
      )
    ) {
      evalCandidates.push(w);
    }
  }
  for (const w of grading.missing_elements?.evaluation ?? []) {
    if (!usedWeaknessTexts.has(w)) {
      evalCandidates.push(w);
    }
  }
  if (
    evalCandidates.length === 0 &&
    grading.ao_breakdown?.evaluation?.out_of &&
    grading.ao_breakdown.evaluation.out_of > 0 &&
    (grading.ao_breakdown.evaluation.awarded ?? 0) < grading.ao_breakdown.evaluation.out_of &&
    grading.ao_breakdown.evaluation.comment &&
    !usedWeaknessTexts.has(grading.ao_breakdown.evaluation.comment)
  ) {
    evalCandidates.push(grading.ao_breakdown.evaluation.comment);
  }

  if (evalCandidates.length > 0 && textBlocks.length >= 2) {
    for (let eIdx = 0; eIdx < Math.min(2, evalCandidates.length); eIdx++) {
      const evalWeakness = evalCandidates[eIdx];
      usedWeaknessTexts.add(evalWeakness);

      const evalBlock = findBestMatchingParagraphBlock(
        evalWeakness,
        "evaluation",
        blocks,
        usedBlockIndices,
      );

      const targetIndex = evalBlock.index;
      const targetLabel = evalBlock.label;
      usedBlockIndices.add(targetIndex);
      const highlightSentence = extractBestHighlightSentence(evalBlock.text, evalWeakness, "evaluation");

      const contextualFallback = buildContextualSuggestionFallback(
        evalWeakness,
        evalBlock.text,
        "evaluation",
      );
      const matchedActionable = pickActionableSuggestion({
        critique: evalWeakness,
        category: "evaluation",
        actionableFeedback,
        usedActionableIndices,
        targetBlockText: evalBlock.text,
        idfWeights,
      });
      const rawSuggestion = matchedActionable || contextualFallback;

      comments.push({
        id: eIdx === 0 ? "pass4-eval-gap" : `pass4-eval-gap-${eIdx}`,
        category: "evaluation",
        title: isFullMarks ? "AO3 Evaluative Sophistication: Distinction Depth" : "AO3 Critical Evaluation: Depth & Weighing",
        badge: isFullMarks ? "Examiner Note" : "Evaluation Gap",
        color: isFullMarks ? "emerald" : "sky",
        paragraphIndex: targetIndex,
        paragraphLabel: targetLabel,
        highlightText: highlightSentence,
        critique: stripScoreFractionsFromText(stripStars(evalWeakness)),
        suggestion: stripScoreFractionsFromText(stripStars(formatSuggestion(rawSuggestion, contextualFallback))),
      });
    }
  }

  // 5. Pass 4: Map AO1 Knowledge / Terminology Gaps (if any)
  // Suppress "Terminology Gap" if student secured full AO1 knowledge marks and there are no explicit missing definitions
  const hasKnowledgeGap =
    (grading.ao_breakdown?.knowledge?.awarded ?? 0) < (grading.ao_breakdown?.knowledge?.out_of ?? 2) ||
    (grading.missing_elements?.definitions && grading.missing_elements.definitions.length > 0);

  // Strict regex: must NOT match "acknowledge" as "knowledge"
  const knowledgeWeakness =
    hasKnowledgeGap || !isFullMarks
      ? grading.weaknesses?.find((w) => {
          if (usedWeaknessTexts.has(w)) return false;
          if (/\backnowledg/i.test(w) && !/\b(definition|terminology|formula)\b/i.test(w)) return false;
          return (
            /\b(definition|definitions|terminology|terms|formula|concept|concepts)\b/i.test(w) ||
            /\b(theoretical\s+definition|conceptual\s+precision)\b/i.test(w)
          );
        }) || grading.missing_elements?.definitions?.find((w) => !usedWeaknessTexts.has(w))
      : null;

  if (knowledgeWeakness) {
    usedWeaknessTexts.add(knowledgeWeakness);

    const knowledgeBlock = findBestMatchingParagraphBlock(
      knowledgeWeakness,
      "knowledge",
      blocks,
      usedBlockIndices,
    );

    const targetIndex = knowledgeBlock.index;
    const targetLabel = knowledgeBlock.label;
    usedBlockIndices.add(targetIndex);
    const highlightSentence = extractBestHighlightSentence(knowledgeBlock.text, knowledgeWeakness, "knowledge");

    const contextualFallback = buildContextualSuggestionFallback(
      knowledgeWeakness,
      knowledgeBlock.text,
      "knowledge",
    );
    const matchedActionable = pickActionableSuggestion({
      critique: knowledgeWeakness,
      category: "knowledge",
      actionableFeedback,
      usedActionableIndices,
      targetBlockText: knowledgeBlock.text,
      idfWeights,
    });
    const rawSuggestion = matchedActionable || contextualFallback;

    comments.push({
      id: "pass4-knowledge-gap",
      category: "knowledge",
      title: isFullMarks ? "AO1 Knowledge Extension: Advanced Theoretical Framing" : "AO1 Knowledge: Conceptual Precision",
      badge: isFullMarks ? "Extension Tip" : "Terminology Gap",
      color: "indigo",
      paragraphIndex: targetIndex,
      paragraphLabel: targetLabel,
      highlightText: highlightSentence,
      critique: stripScoreFractionsFromText(stripStars(knowledgeWeakness)),
      suggestion: stripScoreFractionsFromText(
        stripStars(
          isFullMarks
            ? formatSuggestion(
                rawSuggestion,
                "Full marks secured. For academic distinction: provide formal mathematical or textbook bounds for all economic variables.",
              )
            : rawSuggestion,
        ),
      ),
    });
  }

  return comments;
}
